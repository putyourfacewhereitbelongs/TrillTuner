/* Trill Tuner — Clean loop controller test.
 *
 * Drives the real page code (public/js/cleanloop.js, lib/denoise.js and the
 * looper's alignTake from playtools.js) with a fake mic: a noisy plucked phrase
 * is fed through the same ScriptProcessor the browser would call, then Stop is
 * pressed. The checks are on what the page ends up holding and playing.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const SR = 44100;
const root = path.join(__dirname, '..', 'public', 'js');
let failed = 0;

function mkEl(id, extra) {
  return Object.assign({
    id: id, textContent: '', value: '', checked: false, disabled: false, dataset: {},
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(ev, fn) { this._h = this._h || {}; (this._h[ev] = this._h[ev] || []).push(fn); },
    click() { (this._h && this._h.click || []).forEach(f => f()); },
    setAttribute() {}, getAttribute() { return null; }, querySelectorAll() { return []; },
    appendChild() {}, getContext() { return null; }
  }, extra || {});
}

/* the phrase the player plays: four plucked notes with gaps, plus hiss and mains hum */
let seed = 99;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;
function noisyPhrase(sec) {
  const n = Math.round(sec * SR), clean = new Float32Array(n);
  [196, 247, 294, 330].forEach((f0, k) => {
    const st = Math.round((0.3 + k * 0.7) * SR);
    for (let i = 0; i < 0.5 * SR && st + i < n; i++) {
      const t = i / SR;
      let s = 0;
      for (let h = 1; h <= 4; h++) s += Math.sin(2 * Math.PI * f0 * h * t) / h;
      clean[st + i] += 0.3 * Math.exp(-6 * t) * s;
    }
  });
  const noisy = new Float32Array(n);
  for (let i = 0; i < n; i++) noisy[i] = clean[i] + 0.06 * rnd() + 0.05 * Math.sin(2 * Math.PI * 60 * i / SR);
  return { clean: clean, noisy: noisy };
}

function rms(a, f, t) { let s = 0; for (let i = f; i < t; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, t - f)); }

async function main() {
  const ids = ['cl-rec', 'cl-play', 'cl-ab', 'cl-clear', 'cl-align', 'cl-vocals', 'cl-strength',
    'cl-strength-val', 'cl-vol', 'cl-status'];
  const els = {};
  const defaults = {
    'cl-align': { checked: true }, 'cl-vocals': { checked: false },
    'cl-strength': { value: '3' }, 'cl-vol': { value: '0.9' }
  };
  ids.forEach(id => { els[id] = mkEl(id, defaults[id]); });
  els['cl-play'].disabled = true; els['cl-ab'].disabled = true;

  const document = { getElementById: id => els[id] || null, createElement() { return mkEl('x'); } };
  const started = [];
  let sp = null;
  const ctx = {
    sampleRate: SR, currentTime: 0, destination: {},
    createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() {}, disconnect() {} }; },
    createBuffer(ch, len, rate) { const d = new Float32Array(len); return { length: len, sampleRate: rate, numberOfChannels: ch, getChannelData: () => d }; },
    createBufferSource() { const nd = { buffer: null, loop: false, playbackRate: { value: 1 }, connect() {}, disconnect() {}, start() { started.push(nd); }, stop() {} }; return nd; },
    createScriptProcessor(bs) { sp = { bufferSize: bs, onaudioprocess: null, connect() {}, disconnect() {} }; return sp; }
  };
  const audio = {
    ctx: ctx, micState: 'on', _silent: null,
    ensure() { return ctx; }, startMic() { return Promise.resolve(); },
    tapNode() { return { connect() {}, disconnect() {} }; }
  };
  const metronome = { state: { bpm: 120, bpb: 4 }, isPlaying() { return false; } };

  const sandbox = { document: document, console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
    Float32Array: Float32Array, Math: Math, Date: Date, Promise: Promise };
  sandbox.window = sandbox;
  sandbox.TT = { audio: audio, metronome: metronome };
  sandbox.window.TT = sandbox.TT;
  vm.createContext(sandbox);
  for (const f of ['lib/fft.js', 'lib/dsp.js', 'lib/denoise.js', 'playtools.js', 'cleanloop.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox);
  }
  const C = sandbox.TT.cleanloop;
  assert.ok(C, 'cleanloop did not attach');
  C.init();

  const phrase = noisyPhrase(4.0);
  const gapFrom = Math.round(0.9 * SR), gapTo = Math.round(0.97 * SR);

  /* 1. record: press Record, the mic arrives in chunks, press Stop */
  await els['cl-rec'].click();
  assert.ok(sp && typeof sp.onaudioprocess === 'function', 'recording did not start');
  assert.ok(/Stop/.test(els['cl-rec'].textContent), 'Record button did not change to Stop');
  const chunk = 4096;
  for (let i = 0; i < phrase.noisy.length; i += chunk) {
    sp.onaudioprocess({ inputBuffer: { getChannelData: () => phrase.noisy.subarray(i, Math.min(phrase.noisy.length, i + chunk)) } });
  }
  await els['cl-rec'].click();                        /* Stop */

  /* the clean-up runs asynchronously; wait for it to report */
  const deadline = Date.now() + 20000;
  while (!C.state.takes.clean && Date.now() < deadline) await new Promise(r => setTimeout(r, 20));

  check('the take is stored, cleaned, trimmed and looping', () => {
    assert.ok(C.state.takes.clean, 'no clean take · status: ' + els['cl-status'].textContent);
    assert.ok(C.state.takes.raw, 'no original take kept');
    assert.ok(started.length >= 1, 'nothing started playing');
    assert.ok(started[started.length - 1].loop, 'playback is not looping');
    const st = els['cl-status'].textContent;
    assert.ok(/Clean loop ready/.test(st), 'status: ' + st);
    return st;
  });

  check('the clean take has less hiss in the gaps than the original', () => {
    const c = C.state.takes.clean.samples, r = C.state.takes.raw.samples;
    /* both are bar-aligned, so compare each by its own last-second quiet
     * region: find a quiet stretch in each by taking the lowest-energy 0.07 s */
    const win = Math.round(0.07 * SR);
    const quietest = a => {
      let best = Infinity;
      for (let s = 0; s + win < a.length; s += Math.round(0.02 * SR)) {
        const v = rms(a, s, s + win);
        if (v < best) best = v;
      }
      return best;
    };
    const qc = quietest(c), qr = quietest(r);
    const db = 20 * Math.log10(qr / qc);
    assert.ok(db > 5, 'the quiet floor only dropped ' + db.toFixed(1) + ' dB');
    return 'quietest passage ' + db.toFixed(1) + ' dB lower than the original';
  });

  check('the notes are still there: the clean take is not silent or clipped', () => {
    const c = C.state.takes.clean.samples;
    let peak = 0;
    for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
    assert.ok(peak > 0.2 && peak <= 1.0, 'peak ' + peak);
    return 'peak ' + peak.toFixed(2);
  });

  check('Hearing toggles between clean and original, and the loop follows', () => {
    const before = started.length;
    els['cl-ab'].click();
    assert.ok(/original/.test(els['cl-ab'].textContent), 'label: ' + els['cl-ab'].textContent);
    assert.ok(started.length > before, 'switching did not restart the loop');
    els['cl-ab'].click();
    assert.ok(/clean/.test(els['cl-ab'].textContent), 'label: ' + els['cl-ab'].textContent);
    return 'both ways';
  });

  check('leaving the tab silences it', () => {
    C.stop();
    assert.strictEqual(C.state.playing, false);
    return 'stopped';
  });

  /* a Stop with nothing captured says so and stores nothing */
  C.state.takes = { raw: null, clean: null };
  els['cl-rec'].click();
  sp.onaudioprocess = sp.onaudioprocess;             /* the mic delivers nothing */
  els['cl-rec'].click();
  check('a Stop with nothing recorded says so and stores nothing', () => {
    assert.ok(/Nothing came through|too short/.test(els['cl-status'].textContent), 'status: ' + els['cl-status'].textContent);
    assert.strictEqual(C.state.takes.clean, null);
    return els['cl-status'].textContent;
  });

  /* with no metronome the take is trimmed, not cut to a guessed bar */
  C.state.takes = { raw: null, clean: null };
  await els['cl-rec'].click();
  for (let i = 0; i < phrase.noisy.length; i += chunk) {
    sp.onaudioprocess({ inputBuffer: { getChannelData: () => phrase.noisy.subarray(i, Math.min(phrase.noisy.length, i + chunk)) } });
  }
  await els['cl-rec'].click();
  const d2 = Date.now() + 20000;
  while (!C.state.takes.clean && Date.now() < d2) await new Promise(r => setTimeout(r, 20));
  check('without a metronome the phrase keeps its length (no bar guessed)', () => {
    assert.ok(C.state.takes.clean, 'no take');
    assert.ok(!/\d bars? at/.test(els['cl-status'].textContent), 'status claims bars: ' + els['cl-status'].textContent);
    const secs = C.state.takes.clean.samples.length / SR;
    assert.ok(secs > 2.0 && secs < 3.2, 'length ' + secs.toFixed(2) + ' s');
    return secs.toFixed(2) + ' s · ' + els['cl-status'].textContent.slice(0, 70);
  });

  if (failed) { console.log('\n❌ ' + failed + ' failed'); process.exit(1); }
  console.log('\n✅ clean loop');
}

function check(name, fn) {
  try {
    const msg = fn();
    if (msg && typeof msg.then === 'function') throw new Error('async check not awaited: ' + name);
    console.log('  ok  ' + name + (msg ? ' — ' + msg : ''));
  } catch (e) { failed++; console.log('  FAIL  ' + name + ' — ' + e.message); }
}

main().catch(e => { console.log('  FAIL  ' + e.stack); process.exit(1); });
