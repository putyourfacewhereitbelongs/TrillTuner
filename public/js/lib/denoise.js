/* Trill Tuner — background-noise removal for a recorded phrase.
 *
 * A from-scratch spectral subtractor, the same family of tool as a studio
 * "noise reduction" plug-in:
 *
 *   1. the take is cut into 50 %-overlapping Hann frames (2048 samples) and
 *      each frame is taken to the frequency domain;
 *   2. the noise is learned from the take itself: the quietest frames (the
 *      gaps between notes, the room before you play) give the average
 *      spectrum of whatever is not the instrument — hiss, hum, fridge, traffic;
 *   3. every bin is turned down by how much of it is noise, with a floor so
 *      nothing is ever gated to digital silence (that is what makes a cheap
 *      noise gate sound like it is breathing);
 *   4. the frames are overlap-added back together.
 *
 * Pure functions over Float32Array — no AudioContext, no DOM — so it is unit
 * tested against synthesised signals in test/denoise-test.js.
 */
(function () {
  'use strict';

  const N = 2048;            /* frame length: 46 ms at 44.1 kHz — fine enough for a guitar's partials */
  const HOP = N / 4;         /* 75 % overlap: a clean Hann overlap-add with no level ripple */

  function hann(n) {
    const w = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
    return w;
  }

  function fftApi() {
    const api = (typeof globalThis !== 'undefined' && globalThis.TT && globalThis.TT.fft) ||
      (typeof window !== 'undefined' && window.TT && window.TT.fft);
    if (!api) throw new Error('the FFT engine (lib/fft.js) is not loaded');
    return api;
  }

  /* Remove background noise from `samples`.
   *
   * opts.strength  how hard to subtract the noise, 0.5 (gentle) … 4 (heavy). Default 3.
   * opts.floor     the least each bin is left at, as a power fraction. Default 0.05 (−13 dB
   *                in power): a louder floor keeps the air and avoids “watery” artefacts.
   *
   * Returns { samples, info } where info says what was done, so the page can
   * report it honestly rather than claiming a reduction it did not measure. */
  function denoise(samples, sr, opts) {
    opts = opts || {};
    const info = {
      applied: false, frames: 0, noiseFrames: 0, gentle: false,
      reductionDb: 0, noiseDb: -Infinity
    };
    if (!samples || !samples.length || !sr) return { samples: samples || new Float32Array(0), info: info };
    const fft = fftApi().fft;
    const x = samples instanceof Float32Array ? samples : Float32Array.from(samples);
    const n = x.length;
    const strength = Math.max(0, opts.strength == null ? 3 : +opts.strength);
    const floor = Math.min(1, Math.max(0, opts.floor == null ? 0.05 : +opts.floor));
    const half = N / 2;
    const win = hann(N);

    /* pad one frame of silence each side so the first and last samples get the
     * same overlap as the middle — the same edge rule the stem separator uses */
    const padded = new Float32Array(n + 2 * N);
    padded.set(x, N);
    const frames = Math.max(1, Math.ceil((padded.length - N) / HOP) + 1);
    info.frames = frames;

    /* ---- 1. analysis: keep every frame's spectrum (bins 0..N-1, full complex) */
    const RE = new Array(frames), IM = new Array(frames);
    const energy = new Float64Array(frames);
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let t = 0; t < frames; t++) {
      const off = t * HOP;
      for (let i = 0; i < N; i++) {
        const s = off + i < padded.length ? padded[off + i] : 0;
        re[i] = s * win[i]; im[i] = 0;
      }
      fft(re, im);
      const r = new Float32Array(N), m = new Float32Array(N);
      let e = 0;
      for (let b = 0; b < N; b++) {
        r[b] = re[b]; m[b] = im[b];
        if (b <= half) e += re[b] * re[b] + im[b] * im[b];
      }
      RE[t] = r; IM[t] = m; energy[t] = e;
    }

    /* ---- 2. the noise: per-bin minimum statistics. Every frequency bin is
     * followed over the whole take, and its noise floor is its low percentile
     * across time: in the gaps between notes a bin holds only the hiss, the
     * hum and the room, and the low tail of its own history finds that level
     * even when the take has no silent gap at all. The 15th percentile of an
     * exponentially distributed power sits at 0.1625 of its mean, so it is
     * scaled back up to the mean noise power. */
    /* The quietest quarter of the frames is what the report measures against.
     * A fixed fraction of the median would miss the gaps whenever something
     * constant (a mains hum, an amp hiss) lifts them, so rank instead. */
    const energySorted = Array.from(energy).sort((a, b) => a - b);
    const median = energySorted[Math.floor(frames / 2)] || 0;
    const q25 = energySorted[Math.floor(frames * 0.25)] || 0;
    const quiet = [];
    for (let t = 0; t < frames; t++) if (energy[t] <= q25) quiet.push(t);
    const noisePow = new Float64Array(N);
    const colBuf = new Float64Array(frames);
    for (let b = 0; b <= half; b++) {
      for (let t = 0; t < frames; t++) colBuf[t] = RE[t][b] * RE[t][b] + IM[t][b] * IM[t][b];
      const col = colBuf.slice().sort();
      const q15 = col[Math.floor(0.15 * (frames - 1))];
      noisePow[b] = q15 / 0.1625;
    }
    let noiseSum = 0;
    for (let b = 0; b <= half; b++) noiseSum += noisePow[b];
    info.noiseDb = noiseSum > 0 ? 10 * Math.log10(noiseSum / (half + 1) + 1e-20) : -Infinity;
    /* With almost no quiet frames the take is one continuous sound: the floor
     * is then the instrument itself, so the subtraction goes gently rather
     * than eating the notes along with the hiss. */
    let alpha = strength;
    const q90 = energySorted[Math.floor(frames * 0.9)] || 0;
    if (q90 <= 0 || q25 > q90 * 0.5) { alpha = strength * 0.5; info.gentle = true; }
    info.noiseFrames = quiet.length;
    if (strength === 0) return { samples: new Float32Array(x), info: info };

    /* ---- 3. the gain of every bin in every frame */
    const quietSet = new Set(quiet);
    let before = 0, after = 0;
    const G = new Array(frames);
    const bins = half + 1;
    for (let t = 0; t < frames; t++) {
      const g = new Float32Array(bins);
      for (let b = 0; b < bins; b++) {
        const p = RE[t][b] * RE[t][b] + IM[t][b] * IM[t][b];
        /* spectral subtraction in power, floored, then amplitude */
        const gp = Math.max(floor, 1 - alpha * noisePow[b] / (p + 1e-20));
        g[b] = Math.sqrt(gp);
        if (quietSet.has(t)) { before += p; after += p * gp; }
      }
      G[t] = g;
    }
    if (before > 0) info.reductionDb = 10 * Math.log10(before / Math.max(after, 1e-20));

    /* smooth the gains across neighbouring bins: a gain that jumps bin to bin
     * is what makes denoised audio sound metallic. Only across frequency, never
     * across time — averaging with a loud neighbouring frame would hand the
     * gap between two notes back the gain of the note, and the gap is exactly
     * where the hiss has to go. */
    const Gs = new Array(frames);
    for (let t = 0; t < frames; t++) {
      const c = G[t];
      const out = new Float32Array(bins);
      for (let b = 0; b < bins; b++) {
        const lo = c[Math.max(0, b - 1)], hi = c[Math.min(bins - 1, b + 1)];
        out[b] = (lo + 2 * c[b] + hi) / 4;
      }
      Gs[t] = out;
    }

    /* ---- 4. synthesis: inverse FFT of each filtered frame, overlap-add with
     * the synthesis window, then divide out the summed window energy */
    const outBuf = new Float64Array(padded.length);
    const wsum = new Float64Array(padded.length);
    for (let t = 0; t < frames; t++) {
      const g = Gs[t];
      for (let b = 0; b < N; b++) {
        const k = b <= half ? b : N - b;          /* mirror the spectrum so the output is real */
        const gain = g[k];
        re[b] = RE[t][b] * gain;
        im[b] = -IM[t][b] * gain;                 /* conjugate: inverse via forward FFT */
      }
      fft(re, im);
      const off = t * HOP;
      for (let i = 0; i < N; i++) {
        const idx = off + i;
        if (idx >= outBuf.length) break;
        outBuf[idx] += (re[i] / N) * win[i];
        wsum[idx] += win[i] * win[i];
      }
    }
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const idx = i + N;
      const w = wsum[idx];
      out[i] = w > 1e-9 ? outBuf[idx] / w : 0;
    }
    info.applied = true;
    return { samples: out, info: info };
  }

  /* Tail/head noise measure, so callers can say what the room sounded like. */
  function rmsDb(samples) {
    if (!samples || !samples.length) return -Infinity;
    let s = 0;
    for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i];
    return 10 * Math.log10(s / samples.length + 1e-20);
  }

  const api = { denoise: denoise, rmsDb: rmsDb, FRAME: N, HOP: HOP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  const root = typeof window !== 'undefined' ? window
    : typeof globalThis !== 'undefined' ? globalThis : self;
  root.TT = root.TT || {};
  root.TT.denoise = api;
})();
