/* Trill Tuner — HT-Demucs core tests (no model file needed).
 *
 * The model itself is checked separately (test/htdemucs-model-test.js, which
 * runs only when a real model file is supplied). These tests prove the signal
 * path around it is exact: the spectrogram conventions, the inverse transform
 * and the overlap-add across segments. A stand-in "model" makes that testable:
 * if it hands back the mix for one stem and silence for the rest, the separator
 * has to return exactly that, edges and seams included.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

let failed = 0;
function check(name, fn) {
  return Promise.resolve().then(fn)
    .then(msg => console.log('  ok  ' + name + (msg ? ' — ' + msg : '')))
    .catch(e => { failed++; console.log('  FAIL  ' + name + ' — ' + e.message); });
}

const sandbox = { window: {}, console: console, setTimeout: setTimeout, Math: Math, Float32Array: Float32Array, Float64Array: Float64Array };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/lib/htdemucs-core.js'), 'utf8'), sandbox);
const H = sandbox.window.TT.htdemucsCore;

const SR = 44100;
let seed = 4242;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;

function song(sec, fn) {
  const n = Math.round(sec * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = fn(i / SR, i);
  return x;
}

(async function main() {
  await check('the STFT and inverse STFT reconstruct a signal exactly', () => {
    const x = song(0.5, t => 0.4 * Math.sin(2 * Math.PI * 330 * t) + 0.1 * rnd());
    const pad = 2048;
    const padded = new Float32Array(x.length + 2 * pad); padded.set(x, pad);
    const S = H.stft(padded, 4096, 1024);
    const y = H.istft(S.real, S.imag, S.numFrames, S.numBins, 4096, 1024, padded.length);
    let worst = 0;
    for (let i = 4096; i < padded.length - 4096; i++) worst = Math.max(worst, Math.abs(y[i] - padded[i]));
    assert.ok(worst < 1e-4, 'reconstruction error ' + worst);
    return 'worst error ' + worst.toExponential(1);
  });

  await check('the model spectrogram of a segment maps back to the same audio (conventions hold)', () => {
    const n = H.TRAINING_SAMPLES;
    const L = new Float32Array(n), R = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      L[i] = 0.3 * Math.sin(2 * Math.PI * 220 * i / SR) + 0.05 * rnd();
      R[i] = 0.25 * Math.sin(2 * Math.PI * 277 * i / SR) + 0.05 * rnd();
    }
    const inp = H.prepareModelInput(L, R);
    /* a model that outputs the mix as the "freq" mask for stem 0, and nothing else */
    const per = H.SPEC_BINS * H.SPEC_FRAMES;
    const freq = new Float32Array(4 * 4 * per);
    freq.set(inp.magSpec, 0);
    const stems = H.standaloneMask(freq);
    const back = H.standaloneIspec(stems[0], n);
    let worst = 0, scale = 0;
    for (let i = 4096; i < n - 4096; i++) {
      worst = Math.max(worst, Math.abs(back.left[i] - L[i]));
      scale = Math.max(scale, Math.abs(L[i]));
    }
    assert.ok(worst < 2e-3 * scale + 1e-4, 'left channel came back ' + (worst / scale * 100).toFixed(2) + '% off');
    return 'left channel back to ' + (worst / scale * 100).toFixed(3) + '% of its level';
  });

  await check('separating a long song returns stems that add back to the mix, seams included', async () => {
    const sec = 20;
    const n = Math.round(sec * SR);
    const L = song(sec, (t, i) => 0.3 * Math.sin(2 * Math.PI * 180 * t) * (1 + 0.5 * Math.sin(2 * Math.PI * 0.7 * t)) + 0.02 * rnd());
    const R = song(sec, (t, i) => 0.25 * Math.sin(2 * Math.PI * 240 * t) + 0.02 * rnd());
    /* a stand-in graph: stem 3 (vocals) carries the whole mix, the others carry nothing */
    const run = async (waveform) => {
      const len = H.TRAINING_SAMPLES;
      const time = new Float32Array(4 * 2 * len);
      time.set(waveform.subarray(0, len), 3 * 2 * len);
      time.set(waveform.subarray(len, 2 * len), 3 * 2 * len + len);
      return { time: time, timeDims: [1, 4, 2, len], freq: new Float32Array(4 * 4 * H.SPEC_BINS * H.SPEC_FRAMES), freqDims: [1, 4, 4, H.SPEC_BINS, H.SPEC_FRAMES] };
    };
    const stems = await H.separateStereo(L, R, run, {});
    let worstV = 0, worstSilent = 0;
    for (let i = 0; i < n; i++) {
      worstV = Math.max(worstV, Math.abs(stems.vocals.left[i] - L[i]), Math.abs(stems.vocals.right[i] - R[i]));
      worstSilent = Math.max(worstSilent, Math.abs(stems.drums.left[i]), Math.abs(stems.bass.right[i]));
    }
    assert.ok(worstV < 1e-4, 'vocals differ from the mix by ' + worstV);
    assert.ok(worstSilent < 1e-4, 'a silent stem leaked ' + worstSilent);
    return 'vocals = mix to ' + worstV.toExponential(1) + ' · silent stems at ' + worstSilent.toExponential(1);
  });

  await check('a stem split between two segments blends smoothly (no seam click)', async () => {
    const sec = 16;
    const n = Math.round(sec * SR);
    const M = song(sec, t => 0.4 * Math.sin(2 * Math.PI * 200 * t));
    /* the stand-in halves the mix in the first segment and keeps all of it in the second:
     * the blend across the overlap must be a ramp, not a step */
    let call = 0;
    const run = async (waveform) => {
      const len = H.TRAINING_SAMPLES;
      const gain = call++ === 0 ? 0.5 : 1.0;
      const time = new Float32Array(4 * 2 * len);
      for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) time[3 * 2 * len + c * len + i] = waveform[c * len + i] * gain;
      return { time: time, timeDims: [1, 4, 2, len], freq: new Float32Array(4 * 4 * H.SPEC_BINS * H.SPEC_FRAMES), freqDims: [1, 4, 4, H.SPEC_BINS, H.SPEC_FRAMES] };
    };
    const stems = await H.separateStereo(M, M, run, {});
    /* the first second is only segment one (gain 0.5), the last second only the last (gain 1) */
    const at = s => stems.vocals.left[Math.round(s * SR)] / M[Math.round(s * SR)];
    const early = at(0.5), late = at(sec - 1.5);
    assert.ok(Math.abs(early - 0.5) < 0.01, 'early gain ' + early);
    assert.ok(Math.abs(late - 1.0) < 0.01, 'late gain ' + late);
    /* and the transition is monotone-ish across the overlap */
    let prev = -1, jumps = 0;
    for (let s = 0; s < sec - 2; s += 0.05) {
      const g = at(s);
      if (prev >= 0 && Math.abs(g - prev) > 0.25) jumps++;
      prev = g;
    }
    assert.strictEqual(jumps, 0, 'the gain jumped ' + jumps + ' times');
    return 'gain 0.5 → 1.0 across the overlap, no jumps';
  });

  await check('a stem passes through a segment boundary with no seam click', async () => {
    const sec = 16;
    const n = Math.round(sec * SR);
    const M = song(sec, t => 0.4 * Math.sin(2 * Math.PI * 200 * t));
    const run = async (waveform) => {
      const len = H.TRAINING_SAMPLES;
      const time = new Float32Array(4 * 2 * len);
      for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) time[3 * 2 * len + c * len + i] = waveform[c * len + i];
      return { time: time, timeDims: [1, 4, 2, len], freq: new Float32Array(4 * 4 * H.SPEC_BINS * H.SPEC_FRAMES), freqDims: [1, 4, 4, H.SPEC_BINS, H.SPEC_FRAMES] };
    };
    const stems = await H.separateStereo(M, M, run, {});
    let worst = 0;
    for (let i = 1; i < n; i++) worst = Math.max(worst, Math.abs(stems.vocals.left[i] - M[i]));
    assert.ok(worst < 1e-4, 'max error ' + worst);
    return n + ' samples · worst error ' + worst.toExponential(1);
  });

  await check('resampling 48 kHz to 44.1 kHz and back keeps a tone at its level', () => {
    const x = song(1, t => 0.5 * Math.sin(2 * Math.PI * 1000 * t));
    const up = H.resample(x, 44100, 48000);
    const back = H.resample(up, 48000, 44100);
    assert.ok(Math.abs(up.length - 48000) <= 1, 'length ' + up.length);
    let worst = 0;
    for (let i = 2000; i < back.length - 2000; i++) worst = Math.max(worst, Math.abs(back[i] - x[i]));
    assert.ok(worst < 0.01, 'round trip error ' + worst);
    return 'round-trip error ' + worst.toExponential(1);
  });

  if (failed) { console.log('\n❌ ' + failed + ' failed'); process.exit(1); }
  console.log('\n✅ htdemucs core');
})();
