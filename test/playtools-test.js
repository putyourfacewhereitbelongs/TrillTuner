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

/* --------------------------------------------------------------------- */
/* looper auto-align                                                     */
/* --------------------------------------------------------------------- */

const SR = 44100;

/* a note: a decaying burst, so there is a real onset for the tempo detector
 * to find and a real tail for the silence trimmer to ignore */
function burstInto(buf, atSec, durSec, freq, amp) {
  const n = Math.round(durSec * SR);
  for (let i = 0; i < n && atSec * SR + i < buf.length; i++) {
    const t = i / SR;
    buf[Math.round(atSec * SR) + i] += amp * Math.sin(2 * Math.PI * freq * t) * Math.exp(-4 * t);
  }
  return buf;
}
function tone(sec, freq, amp) {
  const n = Math.round(sec * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin(2 * Math.PI * freq * i / SR);
  return out;
}
function seamJump(x) { return Math.abs(x[x.length - 1] - x[0]); }
function meanStep(x) {
  let s = 0;
  for (let i = 1; i < x.length; i++) s += Math.abs(x[i] - x[i - 1]);
  return s / (x.length - 1);
}
function peakOf(x) { let p = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > p) p = v; } return p; }

check('trimSilence cuts the dead air off both ends of a phrase', () => {
  const body = tone(1.0, 220, 0.5);
  const x = new Float32Array(Math.round(2.0 * SR));
  x.set(body, Math.round(0.5 * SR));
  const t = P.trimSilence(x, SR);
  const startSec = t.start / SR, endSec = t.end / SR;
  /* 15 ms of pre-roll is kept so the attack is not clipped */
  assert.ok(startSec > 0.46 && startSec < 0.5, 'start ' + startSec);
  assert.ok(endSec > 1.45 && endSec < 1.55, 'end ' + endSec);
  return startSec.toFixed(3) + 's → ' + endSec.toFixed(3) + 's';
});

check('trimSilence derives its threshold from the take, not a fixed number', () => {
  const noisy = new Float32Array(Math.round(2.0 * SR));
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < noisy.length; i++) noisy[i] = (rnd() - 0.5) * 0.02;   /* room */
  noisy.set(tone(0.8, 330, 0.4), Math.round(0.6 * SR));                    /* phrase */
  const t = P.trimSilence(noisy, SR);
  assert.ok(t.threshold > 0.02, 'threshold should sit above the room: ' + t.threshold);
  assert.ok(t.start / SR > 0.5 && t.start / SR < 0.62, 'start ' + t.start / SR);
  assert.ok(t.end / SR > 1.3 && t.end / SR < 1.5, 'end ' + t.end / SR);
  return 'thr ' + t.threshold.toFixed(4) + ' over a 0.02 room';
});

check('detectTempo reads 120 BPM off four onsets half a second apart', () => {
  const x = new Float32Array(Math.round(4 * SR));
  for (let b = 0; b < 8; b++) burstInto(x, b * 0.5, 0.22, 220, 0.6);
  const bpm = P.detectTempo(x, SR);
  assert.strictEqual(bpm, 120, 'got ' + bpm);
  return bpm + ' BPM';
});

check('detectTempo reads 92 BPM when that is what was played', () => {
  const beat = 60 / 92;
  const x = new Float32Array(Math.round(6 * SR));
  for (let b = 0; b * beat < 6; b++) burstInto(x, b * beat, 0.18, 196, 0.5);
  const bpm = P.detectTempo(x, SR);
  assert.ok(Math.abs(bpm - 92) <= 1, 'got ' + bpm);
  return bpm + ' BPM';
});

check('detectTempo gives up on silence rather than inventing a tempo', () => {
  assert.strictEqual(P.detectTempo(new Float32Array(SR), SR), 0);
});

check('alignTake lands a 4.1 s take on exactly two bars at 120 BPM', () => {
  const x = new Float32Array(Math.round(4.1 * SR));
  for (let b = 0; b < 8; b++) burstInto(x, b * 0.5, 0.3, 220, 0.5);
  const r = P.alignTake(x, SR, { bpm: 120, bpb: 4 });
  const sec = r.samples.length / SR;
  assert.ok(Math.abs(sec - 4) < 0.001, 'got ' + sec + 's');
  assert.strictEqual(r.info.bars, 2);
  assert.strictEqual(r.info.bpm, 120);
  assert.ok(r.info.quantized);
  return sec.toFixed(3) + 's · ' + r.info.bars + ' bars';
});

check('alignTake finds the grid itself when no metronome tempo is given', () => {
  const beat = 60 / 100;
  const x = new Float32Array(Math.round(5.0 * SR));
  for (let b = 0; b * beat < 5.0; b++) burstInto(x, b * beat, 0.25, 174, 0.55);
  const r = P.alignTake(x, SR, {});
  const bar = (60 / r.info.bpm) * 4;
  const bars = r.samples.length / SR / bar;
  assert.ok(r.info.quantized, 'should have found a grid at all');
  assert.ok(Math.abs(bars - Math.round(bars)) < 0.001,
    'length ' + (r.samples.length / SR).toFixed(4) + 's is ' + bars + ' bars of ' + bar + 's');
  assert.ok(Math.abs(r.info.bpm - 100) <= 2, 'detected ' + r.info.bpm);
  return r.info.bpm + ' BPM · ' + Math.round(bars) + ' bar(s) · ' + (r.samples.length / SR).toFixed(3) + 's';
});

check('alignTake never claims a whole-bar loop it did not produce', () => {
  /* 3.8 s of sound at 120 BPM is 1.9 bars: the nearest count that fits is 2
   * (the trailing decay covers it), and if it did not fit we would have to
   * hear about it rather than get a loop that drifts */
  const x = new Float32Array(Math.round(4.1 * SR));
  for (let b = 0; b < 8; b++) burstInto(x, b * 0.5, 0.3, 220, 0.5);
  const r = P.alignTake(x, SR, { bpm: 120, bpb: 4 });
  const bar = (60 / 120) * 4;
  if (r.info.quantized) {
    assert.ok(Math.abs(r.samples.length / SR / bar - r.info.bars) < 0.001,
      'reported ' + r.info.bars + ' bars but the buffer is ' + (r.samples.length / SR / bar));
  }
  assert.ok(r.samples.length / SR <= x.length / SR + 1e-6, 'grew past the source');
  return (r.samples.length / SR).toFixed(3) + 's = ' + (r.samples.length / SR / bar) + ' bars';
});

check('alignTake drops the trailing dead air instead of looping it', () => {
  /* a 1.9 s phrase sitting in 4 s of tape: the bar it lands on is 2 s, so
   * roughly 1.5 s of room tone has to be thrown away rather than looped */
  const x = new Float32Array(Math.round(4 * SR));
  x.set(tone(1.9, 220, 0.5), Math.round(0.5 * SR));
  const r = P.alignTake(x, SR, { bpm: 120, bpb: 4 });
  assert.ok(r.info.trimEnd > 1.0, 'only reported ' + r.info.trimEnd + 's dropped');
  const t = P.trimSilence(r.samples, SR);
  const covered = (t.end - t.start) / r.samples.length;
  assert.ok(covered > 0.9, 'only ' + covered.toFixed(2) + ' of the loop has sound in it');
  return (r.samples.length / SR).toFixed(2) + 's loop · ' + r.info.trimEnd.toFixed(2) +
    's of air dropped · ' + (covered * 100).toFixed(0) + '% covered';
});

check('alignTake folds the seam so looping does not click', () => {
  /* 110.3125 Hz over exactly two bars at 120 BPM is 441.25 cycles, so the
   * loop point is a quarter cycle away from where it started: without a fold
   * that is a jump of nearly the full amplitude, every time round */
  const F = 110.3125;
  const len = Math.round(4 * SR);
  const x = new Float32Array(len + Math.round(0.05 * SR));
  for (let i = 0; i < x.length; i++) x[i] = 0.8 * Math.sin(2 * Math.PI * F * i / SR);
  const r = P.alignTake(x, SR, { bpm: 120, bpb: 4 });
  const out = r.samples;
  assert.strictEqual(out.length, len, 'length ' + out.length);
  assert.strictEqual(r.info.bars, 2);
  assert.ok(r.info.folded, 'seam should have been folded');
  const folded = seamJump(out), unfolded = seamJump(x.subarray(0, len));
  assert.ok(unfolded > 0.5, 'test signal should have a bad raw seam, got ' + unfolded);
  assert.ok(folded < meanStep(out) * 4, 'folded seam ' + folded + ' vs mean step ' + meanStep(out));
  assert.ok(folded < unfolded / 5, 'folded ' + folded + ' not better than unfolded ' + unfolded);
  return 'seam ' + folded.toFixed(5) + ' vs ' + unfolded.toFixed(5) + ' unfolded';
});

check('alignTake removes the DC offset that makes a loop point pop', () => {
  const x = tone(2.0, 220, 0.3);
  for (let i = 0; i < x.length; i++) x[i] += 0.25;
  const r = P.alignTake(x, SR, {});
  let mean = 0;
  for (let i = 0; i < r.samples.length; i++) mean += r.samples[i];
  mean /= r.samples.length;
  assert.ok(Math.abs(mean) < 1e-4, 'mean still ' + mean);
  assert.ok(Math.abs(r.info.dc - 0.25) < 0.01, 'reported dc ' + r.info.dc);
  return 'was ' + r.info.dc.toFixed(3) + ', now ' + mean.toFixed(6);
});

check('alignTake keeps the level under the ceiling and lifts a quiet take', () => {
  const hot = tone(1.0, 220, 1.0);
  for (let i = 0; i < hot.length; i++) hot[i] *= 1.4;
  const quiet = P.alignTake(tone(1.0, 220, 0.05), SR, {});
  const loud = P.alignTake(hot, SR, {});
  assert.ok(peakOf(loud.samples) <= 1.0, 'hot peak ' + peakOf(loud.samples));
  assert.ok(peakOf(quiet.samples) > 0.8, 'quiet peak ' + peakOf(quiet.samples));
  return 'quiet ' + peakOf(quiet.samples).toFixed(2) + ', hot ' + peakOf(loud.samples).toFixed(2);
});

check('alignTake honours a grid-locked take: exact bars, pre-roll not played', () => {
  /* what loopRecStop hands over when the metronome drove the recording:
   * `off` samples of pre-roll, exactly two bars, `off` samples of post-roll */
  const bpm = 120, bpb = 4, bars = 2;
  const off = Math.round(0.03 * SR);
  const len = Math.round((60 / bpm) * bpb * bars * SR);
  const x = new Float32Array(off + len + off);
  for (let i = off; i < off + len; i++) x[i] = 0.6 * Math.sin(2 * Math.PI * 146.83 * (i - off) / SR);
  /* put a marker in the pre-roll so we can prove it is not what gets played */
  for (let i = 0; i < off; i++) x[i] = 0.9;
  const r = P.alignTake(x, SR, { bpm: bpm, bpb: bpb, bars: bars, offset: off });
  assert.strictEqual(r.samples.length, len, 'length ' + r.samples.length + ' vs ' + len);
  assert.strictEqual(r.info.bars, bars);
  /* the first samples of the loop come from the downbeat, not the pre-roll */
  assert.ok(Math.abs(r.samples[Math.round(off / 2)]) < 0.9,
    'pre-roll leaked into the loop: ' + r.samples[Math.round(off / 2)]);
  return bars + ' bars · ' + (r.samples.length / SR).toFixed(3) + 's · offset ' + off;
});

check('alignTake leaves a take shorter than the minimum alone', () => {
  const x = tone(0.1, 220, 0.5);
  const r = P.alignTake(x, SR, { bpm: 120, bpb: 4 });
  assert.ok(r.samples.length <= x.length, 'grew to ' + r.samples.length);
  assert.ok(!r.info.quantized);
});

check('alignTake survives an empty take and a missing sample rate', () => {
  assert.strictEqual(P.alignTake(null, SR, {}).samples, null);
  const empty = P.alignTake(new Float32Array(0), SR, {});
  assert.strictEqual(empty.samples.length, 0);
  const noSr = P.alignTake(tone(0.5, 220, 0.3), 0, {});
  assert.ok(noSr.samples.length > 0);
});

check('crossfadeSeam shortens by the fade and keeps the loop continuous', () => {
  const x = new Float32Array(2 * SR);
  for (let i = 0; i < x.length; i++) x[i] = 0.7 * Math.sin(2 * Math.PI * 137 * i / SR);
  const out = P.crossfadeSeam(x, SR, 0.03);
  const n = Math.floor(0.03 * SR);
  assert.strictEqual(out.length, x.length - n);
  assert.ok(seamJump(out) < meanStep(out) * 4, 'seam ' + seamJump(out));
  return out.length + ' samples, seam ' + seamJump(out).toFixed(5);
});

check('five take slots exist and switching between them is bounded', () => {
  assert.strictEqual(P.TAKE_NAMES.length, 5);
  assert.deepStrictEqual(P.state.loop.takes.length, 5);
  assert.strictEqual(P.state.loop.slot, 0);
  P.selectTake(3);
  assert.strictEqual(P.state.loop.slot, 3);
  P.selectTake(99);            /* out of range is ignored, not wrapped */
  assert.strictEqual(P.state.loop.slot, 3);
  P.selectTake(-1);
  assert.strictEqual(P.state.loop.slot, 3);
  P.selectTake(0);
  assert.strictEqual(P.state.loop.slot, 0);
  return P.TAKE_NAMES.join(' ');
});

if (failed) { console.log('\n❌ ' + failed + ' failed'); process.exit(1); }
console.log('\n✅ playtools');
