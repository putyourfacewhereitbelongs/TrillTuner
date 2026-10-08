/* Unit test: YIN pitch detection on synthetic plucked-string-ish signals */
'use strict';
const yin = require('../public/js/lib/yin.js');
const notes = require('../public/js/lib/notes.js');

const SR = 44100;
function synth(freq, harmonics, len, noise) {
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    let v = 0;
    for (let h = 1; h <= harmonics; h++) {
      v += (1 / (h * h)) * Math.sin(2 * Math.PI * freq * h * i / SR);
    }
    v += (Math.random() * 2 - 1) * (noise || 0);
    buf[i] = v;
  }
  return buf;
}

function testFreq(f, label, opts) {
  opts = opts || {};
  const buf = synth(f, opts.harmonics || 6, opts.len || 2048, opts.noise || 0);
  const r = yin.yin(buf, SR, opts.threshold || 0.12);
  if (!r) { console.log(`FAIL ${label}: no detection (f=${f})`); return false; }
  const cents = 1200 * Math.log2(r.freq / f);
  const pass = Math.abs(cents) < 3;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: target ${f.toFixed(2)} Hz -> ${r.freq.toFixed(2)} Hz (${cents >= 0 ? '+' : ''}${cents.toFixed(2)} cents, clarity ${r.clarity.toFixed(2)})`);
  return pass;
}

let ok = true;
// standard tuning strings (guitar profile: rich harmonics)
[[82.41, 'Low E2'], [110.0, 'A2'], [146.83, 'D3'], [196.0, 'G3'], [246.94, 'B3'], [329.63, 'E4']].forEach(p => {
  ok = testFreq(p[0], p[1], { harmonics: 8, noise: 0.002 }) && ok;
});
// slightly detuned strings
ok = testFreq(110 * Math.pow(2, 15 / 1200), 'A2 +15¢', { harmonics: 6 }) && ok;
ok = testFreq(82.41 * Math.pow(2, -22 / 1200), 'E2 −22¢', { harmonics: 6 }) && ok;
// bass path: decimated E1 41.2 Hz
(function () {
  const f = 41.2;
  const raw = synth(f, 6, 4096, 0.002);
  const dec = yin.downsample2(raw);
  const r = yin.yin(dec, SR / 2, 0.12);
  const cents = r ? 1200 * Math.log2(r.freq / f) : NaN;
  const pass = r && Math.abs(cents) < 3;
  console.log(`${pass ? 'PASS' : 'FAIL'} Bass E1 (decimated): ${r ? r.freq.toFixed(2) + ' Hz (' + cents.toFixed(2) + '¢)' : 'no detection'}`);
  ok = pass && ok;
})();
// silence/noise must not detect
(function () {
  const buf = synth(0, 0, 2048, 0.05); // pure noise
  const r = yin.yin(buf, SR, 0.12);
  const pass = !r || r.clarity < 0.5;
  console.log(`${pass ? 'PASS' : 'FAIL'} Noise rejection: ${r ? 'detected ' + r.freq.toFixed(1) + ' Hz clarity ' + r.clarity.toFixed(2) : 'no detection'}`);
  ok = pass && ok;
})();
// notes helper sanity
(function () {
  const m = notes.nameToMidi('E2');
  const pass = m === 40 && notes.nameToMidi('Eb2') === 39 && notes.nameToMidi('Gb3') === 54 && notes.nameToMidi('A4') === 69;
  console.log(`${pass ? 'PASS' : 'FAIL'} nameToMidi: E2=${notes.nameToMidi('E2')} Eb2=${notes.nameToMidi('Eb2')} Gb3=${notes.nameToMidi('Gb3')} A4=${notes.nameToMidi('A4')}`);
  ok = pass && ok;
  const n = notes.freqToNote(440);
  const p = n.letter === 'A' && n.octave === 4 && Math.abs(n.cents) < 1;
  console.log(`${p ? 'PASS' : 'FAIL'} freqToNote 440 -> ${n.label} (${n.cents}¢)`);
  ok = p && ok;
  const f = notes.midiToFreq(notes.nameToMidi('E2'));
  const q = Math.abs(f - 82.407) < 0.01;
  console.log(`${q ? 'PASS' : 'FAIL'} midiToFreq E2 -> ${f.toFixed(3)} Hz`);
  ok = q && ok;
})();

console.log(ok ? '\nALL TESTS PASSED' : '\nSOME TESTS FAILED');
process.exit(ok ? 0 : 1);
