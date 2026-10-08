/* Trill Tuner — DOM smoke test.
 *
 * Loads public/index.html in jsdom with a stubbed Web Audio API and runs every
 * script in the real order, then exercises the app the way a user would:
 * boot, switch views, open the tuning guide, pick an amp, add a pedal, start a
 * drill, play a riff, run a rhythm tap, and read the progress page.
 *
 * This is the fastest way to catch "it throws on load" bugs without a browser.
 *
 *   node test/dom-smoke.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e && e.message || e)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
vc.on('warn', () => {});
vc.on('log', () => {});

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;

/* ---------------- stubs ---------------- */
function fakeParam(v) {
  return {
    value: v == null ? 0 : v,
    setValueAtTime() { return this; },
    linearRampToValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    setTargetAtTime() { return this; },
    cancelScheduledValues() { return this; }
  };
}
function fakeNode(extra) {
  return Object.assign({
    connect() { return this; }, disconnect() { return this; },
    gain: fakeParam(1), frequency: fakeParam(440), Q: fakeParam(1), delayTime: fakeParam(0.3),
    playbackRate: fakeParam(1), detune: fakeParam(0), threshold: fakeParam(-24), knee: fakeParam(30),
    ratio: fakeParam(4), attack: fakeParam(0.003), release: fakeParam(0.25)
  }, extra || {});
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.state = 'running';
    this.destination = fakeNode();
    this._t = setInterval(() => { this.currentTime += 0.05; }, 20);
    if (this._t.unref) this._t.unref();
  }
  resume() { return Promise.resolve(); }
  createGain() { return fakeNode(); }
  createBiquadFilter() { return fakeNode({ type: 'lowpass' }); }
  createWaveShaper() { return fakeNode({ curve: null, oversample: 'none' }); }
  createDelay() { return fakeNode(); }
  createConvolver() { return fakeNode({ buffer: null }); }
  createDynamicsCompressor() { return fakeNode(); }
  createOscillator() { return fakeNode({ type: 'sine', start() {}, stop() {} }); }
  createBufferSource() { return fakeNode({ buffer: null, start() {}, stop() {} }); }
  createAnalyser() {
    return fakeNode({
      fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0,
      getFloatTimeDomainData(arr) { arr.fill(0); },
      getFloatFrequencyData(arr) { arr.fill(-100); }
    });
  }
  createMediaStreamDestination() { return fakeNode({ stream: {} }); }
  createScriptProcessor() { return fakeNode({ onaudioprocess: null }); }
  createBuffer(ch, len) {
    const data = [];
    for (let i = 0; i < ch; i++) data.push(new Float32Array(len));
    return { length: len, numberOfChannels: ch, sampleRate: this.sampleRate, getChannelData: i => data[i] };
  }
}
window.AudioContext = FakeAudioContext;
window.webkitAudioContext = FakeAudioContext;
window.navigator.mediaDevices = {
  getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() {} }] }),
  enumerateDevices: () => Promise.resolve([])
};
window.HTMLCanvasElement.prototype.getContext = function () {
  const noop = () => {};
  return {
    canvas: this, save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, arcTo: noop, bezierCurveTo: noop, quadraticCurveTo: noop, ellipse: noop, rect: noop, clip: noop,
    fill: noop, stroke: noop, fillRect: noop, clearRect: noop, strokeRect: noop,
    fillText: noop, strokeText: noop, measureText: () => ({ width: 10 }), setTransform: noop,
    translate: noop, rotate: noop, scale: noop, drawImage: noop, createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set font(v) {}, set globalAlpha(v) {},
    set globalCompositeOperation(v) {}, set textAlign(v) {}, set textBaseline(v) {}, set lineCap(v) {},
    set lineJoin(v) {}, set shadowBlur(v) {}, set shadowColor(v) {}, set filter(v) {}
  };
};
window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
window.navigator.storage = { persist: () => Promise.resolve(false), persisted: () => Promise.resolve(false), estimate: () => Promise.resolve({ quota: 5e7, usage: 1234 }) };
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function () {};
window.alert = () => {};
window.confirm = () => false;
window.prompt = () => 'test rig';

/* jsdom has no PointerEvent in older versions */
if (!window.PointerEvent) window.PointerEvent = window.MouseEvent;

/* ---------------- run the scripts in index.html order ---------------- */
const scripts = [...window.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
let failed = false;
scripts.forEach(src => {
  const file = path.join(root, 'public', src);
  try {
    window.eval(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    failed = true;
    errors.push(`SCRIPT FAILED ${src}: ${e.message}\n    ${(e.stack || '').split('\n')[1] || ''}`);
  }
});

const pending = [];       /* async checks are awaited before the final report */
function check(label, fn) {
  let v;
  try {
    v = fn();
  } catch (e) {
    errors.push('CHECK FAILED ' + label + ': ' + e.message);
    console.log('  ✗ ' + label + ' — ' + e.message);
    return false;
  }
  if (v && typeof v.then === 'function') {
    const p = v.then(res => {
      console.log('  ✓ ' + label + (res === undefined || res === true ? '' : ' — ' + res));
    }, e => {
      errors.push('CHECK FAILED ' + label + ': ' + (e && e.message || e));
      console.log('  ✗ ' + label + ' — ' + (e && e.message || e));
    });
    pending.push(p);
    return true;
  }
  console.log('  ✓ ' + label + (v === undefined || v === true ? '' : ' — ' + v));
  return true;
}

console.log('\nTrill Tuner — DOM smoke test');
console.log('  scripts loaded: ' + scripts.length);

/* ---------------- boot ---------------- */
check('TT namespace exists', () => {
  const w = window;
  if (!w.TT) throw new Error('TT missing');
  return Object.keys(w.TT).join(', ');
});
check('app boots without throwing', () => { window.document.dispatchEvent(new window.Event('DOMContentLoaded')); });
check('splash rendered with live system checks', () => {
  const s = window.document.getElementById('splash');
  if (!s) throw new Error('no splash');
  if (s.hidden) throw new Error('splash was hidden on a first run');
  const log = window.document.getElementById('splash-log');
  if (!log || log.children.length < 1) throw new Error('boot log did not render steps');
  const facts = window.document.getElementById('splash-pedals').textContent;
  if (!(+facts > 60)) throw new Error('splash pedal count wrong: ' + facts);
  return log.children.length + ' boot lines, ' + facts + ' pedals';
});
check('splash dismisses and unblocks the app', () => {
  const s = window.document.getElementById('splash');
  window.TT.splash.dismiss();
  if (!s.classList.contains('splash-out')) throw new Error('splash did not dismiss');
  if (window.document.body.classList.contains('splash-on')) throw new Error('body still locked');
});
check('library sizes', () => {
  const TT = window.TT;
  if (TT.tunings.PRESETS.length < 18) throw new Error('too few tunings');
  if (TT.pedals.LIST.length < 120) throw new Error('too few pedals: ' + TT.pedals.LIST.length);
  const ampIds = new Set(TT.amps.AMPS.map(a => a.id)), pedIds = new Set(TT.pedals.LIST.map(p => p.id));
  TT.wiring.CHAINS.forEach(c => {
    if (!c.ampId || !ampIds.has(c.ampId)) throw new Error('chain ' + c.id + ' has no real amp');
    (c.pedalIds || []).forEach(pid => { if (!pedIds.has(pid)) throw new Error('chain ' + c.id + ' references missing pedal ' + pid); });
  });
  const badRecipes = [];
  (TT.amps.GENRES || []).forEach(g => {
    if (!ampIds.has(g.amp)) badRecipes.push(g.id + ' amp');
    (g.pedals || []).forEach(pid => { if (!pedIds.has(pid)) badRecipes.push(g.id + ' ' + pid); });
  });
  if (badRecipes.length) throw new Error('recipes reference missing gear: ' + badRecipes.join(', '));
  if (TT.amps.AMPS.length < 40) throw new Error('too few amps: ' + TT.amps.AMPS.length);
  return `${TT.tunings.PRESETS.length} tunings · ${TT.pedals.LIST.length} pedals · ${TT.amps.AMPS.length} amps · ${TT.wiring.CHAINS.length} famous rigs`;
});
check('E2E contract: #select-tuning has ≥18 options incl. dropd + halfstep', () => {
  const sel = window.document.getElementById('select-tuning');
  const opts = [...sel.querySelectorAll('option')].map(o => o.value);
  if (opts.length < 18) throw new Error('only ' + opts.length + ' options');
  if (!opts.includes('dropd') || !opts.includes('halfstep')) throw new Error('missing presets');
  return opts.length + ' options';
});
check('tuning finder filters the 94-set library', () => {
  const sel = window.document.getElementById('select-tuning');
  const find = window.document.getElementById('tuning-find');
  if (!find) throw new Error('no tuning finder');
  const before = sel.querySelectorAll('option').length;
  find.value = 'dadgad';
  find.dispatchEvent(new window.Event('input'));
  const after = [...sel.querySelectorAll('option')].map(o => o.value);
  if (!after.length || after.length >= before) throw new Error('filter did nothing');
  if (!after.includes('dadgad')) throw new Error('dadgad missing from its own search');
  find.value = '';
  find.dispatchEvent(new window.Event('input'));
  if (sel.querySelectorAll('option').length !== before) throw new Error('clearing the filter did not restore the list');
  return `${before} → ${after.length} for “dadgad”`;
});
check('E2E contract: 6 guitar strings + 6 chips', () => {
  const str = window.document.querySelectorAll('#guitar-box svg .g-str');
  const chips = window.document.querySelectorAll('#string-chips .chip');
  if (str.length !== 6 || chips.length !== 6) throw new Error(`${str.length} strings / ${chips.length} chips`);
});
check('Tuning guide opens with the new guide fields', () => {
  window.document.getElementById('btn-guide').click();
  const overlay = window.document.getElementById('guide-overlay');
  if (overlay.hidden) throw new Error('guide did not open');
  const extra = window.document.getElementById('guide-extra');
  if (!extra.innerHTML.length) throw new Error('guide-extra empty');
  window.document.getElementById('guide-close').click();
  if (!overlay.hidden) throw new Error('guide did not close');
});
check('Capo + sweetener controls present', () => {
  if (!window.document.getElementById('select-capo')) throw new Error('no capo');
  if (window.document.querySelectorAll('#off-row input').length !== 6) throw new Error('off-row count');
});

/* ---------------- views ---------------- */
check('every nav view switches without error', () => {
  const views = [...window.document.querySelectorAll('.nav-btn')].map(b => b.dataset.view);
  views.forEach(v => window.TT.app.showView(v));
  return views.join(', ');
});
check('learn tabs all render', () => {
  const tabs = [...window.document.querySelectorAll('#learn-tabs .tab')].map(t => t.dataset.tab);
  tabs.forEach(t => {
    const btn = window.document.querySelector(`#learn-tabs .tab[data-tab="${t}"]`);
    btn.click();
    const pane = window.document.getElementById('tab-' + t);
    if (!pane) throw new Error('no pane for ' + t);
  });
  return tabs.length + ' tabs';
});
check('tools: scales, circle, builder, trainer, tension, setup, capo, mods', () => {
  const tabs = [...window.document.querySelectorAll('#tools-tabs .tab')].map(t => t.dataset.tab);
  tabs.forEach(t => {
    window.document.querySelector(`#tools-tabs .tab[data-tab="${t}"]`).click();
    const pane = window.document.getElementById('tools-' + t);
    if (!pane.classList.contains('active')) throw new Error(t + ' pane not active');
  });
  const dots = window.document.querySelectorAll('#scale-fretboard .fb-dot').length;
  const svg = window.document.querySelectorAll('#cof-svg .cof-key').length;
  const diagrams = window.document.querySelectorAll('#chord-diagrams .chord-svg').length;
  const cells = window.document.querySelectorAll('#game-board .game-cell').length;
  if (!dots || !svg || !diagrams || !cells) throw new Error(`dots ${dots} cof ${svg} chords ${diagrams} cells ${cells}`);
  return `${dots} scale notes · ${svg} circle keys · ${diagrams} chord diagrams · ${cells} trainer cells`;
});
check('tension calculator matches the published D’Addario chart', () => {
  window.document.querySelector('#tools-tabs .tab[data-tab="tension"]').click();
  const preset = window.document.getElementById('tension-preset');
  preset.value = '10-46 (regular light)';
  preset.dispatchEvent(new window.Event('change'));
  const t = window.document.getElementById('tension-out').textContent;
  /* the table lists the low E first; the .010 high E must read ≈16.2 lb and the set ≈102 lb */
  const set = window.document.getElementById('tension-preset').value;
  if (!/16\.[0-9] lb/.test(t)) throw new Error('high-E .010 tension looks wrong: ' + t.replace(/\s+/g, ' ').slice(0, 160));
  const total = /([0-9]{2,3}) lb · [0-9.]+ kg/.exec(t);
  if (!total || +total[1] < 95 || +total[1] > 110) throw new Error('total ' + (total && total[1]) + ' lb is not the expected ~102 lb');
  return set + ' → total ' + total[1] + ' lb';
});
check('rig: amp loads, pedal added, chain reorders', () => {
  window.TT.app.showView('rig');
  const sel = window.document.getElementById('rig-amp-select');
  if (!sel.options.length) throw new Error('no amps in the select');
  sel.value = 'jcm800-2203';
  sel.dispatchEvent(new window.Event('change'));
  const knobs = window.document.querySelectorAll('#rig-amp-face .knob').length;
  if (knobs < 4) throw new Error('amp panel did not render knobs');
  const before = window.TT.rig.getState().pedals.length;
  window.TT.rig.addPedal('ts808');
  window.TT.rig.addPedal('wah-crybaby');
  const after = window.TT.rig.getState().pedals.length;
  if (after !== before + 2) throw new Error('pedals not added');
  window.TT.rig.loadFamous(window.TT.wiring.CHAINS.find(c => c.id === 'hendrix'));
  const rig = window.TT.rig.getState();
  if (rig.ampId !== 'plexi-1959' || rig.pedals.length < 3) throw new Error('famous rig did not load');
  window.TT.rig.testRiff('chord');
  window.TT.rig.rebuild();
  const chain = window.document.getElementById('rig-signal-chain').textContent;
  return chain.slice(0, 110);
});
check('rig: genre recipes load amp + cab + the right pedals', () => {
  const g = window.TT.rig.recipes().find(r => r.id === 'swedish-death');
  if (!g) throw new Error('recipe missing');
  window.TT.rig.loadRecipe(g);
  const st = window.TT.rig.getState();
  if (st.ampId !== 'jcm800-2203') throw new Error('recipe amp not applied: ' + st.ampId);
  if (!st.pedals.some(p => p.id === 'boss-hm-2')) throw new Error('recipe pedals not applied');
  const tabs = [...window.document.querySelectorAll('#rig-guide .tab')].map(t => t.dataset.tab);
  if (!tabs.includes('recipes')) throw new Error('no recipes tab');
  const btn = window.document.querySelector('#rig-guide .tab[data-tab="recipes"]');
  btn.click();
  const items = window.document.querySelectorAll('#rig-guide-body .guide-item').length;
  if (items < 15) throw new Error('only ' + items + ' recipes rendered');
  return window.TT.rig.recipes().length + ' recipes · ' + items + ' rendered';
});
check('rig: wiring guide tabs all render real content', () => {
  const tabs = [...window.document.querySelectorAll('#rig-guide .tab')].map(t => t.dataset.tab);
  tabs.forEach(t => {
    window.document.querySelector(`#rig-guide .tab[data-tab="${t}"]`).click();
    const pane = window.document.getElementById('rig-guide-body');
    if (!pane || pane.textContent.trim().length < 40) throw new Error('tab "' + t + '" rendered nothing');
    if (/undefined|\[object Object\]/.test(pane.textContent)) throw new Error('tab "' + t + '" contains undefined/[object Object]');
  });
  return tabs.length + ' guide tabs';
});
check('rig: every amp and pedal can be loaded without throwing', () => {
  window.TT.amps.AMPS.forEach(a => {
    window.TT.rig.getState().ampId = a.id;
    window.TT.rig.getState().ampSettings = {};
    window.TT.rig.rebuild();
  });
  window.TT.pedals.LIST.forEach(p => { window.TT.rig.addPedal(p.id); });
  window.TT.rig.rebuild();
  return window.TT.amps.AMPS.length + ' amps · ' + window.TT.pedals.LIST.length + ' pedal adds';
});
check('practice: drill, routine, riff, rhythm, interval', () => {
  window.TT.app.showView('learn');
  window.document.querySelector('#learn-tabs .tab[data-tab="drills"]').click();
  const drills = window.document.querySelectorAll('#drill-list .drill').length;
  if (drills < 8) throw new Error('only ' + drills + ' drills');
  window.document.querySelector('#drill-list [data-start]').click();
  window.document.querySelector('#routine-pick [data-mins="30"]').click();
  const routine = window.document.querySelectorAll('#routine-out .routine-list li').length;
  if (!routine) throw new Error('routine empty');
  window.document.querySelector('#learn-tabs .tab[data-tab="tab"]').click();
  const riffs = window.document.querySelectorAll('#riff-select option').length;
  const tab = window.document.getElementById('riff-tab').textContent;
  if (!riffs || tab.length < 40) throw new Error('riff player empty');
  window.document.getElementById('riff-play').click();
  window.document.getElementById('riff-play').click();
  window.document.querySelector('#learn-tabs .tab[data-tab="rhythm"]').click();
  window.document.getElementById('rhythm-start').click();
  window.document.getElementById('rhythm-tap').click();
  window.document.getElementById('rhythm-start').click();
  window.document.querySelector('#learn-tabs .tab[data-tab="interval"]').click();
  window.document.getElementById('interval-play').click();
  const answers = window.document.querySelectorAll('#interval-answers .btn').length;
  window.document.querySelector('#interval-answers .btn').click();
  return `${drills} drills · ${routine} routine steps · ${riffs} riffs · ${answers} interval answers`;
});
check('progress: stats, badges, share card, backup', () => {
  window.TT.app.showView('progress');
  const stats = window.document.querySelectorAll('#progress-stats .stat-card').length;
  const badges = window.document.querySelectorAll('#progress-badges .badge-card').length;
  window.TT.share.checkBadges(true);
  const canvas = window.document.getElementById('share-canvas');
  window.TT.share.drawCard(canvas);
  const backup = window.TT.store.exportAll();
  if (!backup.data || backup.app !== 'Trill Tuner') throw new Error('export shape wrong');
  window.TT.store.importAll(backup, { replace: false });
  window.TT.share.shareText();
  return `${stats} stats · ${badges} badges · ${Object.keys(backup.data).length} backup keys`;
});
check('sharing: a progress link round-trips and imports safely', async () => {
  /* a code that no build knows about must not throw, and the round trip has to
   * come back with the same numbers the sender saw */
  window.TT.store.set('practice', { '2026-01-01': 30 });
  const code = await window.TT.share.encodeProgress();
  const data = await window.TT.share.decodeProgress(code);
  if (!data || data.v !== window.TT.share.VERSION) throw new Error('version lost in the round trip');
  if (!data.stats || typeof data.stats.totalMins !== 'number') throw new Error('no stats in the payload');
  if (!Array.isArray(data.badges)) throw new Error('no badges in the payload');
  /* hand it a hostile payload: unknown amp, unknown pedals, junk keys */
  window.TT.share.applyShared({ at: Date.now(), stats: {}, badges: [], rig: { ampId: 'not-an-amp', pedals: ['nope', 'ts808', null] } });
  const rig = window.TT.store.get('rig', {});
  if (rig.pedals && rig.pedals.some(p => p.id === 'nope' || !window.TT.pedals.byId(p.id))) throw new Error('imported an unknown pedal');
  if (rig.ampId === 'not-an-amp') throw new Error('imported an unknown amp');
  const link = window.location.origin + window.location.pathname + '#p=' + code;
  return code.length + ' chars → ' + Object.keys(data.stats).length + ' stats · link ok (' + link.length + ' chars)';
});
check('persistence: settings + progress survive a reload', () => {
  window.TT.store.set('practice', { '2026-01-01': 42 });
  window.TT.store.set('rig', window.TT.rig.getState());
  const raw = window.localStorage.getItem('tt.practice');
  if (!/42/.test(raw || '')) throw new Error('practice not written');
  const rigBack = JSON.parse(window.localStorage.getItem('tt.rig'));
  if (!rigBack.ampId) throw new Error('rig not written');
  return 'keys: ' + window.TT.store.keys().length;
});
check('rename: no old branding anywhere in the DOM', () => {
  /* “While My Guitar Gently Weeps” is a song title, not a brand */
  const clean = str => String(str).replace(/While My Guitar Gently Weeps/g, '');
  const bad = /Trill Guitar|My Guitar|\bMG\b/;
  const text = clean(window.document.body.textContent);
  if (bad.test(text)) {
    const m = bad.exec(text);
    throw new Error('found “' + m[0] + '” in body text: …' + text.slice(Math.max(0, m.index - 70), m.index + 70).replace(/\s+/g, ' ') + '…');
  }
  const html = clean(window.document.documentElement.outerHTML);
  if (bad.test(html)) throw new Error('found old branding in markup');
  return 'clean';
});

Promise.all(pending).then(() => {
  console.log('\n' + (errors.length ? '❌ ' + errors.length + ' problem(s):' : '✅ all checks passed'));
  errors.forEach(e => console.log('   · ' + e));
  console.log('');
  process.exit(errors.length || failed ? 1 : 0);
});
