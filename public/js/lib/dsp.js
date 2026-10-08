/* Trill Tuner — the offline audio lab: everything here works on raw PCM
 * Float32Arrays, so it runs in the browser (Web Audio gives us the samples) and
 * in node (the test suite feeds it synthesised chords).
 *
 *   · STFT / inverse STFT with a Hann window and 75 % overlap
 *   · harmonic/percussive separation (median-filter HPSS)
 *   · stereo centre extraction (mid/side "centre-ness" per bin)
 *   · instrument profiles → soft spectral masks (stem separation)
 *   · chroma, key detection (Krumhansl profiles), chord recognition, tempo
 *   · 16-bit WAV encoding for downloads
 *
 * No models, no network: this is signal processing, from scratch.
 */
(function (root) {
  'use strict';

  /* Works in the page, in node and inside a Web Worker: `window` does not exist
   * in a worker, so the global object is resolved explicitly. */
  const GLOBAL = typeof window !== 'undefined' ? window
    : typeof globalThis !== 'undefined' ? globalThis : self;
  const FFT = (typeof require === 'function' && typeof window === 'undefined')
    ? require('./fft.js')
    : GLOBAL.TT.fft;

  const EPS = 1e-12;

  /* =================================================================== */
  /* helpers                                                              */
  /* =================================================================== */
  function hann(n) {
    const w = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
    return w;
  }
  function median(arr) {
    const a = arr.slice().sort((x, y) => x - y);
    const m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function mixdown(channels) {
    const n = channels[0].length;
    const out = new Float32Array(n);
    for (let c = 0; c < channels.length; c++) {
      const ch = channels[c];
      for (let i = 0; i < n; i++) out[i] += ch[i];
    }
    const inv = 1 / channels.length;
    for (let i = 0; i < n; i++) out[i] *= inv;
    return out;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smoothstep(x, lo, hi) {
    const t = clamp01((x - lo) / (hi - lo || 1));
    return t * t * (3 - 2 * t);
  }

  /* =================================================================== */
  /* STFT / iSTFT                                                         */
  /* =================================================================== */
  /* One windowed frame → {re, im} of length n/2+1 (analysed frequencies).
   * The caller owns the arrays so the streaming loop can reuse them. */
  function frameFFT(data, offset, n, win) {
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const s = offset + i;
      re[i] = (s >= 0 && s < data.length ? data[s] : 0) * win[i];
    }
    FFT.fft(re, im);
    return { re: re, im: im };
  }

  /* =================================================================== */
  /* instrument profiles for the stem lab                                  */
  /* =================================================================== */
  /* Each profile scores a time-frequency bin for "how much of this instrument
   * is here":
   *   band   [lo, hi]  Hz        — where the instrument lives (30 Hz skirts)
   *   tonal  0..1                — 1 = pitched/sustained, 0 = bang/percussive
   *   perc   0..1                — 1 = transients only
   *   centre -1..1               — +1 centre of the mix, -1 wide/side pairs
   * `remove` inverts the resulting mask.                                        */
  const PROFILES = {
    vocals: { name: 'Lead & backing vocals', band: [110, 9000], tonal: 0.62, perc: 0.05, centre: 0.85, fftSize: 4096,
      note: 'Vocals sit in the middle of the mix, are pitched and mostly not percussive. Measured on a centred voice over a wide double-tracked guitar: −26 dB on the voice with the guitar about −3 dB, and the finer 4096 analysis is what buys that. For a perfectly centred lead, the classic phase-cancel recipe is stronger still.' },
    bass: { name: 'Bass guitar', band: [30, 280], tonal: 0.9, perc: 0.05, centre: 0.55,
      note: 'Bass is pitched and low; a kick drum shares the band but is percussive, so it survives.' },
    drums: { name: 'Drums & percussion', band: [35, 14000], tonal: 0.0, perc: 1.0, centre: 0.2,
      note: 'Drums are the transients: the percussive mask pulls them out and leaves the pitched parts.' },
    kick: { name: 'Kick drum', band: [35, 160], tonal: 0.0, perc: 1.0, centre: 0.6, note: 'Low + percussive.' },
    snare: { name: 'Snare drum', band: [150, 6000], tonal: 0.0, perc: 1.0, centre: 0.25, note: 'Wide + percussive.' },
    hats: { name: 'Hi-hats & cymbals', band: [5000, 16000], tonal: 0.0, perc: 1.0, centre: 0.0, note: 'Pure top-end transients.' },
    'electric-guitar': { name: 'Electric guitar', band: [80, 6500], tonal: 0.72, perc: 0.03, centre: 0.1,
      note: 'Distorted guitars are sustained and usually doubled wide — centre-panned clean parts are harder.' },
    'acoustic-guitar': { name: 'Acoustic guitar', band: [150, 5600], tonal: 0.2, perc: 0.06, centre: 0, pluck: 0.95, spread: true, widen: 2, fftSize: 4096,
      note: 'The discriminator is the decay: a plucked chord rises and dies away while a distorted electric holds its note, so the mask follows the envelope and excludes transients — which is what keeps the drums. Audio carries no label, so a heavily compressed or heavily effected acoustic can fool it: use Isolate to hear what it found.' },
    keys: { name: 'Piano & keyboards', band: [90, 4200], tonal: 0.8, perc: 0.08, centre: 0.25, note: 'Pitched, wide and fairly smooth.' },
    strings: { name: 'Strings & pads', band: [150, 3500], tonal: 0.95, perc: 0.0, centre: -0.15, note: 'Very sustained and often wide.' },
    synth: { name: 'Synths & leads', band: [120, 8000], tonal: 0.7, perc: 0.1, centre: 0.0, note: 'Pitched with a steady timbre.' },
    guitar: { name: 'All guitars (acoustic + electric)', band: [80, 6500], tonal: 0.78, perc: 0.05, centre: 0.15, note: 'Both guitar families at once.' }
  };

  function bandMask(freq, lo, hi) {
    /* raised-cosine skirts so we never get a hard notch */
    const skirt = Math.max(30, hi * 0.15);
    if (freq < lo - skirt || freq > hi + skirt) return 0;
    if (freq >= lo && freq <= hi) return 1;
    if (freq < lo) {
      const t = (freq - (lo - skirt)) / skirt;
      return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
    }
    const t = ((hi + skirt) - freq) / skirt;
    return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
  }

  /* =================================================================== */
  /* stem separation                                                      */
  /* =================================================================== */
  /* modes:
   *   'classic-karaoke'   — pure L−R centre cancellation (instant, mono)
   *   'classic-keep-bass' — L−R but the low band stays mono (keeps the bass)
   *   a PROFILES key      — with opts.remove true (take it out) or false (keep only it)
   *
   * Returns { channels: [Float32Array…], sr, mode, info, remove }.
   * onProgress(fraction) is called as work proceeds.                           */
  function separate(channels, sr, mode, opts) {
    opts = opts || {};
    const amount = opts.amount == null ? 0.9 : clamp01(opts.amount);
    const profHint = PROFILES[mode] && PROFILES[mode].fftSize;
    const fftSize = opts.fftSize || profHint || 2048;
    const hop = opts.hop || (fftSize >> 2);
    const nCh = channels.length;
    const n = channels[0].length;
    const remove = !!opts.remove;
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    const win = hann(fftSize);
    const bins = (fftSize >> 1) + 1;

    /* ---- classic mid/side cancellation (no STFT needed) ---- */
    if (mode === 'classic-karaoke' || mode === 'classic-keep-bass') {
      const out = [new Float32Array(n)];
      const mono = mixdown(channels);
      if (mode === 'classic-karaoke' || nCh < 2) {
        const L = channels[0], R = channels[1];
        for (let i = 0; i < n; i++) out[0][i] = (L ? L[i] : mono[i]) - (R ? R[i] : 0);
      } else {
        /* cancel the centre but keep the mono low end so the song still has bass */
        const keep = clamp01(opts.keepBass == null ? 0.85 : opts.keepBass);
        const L = channels[0], R = channels[1];
        const fc = 200 / sr, a = Math.exp(-2 * Math.PI * fc);
        let lp = 0;
        for (let i = 0; i < n; i++) {
          lp = mono[i] * (1 - a) + lp * a;
          out[0][i] = (L[i] - R[i]) + lp * keep;
        }
      }
      if (onProgress) onProgress(1);
      return { channels: out, sr: sr, mode: mode, info: 'classic centre-cancel', remove: true, amount: amount };
    }

    const prof = PROFILES[mode] || PROFILES.vocals;
    const freqs = new Float32Array(bins);
    for (let b = 0; b < bins; b++) freqs[b] = b * sr / fftSize;
    const band = new Float32Array(bins);
    for (let b = 0; b < bins; b++) band[b] = prof.band ? bandMask(freqs[b], prof.band[0], prof.band[1]) : 1;

    const HALO = 4;                                  /* ±4 frames of context */
    const ENV = 2;                                   /* envelope measured over ±2 bins */
    const WIN = HALO * 2 + 1;
    /* Pad the analysis with one window of silence at each end. Without it the
     * first and last few milliseconds of a file have an *incomplete* window
     * schedule: the overlap-add divisor there is a fraction of its interior
     * value while the mask-modified frame content is not — dividing one by the
     * other turns the edge into a full-scale bang (and clips the WAV export).
     * One window of pad gives every real sample exactly the overlap the middle
     * of the song has, so the reconstruction is smooth and correct at both
     * ends, and the mask sees the same ±4 frames of context it always got. */
    const PAD = fftSize;
    const padFrames = Math.ceil(PAD / hop);
    const outLen = n + 2 * PAD;
    const outCh = [];
    for (let c = 0; c < nCh; c++) outCh.push(new Float32Array(outLen));
    const wsum = new Float32Array(outLen);
    const nFrames = Math.max(1, Math.ceil(n / hop) + 1);   /* +1 so the tail is fully covered */
    const totalFrames = nFrames + 2 * padFrames;
    const ring = [];                                 /* analysis frames, newest last */

    /* one windowed frame, full complex spectrum + half-spectrum magnitude */
    function analyse(k) {
      const off = k * hop;
      const L = frameFFT(channels[0], off, fftSize, win);
      const R = nCh > 1 ? frameFFT(channels[1], off, fftSize, win) : null;
      const mag = new Float32Array(bins);
      for (let b = 0; b < bins; b++) {
        const re = R ? (L.re[b] + R.re[b]) * 0.5 : L.re[b];
        const im = R ? (L.im[b] + R.im[b]) * 0.5 : L.im[b];
        mag[b] = Math.hypot(re, im);
      }
      return { k: k, off: off, L: L, R: R, mag: mag };
    }

    /* Per-bin gains for one frame, using the neighbouring frames in `ringAt`.
     *
     * Two features, deliberately measured on different things so that a drum hit
     * cannot open the notch on a held vocal:
     *   · the *harmonic* spectrogram Hs (time median over ±4 frames) gives a
     *     stable "is there a sustained note in this bin" answer. A transient in
     *     the middle of a held note cannot fool a time median.
     *   · the *current* frame gives the "is this bin a bang right now" answer
     *     used by the percussive profiles.
     * Stereo coherence then decides whether that sustained note is in the
     * middle of the mix (vocals, bass, kick) or spread wide (guitars, cymbals).  */
    function gainFor(an, ringAt) {
      const raw = new Float32Array(bins);          /* this frame's magnitude */
      const Hs = new Float32Array(bins);           /* time median → harmonic  */
      /* how much this bin moves over the ring (a plucked string rises and then
       * decays; a held note does not), and how peaky it is against its own
       * neighbours (a harmonic of a string is a peak; a snare is a plateau) */
      const mod = new Float32Array(bins);   /* (peak − trough) / peak, 0 = steady */
      const tbuf = new Float64Array(ringAt.length);
      for (let b = 0; b < bins; b++) {
        raw[b] = an.mag[b];
        let mx = 0, mn = Infinity;
        for (let i = 0; i < ringAt.length; i++) {
          const v = ringAt[i].mag[b];
          tbuf[i] = v;
          if (v > mx) mx = v;
          if (v < mn) mn = v;
        }
        Hs[b] = median(tbuf);
      }
      /* The flattest, most honest envelope measure available: how much energy the
       * *neighbourhood* of this bin loses across the window, relative to its own
       * peak. Using the neighbourhood instead of the single bin is what makes it
       * robust to pitch modulation: vibrato, a whammy dip or a chorus moves
       * energy between neighbouring bins without removing any of it, so a
       * vibratoed electric reads as steady, while a plucked string — whose whole
       * harmonic neighbourhood decays — does not. */
      for (let b = 0; b < bins; b++) {
        let mx = 0, mn = Infinity;
        for (let i = 0; i < ringAt.length; i++) {
          const mag = ringAt[i].mag;
          let sum = 0;
          for (let j = Math.max(0, b - ENV); j <= Math.min(bins - 1, b + ENV); j++) sum += mag[j];
          if (sum > mx) mx = sum;
          if (sum < mn) mn = sum;
        }
        mod[b] = (mx - mn) / (mx + EPS);
      }
      const fbuf = new Float64Array(WIN);
      /* A robust spectral floor: the 25th percentile of the *time-median*
       * (stationary) spectrum. Bins at or below it are hiss, leakage and room
       * noise and must be left alone. Two things matter here:
       *   · a percentile, not the peak — percussive content spreads thinly over
       *     hundreds of bins, so anything peak-relative would erase the drums
       *     instead of the vocal;
       *   · the time median, not the current frame — during a drum hit most
       *     bins ARE the hit, and a per-frame floor would gate away the very
       *     thing we are looking for. */
      const sample = [];
      for (let b = 1; b < bins; b += 3) sample.push(Hs[b]);
      sample.sort((x, y) => x - y);
      const floorMag = sample[Math.floor(sample.length * 0.25)] || 1e-9;
      const g = new Float32Array(bins);
      for (let b = 0; b < bins; b++) {
        const lo = Math.max(0, b - HALO), hi = Math.min(bins - 1, b + HALO);
        let fn = 0;
        for (let j = lo; j <= hi; j++) fbuf[fn++] = Hs[j];          /* broadband over the harmonic field */
        const PH = median(fbuf.subarray(0, fn));
        fn = 0;
        for (let j = lo; j <= hi; j++) fbuf[fn++] = raw[j];
        const PR = median(fbuf.subarray(0, fn));                    /* broadband in this one frame */
        const h2 = Hs[b] * Hs[b], ph2 = PH * PH, pr2 = PR * PR, r2 = raw[b] * raw[b];
        const tonalScore = smoothstep(h2 / (h2 + ph2 + EPS), 0.55, 0.85);   /* a steady note lives here */
        /* The time median answers “is there a *sustained* note here”, which is the
         * right question for telling a held vocal from a drum hit — but it is a
         * median, so it can only rise once the note has been sounding for a few
         * frames, and the first ~100 ms of every word would come through untouched
         * (removing) or ramp up from nothing (isolating). The current frame is
         * asked the same question about its own neighbourhood, so a word opens the
         * mask on its first frame; a drum hit cannot fake it, because a hit is
         * broadband and its neighbourhood median rises with it. */
        const tonalNow = smoothstep(r2 / (r2 + pr2 + EPS), 0.55, 0.85);
        const tonalAny = tonalNow > tonalScore ? tonalNow : tonalScore;
        /* a transient is much louder than its own time median */
        const transient = smoothstep(raw[b] / (Hs[b] + EPS), 1.35, 3.2);
        const percScore = smoothstep(pr2 / (pr2 + h2 + EPS), 0.5, 0.8) * transient;
        /* the plucked-string signature: a narrow harmonic peak that rises and
         * decays — which is how a strummed acoustic differs from a held,
         * distorted electric (peaky but steady) and from a snare (moving but
         * broadband). Only profiles that ask for it pay for it. */
        const pluckScore = prof.pluck
          ? smoothstep(mod[b], 0.12, 0.42) * (1 - percScore)
          : 0;
        let score = band[b];
        /* Removing needs the *instant* answer — the notch has to be shut on the
         * first frame of a word or the word leaks through. Isolating keeps the
         * median answer: there, an instant “is this tonal right now” reading
         * would also open the island for every held note underneath, which is
         * how a plucked acoustic loses to a sustained electric. The running gain
         * below is what keeps an isolated voice from being faded. */
        /* Removing needs the *instant* answer — the notch has to be shut on the
         * first frame of a word or the word leaks through. Isolating wants it
         * too, so the island is open before the word arrives rather than a few
         * frames after it. The pluck profile is the exception: there the instant
         * reading would also open the island for every held note underneath,
         * which is how a plucked acoustic loses to a sustained electric. */
        const useFast = remove || !prof.pluck;
        if (prof.tonal) score *= (1 - prof.tonal) + prof.tonal * (useFast ? tonalAny : tonalScore);
        if (prof.perc) score *= (1 - prof.perc) + prof.perc * percScore;
        if (prof.pluck) {
          /* removing: the pluck signature is what qualifies a bin for the chop.
           * isolating: it is a bonus, because a strummed chord also has plenty
           * of steady harmonic energy we do not want to throw away. */
          score = remove ? score * ((1 - prof.pluck) + prof.pluck * pluckScore)
                         : clamp01(score + (1 - score) * prof.pluck * pluckScore * 0.9);
        }
        if ((prof.centre || prof.spread) && an.R) {
          /* stereo coherence: 1 = identical in both ears (centre), 0.5 = unrelated,
           * 0 = polarity-inverted (pure side / out-of-phase) */
          const lr = an.L.re[b] * an.R.re[b] + an.L.im[b] * an.R.im[b];
          const ll = an.L.re[b] * an.L.re[b] + an.L.im[b] * an.L.im[b];
          const rr = an.R.re[b] * an.R.re[b] + an.R.im[b] * an.R.im[b];
          const c = (2 * lr / (ll + rr + EPS) + 1) / 2;
          if (prof.centre) {
            const w = Math.min(1, Math.abs(prof.centre));
            const want = prof.centre > 0 ? smoothstep(c, 0.52, 0.90) : smoothstep(1 - c, 0.52, 0.90);
            score *= (1 - w) + w * want;
          }
          /* `spread` asks for the opposite: a part that is not in the middle.
           * A doubled acoustic sits wide (often polarity-inverted, which no
           * amount of EQ can hide); a centred electric does not. The floor
           * keeps a mono acoustic usable. */
          if (prof.spread) {
            const side = smoothstep(1 - 2 * Math.abs(c - 0.5), 0.10, 0.45);
            score *= 0.72 + 0.28 * side;
          }
        }
        /* Only touch bins that actually carry energy — without this every silent
         * bin is "50 % tonal" and the whole file just gets quieter. The current
         * frame counts, otherwise nothing percussive could ever be targeted. */
        score *= smoothstep(Math.max(raw[b], Hs[b]) / (floorMag * 2.5 + 1e-12), 0.5, 1.5);
        if (remove) {
          g[b] = clamp01(1 - amount * score);
        } else if (prof.pluck) {
          g[b] = clamp01(score + (1 - amount) * 0.12);
        } else {
          /* Isolating: a soft score *is* a fade — it multiplies the voice by
           * its own confidence. Once we are more sure than not that this bin
           * is the target, pass the original through at full level so the
           * voice keeps its own envelope (a sung note with vibrato went from
           * −3.2 dB ±2.5 to −0.1 dB ±1.4). Below that we still blend, so the
           * edges do not click. The pluck profile keeps the soft score: its
           * discriminator is the envelope shape. */
          const open = clamp01(score + (1 - amount) * 0.12);
          g[b] = open >= 0.45 ? 1 : open / 0.45;
        }
      }
      /* Widen the region instead of smoothing it. A real tone splatters into its
       * neighbours (the window's main lobe is three bins wide), so a one-bin notch
       * barely notches, and weighted averaging would drag a narrow high-Q target
       * halfway back to zero. Removing → the minimum of the neighbourhood (a
       * wider, deeper notch); isolating → the maximum (a wider island).          */
      /* How far a notch/island spreads. A tone splatters over roughly its
       * window's main lobe (three bins at 2048/4), so widening is what makes a
       * notch actually notch — but widening also eats the neighbours, so a
       * profile that has to remove one plucked part out of a dense mix asks for
       * a narrower spread (`widen`). Isolating does not get a wider island than
       * this: extra spread lets accompaniment through, which reads as the voice
       * being over-loud (and “fading” as the leak comes and goes). */
      const D = prof.widen == null ? 2 : prof.widen;
      const out = new Float32Array(bins);
      for (let b = 0; b < bins; b++) {
        let v = g[b];
        for (let j = -D; j <= D; j++) {
          const i = Math.max(0, Math.min(bins - 1, b + j));
          v = remove ? Math.min(v, g[i]) : Math.max(v, g[i]);
        }
        out[b] = v;
      }
      out[0] = out[1];
      out[bins - 1] = out[bins - 2];
      return out;
    }

    /* scaled inverse transform, overlap-added into the output buffers */
    function synthesize(an, gain) {
      const scratch = new Float64Array(fftSize);
      for (let ch = 0; ch < nCh; ch++) {
        const S = ch === 0 ? an.L : an.R || an.L;
        const re = new Float64Array(fftSize);
        const half = fftSize >> 1;
        for (let i = 0; i < fftSize; i++) {
          const b = i <= half ? i : fftSize - i;              /* mirror for the upper half */
          const g = gain[b];
          re[i] = S.re[i] * g;
          scratch[i] = -S.im[i] * g;                          /* conjugate → inverse FFT */
        }
        FFT.fft(re, scratch);
        const dst = outCh[ch];
        for (let i = 0; i < fftSize; i++) {
          const idx = an.off + PAD + i;              /* PAD keeps indices positive */
          if (idx >= outLen) break;
          if (idx < 0) continue;
          dst[idx] += re[i] / fftSize * win[i];
          if (ch === 0) wsum[idx] += win[i] * win[i];
        }
      }
    }

    /* The mask is applied as a running level, not frame by frame.
     *
     * Every per-frame score above is a *soft* decision, so applying it raw
     * multiplies the voice by its own slowly varying confidence: words ramp in
     * (isolating) and the first ~100 ms of every word leaks through the notch
     * (removing) — the mask, not the music, ends up shaping the vocal envelope.
     *
     * So the applied gain moves asymmetrically: it snaps in the direction that
     * *protects* the target (the notch deepens, the island opens) on the very
     * frame the note appears, and relaxes back over ~40 ms (isolate) / ~110 ms
     * (remove) once the note stops. The voice keeps its own attack, and the
     * accompaniment is still left alone between phrases. */
    const prevGain = new Float32Array(bins);
    let havePrev = false;
    let releaseCoef = 0;
    /* The acoustic profile is the exception, and deliberately so: its whole
     * discriminator is the *shape* of the envelope (a pluck rises and dies), so
     * holding gains open across frames would smooth away the feature it is
     * measuring. Sustained-content profiles get the running gain. */
    const runGain = !prof.pluck;
    function decide(an, ringAt) {
      const g = gainFor(an, ringAt);
      if (!havePrev) {
        prevGain.set(g);
        havePrev = true;
        releaseCoef = Math.exp(-(hop / sr) / (remove ? 0.11 : 0.04));
      } else if (!runGain) {
        prevGain.set(g);
      } else {
        for (let b = 0; b < bins; b++) {
          /* Ease *towards the target*, not towards 0 (isolate) or 1 (remove).
           * Decaying towards zero made a held note's gain random-walk down —
           * a fade all by itself, measured at −4 dB mean with ±3 dB of ripple
           * on a dead-steady vowel. Protect the target instantly (the notch
           * deepens, the island opens), then approach the new value over the
           * release window. */
          const target = g[b], p = prevGain[b];
          const fast = remove ? (target < p) : (target > p);
          prevGain[b] = fast ? target : p + (target - p) * (1 - releaseCoef);
        }
      }
      synthesize(an, prevGain);
    }

    let decided = 0;
    /* prime the ring with the first frame so the first real frame gets the same
     * ±HALO context as everything else (and every frame is synthesized exactly
     * once: overlapping frames are what makes the overlap-add add up) */
    const first = analyse(-padFrames);
    for (let p = 0; p < HALO; p++) ring.push(first);
    for (let k = -padFrames; k < nFrames + padFrames; k++) {
      ring.push(analyse(k));
      if (ring.length === WIN) {
        decide(ring[HALO], ring);          /* the middle frame, fully surrounded */
        ring.shift();
        decided++;
        if (onProgress && (decided & 15) === 0) onProgress(decided / totalFrames);
      }
    }
    /* the last few frames only have earlier context — still perfectly usable */
    while (ring.length) {
      decide(ring[0], ring);
      ring.shift();
      decided++;
    }
    if (onProgress) onProgress(1);

    /* Normalise the overlap-add — dividing by the summed window squares makes
     * the reconstruction exact, so no level matching is needed (and a peak
     * restore would undo the very removal we just performed).
     *
     * It is also divided by the *true* window sum, not by a floor: an absolute
     * floor is not a safety net, it is a multiplier (the window squares at the
     * very start of a frame are ~1e-10, so a floor of 1e-4 made those samples up
     * to 10 000× louder). With the padding above, the sum is the full interior
     * value for every sample of the original signal, so this is a plain
     * division; the guard only covers the discarded pad itself. */
    const out = [];
    for (let c = 0; c < nCh; c++) {
      const a = outCh[c];
      const dst = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const w = wsum[i + PAD];
        if (w > 1e-9) dst[i] = a[i + PAD] / w;
      }
      out.push(dst);
    }
    return { channels: out, sr: sr, mode: mode, profile: prof, remove: remove, amount: amount };
  }

  /* =================================================================== */
  /* chroma · key · chords · tempo                                        */
  /* =================================================================== */
  const PITCH_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  /* Krumhansl–Kessler key profiles */
  const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  const CHORD_TEMPLATES = [
    ['', [0, 4, 7], 1.00], ['m', [0, 3, 7], 1.00], ['7', [0, 4, 7, 10], 0.98], ['m7', [0, 3, 7, 10], 0.98],
    ['maj7', [0, 4, 7, 11], 0.95], ['sus4', [0, 5, 7], 0.90], ['sus2', [0, 2, 7], 0.90], ['6', [0, 4, 7, 9], 0.90],
    ['m6', [0, 3, 7, 9], 0.85], ['5', [0, 7], 0.85], ['dim', [0, 3, 6], 0.80], ['aug', [0, 4, 8], 0.75]
  ];

  /* Chroma frames from a mono signal.
   *
   * Bins are not simply bucketed by frequency — that would let the 3rd harmonic
   * of one chord tone masquerade as a different chord tone (which is how you end
   * up calling a C triad "Cmaj7"). Instead every semitone in the guitar's range
   * votes for its pitch class using its own harmonic series, with the upper
   * harmonics weighted down. Classic harmonic pitch-class profiling.              */
  const HPCP_HARMONICS = [[1, 1], [2, 0.62], [3, 0.42], [4, 0.30], [5, 0.22], [6, 0.16], [7, 0.11], [8, 0.08]];
  function chromaFrames(mono, sr, opts) {
    opts = opts || {};
    const fftSize = opts.fftSize || 4096;
    const hop = opts.hop || (fftSize >> 1);
    const fMin = opts.fMin || 55, fMax = opts.fMax || 1600;
    const win = hann(fftSize);
    const bins = (fftSize >> 1) + 1;
    const nFrames = Math.max(1, Math.floor((mono.length - fftSize) / hop) + 1);

    /* Pre-compute the harmonics of every candidate fundamental in range.
     *
     * The naive version of this ("every bin votes for every fundamental that
     * could own it") is how you end up calling a G triad "Cmaj7": 196 Hz is
     * simultaneously the fundamental of G3 and the 3rd harmonic of C3, so a
     * single partial would hand energy to both roots. Instead each bin is
     * awarded to exactly one candidate per frame, and a candidate only gets a
     * serious weighting if its *own* fundamental is actually present in the
     * spectrum. Energy is then credited once, to the best explanation. */
    const candidates = [];
    for (let midi = 33; midi <= 96; midi++) {
      const f0 = 440 * Math.pow(2, (midi - 69) / 12);
      if (f0 < fMin || f0 > fMax) continue;
      const pc = ((midi % 12) + 12) % 12;
      const fWeight = 1 / (1 + f0 / 900);   /* gentle: high notes vote a little less */
      const harms = [];
      for (const [h, hw] of HPCP_HARMONICS) {
        const f = f0 * h;
        if (f > sr / 2 - 40) break;
        const bin = Math.round(f * fftSize / sr);
        if (bin < 1 || bin >= bins) continue;
        harms.push([bin, hw]);
      }
      if (harms.length) candidates.push({ pc: pc, f0: f0, fw: fWeight, bin: Math.min(bins - 1, Math.round(f0 * fftSize / sr)), harms: harms });
    }
    const bestW = new Float64Array(bins), bestPc = new Int8Array(bins);

    const frames = [], times = [], flux = [];
    const prevMag = new Float64Array(bins);
    const mag = new Float64Array(bins);
    for (let k = 0; k < nFrames; k++) {
      const off = k * hop;
      const { re, im } = frameFFT(mono, off, fftSize, win);
      let magSum = 0;
      for (let b = 1; b < bins; b++) { mag[b] = Math.hypot(re[b], im[b]); magSum += mag[b]; }
      const chroma = new Float32Array(12);
      /* how strong is the best fundamental in this frame? */
      let maxSupport = 1e-9;
      for (let c = 0; c < candidates.length; c++) {
        const v = mag[candidates[c].bin];
        if (v > maxSupport) maxSupport = v;
      }
      /* a candidate competes for its harmonics only as far as its own
       * fundamental is present — with a small floor so a genuinely quiet or
       * missing fundamental is not thrown away completely */
      bestW.fill(0); bestPc.fill(-1);
      for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        const support = mag[cand.bin];
        const cred = 0.12 + 0.88 * (support / (support + 0.25 * maxSupport));
        const weight = cand.fw * cred;
        for (let h = 0; h < cand.harms.length; h++) {
          const bin = cand.harms[h][0], w = cand.harms[h][1] * weight;
          if (w > bestW[bin]) { bestW[bin] = w; bestPc[bin] = cand.pc; }
        }
      }
      for (let b = 1; b < bins; b++) {
        const pc = bestPc[b];
        if (pc >= 0) chroma[pc] += mag[b] * bestW[b];
      }
      /* spectral flux for onset / tempo work */
      let fl = 0;
      for (let b = 1; b < bins; b++) {
        const d = mag[b] - prevMag[b];
        if (d > 0) fl += d;
        prevMag[b] = mag[b];
      }
      let norm = 0;
      for (let c = 0; c < 12; c++) norm += chroma[c] * chroma[c];
      norm = Math.sqrt(norm) || 1;
      for (let c = 0; c < 12; c++) chroma[c] /= norm;
      frames.push(chroma);
      times.push(off / sr);
      flux.push(fl / (magSum + EPS));
    }
    return { frames: frames, times: times, flux: flux, hopSeconds: hop / sr, bins: bins };
  }

  /* Krumhansl–Kessler correlation, plus one musical tiebreak: the chord a song
   * opens on is very likely its tonic, so a key that matches both the root and
   * the quality of that first chord gets a nudge. Without it, loops like
   * C–G–Am–F come out as A minor (same key signature, wrong answer to a player). */
  function bestKey(chromaSum, opts) {
    opts = opts || {};
    const hint = opts.tonicHint == null ? null : opts.tonicHint;
    const hintMinor = !!opts.minorHint;
    let best = { key: 'C', mode: 'major', score: -Infinity, tonic: 0 };
    for (let t = 0; t < 12; t++) {
      for (const [mode, prof] of [['major', KK_MAJOR], ['minor', KK_MINOR]]) {
        let dot = 0;
        for (let i = 0; i < 12; i++) dot += chromaSum[(t + i) % 12] * prof[i];
        if (hint != null && t === hint && (mode === 'minor') === hintMinor) dot *= 1.18;
        if (dot > best.score) best = { key: PITCH_NAMES[t], mode: mode, score: dot, tonic: t };
      }
    }
    return best;
  }

  /* Scoring a chord is about "is every chord tone there?" and "is anything
   * else ringing?" — summing the chord tones rewards bolting extra notes on, so
   * presence is the *weakest* chord tone relative to the strongest.            */
  function matchChord(chroma) {
    let best = null;
    const total = chroma.reduce((a, b) => a + b, 0) || 1;
    let peak = 1e-6;
    for (let c = 0; c < 12; c++) if (chroma[c] > peak) peak = chroma[c];
    for (let root = 0; root < 12; root++) {
      for (const [suffix, iv, prior] of CHORD_TEMPLATES) {
        let inSum = 0, outSum = 0, weakest = Infinity;
        const inSet = new Set(iv.map(i => (root + i) % 12));
        for (let c = 0; c < 12; c++) {
          if (inSet.has(c)) { inSum += chroma[c]; if (chroma[c] < weakest) weakest = chroma[c]; }
          else outSum += chroma[c];
        }
        const presence = weakest / peak;                 /* every chord tone present? */
        const cleanliness = 1 - outSum / total;          /* nothing extra ringing? */
        const score = (0.55 * presence + 0.45 * cleanliness) * prior;
        if (!best || score > best.score) {
          best = { root: root, suffix: suffix, score: score, presence: presence, cleanliness: cleanliness };
        }
      }
    }
    return best;
  }

  function analyseChords(mono, sr, opts) {
    opts = opts || {};
    const cf = chromaFrames(mono, sr, opts);
    const frames = cf.frames;
    /* 5-frame median smoothing of the chord guess kills single-frame glitches */
    const guesses = frames.map(f => matchChord(f));
    const smoothed = [];
    for (let i = 0; i < guesses.length; i++) {
      const idx = [];
      for (let j = i - 2; j <= i + 2; j++) {
        const k = Math.max(0, Math.min(guesses.length - 1, j));
        idx.push(guesses[k].root * 12 + Math.max(0, CHORD_TEMPLATES.findIndex(t => t[0] === guesses[k].suffix)));
      }
      const med = median(idx);
      const root = Math.floor(med / 12);
      const suffix = CHORD_TEMPLATES[((med % 12) + 12) % 12][0];
      smoothed.push({ root: root, suffix: suffix, score: guesses[i].score });
    }
    /* merge runs, ignore anything shorter than ~0.30 s */
    const minRun = Math.max(2, Math.round(0.30 / cf.hopSeconds));
    const segments = [];
    let cur = null;
    smoothed.forEach((g, i) => {
      const name = PITCH_NAMES[g.root] + g.suffix;
      if (!cur || cur.name !== name) {
        if (cur) segments.push(cur);
        cur = { name: name, root: g.root, suffix: g.suffix, start: cf.times[i], end: cf.times[i], score: g.score, frames: 1 };
      } else {
        cur.end = cf.times[i]; cur.frames++; cur.score = Math.max(cur.score, g.score);
      }
    });
    if (cur) segments.push(cur);
    const chords = segments.filter(s => s.frames >= minRun).map(s => ({
      name: s.name, root: s.root, suffix: s.suffix,
      start: +s.start.toFixed(2), end: +s.end.toFixed(2),
      confidence: +clamp01((s.score - 0.15) / 0.65).toFixed(2)
    }));
    /* global key + tempo */
    const chromaSum = new Float32Array(12);
    frames.forEach(f => { for (let c = 0; c < 12; c++) chromaSum[c] += f[c]; });
    const firstChord = chords.find(c => c.frames != null) || chords[0];
    const key = bestKey(chromaSum, chords.length ? { tonicHint: chords[0].root, minorHint: /^m(?!aj)/.test(chords[0].suffix) } : {});
    const tempo = estimateTempo(cf);
    return { chords: chords, key: key, tempo: tempo, chromaFrames: frames.length, duration: mono.length / sr, hopSeconds: cf.hopSeconds, chroma: Array.from(chromaSum) };
  }

  /* Tempo from the onset envelope: autocorrelation of the spectral flux in the
   * 55–200 BPM lag range, with a preference for the 80–140 "feels right" band. */
  function estimateTempo(cf) {
    const flux = cf.flux;
    if (!flux.length) return { bpm: 0, confidence: 0 };
    const mean = flux.reduce((a, b) => a + b, 0) / flux.length;
    const x = flux.map(v => Math.max(0, v - mean));
    const fps = 1 / cf.hopSeconds;
    const minLag = Math.max(1, Math.round(fps * 60 / 200));
    const maxLag = Math.min(x.length - 2, Math.round(fps * 60 / 55));
    let best = { lag: 0, val: -Infinity };
    const ac = new Float32Array(maxLag + 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let s = 0, n = 0;
      for (let i = 0; i + lag < x.length; i++) { s += x[i] * x[i + lag]; n++; }
      ac[lag] = n ? s / n : 0;
      /* musical preference curve: 100 BPM is the most likely, 60/180 least */
      const bpm = 60 * fps / lag;
      const pref = Math.exp(-Math.pow(Math.log(bpm / 105) / 0.55, 2));
      const v = ac[lag] * (0.65 + 0.35 * pref);
      if (v > best.val) best = { lag: lag, val: v };
    }
    if (!best.lag) return { bpm: 0, confidence: 0 };
    let bpm = 60 * fps / best.lag;
    while (bpm < 70) bpm *= 2;
    while (bpm > 190) bpm /= 2;
    const norm = best.val / (ac[best.lag] || 1);
    return { bpm: Math.round(bpm), confidence: +clamp01(0.25 * norm + 0.3).toFixed(2) };
  }

  /* Group a chord timeline into bars of four beats at the detected tempo. */
  function toBars(chords, bpm) {
    if (!chords.length) return [];
    const beat = bpm > 0 ? 60 / bpm : 0.5;
    const bar = beat * 4;
    const total = chords[chords.length - 1].end;
    const out = [];
    for (let t = 0; t < total - 1e-6; t += bar) {
      const mid = t + bar / 2;
      const hit = chords.find(c => mid >= c.start && mid < c.end) || chords.find(c => Math.abs(c.start - t) < bar) || chords[0];
      const prev = out[out.length - 1];
      out.push({ bar: out.length + 1, name: hit.name, sameAsPrev: !!prev && prev.name === hit.name, start: +t.toFixed(2) });
    }
    if (out.length > 64) out.length = 64;                 /* 64 bars is a whole song */
    return out;
  }

  /* Separate a whole song without freezing the browser: the audio is processed
   * in slices with a margin at each end (the per-bin masks look at a few frames
   * either side, so the margin gives them their context) and the margin is
   * thrown away. `onProgress(fraction)` is called between slices. */
  /* Peak guard.
   *
   * A couple of perfectly honest results are *louder than the song they came
   * from*: an isolated wide-band drum layer drops the parts of the signal that
   * used to cancel its peaks, and the classic centre-cancel is literally a
   * difference signal (which is why 90s karaoke boxes sound so hot). Those can
   * peak above 1.0, and 1.0 is what the WAV writer and the sound card accept —
   * past it the export clips flat and the transients crackle.
   *
   * So the whole take is measured once and, only if it really does go past the
   * ceiling, scaled by one constant. Scaling the finished take — never a slice
   * on its own — means no level step can ever appear at a slice seam, and a
   * result that already fits is returned untouched (gain 1, no copy). */
  function limitPeak(channels, ceiling) {
    const cap = ceiling == null ? 0.99 : ceiling;   /* a little under full scale, so 16-bit rounding can never clip */
    let peak = 0;
    for (let c = 0; c < channels.length; c++) {
      const a = channels[c];
      for (let i = 0; i < a.length; i++) {
        const v = a[i] < 0 ? -a[i] : a[i];
        if (v > peak) peak = v;
      }
    }
    if (!(peak > cap)) return { channels: channels, gain: 1, peak: peak };
    const g = cap / peak;
    const out = channels.map(ch => {
      const d = new Float32Array(ch.length);
      for (let i = 0; i < ch.length; i++) d[i] = ch[i] * g;
      return d;
    });
    return { channels: out, gain: g, peak: peak };
  }

  /* a raised-cosine half: 0 at 0, 1 at `width`, and its mirror sums to 1 */
  function ramp(i, width) {
    if (width <= 0) return 1;
    const x = i / width;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const s = Math.sin(0.5 * Math.PI * x);
    return s * s;
  }

  async function separateChunked(channels, sr, mode, opts) {
    opts = opts || {};
    let cross = new Float32Array(0);
    const onProgress = opts.onProgress;
    const shouldAbort = typeof opts.shouldAbort === 'function' ? opts.shouldAbort : null;
    const abortError = () => { const e = new Error('separation stopped'); e.aborted = true; return e; };
    const margin = Math.max(0.2, opts.marginSeconds || 0.4);
    const sliceSeconds = Math.max(4, opts.sliceSeconds || 12);
    const n = channels[0].length;
    /* Every slice is framed from its own first sample, so unless the slice
     * starts land on the same grid the frame grid uses, the two estimates of
     * the shared second are built from differently placed windows — which is
     * how a transient ends up smeared on one side of a join and sharp on the
     * other. Landing the slices and their context on the largest hop any
     * profile uses (4096) puts every frame where the whole-song pass would
     * have put it; the overlap then agrees closely and the cross-fade has
     * almost nothing left to blend. */
    const ALIGN = 4096;
    const up = v => Math.ceil(v / ALIGN) * ALIGN;
    const per = Math.max(ALIGN, up(Math.round(sliceSeconds * sr)));
    const slices = Math.max(1, Math.ceil(n / per));
    if (slices === 1) {
      if (shouldAbort && shouldAbort()) throw abortError();
      const only = separate(channels, sr, mode, opts);
      const safe = limitPeak(only.channels);
      if (onProgress) onProgress(1);
      return Object.assign({}, only, { channels: safe.channels, slices: 1, peak: safe.peak, gain: safe.gain });
    }
    const pad = Math.max(ALIGN, up(Math.round(margin * sr)));
    /* Each slice is separated with `margin` seconds of context on both sides,
     * and the slices overlap by twice that. The context is only there to give
     * the analysis something to look at, and the two estimates of the same
     * second of music differ slightly — so the overlap is cross-faded with
     * complementary raised-cosine ramps and normalised by the weight that
     * actually landed. A straight splice here is a level step, and a level step
     * is a click every slice. */
    const acc = [], wsum = new Float32Array(n);
    let out = null, meta = null;
    for (let s = 0; s < slices; s++) {
      /* a long song can be stopped between slices, so the tab never gets stuck */
      if (shouldAbort && shouldAbort()) throw abortError();
      const from = s * per;
      const to = Math.min(n, from + per);
      const a = Math.max(0, from - pad), b = Math.min(n, to + pad);
      const sub = channels.map(c => c.subarray(a, b));
      const r = separate(sub, sr, mode, Object.assign({}, opts, { onProgress: null }));
      const nCh = r.channels.length;
      if (!out) {
        out = r.channels.map(() => new Float32Array(n));
        for (let c = 0; c < nCh; c++) acc.push(new Float32Array(n));
        meta = { sr: r.sr, mode: r.mode, profile: r.profile, remove: r.remove, amount: r.amount };
      }
      /* local index i maps straight onto the original timeline at a + i, which
       * is what `separate` was given, so every padded sample has a home. */
      const len = b - a;
      if (cross.length !== len) cross = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        /* the first and the last slice keep full weight at the file edge, so
         * nothing ever fades out at the start of the song or at its end */
        let w = 1;
        if (s > 0 && i < pad) w = ramp(i, pad);
        if (s < slices - 1 && i >= len - pad) w = Math.min(w, ramp(len - i, pad));
        cross[i] = w;
        wsum[a + i] += w;
      }
      for (let c = 0; c < nCh; c++) {
        const src = r.channels[c], dst = acc[c];
        for (let i = 0; i < len; i++) dst[a + i] += src[i] * cross[i];
      }
      if (onProgress) onProgress((s + 1) / slices);
      /* hand the frame back to the browser so the UI keeps painting */
      await new Promise(res => setTimeout(res, 0));
    }
    for (let c = 0; c < out.length; c++) {
      const dst = out[c], src = acc[c];
      for (let i = 0; i < n; i++) {
        const w = wsum[i];
        if (w > 1e-9) dst[i] = src[i] / w;
      }
    }
    const safe = limitPeak(out);
    return Object.assign(meta, { channels: safe.channels, sr: sr, slices: slices, peak: safe.peak, gain: safe.gain });
  }

  /* =================================================================== */
  /* WAV export                                                           */
  /* =================================================================== */
  function encodeWav(channels, sr) {
    const nCh = channels.length, n = channels[0].length;
    const bytes = 44 + n * nCh * 2;
    const buf = new ArrayBuffer(bytes);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, nCh, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * nCh * 2, true); v.setUint16(32, nCh * 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * nCh * 2, true);
    let o = 44;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < nCh; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    }
    return buf;
  }

  const api = {
    hann, median, mixdown, frameFFT, bandMask, smoothstep,
    separate, separateChunked, limitPeak, PROFILES,
    chromaFrames, analyseChords, bestKey, matchChord, estimateTempo, toBars,
    encodeWav, PITCH_NAMES, CHORD_TEMPLATES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TT = root.TT || {};
  root.TT.dsp = api;
})(typeof window !== 'undefined' ? window
  : typeof globalThis !== 'undefined' ? globalThis : self);
