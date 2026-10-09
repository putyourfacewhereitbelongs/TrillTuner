/* Trill Tuner — play-tools unit tests (CAGED maps, loop snap, drone, harmonics). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync(path.join(__dirname, '../public/js/playtools.js'), 'utf8');
const sandbox = {
  window: { TT: { tuner: { state: { a4: 440, presetId: 'standard' } } } },
  document: { getElementById: () => null },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  console
};
sandbox.window.document = sandbox.document;
sandbox.TT = sandbox.window.TT;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const P = sandbox.window.TT.playtools;
if (!P) { console.error('playtools did not attach to TT'); process.exit(1); }

let failed = 0;
function check(name, fn) {
  try { const msg = fn(); console.log('  ok  ' + name + (msg ? ' — ' + msg : '')); }
  catch (e) { failed++; console.log('  FAIL  ' + name + ' — ' + e.message); }
}
function eq(got, want) {
  const a = JSON.stringify(Array.from(got));
  const b = JSON.stringify(want);
  assert.strictEqual(a, b);
}

check('open E major is the E shape at fret 0', () => {
  eq(P.shapeFrets('maj', 'E', 4), [0, 2, 2, 1, 0, 0]);
});
check('G major E-shape barre is 3-5-5-4-3-3', () => {
  eq(P.shapeFrets('maj', 'E', 7), [3, 5, 5, 4, 3, 3]);
});
check('open A major is the A shape', () => {
  eq(P.shapeFrets('maj', 'A', 9), [-1, 0, 2, 2, 2, 0]);
});
check('D major A-shape barre is x-5-7-7-7-5', () => {
  eq(P.shapeFrets('maj', 'A', 2), [-1, 5, 7, 7, 7, 5]);
});
check('open C major is the C shape', () => {
  eq(P.shapeFrets('maj', 'C', 0), [-1, 3, 2, 0, 1, 0]);
});
check('open G major is the G shape', () => {
  eq(P.shapeFrets('maj', 'G', 7), [3, 2, 0, 0, 0, 3]);
});
check('G shape of E moves up an octave instead of going behind the nut', () => {
  eq(P.shapeFrets('maj', 'G', 4), [12, 11, 9, 9, 9, 12]);
});
check('open D major is the D shape', () => {
  eq(P.shapeFrets('maj', 'D', 2), [-1, -1, 0, 2, 3, 2]);
});
check('Am shape of D is x-5-7-7-6-5', () => {
  eq(P.shapeFrets('min', 'Am', 2), [-1, 5, 7, 7, 6, 5]);
});
check('Em shape of A is 5-7-7-5-5-5', () => {
  eq(P.shapeFrets('min', 'Em', 9), [5, 7, 7, 5, 5, 5]);
});
check('chord box draws muted strings and an SVG', () => {
  const svg = P.chordBox([-1, 3, 2, 0, 1, 0]);
  assert.ok(svg.indexOf('<svg') === 0, svg.slice(0, 40));
  assert.ok(svg.indexOf('>×<') > 0 || svg.indexOf('>×<') >= 0 || /×/.test(svg), 'muted mark');
  return svg.length + ' chars';
});
check('loop snap at 120 BPM 4/4 trims 4.1 s to two bars (4.0 s)', () => {
  const sr = 44100;
  const samples = new Float32Array(Math.round(4.1 * sr));
  const out = P.snapLoop(samples, sr, 120, 4);
  const sec = out.length / sr;
  assert.ok(Math.abs(sec - 4) < 0.02, 'got ' + sec + 's');
  return sec.toFixed(3) + 's';
});
check('loop snap leaves a take shorter than a third of a bar alone', () => {
  const sr = 44100;
  const samples = new Float32Array(Math.round(0.4 * sr));
  const out = P.snapLoop(samples, sr, 120, 4);
  assert.strictEqual(out.length, samples.length);
});
check('G drone is G2 plus D3 plus G3', () => {
  const f = P.droneFreqs(7, true, true);
  const g2 = 440 * Math.pow(2, (43 - 69) / 12);
  const d3 = 440 * Math.pow(2, (50 - 69) / 12);
  const g3 = 440 * Math.pow(2, (55 - 69) / 12);
  assert.ok(Math.abs(f[0] - g2) < 0.05, 'root ' + f[0]);
  assert.ok(Math.abs(f[1] - d3) < 0.05, 'fifth ' + f[1]);
  assert.ok(Math.abs(f[2] - g3) < 0.05, 'oct ' + f[2]);
  return f.map(x => x.toFixed(1)).join(' · ') + ' Hz';
});
check('natural harmonic nodes include 12/7/5 with ratios 2/3/4', () => {
  const byFret = {};
  P.HARMONICS.forEach(h => { byFret[h.fret] = h.ratio; });
  assert.strictEqual(byFret[12], 2);
  assert.strictEqual(byFret[7], 3);
  assert.strictEqual(byFret[5], 4);
  const e2 = 440 * Math.pow(2, (40 - 69) / 12);
  assert.ok(Math.abs(e2 * 2 - 82.41 * 2) < 0.2);
  return P.HARMONICS.length + ' nodes';
});
check('stop() is safe before anything has started', () => {
  P.stop();
});

if (failed) { console.log('\n❌ ' + failed + ' failed'); process.exit(1); }
console.log('\n✅ playtools');
