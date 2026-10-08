'use strict';
/* Unit tests for the new DSP libs: FFT, polyphonic strum analysis, sweeteners. */
const FFT = require('../public/js/lib/fft.js');
const POLY = require('../public/js/lib/poly.js');
const SWEET = require('../public/js/lib/sweeteners.js');
const NOTES = require('../public/js/lib/notes.js');
let fails = 0;
const ok = (c, l, e) => { console.log(`${c ? 'PASS' : 'FAIL'} ${l}${e !== undefined ? ' — ' + e : ''}`); if (!c) fails++; };

const SR = 44100;

/* decaying harmonic-rich "string" */
function string(f, secs, amp, harm) {
  const n = Math.floor(SR * secs);
  const out = new Float32Array(n);
  for (let h = 1; h <= (harm || 4); h++) {
    const a = amp * Math.pow(0.55, h - 1);
    for (let i = 0; i < n; i++) {
      const env = Math.exp(-i / SR * (1.1 + h * 0.35));
      out[i] += a * env * Math.sin(2 * Math.PI * f * h * i / SR + h);
    }
  }
  return out;
}

function mix(buffers, offsetsSecs) {
  const n = Math.max(...buffers.map((b, i) => b.length + Math.floor((offsetsSecs && offsetsSecs[i] || 0) * SR)));
  const out = new Float32Array(n);
  buffers.forEach((b, i) => {
    const off = Math.floor((offsetsSecs && offsetsSecs[i] || 0) * SR);
    for (let i2 = 0; i2 < b.length; i2++) out[off + i2] += b[i2];
  });
  return out;
}

/* ---------- FFT ---------- */
{
  const n = 4096;
  const f = 440;
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = Math.sin(2 * Math.PI * f * i / SR);
  const mag = FFT.magnitudeSpectrum(buf);
  let bi = 0;
  for (let i = 1; i < mag.length; i++) if (mag[i] > mag[bi]) bi = i;
  ok(Math.abs(bi * SR / n - f) < SR / n + 0.01, 'FFT peak bin matches 440 Hz', (bi * SR / n).toFixed(2) + ' Hz');
}
{
  // Goertzel on a pure sine: frequency near vs far
  const f = 110;
  const buf = new Float32Array(SR);
  for (let i = 0; i < buf.length; i++) buf[i] = 0.5 * Math.sin(2 * Math.PI * f * i / SR);
  const near = FFT.goertzel(buf, SR, f);
  const far = FFT.goertzel(buf, SR, f * 1.2);
  ok(near > far * 20, 'Goertzel power concentrated at 110 Hz', (near / far).toFixed(0) + 'x');
}

/* ---------- poly: full 6-string strum with known offsets ---------- */
{
  const base = [82.407, 110.0, 146.83, 196.0, 246.94, 329.63]; // E2 A2 D3 G3 B3 E4
  const offs = [0, 8, -12, 4, -18, 25]; // cents
  const bufs = base.map((f, i) => string(f * Math.pow(2, offs[i] / 1200), 1.6, 0.22, 4));
  const strum = mix(bufs, [0, 0.02, 0.04, 0.06, 0.08, 0.10]);
  const targets = base.map(f => ({ freq: f }));
  const res = POLY.analyzeStrum(strum, SR, targets);
  const letters = ['E', 'A', 'D', 'G', 'B', 'e'];
  res.forEach((r, i) => {
    ok(r.found, `strum: string ${letters[i]} detected`, r.found ? '' : 'not found');
    ok(Math.abs(r.cents - offs[i]) <= 3.5, `strum: ${letters[i]} cents ≈ ${offs[i] > 0 ? '+' : ''}${offs[i]}`, r.cents.toFixed(1));
  });
}

/* ---------- poly: single low E only, harmonics must be masked ---------- */
{
  const f = 82.407;
  const strum = string(f, 1.6, 0.3, 6); // strong harmonic content (H3 ≈ 247 Hz ~ B3)
  const targets = [82.407, 110.0, 146.83, 196.0, 246.94, 329.63].map(x => ({ freq: x }));
  const res = POLY.analyzeStrum(strum, SR, targets);
  ok(res[0].found && Math.abs(res[0].cents) < 3, 'single E: E found in tune', res[0].cents.toFixed(1));
  const falseFinds = res.slice(1).filter(r => r.found);
  ok(falseFinds.length === 0, 'single E: no false positives from overtones', falseFinds.map(r => r.cents.toFixed(0)).join(','));
}

/* ---------- poly: silence ---------- */
{
  const res = POLY.analyzeStrum(new Float32Array(SR), SR, [{ freq: 110 }]);
  ok(!res[0].found, 'silence: nothing found');
}

/* ---------- sweeteners ---------- */
{
  ok(SWEET.byId('jt').offsets[0] === -12, 'JT sweetener offsets low E −12');
  ok(SWEET.offsetFor('equal', null, 3) === 0, 'equal temperament gives 0 offset');
  ok(SWEET.offsetFor('custom', [1, 2, 3, 4, 5, 6], 2) === 3, 'custom offsets respected');
  ok(SWEET.offsetFor('jt', null, 9) === 0, 'out-of-range string gets 0');
  const s = SWEET.SWEETENERS;
  ok(s.length === 5 && s.every(x => x.offsets.length === 6), '5 sweeteners, 6 offsets each');
}

/* ---------- notes sanity (regression) ---------- */
{
  ok(NOTES.nameToMidi('E2') === 40, 'E2 = midi 40');
  ok(Math.abs(NOTES.midiToFreq(40) - 82.407) < 0.01, 'E2 freq ≈ 82.407');
}

console.log(fails ? `\n❌ ${fails} DSP test(s) failed` : '\n✅ ALL DSP TESTS PASSED');
process.exit(fails ? 1 : 0);
