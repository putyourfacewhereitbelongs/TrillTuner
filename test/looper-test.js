/* Trill Tuner — looper end-to-end tests.
 *
 * These drive the real recording pipeline the way the browser does: a fake
 * AudioContext that hands back timestamped buffers, a fake metronome that
 * fires beats on a clock, and the actual loopRecStart / loopRecStop /
 * alignTake code from public/js/playtools.js. The question they answer is
 * the one the feature is sold on: when you press Rec with a metronome
 * running, does the loop you get back start on the downbeat and run to an
 * exact number of bars?
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const SR = 44100;

let failed = 0;
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(msg => console.log('  ok  ' + name + (msg ? ' — ' + msg : '')))
    .catch(e => { failed++; console.log('  FAIL  ' + name + ' — ' + e.message); });
}

/* ---------- fake browser -------------------------------------------- */

function mkEl(id) {
  const e = {
    id: id, textContent: '', value: '', checked: false, dataset: {}, innerHTML: '',
    style: {}, title: '', childElementCount: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    querySelectorAll() { return []; }, appendChild() {}, cloneNode() { return mkEl(id); },
    getContext() { return null; }
  };
  return e;
}

/* A whole recording session: elements, audio graph, metronome and a clock
 * we advance by hand so the test is deterministic. */
function session(opts) {
  opts = opts || {};
  const sr = opts.sr || SR;
  const els = {};
  const want = {
    'pt-loop-rec': {}, 'pt-loop-play': {}, 'pt-loop-status': {}, 'pt-loop-half': {},
    'pt-loop-takes': {}, 'pt-loop-take-label': {}, 'pt-loop-vol': { value: '0.9' },
    'pt-loop-snap': { checked: opts.align !== false },
    'pt-loop-countin': { checked: opts.countin !== false },
    'pt-loop-overdub': { checked: !!opts.overdub },
    'pt-loop-bars': { value: String(opts.bars || 2) }
  };
  const document = {
    getElementById(id) {
      if (!(id in want)) return null;              /* canvas etc: deliberately absent */
      if (!els[id]) { els[id] = mkEl(id); Object.assign(els[id], want[id]); }
      return els[id];
    },
    createElement() { return mkEl('div'); },
    addEventListener() {}
  };

  let sp = null;
  const started = [];
  const ctx = {
    sampleRate: sr,
    currentTime: 0,
    destination: {},
    createGain() {
      return {
        gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} },
        connect() {}, disconnect() {}
      };
    },
    createBuffer(ch, len, rate) {
      const d = new Float32Array(len);
      return { length: len, sampleRate: rate, numberOfChannels: ch, getChannelData: () => d };
    },
    createBufferSource() {
      const n = {
        buffer: null, loop: false, playbackRate: { value: 1 },
        connect() {}, disconnect() {}, start() { started.push(n); }, stop() {}
      };
      return n;
    },
    createScriptProcessor(bs) { sp = { bufferSize: bs, onaudioprocess: null, connect() {}, disconnect() {} }; return sp; }
  };

  const audio = {
    ctx: ctx, micState: 'on', _silent: null,
    ensure() { return ctx; },
    startMic() { this.micState = 'on'; return Promise.resolve(); },
    tapNode() { return { connect() {}, disconnect() {} }; }
  };

  const metro = {
    state: { bpm: opts.bpm || 120, bpb: opts.bpb || 4, subdiv: 1, vol: 0.9 },
    _hooks: [], _playing: opts.metronomeOff ? false : true,
    isPlaying() { return this._playing; },
    start() { this._playing = true; },
    stop() { this._playing = false; },
    onBeat(cb) {
      const h = { cb: cb };
      this._hooks.push(h);
      const self = this;
      return function () { self._hooks = self._hooks.filter(x => x !== h); };
    },
    fire(time, idx, accent) { this._hooks.slice().forEach(h => h.cb(time, idx, accent)); }
  };

  const timers = [];
  const sandbox = {
    window: { TT: { tuner: { state: { a4: 440, presetId: 'standard' } } } },
    document: document,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    setTimeout: (fn, ms) => { timers.push({ fn: fn, ms: ms }); return timers.length; },
    clearTimeout: () => {},
    console: console,
    Date: Date, Math: Math, Float32Array: Float32Array
  };
  sandbox.window.document = document;
  sandbox.window.TT.audio = audio;
  sandbox.window.TT.metronome = metro;
  sandbox.TT = sandbox.window.TT;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/playtools.js'), 'utf8'), sandbox);
  const P = sandbox.window.TT.playtools;
  if (!P) throw new Error('playtools did not attach to TT');

  return {
    P: P, els: els, audio: audio, ctx: ctx, metro: metro, timers: timers, sr: sr,
    get sp() { return sp; },
    started: started,
    status() { return els['pt-loop-status'] ? els['pt-loop-status'].textContent : ''; },
    el(id) { return document.getElementById(id); },
    fireTimers() { const t = timers.splice(0, timers.length); t.forEach(x => x.fn()); }
  };
}

/* Feed the ScriptProcessor timestamped buffers and fire metronome beats,
 * both in time order, exactly as the browser's render thread would. */
function run(s, opts) {
  const sr = s.sr;
  const chunkSec = 4096 / sr;
  const beat = 60 / s.metro.state.bpm;
  const events = [];
  for (let t = opts.from; t < opts.to; t += chunkSec) events.push({ kind: 'chunk', at: t + chunkSec });
  /* beat indexes count from the metronome's downbeat, like the real scheduler:
   * opts.firstIdx says which beat of the bar the first fired beat was */
  const bpb = s.metro.state.bpb, firstIdx = opts.firstIdx || 0;
  for (let k = 0; opts.firstBeat + k * beat < opts.to; k++) {
    events.push({ kind: 'beat', at: opts.firstBeat + k * beat, idx: (k + firstIdx) % bpb });
  }
  events.sort((a, b) => a.at - b.at || (a.kind === 'beat' ? -1 : 1));
  const seen = [];
  events.forEach(ev => {
    if (ev.kind === 'beat') {
      s.metro.fire(ev.at, ev.idx, ev.idx === 0);
      seen.push('beat@' + ev.at.toFixed(3));
    } else {
      /* the capture cap can detach the processor mid-run; a real render
       * thread simply stops calling it, so neither do we */
      if (!s.sp || typeof s.sp.onaudioprocess !== 'function') return;
      const n = 4096;
      const data = new Float32Array(n);
      for (let i = 0; i < n; i++) data[i] = opts.sig(ev.at - chunkSec + (i + 1) / sr);
      s.sp.onaudioprocess({ inputBuffer: { getChannelData: () => data, length: n }, playbackTime: ev.at });
    }
    if (opts.until && opts.until(s)) { /* allow early bail */ }
    if (opts.afterChunk) opts.afterChunk(s, ev.at);
  });
  if (opts.beforeTimers) opts.beforeTimers(s);
  s.fireTimers();
  return seen;
}

/* ---------- the tests ----------------------------------------------- */

(async function main() {
  await check('a metronome-driven take comes back as exactly two bars, starting on the downbeat', async () => {
    const s = session({ bpm: 120, bpb: 4, bars: 2 });
    const P = s.P, sr = s.sr;
    const beat = 0.5;
    const startAt = 10.1 + 4 * beat;               /* four count-in beats */
    const loopSec = 2 * beat * 4;                  /* 2 bars = 4 s */
    /* before the downbeat: a 5 kHz whine that must never reach the loop.
     * after it: a tone whose period is exactly one beat, so it is continuous
     * (unlike a resetting ramp, whose own jump would swamp the measurement)
     * and any drift from the grid shows up immediately. */
    const sig = t => t < startAt
      ? 0.9 * Math.sin(2 * Math.PI * 5000 * t)
      : 0.6 * Math.sin(2 * Math.PI * (t - startAt) / beat);

    await P.loopRecStart();
    run(s, { from: 10.0, to: 10.1 + 12 * beat + 0.4, firstBeat: 10.1, sig: sig });
    P.loopRecStop();

    const take = P.state.loop.takes[0];
    assert.ok(take, 'nothing was stored in take A');
    assert.strictEqual(take.samples.length, Math.round(loopSec * sr),
      'loop is ' + take.samples.length + ' samples, wanted ' + Math.round(loopSec * sr));
    assert.strictEqual(take.bars, 2);
    assert.strictEqual(take.bpm, 120);
    assert.ok(take.grid, 'should be flagged as grid-locked');

    /* the 5 kHz count-in marker must not have leaked into the loop: the beat
     * tone never moves more than 1.7e-4 per sample, the whine moves 0.64 */
    let maxStep = 0;
    for (let i = 1; i < take.samples.length; i++) {
      const d = Math.abs(take.samples[i] - take.samples[i - 1]);
      if (d > maxStep) maxStep = d;
    }
    assert.ok(maxStep < 0.01, 'pre-roll leaked in: max step ' + maxStep);

    /* and the beat period is exact, sample for sample */
    const period = Math.round(beat * sr);
    for (let k = 1; k <= 7; k++) {
      const i = 2000, j = i + period * k;
      if (j >= take.samples.length) break;
      assert.ok(Math.abs(take.samples[j] - take.samples[i]) < 1e-3,
        'beat ' + k + ' drifted: ' + take.samples[j] + ' vs ' + take.samples[i]);
    }
    return '2 bars · ' + (take.samples.length / sr).toFixed(3) + 's · max step ' + maxStep.toExponential(2);
  });

  await check('the count-in is what keeps the loop off the record-button fumble', async () => {
    const s = session({ bpm: 90, bpb: 3, bars: 1 });
    const P = s.P, sr = s.sr;
    const beat = 60 / 90;
    const startAt = 10.1 + 3 * beat;               /* 3 beats: one bar of 3/4 */
    const sig = t => t < startAt ? 0.9 * Math.sin(2 * Math.PI * 5000 * t) : 0.7 * ((t - startAt) / beat % 1);
    await P.loopRecStart();
    assert.ok(/Armed/.test(s.status()), 'status was: ' + s.status());
    run(s, { from: 10.0, to: startAt + 3 * beat + 0.5, firstBeat: 10.1, sig: sig });
    P.loopRecStop();
    const take = P.state.loop.takes[0];
    assert.ok(take, 'nothing stored');
    const want = Math.round(3 * beat * sr);
    assert.strictEqual(take.samples.length, want, 'got ' + take.samples.length + ' want ' + want);
    assert.strictEqual(take.bars, 1);
    assert.strictEqual(take.bpb, 3, 'should follow the metronome time signature');
    return '1 bar of 3/4 at 90 BPM · ' + (take.samples.length / sr).toFixed(3) + 's';
  });

  await check('without a metronome it still trims the air and lands on whole bars', async () => {
    const s = session({ bpm: 120, bpb: 4, align: false });
    const P = s.P, sr = s.sr;
    /* free recording: no beats are fired, and the phrase sits inside dead air */
    const sig = t => (t > 10.4 && t < 12.3) ? 0.5 * Math.sin(2 * Math.PI * 220 * t) : 0;
    await P.loopRecStart();
    run(s, { from: 10.0, to: 13.2, firstBeat: 1e9, sig: sig });
    P.loopRecStop();
    const take = P.state.loop.takes[0];
    assert.ok(take, 'nothing stored');
    assert.ok(!take.grid, 'should not claim to be grid-locked');
    const r = P.alignTake(take.samples, sr, { bpm: 0 });   /* re-measure what it holds */
    const t = P.trimSilence(take.samples, sr);
    const covered = (t.end - t.start) / take.samples.length;
    assert.ok(covered > 0.85, 'only ' + covered.toFixed(2) + ' of the loop has sound in it');
    assert.ok(take.samples.length / sr < 2.6, 'loop is ' + take.samples.length / sr + 's, the air came along');
    return (take.samples.length / sr).toFixed(2) + 's · ' + (covered * 100).toFixed(0) + '% covered' +
      (r.info.bpm ? ' · read as ' + r.info.bpm + ' BPM' : '');
  });

  await check('five takes are independent and switching keeps them separate', async () => {
    const s = session({ bpm: 120, bpb: 4, bars: 1 });
    const P = s.P, sr = s.sr;
    const beat = 0.5;
    const freqs = [220, 330, 440];
    const got = [];
    for (let slot = 0; slot < 3; slot++) {
      P.selectTake(slot);
      const startAt = 10.1 + 4 * beat;
      const sig = t => t < startAt ? 0 : 0.6 * Math.sin(2 * Math.PI * freqs[slot] * (t - startAt));
      await P.loopRecStart();
      run(s, { from: 10.0, to: startAt + 4 * beat + 0.4, firstBeat: 10.1, sig: sig });
      P.loopRecStop();
      got.push(P.state.loop.takes[slot] ? P.state.loop.takes[slot].samples.length : 0);
    }
    assert.strictEqual(P.state.loop.takes.length, 5);
    const barLen = Math.round(4 * beat * sr);          /* one bar of 4/4 */
    assert.ok(got.every(n => n === barLen), 'take lengths ' + got.join(',') + ' want ' + barLen);
    assert.strictEqual(P.state.loop.takes[3], null, 'take D should still be empty');
    assert.strictEqual(P.state.loop.takes[4], null, 'take E should still be empty');
    /* the takes really are different recordings, not three copies */
    const a = P.state.loop.takes[0].samples, b = P.state.loop.takes[1].samples;
    let same = 0;
    for (let i = 2000; i < a.length; i += 97) if (a[i] === b[i]) same++;
    assert.strictEqual(same, 0, 'takes 1 and 2 are identical');
    P.selectTake(2);
    assert.strictEqual(P.state.loop.slot, 2);
    return 'A/B/C filled (' + got.map(n => (n / sr).toFixed(2) + 's').join(' ') + '), D/E empty';
  });

  await check('overdub stacks onto the active take instead of replacing it', async () => {
    const s = session({ bpm: 120, bpb: 4, bars: 1 });
    const P = s.P;
    const beat = 0.5;
    const startAt = 10.1 + 4 * beat;
    await P.loopRecStart();
    run(s, { from: 10.0, to: startAt + 4 * beat + 0.4, firstBeat: 10.1, sig: t => t < startAt ? 0 : 0.4 });
    P.loopRecStop();
    const before = P.state.loop.takes[0].samples.slice();

    s.el('pt-loop-overdub').checked = true;
    await P.loopRecStart();
    run(s, { from: 10.0, to: startAt + 4 * beat + 0.4, firstBeat: 10.1, sig: t => t < startAt ? 0 : 0.3 });
    P.loopRecStop();
    const after = P.state.loop.takes[0].samples;

    assert.strictEqual(after.length, before.length, 'overdub changed the loop length');
    let lifted = 0;
    for (let i = 2000; i < after.length; i += 53) if (Math.abs(after[i]) > Math.abs(before[i])) lifted++;
    assert.ok(lifted > 100, 'the second pass did not add anything (' + lifted + ' samples louder)');
    assert.ok(P.state.loop.takes[0].prev, 'undo should have something to go back to');
    return lifted + ' samples louder, undo armed';
  });

  await check('overdubbing a shorter pass keeps the loop length and tells the truth about it', async () => {
    /* bank 2 bars, then overdub 1 bar onto it. The loop must stay 2 bars —
     * the second bar is still the original pass — and it must not start
     * describing itself as a 1-bar loop. */
    const s = session({ bpm: 120, bpb: 4, bars: 2 });
    const P = s.P, sr = s.sr;
    const beat = 0.5;
    const startAt = 10.1 + 4 * beat;
    await P.loopRecStart();
    run(s, { from: 10.0, to: startAt + 2 * beat * 4 + 0.4, firstBeat: 10.1, sig: t => t < startAt ? 0 : 0.3 });
    P.loopRecStop();
    const base = P.state.loop.takes[0];
    const baseLen = base.samples.length;
    assert.strictEqual(base.bars, 2, 'base take should be 2 bars, says ' + base.bars);

    s.el('pt-loop-overdub').checked = true;
    s.el('pt-loop-bars').value = '1';
    await P.loopRecStart();
    run(s, { from: 10.0, to: startAt + 2 * beat * 4 + 0.4, firstBeat: 10.1, sig: t => t < startAt ? 0 : 0.3 });
    P.loopRecStop();

    const after = P.state.loop.takes[0];
    assert.strictEqual(after.samples.length, baseLen,
      'loop length changed from ' + baseLen + ' to ' + after.samples.length);
    assert.strictEqual(after.bars, 2,
      'a 2-bar loop is being described as ' + after.bars + ' bar(s) after a 1-bar overdub');
    assert.strictEqual(Math.round(after.samples.length / sr / ((60 / 120) * 4)), after.bars,
      'bars field disagrees with the buffer length');
    return after.bars + ' bars kept · ' + (after.samples.length / sr).toFixed(2) + 's';
  });

  await check('a tempo change during the take does not re-measure it against a grid it was never played on', async () => {
    const s = session({ bpm: 120, bpb: 4, bars: 2 });
    const P = s.P, sr = s.sr;
    const beat = 0.5;
    const startAt = 10.1 + 4 * beat;
    const sig = t => t < startAt ? 0 : 0.6 * Math.sin(2 * Math.PI * (t - startAt) / beat);
    await P.loopRecStart();
    /* the player nudges the metronome up just as the take is wrapping up */
    run(s, {
      from: 10.0, to: 10.1 + 12 * beat + 0.4, firstBeat: 10.1, sig: sig,
      beforeTimers: () => { s.metro.state.bpm = 160; }
    });
    P.loopRecStop();
    const take = P.state.loop.takes[0];
    assert.ok(take, 'nothing stored');
    /* two bars at the 120 BPM it was armed at — not 2 bars of 160 BPM, which
     * would be a third shorter than what was actually played */
    assert.strictEqual(take.samples.length, Math.round(4 * sr),
      'loop is ' + (take.samples.length / sr).toFixed(3) + 's, should be 4.000s');
    assert.strictEqual(take.bpm, 120, 'labelled ' + take.bpm + ' BPM, was recorded at 120');
    assert.strictEqual(take.bars, 2);
    return '2 bars · ' + (take.samples.length / sr).toFixed(3) + 's at ' + take.bpm +
      ' BPM, metronome had moved to ' + s.metro.state.bpm;
  });

  await check('a take that runs out of audio mid-way comes back honest, not padded with silence', async () => {
    /* 8 bars of 4/4 at 60 BPM is 32 s, but only 31 s of tape is fed in, so
     * the beat that would have stopped the take never arrives. Whatever
     * lands has to be real audio and a whole number of bars — not the zeros
     * the slice buffer started out with. */
    const s = session({ bpm: 60, bpb: 4, bars: 8 });
    const P = s.P, sr = s.sr;
    const beat = 1.0;
    const startAt = 10.1 + 4 * beat;
    const sig = t => t < startAt ? 0 : 0.5 * Math.sin(2 * Math.PI * (t - startAt) / beat);
    await P.loopRecStart();
    run(s, { from: 10.0, to: 10.0 + 31, firstBeat: 10.1, sig: sig });
    P.loopRecStop();
    const take = P.state.loop.takes[0];
    assert.ok(take, 'nothing stored');
    /* the last half second of the loop must still be playing, not dead air */
    const tailN = Math.round(sr * 0.5);
    let tailPeak = 0;
    for (let i = take.samples.length - tailN; i < take.samples.length; i++) {
      const v = Math.abs(take.samples[i]);
      if (v > tailPeak) tailPeak = v;
    }
    assert.ok(tailPeak > 0.05, 'the loop ends in ' + tailPeak.toFixed(4) + ' of dead air');
    const sec = take.samples.length / sr;
    const barSec = (60 / 60) * 4;
    assert.ok(Math.abs(sec / barSec - Math.round(sec / barSec)) < 0.001,
      sec.toFixed(3) + 's is not a whole number of ' + barSec + 's bars');
    assert.ok(take.bars < 8, 'claimed all 8 bars from ' + sec.toFixed(1) + 's of tape');
    assert.ok(/cut short/.test(s.status()), 'should say it came up short: ' + s.status());
    return sec.toFixed(2) + 's · ' + take.bars + ' of 8 bars · tail peak ' + tailPeak.toFixed(3);
  });

  await check('the capture ceiling covers what was asked for — 8 slow bars are not clipped', async () => {
    /* the old flat 30 s cap cut this take off two beats early; 8 bars of 4/4
     * at 60 BPM plus a bar of count-in is 36 s and has to survive whole */
    const s = session({ bpm: 60, bpb: 4, bars: 8 });
    const P = s.P, sr = s.sr;
    const beat = 1.0;
    const startAt = 10.1 + 4 * beat;
    const sig = t => t < startAt ? 0 : 0.5 * Math.sin(2 * Math.PI * (t - startAt) / beat);
    await P.loopRecStart();
    assert.ok(s.P.state.loop.recCap > 32, 'capture cap is only ' + s.P.state.loop.recCap + 's for a 32 s take');
    run(s, { from: 10.0, to: startAt + 34, firstBeat: 10.1, sig: sig });
    P.loopRecStop();
    const take = P.state.loop.takes[0];
    assert.ok(take, 'nothing stored');
    assert.strictEqual(take.samples.length, Math.round(32 * sr),
      'loop is ' + (take.samples.length / sr).toFixed(3) + 's, wanted 32.000s');
    assert.strictEqual(take.bars, 8);
    assert.ok(!/cut short/.test(s.status()), 'should not report a shortfall: ' + s.status());
    return '8 bars · ' + (take.samples.length / sr).toFixed(3) + 's · cap ' + s.P.state.loop.recCap + 's';
  });

  await check('the capture cap does not run the align pass inside the audio callback', async () => {
    /* onaudioprocess is the render path. alignTake over a long take is a few
     * hundred milliseconds of arithmetic, so if the cap stops the recorder
     * synchronously it stalls the audio thread — the beat-driven stop defers
     * through setTimeout for exactly this reason, and so must the cap. */
    const s = session({ align: false });
    const P = s.P;
    const threshold = 30 * s.sr;          /* MAX_REC_SEC, with no grid to size it */
    let cap = null;
    await P.loopRecStart();
    run(s, {
      from: 10.0, to: 10.0 + 31, firstBeat: 1e9, sig: () => 0.3,
      afterChunk: (sess, at) => {
        /* key off the cap threshold itself, not off any flag the fix adds:
         * the first buffer that crosses it is the moment the recorder has to
         * stop, and by the time this hook runs the align pass must not have
         * happened yet */
        const L = P.state.loop;
        if (cap === null && L.recGot > threshold) {
          cap = { at: at, takeReady: !!L.takes[0], recStillOn: L.rec };
        }
      }
    });
    assert.ok(cap, 'the cap threshold was never crossed — test is not exercising anything');
    assert.strictEqual(cap.takeReady, false,
      'the take was built inside the audio callback at ' + cap.at.toFixed(2) + 's');
    assert.strictEqual(cap.recStillOn, true, 'recording was torn down on the audio thread');
    s.fireTimers();
    assert.ok(P.state.loop.takes[0], 'the deferred stop never produced a take');
    return 'cap crossed at ' + cap.at.toFixed(1) + 's, align deferred off the audio thread';
  });

  await check('recording is refused nothing and reports honestly when the mic gives up', async () => {
    const s = session({ bpm: 120, bpb: 4, bars: 2 });
    const P = s.P;
    await P.loopRecStart();
    /* no chunks at all, no beats — the player pressed Rec and nothing happened */
    P.loopRecStop();
    assert.strictEqual(P.state.loop.takes[0], null, 'stored an empty take');
    assert.ok(/mic/i.test(s.status()), 'status was: ' + s.status());
    return s.status();
  });

  await check('a metronome already running mid-bar: the take still starts on the downbeat', async () => {
    /* The metronome is running and the player presses Rec on beat 3 of the
     * bar. The count-in is four beats; the take must begin on the NEXT
     * downbeat (beat 1), not on whichever beat happens to follow the count. */
    const s = session({ bpm: 120, bpb: 4, bars: 1 });
    const P = s.P, sr = s.sr;
    const beat = 0.5, bar = 2;
    const firstBeat = 10.1;
    const idxAt = k => (k + 2) % 4;                /* beat k of the run is idx (k+2)%4 */
    /* count-in: k = 0..3 (idx 2,3,0,1); the first beat after it is k=4 (idx 2,
     * not a downbeat), so the take must wait until k=6 (idx 0) */
    const downK = 6;
    const startAt = firstBeat + downK * beat;
    /* one bar of a tone whose period is exactly one bar: any take that starts
     * even one beat late comes back with its phase flipped */
    const tone = t => 0.6 * Math.sin(2 * Math.PI * (t - startAt) / bar);
    const sig = t => t < startAt ? 0.9 * Math.sin(2 * Math.PI * 5000 * t) : tone(t);
    await P.loopRecStart();
    run(s, { from: 10.0, to: startAt + bar + 0.6, firstBeat: firstBeat, firstIdx: 2, sig: sig });
    P.loopRecStop();
    const take = P.state.loop.takes[0];
    assert.ok(take, 'nothing was stored in take A · status: ' + s.status());
    assert.strictEqual(take.bars, 1, 'bars: ' + take.bars);
    /* compare the body of the loop with the expected tone, shape-for-shape */
    let peak = 0;
    for (let i = 0; i < take.samples.length; i++) peak = Math.max(peak, Math.abs(take.samples[i]));
    const g = peak / 0.6;
    let worst = 0;
    for (let i = 2000; i < take.samples.length - 2000; i += 37) {
      const want = g * tone(startAt + i / sr);
      worst = Math.max(worst, Math.abs(take.samples[i] - want));
    }
    assert.ok(worst < 0.02 * g, 'take is ' + (worst / g * 100).toFixed(0) + '% off the downbeat');
    return '1 bar · starts on beat 1 of the bar · worst error ' + (worst / g * 100).toFixed(2) + '%';
  });

  await check('a take too short to loop is not stored as a loop', async () => {
    const s = session({ bpm: 120, bpb: 4, align: false });
    const P = s.P;
    await P.loopRecStart();
    run(s, { from: 10.0, to: 10.06, firstBeat: 1e9, sig: () => 0.4 });
    P.loopRecStop();
    assert.strictEqual(P.state.loop.takes[0], null, 'stored a ' + (P.state.loop.takes[0] || {}).samples + ' take');
    assert.ok(/short/i.test(s.status()), 'status was: ' + s.status());
    return s.status();
  });

  if (failed) { console.log('\n❌ ' + failed + ' failed'); process.exit(1); }
  console.log('\n✅ looper');
})();
