/* Trill Tuner — YIN pitch detection, implemented from scratch.
 * Based on: de Cheveigné & Kawahara (2002), "YIN, a fundamental frequency
 * estimator for speech and music". Steps: difference function → cumulative
 * mean normalized difference → absolute threshold → parabolic interpolation.
 */
(function () {
  'use strict';

  function yin(buf, sampleRate, threshold) {
    threshold = threshold || 0.12;
    const n = buf.length;
    const half = n >> 1;
    if (half < 4) return null;

    // Step 1: squared difference function d(tau)
    const cmnd = new Float32Array(half);
    for (let tau = 0; tau < half; tau++) {
      let sum = 0;
      for (let i = 0; i < half; i++) {
        const d = buf[i] - buf[i + tau];
        sum += d * d;
      }
      cmnd[tau] = sum;
    }

    // Step 2: cumulative mean normalized difference d'(tau)
    cmnd[0] = 1;
    let runSum = 0;
    for (let tau = 1; tau < half; tau++) {
      runSum += cmnd[tau];
      cmnd[tau] = cmnd[tau] * tau / (runSum || 1);
    }

    // Step 3: absolute threshold — first dip below threshold, then local minimum
    let tauEst = -1;
    for (let tau = 2; tau < half; tau++) {
      if (cmnd[tau] < threshold) {
        while (tau + 1 < half && cmnd[tau + 1] < cmnd[tau]) tau++;
        tauEst = tau;
        break;
      }
    }
    if (tauEst < 0) return null;

    // Step 4: parabolic interpolation around the minimum for sub-sample precision
    let better = tauEst;
    if (tauEst > 0 && tauEst < half - 1) {
      const s0 = cmnd[tauEst - 1], s1 = cmnd[tauEst], s2 = cmnd[tauEst + 1];
      const denom = 2 * (s0 - 2 * s1 + s2);
      if (Math.abs(denom) > 1e-9) {
        better = tauEst + (s0 - s2) / denom;
      }
    }
    if (better <= 0) return null;

    const freq = sampleRate / better;
    if (freq < 20 || freq > 5000) return null;
    return { freq: freq, clarity: Math.max(0, 1 - cmnd[tauEst]), tau: better };
  }

  // Average pairs — cheap 2:1 decimation (anti-alias-ish low pass) for bass tunings.
  function downsample2(buf) {
    const m = buf.length >> 1;
    const out = new Float32Array(m);
    for (let i = 0; i < m; i++) out[i] = (buf[2 * i] + buf[2 * i + 1]) * 0.5;
    return out;
  }

  const api = { yin: yin, downsample2: downsample2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // node (for tests)
  if (typeof window !== 'undefined') { window.TT = window.TT || {}; window.TT.yin = api; }
})();
