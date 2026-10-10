/* Trill Tuner — HT-Demucs separation core (model-agnostic maths).
 *
 * A classic-script port of the signal path of demucs-web (MIT, © timcsy,
 * https://github.com/timcsy/demucs-web). It turns a stereo song into the two
 * tensors the htdemucs ONNX graph wants, and turns the graph's outputs back into
 * four stereo stems: drums, bass, other, vocals.
 *
 *   waveform  [1, 2, 343980]          the raw segment, 7.8 s at 44.1 kHz
 *   magSpec   [1, 4, 2048, 336]       its STFT (L re, L im, R re, R im)
 *   → freq    [1, 4, 4, 2048, 336]    a complex mask per stem, and
 *   → time    [1, 4, 2, 343980]       a time-domain residual per stem
 *
 * Nothing here knows about ONNX Runtime: separateStereo takes a `run` function,
 * so the same code is exercised by the unit tests with a stand-in model and by
 * the page with the real one (lib/htdemucs-core.js + htdemucs.js).
 *
 * Changes from the upstream port: the segment crossfade is a complementary
 * linear ramp (the upstream window is zero on the first sample and its ramps do
 * not sum to one), and the resampler to and from 44.1 kHz is windowed-sinc.
 */
(function () {
  'use strict';

  const SAMPLE_RATE = 44100;
  const FFT_SIZE = 4096;
  const HOP_SIZE = 1024;
  const TRAINING_SAMPLES = 343980;
  const SPEC_BINS = 2048;
  const SPEC_FRAMES = 336;
  const SEGMENT_OVERLAP = 0.25;
  const TRACKS = ['drums', 'bass', 'other', 'vocals'];

  /* ---------- FFT (radix-2, as upstream) ---------------------------------- */

  const twiddleCache = new Map(), hannCache = new Map();

  function twiddles(n, sign) {
    const key = n * sign;
    if (twiddleCache.has(key)) return twiddleCache.get(key);
    const re = new Float64Array(n / 2), im = new Float64Array(n / 2);
    for (let k = 0; k < n / 2; k++) {
      const a = sign * 2 * Math.PI * k / n;
      re[k] = Math.cos(a); im[k] = Math.sin(a);
    }
    const t = { re: re, im: im };
    twiddleCache.set(key, t);
    return t;
  }

  function hann(n) {
    if (hannCache.has(n)) return hannCache.get(n);
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / n));
    hannCache.set(n, w);
    return w;
  }

  function bitReverse(x, bits) {
    let r = 0;
    for (let i = 0; i < bits; i++) { r = (r << 1) | (x & 1); x >>= 1; }
    return r;
  }

  /* in-place-ish transform of (re, im) of length n; sign -1 forward, +1 inverse */
  function transform(re, im, n, sign) {
    const bits = Math.log2(n) | 0;
    const tw = twiddles(n, sign);
    const r = new Float64Array(n), q = new Float64Array(n);
    for (let i = 0; i < n; i++) { const j = bitReverse(i, bits); r[i] = re[j]; q[i] = im[j]; }
    for (let size = 2; size <= n; size *= 2) {
      const half = size / 2, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < half; j++) {
          const k = j * step, tr = tw.re[k], ti = tw.im[k];
          const a = i + j, b = a + half;
          const or = r[b] * tr - q[b] * ti, oi = r[b] * ti + q[b] * tr;
          const er = r[a], ei = q[a];
          r[a] = er + or; q[a] = ei + oi;
          r[b] = er - or; q[b] = ei - oi;
        }
      }
    }
    return { re: r, im: q };
  }

  /* STFT with upstream scaling: 1/sqrt(N) forward, sqrt(N) on the way back. */
  function stft(signal, fftSize, hop) {
    const frames = Math.floor((signal.length - fftSize) / hop) + 1;
    const bins = fftSize / 2 + 1;
    const w = hann(fftSize);
    const scale = 1 / Math.sqrt(fftSize);
    const re = new Float32Array(frames * bins), im = new Float32Array(frames * bins);
    const frame = new Float64Array(fftSize), zero = new Float64Array(fftSize);
    for (let f = 0; f < frames; f++) {
      const s = f * hop;
      for (let i = 0; i < fftSize; i++) frame[i] = signal[s + i] * w[i];
      const X = transform(frame, zero, fftSize, -1);
      for (let k = 0; k < bins; k++) {
        re[f * bins + k] = X.re[k] * scale;
        im[f * bins + k] = X.im[k] * scale;
      }
    }
    return { real: re, imag: im, numFrames: frames, numBins: bins };
  }

  function istft(specRe, specIm, frames, bins, fftSize, hop, length) {
    const outLen = length || (frames - 1) * hop + fftSize;
    const out = new Float64Array(outLen), wsum = new Float64Array(outLen);
    const w = hann(fftSize);
    const scale = Math.sqrt(fftSize);
    const fr = new Float64Array(fftSize), fi = new Float64Array(fftSize);
    for (let f = 0; f < frames; f++) {
      fr.fill(0); fi.fill(0);
      for (let k = 0; k < bins; k++) {
        fr[k] = specRe[f * bins + k];
        fi[k] = specIm[f * bins + k];
      }
      for (let k = 1; k < bins - 1; k++) {
        fr[fftSize - k] = fr[k];
        fi[fftSize - k] = -fi[k];
      }
      const X = transform(fr, fi, fftSize, +1);
      const s = f * hop;
      for (let i = 0; i < fftSize && s + i < outLen; i++) {
        out[s + i] += (X.re[i] / fftSize) * w[i] * scale;
        wsum[s + i] += w[i] * w[i];
      }
    }
    const res = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) if (wsum[i] > 1e-8) res[i] = out[i] / wsum[i];
    return res;
  }

  function reflectPad(signal, padLeft, padRight) {
    const n = signal.length;
    const out = new Float32Array(padLeft + n + padRight);
    for (let i = 0; i < padLeft; i++) out[i] = signal[Math.min(padLeft - i, n - 1)];
    out.set(signal, padLeft);
    for (let i = 0; i < padRight; i++) out[padLeft + n + i] = signal[Math.max(0, n - 2 - i)];
    return out;
  }

  /* ---------- the model's own spectrogram conventions ---------------------- */

  /* Frequency output → one complex spectrogram per stem. The graph lays out
   * [track][channel L re, L im, R re, R im][bin][frame]. */
  function standaloneMask(freq) {
    const per = SPEC_BINS * SPEC_FRAMES;
    const out = [];
    for (let t = 0; t < 4; t++) {
      const base = t * 4 * per;
      const s = { leftReal: new Float32Array(per), leftImag: new Float32Array(per),
        rightReal: new Float32Array(per), rightImag: new Float32Array(per) };
      for (let i = 0; i < per; i++) {
        s.leftReal[i] = freq[base + 0 * per + i];
        s.leftImag[i] = freq[base + 1 * per + i];
        s.rightReal[i] = freq[base + 2 * per + i];
        s.rightImag[i] = freq[base + 3 * per + i];
      }
      out.push(s);
    }
    return out;
  }

  /* One stem's complex spectrogram back to time, aligned to the segment. */
  function standaloneIspec(spec, targetLength) {
    const paddedBins = SPEC_BINS + 1;
    const paddedFrames = SPEC_FRAMES + 4;
    const pad = (re, im) => {
      const pr = new Float32Array(paddedFrames * paddedBins), pi = new Float32Array(paddedFrames * paddedBins);
      for (let f = 0; f < SPEC_FRAMES; f++) {
        for (let b = 0; b < SPEC_BINS; b++) {
          const src = b * SPEC_FRAMES + f, dst = (f + 2) * paddedBins + b;
          pr[dst] = re[src]; pi[dst] = im[src];
        }
      }
      return { re: pr, im: pi };
    };
    const L = pad(spec.leftReal, spec.leftImag), R = pad(spec.rightReal, spec.rightImag);
    const istftLen = (paddedFrames - 1) * HOP_SIZE + FFT_SIZE;
    const lo = istft(L.re, L.im, paddedFrames, paddedBins, FFT_SIZE, HOP_SIZE, istftLen);
    const ro = istft(R.re, R.im, paddedFrames, paddedBins, FFT_SIZE, HOP_SIZE, istftLen);
    const off = FFT_SIZE / 2 + Math.floor(HOP_SIZE / 2) * 3;
    return {
      left: new Float32Array(lo.subarray(off, off + targetLength)),
      right: new Float32Array(ro.subarray(off, off + targetLength))
    };
  }

  /* One segment of stereo audio (already TRAINING_SAMPLES long) → model inputs. */
  function prepareModelInput(left, right) {
    const len = TRAINING_SAMPLES;
    const pl = new Float32Array(len), pr = new Float32Array(len);
    pl.set(left.subarray(0, Math.min(left.length, len)));
    pr.set(right.subarray(0, Math.min(right.length, len)));
    const le = Math.ceil(len / HOP_SIZE);
    const pad = Math.floor(HOP_SIZE / 2) * 3;
    const padRight = pad + le * HOP_SIZE - len;
    const sl = reflectPad(pl, pad, padRight), sr = reflectPad(pr, pad, padRight);
    const c = FFT_SIZE / 2;
    const cl = reflectPad(sl, c, c), cr = reflectPad(sr, c, c);
    const stL = stft(cl, FFT_SIZE, HOP_SIZE), stR = stft(cr, FFT_SIZE, HOP_SIZE);
    const per = SPEC_BINS * SPEC_FRAMES;
    const mag = new Float32Array(4 * per);
    for (let f = 0; f < SPEC_FRAMES; f++) {
      const sf = f + 2;
      for (let b = 0; b < SPEC_BINS; b++) {
        const src = sf * stL.numBins + b, dst = b * SPEC_FRAMES + f;
        mag[0 * per + dst] = stL.real[src];
        mag[1 * per + dst] = stL.imag[src];
        mag[2 * per + dst] = stR.real[src];
        mag[3 * per + dst] = stR.imag[src];
      }
    }
    const wave = new Float32Array(2 * len);
    wave.set(pl, 0); wave.set(pr, len);
    return { waveform: wave, magSpec: mag };
  }

  /* ---------- resampling to and from the model's 44.1 kHz ------------------ */

  function resample(x, from, to) {
    if (!x || !x.length || from === to) return x ? new Float32Array(x) : new Float32Array(0);
    const ratio = to / from;
    const outLen = Math.max(1, Math.round(x.length * ratio));
    const out = new Float32Array(outLen);
    const cutoff = Math.min(1, ratio) * 0.95;      /* anti-alias when going down */
    const half = 16;                               /* 32-tap windowed sinc */
    for (let i = 0; i < outLen; i++) {
      const pos = i / ratio;
      const c0 = Math.floor(pos);
      let acc = 0, wsum = 0;
      for (let k = c0 - half + 1; k <= c0 + half; k++) {
        if (k < 0 || k >= x.length) continue;
        const d = pos - k;
        const sinc = d === 0 ? cutoff : Math.sin(Math.PI * cutoff * d) / (Math.PI * d);
        const wn = 0.5 + 0.5 * Math.cos(Math.PI * d / (half + 1));
        const w = sinc * wn;
        acc += x[k] * w; wsum += w;
      }
      out[i] = wsum !== 0 ? acc * (1 / wsum) : 0;
    }
    return out;
  }

  /* ---------- the whole song -------------------------------------------- */

  /* run(waveform, magSpec) must resolve to { freq, time, freqDims, timeDims }
   * for one segment. Returns four stems, each { left, right } at 44.1 kHz, and
   * the same length as the input. */
  async function separateStereo(left, right, run, opts) {
    opts = opts || {};
    const total = left.length;
    const stride = Math.floor(TRAINING_SAMPLES * (1 - SEGMENT_OVERLAP));
    const overlap = TRAINING_SAMPLES - stride;
    const outs = TRACKS.map(() => ({ left: new Float32Array(total), right: new Float32Array(total) }));
    const weights = new Float64Array(total);
    const starts = [];
    for (let s = 0; s < total; s += stride) starts.push(s);
    if (!starts.length) starts.push(0);
    const seg = TRAINING_SAMPLES;
    const ramp = new Float32Array(seg);
    for (let i = 0; i < seg; i++) {
      ramp[i] = Math.min(1, (i + 1) / overlap, (seg - i) / overlap);
    }

    for (let k = 0; k < starts.length; k++) {
      if (opts.shouldAbort && opts.shouldAbort()) { const e = new Error('separation stopped'); e.aborted = true; throw e; }
      const start = starts[k];
      const len = Math.min(seg, total - start);
      const sl = new Float32Array(seg), sr = new Float32Array(seg);
      sl.set(left.subarray(start, start + len));
      sr.set(right.subarray(start, start + len));
      const inp = prepareModelInput(sl, sr);
      const res = await run(inp.waveform, inp.magSpec);

      /* the time output: 4 tracks × 2 channels × samples */
      const tDims = res.timeDims, tData = res.time;
      const samples = tDims[3];
      const freqStems = standaloneMask(res.freq);
      for (let t = 0; t < 4; t++) {
        const ispec = standaloneIspec(freqStems[t], seg);
        const o = outs[t];
        for (let i = 0; i < len; i++) {
          const w = ramp[i];
          const tl = tData[t * 2 * samples + 0 * samples + i];
          const trr = tData[t * 2 * samples + 1 * samples + i];
          o.left[start + i] += (tl + ispec.left[i]) * w;
          o.right[start + i] += (trr + ispec.right[i]) * w;
        }
      }
      for (let i = 0; i < len; i++) weights[start + i] += ramp[i];
      if (opts.onProgress) opts.onProgress((k + 1) / starts.length);
      /* give the page a turn between segments: the graph call is the long part */
      await new Promise(r => setTimeout(r, 0));
    }

    for (let t = 0; t < 4; t++) {
      const o = outs[t];
      for (let i = 0; i < total; i++) {
        const w = weights[i];
        if (w > 0) { o.left[i] /= w; o.right[i] /= w; }
      }
    }
    return { drums: outs[0], bass: outs[1], other: outs[2], vocals: outs[3] };
  }

  const api = {
    SAMPLE_RATE: SAMPLE_RATE, FFT_SIZE: FFT_SIZE, HOP_SIZE: HOP_SIZE,
    TRAINING_SAMPLES: TRAINING_SAMPLES, SPEC_BINS: SPEC_BINS, SPEC_FRAMES: SPEC_FRAMES,
    TRACKS: TRACKS,
    stft: stft, istft: istft, reflectPad: reflectPad,
    standaloneMask: standaloneMask, standaloneIspec: standaloneIspec,
    prepareModelInput: prepareModelInput, resample: resample,
    separateStereo: separateStereo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  const root = typeof window !== 'undefined' ? window
    : typeof globalThis !== 'undefined' ? globalThis : self;
  root.TT = root.TT || {};
  root.TT.htdemucsCore = api;
})();
