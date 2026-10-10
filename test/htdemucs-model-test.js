/* Trill Tuner — the real HT-Demucs model, end to end (gated).
 *
 * This needs the 172 MB htdemucs_embedded.onnx on disk, which is not in the repo.
 * Get it from https://huggingface.co/timcsy/demucs-web-onnx (MIT) and run:
 *
 *   HTDEMUCS_MODEL=/path/to/htdemucs_embedded.onnx npm run test:model
 *
 * Without HTDEMUCS_MODEL the test prints a skip notice and exits 0, so the
 * normal `npm test` never depends on the download.
 *
 * With the model it checks what the stem lab relies on:
 *   - the model loads and its graph has the expected inputs and outputs
 *   - a few seconds of a stereo mix come back as four stems of the right length
 *   - the stems add back up to the mix (the four are a partition of it), and
 *     the vocal stem of a mix with a loud centred voice-like tone keeps most of it
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const MODEL = process.env.HTDEMUCS_MODEL;
if (!MODEL) {
  console.log('skip  htdemucs model test — set HTDEMUCS_MODEL=/path/to/htdemucs_embedded.onnx to run it');
  process.exit(0);
}
if (!fs.existsSync(MODEL)) {
  console.log('FAIL  HTDEMUCS_MODEL points at a file that does not exist: ' + MODEL);
  process.exit(1);
}

const sandbox = { window: {}, console: console, setTimeout: setTimeout, Math: Math, Float32Array: Float32Array, Float64Array: Float64Array };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/lib/htdemucs-core.js'), 'utf8'), sandbox);
const C = sandbox.window.TT.htdemucsCore;

(async function main() {
  const ort = require('onnxruntime-web');
  const session = await ort.InferenceSession.create(fs.readFileSync(MODEL), { executionProviders: ['wasm'] });
  console.log('model loaded · inputs ' + session.inputNames.join(', ') + ' · outputs ' + session.outputNames.join(', '));

  /* three seconds of a stereo mix: a centred 220 Hz "voice" plus a 90 Hz bass note and a click track */
  const sec = 3, n = Math.round(sec * C.SAMPLE_RATE);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / C.SAMPLE_RATE;
    const voice = 0.25 * Math.sin(2 * Math.PI * 220 * t) * (1 + 0.3 * Math.sin(2 * Math.PI * 5 * t));
    const bass = 0.2 * Math.sin(2 * Math.PI * 90 * t);
    const click = (i % 22050) < 200 ? 0.3 * Math.sin(2 * Math.PI * 1800 * t) : 0;
    L[i] = voice + bass + click;
    R[i] = voice + bass + click;
  }

  const run = async (waveform, magSpec) => {
    const feeds = {};
    feeds[session.inputNames[0]] = new ort.Tensor('float32', waveform, [1, 2, C.TRAINING_SAMPLES]);
    feeds[session.inputNames[1]] = new ort.Tensor('float32', magSpec, [1, 4, C.SPEC_BINS, C.SPEC_FRAMES]);
    const out = await session.run(feeds);
    let time = null, freq = null;
    for (const name of session.outputNames) {
      const t = out[name];
      if (t.dims.length === 4 && t.dims[2] === 2) time = t;
      else if (t.dims.length === 5 && t.dims[2] === 4) freq = t;
    }
    assert.ok(time && freq, 'unexpected output shapes');
    return { time: time.data, timeDims: time.dims, freq: freq.data, freqDims: freq.dims };
  };

  const stems = await C.separateStereo(L, R, run, {});
  for (const name of C.TRACKS) {
    const s = stems[name];
    assert.strictEqual(s.left.length, n, name + ' length');
    for (let i = 0; i < n; i += 997) assert.ok(Number.isFinite(s.left[i]), name + ' has non-finite samples');
  }

  /* the four stems should add back up to roughly the mix */
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const sum = C.TRACKS.reduce((a, name) => a + stems[name].left[i], 0);
    num += sum * L[i]; den += L[i] * L[i];
  }
  const recon = num / den;
  assert.ok(Math.abs(recon - 1) < 0.25, 'stems sum to ' + recon.toFixed(2) + ' × the mix');

  /* the voice-like tone should land mostly in the vocal stem */
  let vv = 0, vm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / C.SAMPLE_RATE;
    const voiceOnly = 0.25 * Math.sin(2 * Math.PI * 220 * t) * (1 + 0.3 * Math.sin(2 * Math.PI * 5 * t));
    vv += stems.vocals.left[i] * voiceOnly; vm += voiceOnly * voiceOnly;
  }
  const share = vv / vm;
  console.log('  vocal stem carries ' + (share * 100).toFixed(0) + '% of the centred tone');
  assert.ok(share > 0.3, 'vocal stem keeps only ' + (share * 100).toFixed(0) + '% of the voice');

  console.log('\n✅ htdemucs model: loads, separates, stems sum to the mix');
})().catch(e => { console.log('FAIL  htdemucs model test — ' + e.message); process.exit(1); });
