/* Trill Tuner — polyphonic strum analysis: hit all strings at once and get a
 * per-string sharp/flat verdict (Polytune-style).
 *
 * Method: for each target string frequency, scan ±160¢ in 2¢ steps with a
 * Goertzel power probe over a long window (~0.3 s), pick the peak, and score
 * it against the local noise floor. Harmonic masking suppresses false
 * positives (e.g. the low E's 3rd harmonic sitting right on the B string).
 * Pure functions, node-testable. */
(function () {
  'use strict';

  const FFT = (typeof module !== 'undefined' && module.exports)
    ? require('./fft.js')
    : window.TT.fft;

  const CENTS_RANGE = 160;   // scan ± this many cents around each target
  const CENTS_STEP = 2;
  const MASK_CENTS = 40;     // a target within this of a stronger string's harmonic is masked
  const MIN_CONF = 3.0;      // peak must beat the local floor by this factor

  /* Power (normalized) at a frequency. */
  function pwr(buf, sr, f) {
    return FFT.goertzel(buf, sr, f) / (buf.length * buf.length);
  }

  /* Scan ±cents around target f for the strongest Goertzel response.
   * Returns { cents, peak, floor } (floor = median power in the scan). */
  function scan(buf, sr, f) {
    let bestC = 0, bestP = -1;
    const samples = [];
    for (let c = -CENTS_RANGE; c <= CENTS_RANGE; c += CENTS_STEP) {
      const fc = f * Math.pow(2, c / 1200);
      const p = pwr(buf, sr, fc);
      samples.push(p);
      if (p > bestP) { bestP = p; bestC = c; }
    }
    const sorted = samples.slice().sort((a, b) => a - b);
    const floor = sorted[sorted.length >> 1];
    // parabolic refine around bestC
    const pm = pwr(buf, sr, f * Math.pow(2, (bestC - CENTS_STEP) / 1200));
    const p0 = bestP;
    const pp = pwr(buf, sr, f * Math.pow(2, (bestC + CENTS_STEP) / 1200));
    let cents = bestC;
    const den = pm - 2 * p0 + pp;
    if (Math.abs(den) > 1e-18) {
      const delta = 0.5 * (pm - pp) / den; // in units of CENTS_STEP
      if (Math.abs(delta) <= 1) cents = bestC + delta * CENTS_STEP;
    }
    return { cents: cents, peak: p0, floor: floor };
  }

  /* Analyze a strum capture.
   * buf: Float32Array samples (>= 8192 recommended), sr: sample rate,
   * targets: [{ freq }] (already includes capo/sweetener/A4).
   * Returns per-target:
   *   { found, cents, conf, masked }  (cents relative to the given target) */
  function analyzeStrum(buf, sr, targets) {
    // Use the deepest available window; if the capture is long enough, score
    // two disjoint windows and keep each string's better result — a loop
    // seam or transient in one window then can't poison the verdict.
    const win = 16384;
    let w;
    if (buf.length >= win * 2 + 4096) {
      const a = window_(buf, buf.length - win);            // newest
      const b = window_(buf, buf.length - win * 2 - 1024); // older, disjoint
      const ra = analyzeWindow(a, sr, targets);
      const rb = analyzeWindow(b, sr, targets);
      for (let i = 0; i < ra.length; i++) {
        const ca = ra[i].found ? ra[i].conf : 0;
        const cb = rb[i].found ? rb[i].conf : 0;
        if (cb > ca * 1.5) ra[i] = rb[i];
      }
      return ra;
    }
    w = window_(buf, Math.max(0, buf.length - win));
    return analyzeWindow(w, sr, targets);
  }

  function window_(buf, start) {
    const len = Math.min(16384, buf.length - start);
    // Hann window: crushes spectral leakage skirts so a loud string can't
    // fake a peak on a far-away target frequency
    const w = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const u = len > 1 ? i / (len - 1) : 0;
      w[i] = buf[start + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
    }
    return w;
  }

  function analyzeWindow(w, sr, targets) {
    let energy = 0;
    for (let i = 0; i < w.length; i++) energy += w[i] * w[i];
    const rms = Math.sqrt(energy / w.length);

    const res = targets.map(t => {
      const s = scan(w, sr, t.freq);
      const conf = s.floor > 0 ? s.peak / s.floor : (s.peak > 0 ? 999 : 0);
      // absolute sanity: the peak must carry real signal energy
      const abs = Math.sqrt(s.peak) * 4; // goertzel peak ~ (A/2)^2 for unit-amplitude sine
      // a peak pinned at the scan edge means the real peak is outside the
      // window — leakage from a different frequency, not this string
      const edge = Math.abs(s.cents) > CENTS_RANGE - 3 * CENTS_STEP;
      return { found: rms > 0.001 && conf >= MIN_CONF && abs > 0.004 && !edge, cents: s.cents, conf: conf, peak: s.peak, freq: t.freq };
    });

    // a genuine string fundamental is never dozens of dB below the loudest
    const maxPeak = Math.max(1e-30, ...res.map(r => r.peak));
    res.forEach(r => { if (r.found && r.peak < maxPeak * 0.01) r.found = false; });

    // harmonic masking: a strong, found lower string can fake a higher target
    const found = res.map((r, i) => ({ r: r, i: i })).filter(x => x.r.found);
    found.sort((a, b) => a.r.freq - b.r.freq); // lowest first
    const maskedBy = res.map(() => -1);
    for (const low of found) {
      for (let k = 2; k <= 5; k++) {
        const hf = low.r.freq * k;
        for (let j = 0; j < res.length; j++) {
          if (j === low.i || !res[j].found || maskedBy[j] >= 0) continue;
          const dc = 1200 * Math.log2((res[j].freq * Math.pow(2, res[j].cents / 1200)) / hf);
          if (Math.abs(dc) <= MASK_CENTS && low.r.peak > res[j].peak * 1.4) {
            maskedBy[j] = low.i;
          }
        }
      }
    }
    res.forEach((r, j) => {
      if (maskedBy[j] >= 0) { r.found = false; r.masked = true; r.maskedBy = maskedBy[j]; }
      else r.masked = false;
    });
    return res;
  }

  const api = { analyzeStrum: analyzeStrum, scan: scan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TT = window.TT || {}; window.TT.poly = api; }
})();
