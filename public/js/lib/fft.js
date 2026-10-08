/* Trill Tuner — FFT (iterative radix-2) + Goertzel power, used by the polyphonic
 * strum tuner and the overtone analyzer. Pure functions, node-testable. */
(function () {
  'use strict';

  /* In-place iterative radix-2 Cooley–Tukey FFT on re/im Float64Arrays.
   * n must be a power of two. */
  function fft(re, im) {
    const n = re.length;
    if (n <= 1) return;
    // bit reversal
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len;
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
  }

  /* Magnitude spectrum (first n/2 bins) of a Hann-windowed signal. */
  function magnitudeSpectrum(buf) {
    let n = 1;
    while (n < buf.length) n <<= 1;
    n = Math.max(n, 16);
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < buf.length; i++) {
      const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (buf.length - 1)); // Hann
      re[i] = buf[i] * w;
    }
    fft(re, im);
    const half = n >> 1;
    const mag = new Float64Array(half);
    for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i]);
    return mag; // bin i => frequency i * sr / n
  }

  /* Goertzel power of a specific frequency over the whole buffer. */
  function goertzel(buf, sr, f) {
    const k = 2 * Math.PI * f / sr;
    const coeff = 2 * Math.cos(k);
    let s0 = 0, s1 = 0, s2 = 0;
    for (let i = 0; i < buf.length; i++) {
      s0 = buf[i] + coeff * s1 - s2;
      s2 = s1; s1 = s0;
    }
    return s1 * s1 + s2 * s2 - coeff * s1 * s2; // ~ (n·A/2)^2 for a sinusoid
  }

  const api = { fft: fft, magnitudeSpectrum: magnitudeSpectrum, goertzel: goertzel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TT = window.TT || {}; window.TT.fft = api; }
})();
