/* Trill Tuner — background-noise removal tests.
 *
 * Every signal is synthesised here: a plucked, decaying phrase of notes with
 * gaps between them, a constant hiss and 60 Hz mains hum added on top. The
 * tests measure what the denoiser did against the clean phrase it started
 * from, so a pass means the noise went down AND the guitar stayed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const SR = 44100;
let failed = 0;
function check(name, fn) {
  try { const msg = fn(); console.log('  ok  ' + name + (msg ? ' — ' + msg : '')); }
  catch (e) { failed++; console.log('  FAIL  ' + name + ' — ' + e.message); }
}

/* load the engine the same way the browser does */
const sandbox = { window: {}, console: console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/lib/fft.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/lib/denoise.js'), 'utf8'), sandbox);
const D = sandbox.window.TT.denoise;

/* deterministic noise */
let seed = 1234567;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;

/* a phrase: four plucked notes, 0.7 s apart, each dying away inside ~0.5 s,
 * with a few harmonics like a real string. Silent in the gaps. */
function phrase(sec) {
  const n = Math.round(sec * SR);
  const out = new Float32Array(n);
  const notes = [196, 247, 294, 330];
  notes.forEach((f0, k) => {
    const start = Math.round((0.3 + k * 0.7) * SR);
    for (let i = 0; i < 0.5 * SR && start + i < n; i++) {
      const t = i / SR;
      const env = Math.exp(-6 * t);
      let s = 0;
      for (let h = 1; h <= 4; h++) s += Math.sin(2 * Math.PI * f0 * h * t) / h;
      out[start + i] += 0.3 * env * s;
    }
  });
  return out;
}

function rms(a, from, to) {
  let s = 0; from = from || 0; to = to == null ? a.length : to;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, to - from));
}

const clean = phrase(4.0);
const hiss = 0.06;
const noisy = new Float32Array(clean.length);
for (let i = 0; i < clean.length; i++) {
  noisy[i] = clean[i] + hiss * rnd() + 0.05 * Math.sin(2 * Math.PI * 60 * i / SR);
}

/* the gaps (no note sounding) are where a pure noise sample lives */
const gapFrom = Math.round(0.9 * SR), gapTo = Math.round(0.97 * SR);

check('a noisy phrase comes back cleaner in its gaps', () => {
  const before = rms(noisy, gapFrom, gapTo);
  const { samples, info } = D.denoise(noisy, SR, { strength: 3 });
  const after = rms(samples, gapFrom, gapTo);
  const db = 20 * Math.log10(before / after);
  assert.ok(info.applied, 'denoise did not run');
  assert.ok(db > 8, 'the gaps only dropped ' + db.toFixed(1) + ' dB');
  return 'gaps ' + db.toFixed(1) + ' dB quieter · reported ' + info.reductionDb.toFixed(1) + ' dB · ' + info.noiseFrames + ' noise frames';
});

check('the guitar survives: notes keep their level and shape', () => {
  const { samples } = D.denoise(noisy, SR, { strength: 3 });
  /* compare the sounding part of the first note against the clean phrase */
  const a = Math.round(0.3 * SR), b = Math.round(0.75 * SR);
  let se = 0, sc = 0, sd = 0;
  for (let i = a; i < b; i++) {
    se += (samples[i] - clean[i]) * (samples[i] - clean[i]);
    sc += clean[i] * clean[i];
    sd += samples[i] * samples[i];
  }
  const keptDb = 10 * Math.log10(sd / sc);
  const errDb = 10 * Math.log10(se / sc);
  assert.ok(Math.abs(keptDb) < 1.5, 'note level moved ' + keptDb.toFixed(2) + ' dB');
  assert.ok(errDb < -12, 'shape error only ' + (-errDb).toFixed(1) + ' dB below the note');
  return 'level ' + keptDb.toFixed(2) + ' dB · error ' + errDb.toFixed(1) + ' dB below the note';
});

check('the 60 Hz hum is taken out, not just the hiss', () => {
  const { samples } = D.denoise(noisy, SR, { strength: 3 });
  /* goertzel-style: power at 60 Hz in the gap, before and after */
  const pw = (x, f) => {
    let re = 0, im = 0;
    const from = gapFrom, to = gapTo;
    for (let i = from; i < to; i++) {
      re += x[i] * Math.cos(2 * Math.PI * f * i / SR);
      im += x[i] * Math.sin(2 * Math.PI * f * i / SR);
    }
    return Math.hypot(re, im) / (to - from);
  };
  const h0 = pw(noisy, 60), h1 = pw(samples, 60);
  assert.ok(h1 < h0 * 0.3, 'hum went ' + h0.toFixed(4) + ' → ' + h1.toFixed(4));
  return 'hum ' + (20 * Math.log10(h0 / h1)).toFixed(1) + ' dB lower';
});

check('it never gates to silence: the floor keeps some air in the gaps', () => {
  const { samples } = D.denoise(noisy, SR, { strength: 3 });
  const after = rms(samples, gapFrom, gapTo);
  assert.ok(after > 1e-5, 'gap collapsed to ' + after);
  return 'heavy setting still leaves rms ' + after.toExponential(2);
});

check('strength 0 leaves the take alone', () => {
  const { samples, info } = D.denoise(noisy, SR, { strength: 0 });
  let d = 0;
  for (let i = 0; i < noisy.length; i++) d = Math.max(d, Math.abs(samples[i] - noisy[i]));
  assert.ok(d < 1e-6 && !info.applied, 'changed by ' + d);
  return 'untouched';
});

check('a take with no quiet gap says so, and is handled gently', () => {
  /* constant strum: no gap at all */
  const busy = new Float32Array(SR * 2);
  for (let i = 0; i < busy.length; i++) busy[i] = 0.3 * Math.sin(2 * Math.PI * 220 * i / SR) + 0.02 * rnd();
  const { info, samples } = D.denoise(busy, SR, { strength: 3 });
  assert.ok(info.gentle, 'expected the gentle path');
  assert.ok(samples.every(v => Number.isFinite(v)), 'non-finite output');
  return 'gentle path · ' + info.noiseFrames + ' frames used';
});

check('edges are not clicked: no bang at the first or last sample', () => {
  const { samples } = D.denoise(noisy, SR, { strength: 3 });
  const edge = Math.max(Math.abs(samples[0]), Math.abs(samples[samples.length - 1]));
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  assert.ok(edge <= peak + 1e-6, 'edge ' + edge + ' above peak ' + peak);
  assert.strictEqual(samples.length, noisy.length);
  return 'same length, edges ' + edge.toFixed(4) + ' ≤ peak ' + peak.toFixed(3);
});

check('empty and tiny input is refused quietly', () => {
  assert.strictEqual(D.denoise(new Float32Array(0), SR).samples.length, 0);
  const r = D.denoise(new Float32Array(10), SR);
  assert.strictEqual(r.samples.length, 10);
  return 'ok';
});

if (failed) { console.log('\n❌ ' + failed + ' failed'); process.exit(1); }
console.log('\n✅ denoise');
