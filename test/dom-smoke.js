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
  createBufferSource() {
    this._sources = this._sources || [];
    const n = fakeNode({
      buffer: null, loop: false, loopStart: 0, loopEnd: 0, started: [], stopped: false,
      start(when, offset, dur) { this.started.push({ when: when, offset: offset, dur: dur }); },
      stop() { this.stopped = true; }
    });
    this._sources.push(n);            /* the tests read loop/loopStart/start offsets here */
    return n;
  }
  createAnalyser() {
    return fakeNode({
      fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0,
      getFloatTimeDomainData(arr) { arr.fill(0); },
      getFloatFrequencyData(arr) { arr.fill(-100); }
    });
  }
  createMediaStreamDestination() { return fakeNode({ stream: {} }); }
  createMediaStreamSource() {
    const n = fakeNode();
    this._micSources = this._micSources || [];
    this._micSources.push(n);
    return n;
  }
  createScriptProcessor() {
    const n = fakeNode({ onaudioprocess: null });
    this._sps = this._sps || [];
    this._sps.push(n);            /* the tests drive the capture from here */
    return n;
  }
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
/* A 2-D context that *records* instead of painting, so a test can see what was
 * drawn (the stem lab's waveform, its loop band and its playhead are all canvas
 * work). jsdom has no canvas of its own, so this is the only way to check that
 * the drawing really happens rather than merely not throwing. */
const canvasLogs = [];
window.__canvasLogs = canvasLogs;
window.HTMLCanvasElement.prototype.getContext = function (kind) {
  const noop = () => {};
  if (kind !== '2d') return null;
  if (!this.__cid) this.__cid = canvasLogs.length + 1;
  let log = canvasLogs[this.__cid - 1];
  if (!log) {
    log = canvasLogs[this.__cid - 1] = { id: this.__cid, canvas: this, ops: {}, rects: [], texts: [], fillStyle: '', strokeStyle: '', font: '' };
  }
  const count = name => { log.ops[name] = (log.ops[name] || 0) + 1; };
  return {
    canvas: this, save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, arcTo: noop, bezierCurveTo: noop, quadraticCurveTo: noop, ellipse: noop, rect: noop, clip: noop,
    fill: () => count('fill'), stroke: () => count('stroke'),
    fillRect: (x, y, w, h) => { count('fillRect'); log.rects.push({ x: x, y: y, w: w, h: h, style: log.fillStyle }); },
    clearRect: () => count('clearRect'), strokeRect: noop,
    fillText: (t, x, y) => { count('fillText'); log.texts.push({ t: t, x: x, y: y }); },
    strokeText: noop, measureText: () => ({ width: 10 }), setTransform: noop,
    translate: noop, rotate: noop, scale: noop, drawImage: () => count('drawImage'),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    get fillStyle() { return log.fillStyle; }, set fillStyle(v) { log.fillStyle = v; },
    get strokeStyle() { return log.strokeStyle; }, set strokeStyle(v) { log.strokeStyle = v; },
    get font() { return log.font; }, set font(v) { log.font = v; },
    set lineWidth(v) {}, set globalAlpha(v) {},
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
  /* async checks run ONE AT A TIME, in the order they are written: they share
   * the app's single state (the stem lab holds one audio take at a time), so
   * letting them overlap made the result depend on scheduling. */
  if (fn && fn.constructor && fn.constructor.name === 'AsyncFunction') {
    const prev = pending.length ? pending[pending.length - 1] : Promise.resolve();
    const p = prev.then(() => fn()).then(res => {
      console.log('  ✓ ' + label + (res === undefined || res === true ? '' : ' — ' + res));
    }, e => {
      errors.push('CHECK FAILED ' + label + ': ' + (e && e.message || e));
      console.log('  ✗ ' + label + ' — ' + (e && e.message || e));
    });
    pending.push(p);
    return true;
  }
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
  const want = ['scales', 'circle', 'builder', 'game', 'tension', 'setup', 'capo', 'mods', 'looper', 'drone', 'caged', 'harmonics', 'into', 'bends'];
  want.forEach(t => { if (tabs.indexOf(t) < 0) throw new Error('missing tools tab ' + t); });
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
  return `${dots} scale notes · ${svg} circle keys · ${diagrams} chord diagrams · ${cells} trainer cells · ${tabs.length} tabs`;
});
check('menu: Looper is in the Play group and opens the looper tab', () => {
  const doc = window.document;
  const btn = doc.querySelector('.nav-btn[data-view="tools"][data-tab="looper"]');
  if (!btn) throw new Error('no Looper item in the menu');
  let heading = btn.previousElementSibling;
  while (heading && !heading.classList.contains('nav-group')) heading = heading.previousElementSibling;
  if (!heading || heading.textContent.trim() !== 'Play') throw new Error('Looper is not in the Play group');
  window.TT.app.showView('tune');
  btn.click();
  if (!doc.getElementById('view-tools').classList.contains('active')) throw new Error('Tools view did not open');
  if (!doc.getElementById('tools-looper').classList.contains('active')) throw new Error('looper pane is not showing');
  if (!btn.classList.contains('active')) throw new Error('Looper menu item not highlighted');
  const toolsBtn = doc.querySelector('.nav-btn[data-view="tools"]:not([data-tab])');
  if (toolsBtn.classList.contains('active')) throw new Error('Tools menu item also highlighted');
  /* opening Tools from its own item keeps the tab that was last used */
  window.TT.app.showView('tools');
  if (!doc.getElementById('tools-looper').classList.contains('active')) throw new Error('Tools lost its tab');
  window.TT.app.showView('tune');
  return 'Looper in Play · opens the looper pane · highlights only itself';
});
check('play tools: looper, CAGED maps, harmonics, bend lab', () => {
  window.document.querySelector('#tools-tabs .tab[data-tab="caged"]').click();
  const cards = window.document.querySelectorAll('#pt-caged-out .caged-card');
  if (cards.length !== 5) throw new Error('expected 5 major CAGED cards, got ' + cards.length);
  if (!cards[0].querySelector('svg.caged-box')) throw new Error('CAGED card has no chord box');
  window.document.getElementById('pt-caged-qual').value = 'min';
  window.document.getElementById('pt-caged-qual').dispatchEvent(new window.Event('change'));
  const minors = window.document.querySelectorAll('#pt-caged-out .caged-card').length;
  if (minors !== 3) throw new Error('expected 3 minor shapes, got ' + minors);
  window.document.querySelector('#tools-tabs .tab[data-tab="looper"]').click();
  ['pt-loop-rec', 'pt-loop-play', 'pt-loop-half', 'pt-loop-undo', 'pt-loop-clear', 'pt-loop-overdub',
    'pt-loop-snap', 'pt-loop-countin', 'pt-loop-bars', 'pt-loop-vol', 'pt-loop-wave',
    'pt-loop-status', 'pt-loop-takes', 'pt-loop-take-label'].forEach(id => {
    if (!window.document.getElementById(id)) throw new Error('missing ' + id);
  });
  /* five switchable takes, and clicking one actually moves the active slot */
  const takes = window.document.querySelectorAll('#pt-loop-takes .take-btn');
  if (takes.length !== 5) throw new Error('expected 5 loop takes, got ' + takes.length);
  takes[2].click();
  if (window.TT.playtools.state.loop.slot !== 2) throw new Error('clicking take C did not select it');
  if (!takes[2].classList.contains('on')) throw new Error('selected take is not marked active');
  takes[0].click();
  if (window.TT.playtools.state.loop.slot !== 0) throw new Error('clicking take A did not select it');
  if (window.document.getElementById('pt-loop-bars').value !== '2') throw new Error('loop length should default to 2 bars');
  if (!window.document.getElementById('pt-loop-snap').checked) throw new Error('auto-align should default to on');
  if (!window.document.getElementById('pt-loop-countin').checked) throw new Error('count-in should default to on');
  window.document.querySelector('#tools-tabs .tab[data-tab="harmonics"]').click();
  const harms = window.document.querySelectorAll('#pt-harm-out .harm-card').length;
  if (harms < 6) throw new Error('harmonic nodes ' + harms);
  window.document.querySelector('#tools-tabs .tab[data-tab="bends"]').click();
  if (!window.document.getElementById('pt-bend-btn') || !window.document.getElementById('pt-bend-fill')) throw new Error('bend lab controls missing');
  window.document.querySelector('#tools-tabs .tab[data-tab="drone"]').click();
  window.document.getElementById('pt-drone-btn').click();
  if (!window.TT.playtools.state.drone.on) throw new Error('drone did not start');
  window.TT.app.showView('tune');
  if (window.TT.playtools.state.drone.on) throw new Error('drone kept running after leaving Tools');
  return cards.length + ' CAGED · ' + harms + ' harmonic nodes';
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


/* ================= the play-along feature set ================= */

check('catalog: the play-along songbook, lessons and artists are real data', () => {
  const TT = window.TT;
  const c = TT.catalog.counts;
  if (c.songs < 350) throw new Error('too few songs: ' + c.songs);
  if (c.lessons < 25) throw new Error('too few lessons: ' + c.lessons);
  if (c.artists < 40) throw new Error('too few artists: ' + c.artists);
  const broken = [];
  TT.catalog.SONGS.forEach(s => {
    if (!s.title || !s.artist || !s.key || !s.bpm || !s.chords.length) broken.push(s.title || '?');
    if (!s.notes || s.notes.length < 20) broken.push('notes:' + s.title);
    s.chords.forEach(ch => { if (TT.chords.pc(TT.chords.rootOf(ch)) < 0) broken.push(s.title + ' chord ' + ch); });
    if (s.capo && (s.capo < 0 || s.capo > 11)) broken.push(s.title + ' capo');
  });
  if (broken.length) throw new Error('incomplete songs: ' + broken.slice(0, 6).join(', '));
  const ids = TT.catalog.SONGS.map(s => s.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate song ids');
  return c.songs + ' songs · ' + c.lessons + ' lessons · ' + c.artists + ' artists';
});

check('catalog: search answers to a title alone, an artist alone, and chords', () => {
  const TT = window.TT;
  const byTitle = TT.catalog.search('wonderwall');
  if (!byTitle.songs.length || byTitle.songs[0].title.indexOf('Wonderwall') < 0) throw new Error('title search failed');
  const byArtist = TT.catalog.search('fleetwood mac');
  if (!byArtist.artists.length && !byArtist.songs.length) throw new Error('artist search failed');
  if (!byArtist.songs.some(s => /Fleetwood Mac/i.test(s.artist))) throw new Error('artist search did not return their songs');
  const byGenre = TT.catalog.search('fingerstyle');
  if (!byGenre.songs.length && !byGenre.lessons.length) throw new Error('genre search failed');
  const byChords = TT.catalog.search('Am F C G');
  if (!byChords.songs.length) throw new Error('chord search failed');
  return 'title ' + byTitle.songs.length + ' · artist ' + byArtist.songs.length + ' · genre ' + (byGenre.songs.length + byGenre.lessons.length) + ' · chords ' + byChords.songs.length;
});

check('catalog: every song maps onto the theory engine (key → chords → roman numerals)', () => {
  const TT = window.TT;
  const bad = [];
  let progressions = 0;
  TT.catalog.SONGS.slice(0, 60).forEach(s => {
    const mode = /m$/.test(s.key) ? 'minor' : 'major';
    const plan = TT.chords.planFor({ key: s.key.replace(/m$/, ''), mode: mode, chords: s.chords, tempo: s.bpm });
    if (!plan.library.triads.length) bad.push(s.title + ' no library');
    plan.detected.forEach(d => { if (!d.roman || d.roman === '?') bad.push(s.title + ' ' + d.name); });
    progressions += plan.progressions.length;
  });
  if (!progressions) throw new Error('no song matched any library progression');
  if (bad.length) throw new Error('unlabelled chords: ' + bad.slice(0, 6).join(', '));
  return progressions + ' progression matches across 60 songs';
});

check('chords: 24 keys produce a full library with correct roman numerals', () => {
  const TT = window.TT;
  const bad = [];
  TT.chords.KEYS.forEach(k => {
    const lib = TT.chords.library(k.name, k.mode);
    if (lib.triads.length !== 7) bad.push(k.name + ' ' + k.mode + ' triads=' + lib.triads.length);
    if (!lib.borrowed.length) bad.push(k.name + ' no borrowed chords');
    lib.triads.forEach((t, i) => {
      if (!/^[A-G][#♯b♭]?/.test(t.name)) bad.push(k.name + ' bad name ' + t.name);
      const degreeRoot = lib.scale[i].root;
      if (t.name.indexOf(degreeRoot) !== 0) bad.push(k.name + ' ' + t.roman + ' named ' + t.name + ' but the degree is ' + degreeRoot);
      if (lib.scale[i].name !== t.name) bad.push(k.name + ' degree/name mismatch ' + lib.scale[i].name + ' vs ' + t.name);
    });
    /* the tonic must be the tonic */
    const tonic = lib.triads[0];
    if (TT.chords.pc(lib.scale[0].root) !== TT.chords.pc(k.name)) bad.push(k.name + ' tonic is ' + tonic.name);
    if (k.mode === 'minor' && !/m$|dim/.test(tonic.name)) bad.push(k.name + ' minor tonic ' + tonic.name);
  });
  if (bad.length) throw new Error(bad.slice(0, 8).join(', '));
  return TT.chords.KEYS.length + ' keys · ' + TT.chords.PROGRESSIONS.length + ' progressions';
});

check('chords: secondary dominants are labelled, not hidden', () => {
  const TT = window.TT;
  const b7 = TT.chords.romanOf('B7', 'G', 'major');
  if (b7.roman !== 'III7') throw new Error('B7 in G labelled ' + b7.roman);
  if (!b7.secondary || !/vi/.test(b7.fn)) throw new Error('B7 not flagged as V/vi: ' + b7.fn);
  const e7 = TT.chords.romanOf('E7', 'A', 'minor');
  if (e7.roman !== 'V7' || !/i\b/.test(e7.fn)) throw new Error('E7 in Am labelled ' + e7.roman + ' / ' + e7.fn);
  const d = TT.chords.romanOf('D', 'G', 'major');
  if (d.roman !== 'V' || !d.inKey) throw new Error('D in G should be the in-key V');
  return 'B7→' + b7.roman + ', E7→' + e7.roman + ', D→' + d.roman;
});

check('lyrics: one box, and an artist name on its own is enough', async () => {
  const doc = window.document;
  if (!doc.getElementById('lyr-q')) throw new Error('no single search box');
  if (doc.getElementById('lyr-artist') || doc.getElementById('lyr-title')) throw new Error('the two-field form is still there');
  /* jsdom has no fetch: the search must fail soft, not throw, and must still
     show the built-in library it found — never “you are offline” as the answer */
  const res = await window.TT.lyrics.search('Fleetwood Mac');
  const status = doc.getElementById('lyr-status').textContent;
  const offline = doc.getElementById('lyr-offline').textContent;
  if (/both/i.test(status)) throw new Error('still demanding both fields: ' + status);
  if (/you are offline/i.test(status + offline)) throw new Error('lyrics tab still says it is offline: ' + status);
  if (!offline || !/Fleetwood/i.test(offline)) throw new Error('no library fallback rendered: ' + offline);
  return 'artist-only query answered from the library';
});

check('songs view: a search renders playable cards with keys, tempos and chords', () => {
  const doc = window.document;
  window.TT.songs.init();
  window.TT.songs.search('blues');
  const cards = doc.querySelectorAll('#ss-songs .song-card');
  if (cards.length < 3) throw new Error('only ' + cards.length + ' cards');
  const first = cards[0];
  if (!first.querySelector('.song-chord')) throw new Error('no chord chips on a card');
  if (!first.querySelector('.btn')) throw new Error('no action buttons on a card');
  /* filters must actually filter */
  const before = cards.length;
  const advanced = doc.querySelector('#ss-level .seg-btn:last-child');
  advanced.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const after = doc.querySelectorAll('#ss-songs .song-card').length;
  const any = doc.querySelector('#ss-level .seg-btn');
  any.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  if (after > before) throw new Error('difficulty filter added songs');
  return before + ' blues results (' + after + ' advanced)';
});

check('songs view: the set list is saved, described and copyable', () => {
  const doc = window.document;
  const song = window.TT.catalog.SONGS.find(s => /Wonderwall/.test(s.title));
  window.TT.songs.init();
  window.TT.songs.search(song.title);
  const card = [...doc.querySelectorAll('#ss-songs .song-card')].find(c => /Wonderwall/.test(c.textContent));
  if (!card) throw new Error('song not found in the results');
  const save = [...card.querySelectorAll('button')].find(b => /Save/.test(b.textContent));
  save.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const list = window.TT.store.get('setlist', []);
  if (list.indexOf(song.id) === -1) throw new Error('not saved');
  const copy = doc.getElementById('ss-btn-copy-set');
  copy.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const shown = doc.getElementById('ss-setlist').textContent;
  if (!/Wonderwall/.test(shown)) throw new Error('set list did not render');
  return 'saved and rendered: ' + shown.slice(0, 40);
});

check('tab maker: a library song becomes a chart, a chord library and a tab sheet', () => {
  const doc = window.document;
  window.TT.tablab.init();
  const song = window.TT.catalog.SONGS.find(s => /Knockin/.test(s.title));
  window.TT.tablab.openSong(song);
  const bars = doc.querySelectorAll('#mk-chart .mk-bar');
  if (bars.length !== song.chords.length) throw new Error('bar count ' + bars.length + ' for ' + song.chords.length + ' chords');
  const cells = doc.querySelectorAll('#mk-plan .plan-cell');
  if (cells.length !== 7) throw new Error('chord library cells: ' + cells.length);
  const romans = [...doc.querySelectorAll('#mk-plan .plan-rom')].map(n => n.textContent);
  if (romans.join(' ') !== 'I ii iii IV V vi vii°') throw new Error('roman numerals wrong: ' + romans.join(' '));
  const progs = doc.querySelectorAll('#mk-plan .plan-prog');
  if (!progs.length) throw new Error('no progressions suggested');
  const sheet = doc.getElementById('mk-sheet').textContent;
  ['TRILL TUNER — TAB SHEET', 'CHORD CHART', 'CHORD SHAPES', 'THE CHORD LIBRARY FOR', 'PROGRESSIONS THAT FIT', 'STRUMMING'].forEach(needle => {
    if (sheet.indexOf(needle) === -1) throw new Error('tab sheet is missing “' + needle + '”');
  });
  song.chords.forEach(c => { if (sheet.indexOf(c) === -1) throw new Error('tab sheet is missing the chord ' + c); });
  /* shapes must be real fret numbers, low string first */
  const shape = sheet.match(/G {2,}(\d|x)( (\d|x)){5}/);
  if (!shape) throw new Error('no guitar shape written out');
  return bars.length + ' bars · 7 library chords · ' + progs.length + ' progressions · ' + sheet.length + ' char sheet';
});

check('tab maker: transpose moves every chord on the sheet', () => {
  const doc = window.document;
  window.TT.tablab.openSong(window.TT.catalog.SONGS.find(s => /Knockin/.test(s.title)));
  const before = doc.getElementById('mk-sheet').textContent;
  /* press +1 twice on the plan's transpose control */
  const up = [...doc.querySelectorAll('#mk-plan .plan-transpose button')].find(b => b.textContent === '+1');
  up.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  up.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const after = doc.getElementById('mk-sheet').textContent;
  if (before === after) throw new Error('the sheet did not change');
  if (after.indexOf('A ') === -1 || after.indexOf('G ') === -1) throw new Error('A/G missing after transposing G up a tone');
  const val = doc.querySelector('#mk-plan .plan-trval').textContent;
  if (val !== '+2') throw new Error('transpose readout says ' + val);
  return 'G → A after two clicks (' + val + ')';
});

check('tab maker: it reads the chords out of audio', () => {
  const TT = window.TT;
  /* a fake AudioBuffer holding a I–V–vi–IV progression, four bars of 2s */
  const sr = 22050, dur = 8, n = sr * dur;
  const data = new Float32Array(n);
  const chords = [[261.63, 329.63, 392], [98, 123.47, 146.83], [110, 130.81, 164.81], [87.31, 110, 130.81]];
  for (let i = 0; i < n; i++) {
    const t = i / sr, seg = Math.min(3, Math.floor(t / 2));
    let v = 0;
    chords[seg].forEach(f => { v += Math.sin(2 * Math.PI * f * t) * 0.3; });
    data[i] = v;
  }
  const fake = {
    numberOfChannels: 2, sampleRate: sr, length: n, duration: dur,
    getChannelData: () => data
  };
  const res = TT.tablab.analyseBuffer(fake, { maxSeconds: 20 });
  const names = res.chords.map(c => c.name).join(' ');
  if (names !== 'C G Am F') throw new Error('read “' + names + '” instead of “C G Am F”');
  if (res.key.key !== 'C' || res.key.mode !== 'major') throw new Error('key: ' + res.key.key + ' ' + res.key.mode);
  TT.tablab.adopt(res, { title: 'Smoke test song', artist: 'The Fixtures' });
  const sheet = window.document.getElementById('mk-sheet').textContent;
  if (sheet.indexOf('Smoke test song') === -1) throw new Error('the sheet does not name the song');
  if (sheet.indexOf('C major') === -1) throw new Error('the sheet does not state the key');
  const facts = window.document.getElementById('mk-summary').textContent;
  if (!/C major/.test(facts)) throw new Error('summary missing the key: ' + facts);
  return names + ' · ' + res.tempo.bpm + ' BPM · sheet ' + sheet.length + ' chars';
});

check('stems: every recipe is wired to a real separation mode', () => {
  const doc = window.document;
  window.TT.stems.init();
  const cards = doc.querySelectorAll('#st-presets .st-preset');
  if (cards.length < 14) throw new Error('only ' + cards.length + ' recipes');
  const opts = [...doc.querySelectorAll('#st-mode option')].map(o => o.value);
  window.TT.dsp.PROFILES && Object.keys(window.TT.dsp.PROFILES).forEach(k => {
    if (opts.indexOf(k) === -1) throw new Error('no profile for ' + k);
  });
  ['classic-karaoke', 'classic-keep-bass'].forEach(k => { if (opts.indexOf(k) === -1) throw new Error('missing ' + k); });
  const acoustic = [...cards].find(c => /ONLY the acoustic/.test(c.textContent));
  if (!acoustic) throw new Error('the acoustic-only recipe is missing');
  return cards.length + ' recipes · ' + opts.length + ' modes';
});

check('stems: the acoustic-only removal runs and describes itself', async () => {
  const TT = window.TT;
  const sr = 22050, n = sr * 3;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    /* acoustic-ish wide tone + a centre vocal-ish tone, so removal has work to do */
    L[i] = Math.sin(2 * Math.PI * 330 * t) * 0.4 + Math.sin(2 * Math.PI * 440 * t) * 0.3;
    R[i] = Math.sin(2 * Math.PI * 330 * t) * 0.4 - Math.sin(2 * Math.PI * 440 * t) * 0.3;
  }
  const fake = { numberOfChannels: 2, sampleRate: sr, length: n, duration: 3, getChannelData: c => (c === 0 ? L : R) };
  TT.stems.state.channels = [L, R];
  TT.stems.state.sr = sr;
  TT.stems.state.buffer = fake;
  TT.stems.state.mode = 'acoustic-guitar';
  TT.stems.state.remove = true;
  await TT.stems.run();
  const result = TT.stems.state.result;
  if (!result || !result.channels || result.channels[0].length !== n) throw new Error('no separation result');
  const box = window.document.getElementById('st-effect').textContent;
  if (!/acoustic/i.test(box)) throw new Error('no explanation rendered');
  if (!/electric|drums/i.test(box)) throw new Error('the electric guitar promise is not explained');
  if (window.document.getElementById('st-result').hidden) throw new Error('result panel stayed hidden');
  /* and the WAV export of that result must be a valid container */
  const raw = TT.dsp.encodeWav(result.channels, result.sr);
  const dv = new DataView(raw);
  const tag = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (tag !== 'RIFF') throw new Error('bad WAV header: ' + tag);
  if (raw.byteLength !== 44 + n * 2 * result.channels.length) throw new Error('bad WAV length: ' + raw.byteLength);
  const blob = new window.Blob([raw], { type: 'audio/wav' });
  if (blob.size !== raw.byteLength) throw new Error('blob size mismatch');
  return result.channels.length + ' channels · ' + (raw.byteLength / 1048576).toFixed(2) + ' MB wav';
});

check('stems: the room recording opens the microphone itself and loads the take', async () => {
  const TT = window.TT;
  const doc = window.document;
  const ctx = TT.audio.ensure();
  const before = (ctx._sps || []).length;
  if (TT.audio.micSource) TT.audio.stopMic();          /* start from mic off */
  doc.getElementById('st-btn-mic').click();
  /* the button itself must ask for the microphone (it used to fail with
     “Microphone is off” unless the tuner had been started first) */
  for (let i = 0; i < 40 && TT.audio.micState !== 'on'; i++) await new Promise(r => setTimeout(r, 5));
  if (TT.audio.micState !== 'on') throw new Error('the microphone was never opened (state ' + TT.audio.micState + ')');
  let sp = null;
  for (let i = 0; i < 40 && !sp; i++) {
    sp = (ctx._sps || []).slice(before).find(n => n && typeof n.onaudioprocess === 'function');
    if (!sp) await new Promise(r => setTimeout(r, 5));
  }
  if (!sp) throw new Error('the recorder tap was never created');
  /* hand it 20 s of audio in one go, the way the ScriptProcessor would */
  const need = Math.floor(ctx.sampleRate * 20);
  const take = new Float32Array(need);
  for (let i = 0; i < need; i++) take[i] = 0.3 * Math.sin(2 * Math.PI * 440 * i / ctx.sampleRate);
  sp.onaudioprocess({ inputBuffer: { getChannelData: () => take } });
  for (let i = 0; i < 60 && !/Recorded/.test(doc.getElementById('st-status').textContent); i++) await new Promise(r => setTimeout(r, 5));
  const status = doc.getElementById('st-status').textContent;
  if (!/Recorded 20 seconds/.test(status)) throw new Error('status after the take: ' + status);
  if (!TT.stems.state.channels || TT.stems.state.channels.length !== 1) throw new Error('the take is not loaded');
  if (Math.abs(TT.stems.state.sr - ctx.sampleRate) > 1) throw new Error('wrong sample rate: ' + TT.stems.state.sr);
  if (!/Microphone take/.test(doc.getElementById('st-source').textContent)) throw new Error('no source card');
  if (doc.getElementById('st-btn-run').disabled) throw new Error('separate stayed disabled after a recording');
  if (TT.audio.micState !== 'off') throw new Error('the microphone was left open (state ' + TT.audio.micState + ')');
  return 'mic opened, 20 s captured at ' + (ctx.sampleRate / 1000) + ' kHz, mic released';
});

check('stems: a take is honest while it runs, and it never clobbers a song opened mid-recording', async () => {
  const TT = window.TT;
  const doc = window.document;
  const ctx = TT.audio.ensure();
  const before = (ctx._sps || []).length;
  if (TT.audio.micSource) TT.audio.stopMic();
  TT.stems.state.recordSeconds = 3;
  doc.getElementById('st-btn-mic').click();
  for (let i = 0; i < 40 && TT.audio.micState !== 'on'; i++) await new Promise(r => setTimeout(r, 5));
  if (TT.audio.micState !== 'on') throw new Error('the microphone was never opened');
  /* while the take is running the tab must not offer a button that does nothing */
  if (!doc.getElementById('st-btn-run').disabled) throw new Error('“Separate it” stayed live during a recording');
  if (!/Recording from the microphone/.test(doc.getElementById('st-run-note').textContent)) {
    throw new Error('the run row did not explain what is happening: “' + doc.getElementById('st-run-note').textContent + '”');
  }
  /* the user opens a song while the take is still recording */
  const other = new Float32Array(ctx.sampleRate);
  for (let i = 0; i < other.length; i++) other[i] = 0.2 * Math.sin(2 * Math.PI * 330 * i / ctx.sampleRate);
  TT.stems.loadBuffer(other, 'opened mid-take', 22050);
  let sp = null;
  for (let i = 0; i < 40 && !sp; i++) {
    sp = (ctx._sps || []).slice(before).find(n => n && typeof n.onaudioprocess === 'function');
    if (!sp) await new Promise(r => setTimeout(r, 5));
  }
  if (!sp) throw new Error('the recorder tap was never created');
  const take = new Float32Array(Math.floor(ctx.sampleRate * 3));
  for (let i = 0; i < take.length; i++) take[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / ctx.sampleRate);
  sp.onaudioprocess({ inputBuffer: { getChannelData: () => take } });
  for (let i = 0; i < 60 && !/discarded/.test(doc.getElementById('st-status').textContent); i++) await new Promise(r => setTimeout(r, 5));
  const status = doc.getElementById('st-status').textContent;
  if (!/discarded/.test(status)) throw new Error('the take was not dropped: “' + status + '”');
  if (!/opened mid-take/.test(doc.getElementById('st-source').textContent)) {
    throw new Error('the take overwrote the song that was opened mid-recording (' + doc.getElementById('st-source').textContent + ')');
  }
  if (TT.stems.state.channels[0].length !== other.length) throw new Error('the wrong buffer is loaded');
  if (doc.getElementById('st-btn-run').disabled) throw new Error('“Separate it” is still disabled after the take');
  if (doc.getElementById('st-run-note').textContent) throw new Error('the run row kept its recording note');
  TT.stems.state.recordSeconds = 20;
  return 'the run row told the truth, the take was discarded, and “opened mid-take” survived';
});

check('stems: the result comes with a waveform, a clock, a skip and an A–B loop', async () => {
  const TT = window.TT;
  const doc = window.document;
  const ctx = TT.audio.ensure();
  /* separate something we can look at: 6 s of two tones */
  const sr = 22050, n = sr * 6;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    L[i] = 0.4 * Math.sin(2 * Math.PI * 440 * t) + 0.2 * Math.sin(2 * Math.PI * 220 * t);
    R[i] = 0.4 * Math.sin(2 * Math.PI * 440 * t) - 0.2 * Math.sin(2 * Math.PI * 220 * t);
  }
  TT.stems.loadBuffer({ numberOfChannels: 2, sampleRate: sr, length: n, duration: n / sr, getChannelData: c => (c ? R : L) }, 'transport fixture', sr);
  /* the player is live on the original, before any separation */
  if (doc.getElementById('st-result').hidden) throw new Error('the player stayed hidden after load');
  if (TT.stems.state.result !== null) throw new Error('load invented a separated result');
  const tPre = TT.stems.transport();
  if (Math.abs(tPre.dur - 6) > 0.05) throw new Error('the clock does not know the song length: ' + tPre.dur);
  TT.stems.seek(3);
  if (doc.getElementById('st-pos').textContent !== '0:03') throw new Error('skip on the original: ' + doc.getElementById('st-pos').textContent);
  if (!doc.getElementById('st-btn-wav').disabled) throw new Error('Save as WAV was on before anything was separated');
  TT.stems.seek(0);
  TT.stems.state.mode = 'vocals'; TT.stems.state.remove = true;
  await TT.stems.run();
  const t0 = TT.stems.transport();
  if (Math.abs(t0.dur - 6) > 0.05) throw new Error('the transport does not know the length: ' + t0.dur);
  if (t0.playing) throw new Error('it claims to be playing with nothing started');

  /* the waveform really was drawn, into an offscreen layer and then stamped */
  const wave = doc.getElementById('st-wave');
  const logs = window.__canvasLogs.filter(l => l && l.rects.length);
  const columns = logs.reduce((a, l) => a + l.rects.filter(r => r.w === 1).length, 0);
  if (columns < 200) throw new Error('the waveform drew only ' + columns + ' columns');
  const mine = window.__canvasLogs[wave.__cid - 1];
  if (!mine || !mine.ops.drawImage) throw new Error('the waveform layer was never stamped onto the canvas');
  const band = logs.some(l => l.rects.some(r => /rgba\(56, 189, 248/.test(String(r.style))));
  if (band) throw new Error('a loop band was drawn before any loop point was set');

  /* skip: the clock follows, and the playhead is redrawn where it went */
  const pos = TT.stems.seek(4.5);
  if (Math.abs(pos - 4.5) > 1e-6) throw new Error('seek() went to ' + pos);
  if (doc.getElementById('st-pos').textContent !== '0:04') throw new Error('the clock says ' + doc.getElementById('st-pos').textContent);
  const head = window.__canvasLogs[wave.__cid - 1].rects.filter(r => r.style === '#ffd28a').pop();
  if (!head) throw new Error('no playhead was drawn');
  const want = 4.5 / 6 * wave.width;
  if (Math.abs(head.x - want) > wave.width * 0.02) throw new Error('the playhead is at ' + head.x + ' but 4.5 s is ' + want + ' px');
  if (!/whole take/.test(doc.getElementById('st-ab-label').textContent)) throw new Error('the loop label: ' + doc.getElementById('st-ab-label').textContent);

  /* A and B, set from the playhead */
  TT.stems.seek(1.5); doc.getElementById('st-btn-aset').click();
  TT.stems.seek(3.5); doc.getElementById('st-btn-bset').click();
  const t1 = TT.stems.transport();
  if (Math.abs(t1.a - 1.5) > 0.01 || Math.abs(t1.b - 3.5) > 0.01) throw new Error('A/B not set: ' + t1.a + '/' + t1.b);
  /* both handles and the band are on the canvas now */
  const logs2 = window.__canvasLogs.filter(l => l && l.rects.some(r => /rgba\(56, 189, 248/.test(String(r.style))));
  if (!logs2.length) throw new Error('no loop band was drawn');
  const marks = logs2.reduce((a, l) => a + l.texts.filter(t => t.t === 'A' || t.t === 'B').length, 0);
  if (marks < 2) throw new Error('the A/B handles are not marked on the waveform (' + marks + ')');
  const label = doc.getElementById('st-ab-label').textContent;
  if (!/A 0:01/.test(label) || !/B 0:03/.test(label)) throw new Error('the loop label reads “' + label + '”');

  /* play with the loop on: the source itself is told to loop that section */
  doc.getElementById('st-loop').checked = true;
  doc.getElementById('st-loop').dispatchEvent(new window.Event('change', { bubbles: true }));
  doc.getElementById('st-btn-play').click();
  const src = ctx._sources[ctx._sources.length - 1];
  if (!TT.stems.transport().playing) throw new Error('the play button did not start anything');
  if (!src.loop || Math.abs(src.loopStart - 1.5) > 0.01 || Math.abs(src.loopEnd - 3.5) > 0.01) {
    throw new Error('the audio node was not looped over A–B: loop=' + src.loop + ' ' + src.loopStart + '→' + src.loopEnd);
  }
  if (Math.abs(src.started[0].offset - 1.5) > 0.01) throw new Error('playback did not start at A (' + src.started[0].offset + ')');
  /* skipping while it plays restarts the sound at the new place */
  TT.stems.seek(2.5);
  const src2 = ctx._sources[ctx._sources.length - 1];
  if (Math.abs(src2.started[0].offset - 2.5) > 0.01) throw new Error('skipping while playing did not move the sound');
  if (!src.stopped) throw new Error('the old player was left running');
  TT.stems.stop();
  if (TT.stems.transport().playing) throw new Error('stop left it playing');
  if (doc.getElementById('st-btn-play').textContent.trim() !== '▶ Play') throw new Error('the button did not reset');

  /* clearing A–B loops the whole take again */
  doc.getElementById('st-btn-abclear').click();
  const t2 = TT.stems.transport();
  if (t2.a != null || t2.b != null) throw new Error('clear A–B left ' + t2.a + '/' + t2.b);
  if (!/whole take/.test(doc.getElementById('st-ab-label').textContent)) throw new Error('the label did not reset');

  /* drag from point A to point B on the wave paints the loop */
  wave.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 96, right: 600, bottom: 96, x: 0, y: 0, toJSON() {} });
  const fire = (type, x) => wave.dispatchEvent(new window.PointerEvent(type, { clientX: x, clientY: 48, bubbles: true, pointerId: 1, cancelable: true }));
  fire('pointerdown', 150);
  fire('pointermove', 350);
  fire('pointerup', 350);
  const tDrag = TT.stems.transport();
  if (Math.abs(tDrag.a - 1.5) > 0.2 || Math.abs(tDrag.b - 3.5) > 0.2) throw new Error('drag A–B landed at ' + tDrag.a + '/' + tDrag.b);
  if (!doc.getElementById('st-loop').checked) throw new Error('dragging A–B did not arm the loop');
  TT.stems.clearAB();
  doc.getElementById('st-loop').checked = false;
  return 'drew the wave (' + columns + ' columns) + A/B handles, clock follows the playhead, loop node 1.5→3.5 s, skip restarts it, drag paints A–B';
});

check('stems: the transport answers the keyboard, and an empty A–B loops the whole take', async () => {
  const TT = window.TT;
  const doc = window.document;
  const ctx = TT.audio.ensure();
  const wave = doc.getElementById('st-wave');
  const key = k => wave.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  TT.stems.clearAB();
  TT.stems.seek(0.5);
  key('ArrowRight');
  if (Math.abs(TT.stems.transport().pos - 5.5) > 0.05) throw new Error('→ did not skip 5 s (at ' + TT.stems.transport().pos + ')');
  key('ArrowLeft');
  if (Math.abs(TT.stems.transport().pos - 0.5) > 0.05) throw new Error('← did not skip back 5 s (at ' + TT.stems.transport().pos + ')');
  key('End');
  if (TT.stems.transport().pos < 5.9) throw new Error('End did not go to the end');
  key('Home');
  if (TT.stems.transport().pos !== 0) throw new Error('Home did not go to the start');
  /* [ and ] mark the section at the playhead */
  TT.stems.seek(1); key('[');
  TT.stems.seek(2.5); key(']');
  const t = TT.stems.transport();
  if (Math.abs(t.a - 1) > 0.01 || Math.abs(t.b - 2.5) > 0.01) throw new Error('[ and ] did not set A/B: ' + t.a + '/' + t.b);
  TT.stems.clearAB();
  /* with no A–B the loop is the whole take, and it must not be a zero-length one */
  doc.getElementById('st-loop').checked = true;
  doc.getElementById('st-loop').dispatchEvent(new window.Event('change', { bubbles: true }));
  TT.stems.play();
  const src = ctx._sources[ctx._sources.length - 1];
  if (!src.loop) throw new Error('the whole take was not looped');
  if (src.loopStart !== 0 && src.loopStart !== src.loopEnd) throw new Error('a stray loop range: ' + src.loopStart + '→' + src.loopEnd);
  TT.stems.stop();
  doc.getElementById('st-loop').checked = false;
  doc.getElementById('st-loop').dispatchEvent(new window.Event('change', { bubbles: true }));
  return 'arrows skip, Home/End jump, [ and ] fence the section, and an empty A–B loops the whole take';
});

check('stems: a backing-studio render is handed over and separated here', async () => {
  const TT = window.TT;
  const doc = window.document;
  const render = TT.backingLib.render({ key: 'G', mode: 'major', style: 'strum', bpm: 96, bars: 4, sr: 22050 });
  if (!TT.stems.adopt(render, { title: 'Backing bed test' })) throw new Error('adopt() refused the render');
  if (!TT.stems.state.channels || TT.stems.state.channels.length !== 2) throw new Error('the render is not loaded');
  if (TT.stems.state.sr !== render.sr) throw new Error('sample rate not carried over');
  if (doc.getElementById('st-btn-run').disabled) throw new Error('separate stayed disabled');
  if (!/Backing bed test/.test(doc.getElementById('st-source').textContent)) throw new Error('the source card does not name the render');
  /* and it must really separate from there */
  TT.stems.state.mode = 'drums';
  TT.stems.state.remove = true;
  await TT.stems.run();
  const res = TT.stems.state.result;
  if (!res || res.channels[0].length !== render.channels[0].length) throw new Error('the hand-off did not separate');
  if (doc.getElementById('st-result').hidden) throw new Error('the result panel stayed hidden');
  /* a new take must never leave the previous result playable */
  TT.stems.state.channels = [render.channels[0].slice(), render.channels[1].slice()];
  TT.stems.state.result = null;
  if (!TT.stems.adopt(render, { title: 'Second render' })) throw new Error('adopt() refused a second render');
  if (TT.stems.state.result !== null) throw new Error('a stale result survived a new take');
  if (doc.getElementById('st-result').hidden) throw new Error('the player should already be up on the new take');
  if (!doc.getElementById('st-btn-wav').disabled) throw new Error('Save as WAV should stay off until something is separated');
  return 'render handed over, separated, and the old result cleared';
});

check('stems: the stop button can end a long separation', async () => {
  const TT = window.TT;
  const doc = window.document;
  const sr = 22050, n = sr * 30;
  const A = new Float32Array(n);
  for (let i = 0; i < n; i++) A[i] = 0.3 * Math.sin(2 * Math.PI * 440 * i / sr);
  TT.stems.state.channels = [A, A.slice()];
  TT.stems.state.sr = sr;
  TT.stems.state.buffer = { numberOfChannels: 2, sampleRate: sr, length: n, duration: 30 };
  TT.stems.state.mode = 'vocals';
  TT.stems.state.remove = true;
  const cancelBtn = doc.getElementById('st-btn-cancel');
  if (!cancelBtn) throw new Error('there is no stop button in the markup');
  if (!cancelBtn.hidden) throw new Error('the stop button is showing before anything runs');
  const running = TT.stems.run();
  if (cancelBtn.hidden) throw new Error('the stop button did not appear while separating');
  TT.stems.cancel();                     /* stop it while it works */
  await running;
  if (TT.stems.state.result !== null) throw new Error('a stopped run still produced a result');
  if (!/Stopped/.test(doc.getElementById('st-status').textContent)) throw new Error('status: ' + doc.getElementById('st-status').textContent);
  if (doc.getElementById('st-btn-run').disabled) throw new Error('the run button did not come back');
  if (!doc.getElementById('st-btn-cancel').hidden) throw new Error('the stop button stayed visible');
  return 'stopped cleanly, nothing changed, controls restored';
});

check('stems: the recipe buttons load their settings and run', () => {
  const doc = window.document;
  const cards = [...doc.querySelectorAll('#st-presets .st-preset')];
  const drumless = cards.find(c => /Remove the drums/.test(c.textContent));
  drumless.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  if (window.TT.stems.state.mode !== 'drums') throw new Error('mode is ' + window.TT.stems.state.mode);
  if (window.TT.stems.state.remove !== true) throw new Error('action is not remove');
  const acapella = cards.find(c => /Isolate the vocals/.test(c.textContent));
  acapella.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  if (window.TT.stems.state.remove !== false) throw new Error('isolate did not switch the action');
  return 'recipes drive the mode, action and amount controls';
});

check('listener: targets can be built from the tuning, a scale, a song and free text', () => {
  const TT = window.TT;
  TT.listener.init();
  const open = TT.listener.buildTargets('open');
  if (open.midis.length !== 6) throw new Error('open strings: ' + open.midis.length);
  if (open.midis[0] >= open.midis[5]) throw new Error('open strings are not low to high: ' + open.labels.join(' '));
  const scale = TT.listener.buildTargets('scale');       /* default: minor pentatonic, two octaves */
  if (scale.midis.length !== 10) throw new Error('pentatonic notes: ' + scale.midis.length);
  window.document.getElementById('ls-scale-type').value = 'major';
  const major = TT.listener.buildTargets('scale');
  if (major.midis.length !== 14) throw new Error('major scale notes: ' + major.midis.length);
  const chords = TT.listener.buildTargets('chords');
  if (chords.midis.length !== 21) throw new Error('chord arpeggios: ' + chords.midis.length);
  const song = TT.listener.buildTargets('song');
  if (song.midis.length < 20) throw new Error('song arpeggios: ' + song.midis.length);
  return 'open ' + open.labels.join(' ') + ' · scale ' + scale.midis.length + ' · chords ' + chords.midis.length + ' · song ' + song.midis.length;
});

check('listener: it says YES to the right note and NO to the wrong one — both ways', () => {
  const TT = window.TT;
  const doc = window.document;
  TT.listener.init();
  TT.listener.reset();
  /* listen for an E4 */
  TT.listener.state.target = [64];
  TT.listener.state.labels = ['E4'];
  TT.listener.state.index = 0;
  TT.listener.state.free = false;

  /* 1. right note, right pitch → confirmed */
  const good = TT.listener.check({ midi: 64, cents: 6, label: 'E4' });
  if (!good || good.verdict !== 'ok') throw new Error('the right note was not confirmed: ' + JSON.stringify(good));
  if (!/E4/.test(doc.getElementById('ls-banner').textContent)) throw new Error('no confirmation message');
  if (!doc.getElementById('ls-banner').classList.contains('ok')) throw new Error('banner is not green');

  /* 2. wrong note → told exactly what was heard and what was wanted */
  const wrong = TT.listener.check({ midi: 63, cents: 2, label: 'D♯4' });
  if (!wrong || wrong.verdict !== 'bad') throw new Error('a wrong note was not flagged: ' + JSON.stringify(wrong));
  const msg = doc.getElementById('ls-banner').textContent;
  if (!/D♯4/.test(msg) || !/E4/.test(msg)) throw new Error('the message does not name both notes: ' + msg);
  if (!/one fret below/.test(msg)) throw new Error('the interval was not described: ' + msg);
  if (!doc.getElementById('ls-banner').classList.contains('bad')) throw new Error('banner is not red');
  if (!/D♯4/.test(doc.getElementById('ls-misses').textContent)) throw new Error('the miss was not logged');
  /* and the same distance the other way */
  TT.listener.check({ midi: 65, cents: 1, label: 'F4' });
  if (!/one fret above/.test(doc.getElementById('ls-banner').textContent)) throw new Error('sharp misses are not described');

  /* 3. right note, out of tune → the other direction of feedback */
  const close = TT.listener.check({ midi: 64, cents: -40, label: 'E4' });
  if (!close || close.verdict !== 'close') throw new Error('an out-of-tune right note was not caught: ' + JSON.stringify(close));
  const msg2 = doc.getElementById('ls-banner').textContent;
  if (!/flat/.test(msg2) || !/tighten/i.test(msg2)) throw new Error('no tuning direction given: ' + msg2);

  /* 4. and the same the other way: sharp */
  TT.listener.check({ midi: 64, cents: 45, label: 'E4' });
  if (!/sharp/.test(doc.getElementById('ls-banner').textContent)) throw new Error('sharp was not reported');

  /* 5. free mode names whatever it hears */
  TT.listener.state.free = true;
  TT.listener.check({ midi: 55, cents: -8, label: 'G3' });
  if (!/G3/.test(doc.getElementById('ls-banner').textContent)) throw new Error('free mode did not name the note');
  TT.listener.state.free = false;

  const score = doc.getElementById('ls-score').textContent;
  if (!/1/.test(score)) throw new Error('score did not update');
  return 'correct confirmed · wrong flagged (D4 vs E4) · flat and sharp both reported · streak and log updated';
});

check('listener: an octave error is described as an octave', () => {
  const TT = window.TT;
  TT.listener.reset();
  TT.listener.state.target = [40];           /* E2 */
  TT.listener.state.labels = ['E2'];
  TT.listener.state.index = 0;
  const res = TT.listener.check({ midi: 52, cents: 0, label: 'E3' });
  if (res.verdict !== 'bad') throw new Error('octave error not flagged');
  const msg = window.document.getElementById('ls-banner').textContent;
  if (!/octave above/.test(msg)) throw new Error('octave not named: ' + msg);
  return 'E3 where E2 was wanted → “a whole octave above”';
});

check('navigation: the new views all have working controls', () => {
  const doc = window.document;
  const ids = ['ss-q', 'ss-setlist', 'ss-level', 'mk-drop', 'mk-file', 'mk-btn-listen', 'mk-key', 'mk-bpm', 'mk-sheet',
    'st-drop', 'st-file', 'st-btn-mic', 'st-btn-run', 'st-presets', 'st-mode', 'st-action', 'st-amount',
    'ls-source', 'ls-btn-start', 'ls-btn-reset', 'ls-tol', 'ls-banner', 'ls-target', 'ls-score'];
  const missing = ids.filter(id => !doc.getElementById(id));
  if (missing.length) throw new Error('missing controls: ' + missing.join(', '));
  /* every new view is reachable from the nav */
  ['songs', 'maker', 'stems', 'listening'].forEach(v => {
    if (!doc.querySelector('.nav-btn[data-view="' + v + '"]')) throw new Error('no nav button for ' + v);
    window.TT.app.showView(v);
    if (!doc.getElementById('view-' + v).classList.contains('active')) throw new Error(v + ' did not open');
  });
  /* and leaving the listener stops the live loop */
  window.TT.listener.state.running = true;
  window.TT.app.showView('tune');
  if (window.TT.listener.state.running) throw new Error('the listener kept the microphone open');
  return ids.length + ' controls across 4 new views';
});


/* ===================================================================== */
/* the 3.x views: styles, backing studio and my stuff                    */
/* ===================================================================== */

check('styles: every player has a page with songs, moves and a rig', () => {
  const doc = window.document;
  const TT = window.TT;
  TT.styles.init();
  const all = TT.styles.filtered();
  if (all.length !== TT.catalog.ARTISTS.length) throw new Error('listed ' + all.length + ' of ' + TT.catalog.ARTISTS.length + ' players');
  /* the genre filter must actually filter */
  const genre = doc.getElementById('sy-genre');
  const options = [...genre.querySelectorAll('option')].map(o => o.value).filter(Boolean);
  if (options.length < 8) throw new Error('only ' + options.length + ' genres offered');
  genre.value = options[0];
  genre.dispatchEvent(new window.Event('change', { bubbles: true }));
  const inGenre = TT.styles.filtered();
  if (!inGenre.length || inGenre.some(a => (a.genres || []).indexOf(options[0]) < 0)) throw new Error('the genre filter let the wrong players through');
  genre.value = '';
  genre.dispatchEvent(new window.Event('change', { bubbles: true }));
  /* every artist page must be able to hand over something playable */
  const empty = TT.catalog.ARTISTS.filter(a => !TT.catalog.artistSongs(a.name).length);
  if (empty.length) throw new Error('no song for: ' + empty.map(a => a.name).join(', '));
  /* the detail panel of the open player */
  const detail = doc.getElementById('sy-detail').textContent;
  if (!/Play these|Nothing of theirs/.test(detail)) throw new Error('the detail panel has no songs section');
  if (!doc.querySelector('#sy-detail .sy-song')) throw new Error('no song rows rendered');
  if (!doc.querySelector('#sy-list .sy-card')) throw new Error('no player cards rendered');
  /* a genre must be able to load a real rig recipe */
  if (TT.styles.recipeFor(['shoegaze', 'noise pop']) !== 'shoegaze') throw new Error('shoegaze did not map to its recipe');
  if (TT.styles.recipeFor(['funk', 'soul']) !== 'funk') throw new Error('funk did not map to its recipe');
  return all.length + ' players · ' + options.length + ' genres · ' + TT.styles.TECHNIQUES.length + ' techniques';
});

check('styles: the technique glossary explains each move and its drill', () => {
  const list = window.TT.styles.TECHNIQUES;
  if (list.length < 20) throw new Error('only ' + list.length + ' techniques');
  const thin = list.filter(t => !t.name || !t.what || !t.who || !t.drill || t.drill.length < 20);
  if (thin.length) throw new Error('thin entries: ' + thin.map(t => t.name).join(', '));
  const rendered = window.document.querySelectorAll('#sy-glossary .sy-tech');
  if (rendered.length !== list.length) throw new Error('glossary rendered ' + rendered.length + ' of ' + list.length);
  /* the filter works */
  const q = window.document.getElementById('sy-tech-q');
  q.value = 'tapping';
  q.dispatchEvent(new window.Event('input', { bubbles: true }));
  const filtered = window.document.querySelectorAll('#sy-glossary .sy-tech');
  if (!filtered.length || filtered.length >= list.length) throw new Error('the glossary filter did nothing');
  q.value = '';
  q.dispatchEvent(new window.Event('input', { bubbles: true }));
  return list.length + ' moves, each with a drill';
});

check('backing: a key, a feel and a tempo become a real rendering', () => {
  const TT = window.TT;
  const lib = TT.backingLib;
  if (!lib) throw new Error('the backing engine is not loaded');
  const r = lib.render({ key: 'C', mode: 'major', style: 'strum', bpm: 90, bars: 4, sr: 22050 });
  if (r.channels.length !== 2) throw new Error('not stereo');
  const expected = Math.ceil(4 * 4 * (60 / 90) * 22050);
  if (r.channels[0].length < expected || r.channels[0].length > expected + 22050) throw new Error('bad length ' + r.channels[0].length + ' vs ' + expected);
  if (!(r.peak > 0.85 && r.peak <= 0.91)) throw new Error('not normalised: ' + r.peak);
  if (r.progression.join(' ') !== 'C G Am F') throw new Error('wrong progression: ' + r.progression.join(' '));
  /* it must be audible, not silence */
  let sum = 0;
  for (let i = 0; i < r.channels[0].length; i++) sum += r.channels[0][i] * r.channels[0][i];
  const rms = Math.sqrt(sum / r.channels[0].length);
  if (!(rms > 0.02)) throw new Error('the render is silent (rms ' + rms.toFixed(4) + ')');
  /* and it must be readable by the analysis engine that the tab maker uses */
  const mono = r.channels[0].slice(0, 22050 * 4);
  const read = TT.dsp.analyseChords(mono, r.sr, { fftSize: 4096, hop: 2048 });
  if (!read.key || read.key.key !== 'C') throw new Error('the key did not come back: ' + JSON.stringify(read.key));
  const names = read.chords.map(c => c.name[0]);
  if (names.indexOf('C') < 0 || names.indexOf('G') < 0) throw new Error('the chords did not come back: ' + read.chords.map(c => c.name).join(' '));
  /* the parts switches must actually remove parts */
  const nodrums = lib.render({ key: 'C', mode: 'major', style: 'strum', bpm: 90, bars: 4, sr: 22050, parts: { drums: false, bass: false, chords: true } });
  if (nodrums.progression.length !== 4) throw new Error('a parts render lost its progression');
  /* minor keys and odd meters */
  const waltz = lib.render({ key: 'G', mode: 'minor', style: 'ballad', bpm: 120, bars: 3, meter: 3, sr: 22050 });
  if (waltz.beatsPerBar !== 3) throw new Error('3/4 was ignored');
  if (waltz.seconds < 4.4 || waltz.seconds > 5.1) throw new Error('3/4 length wrong: ' + waltz.seconds.toFixed(2) + 's');
  return r.seconds.toFixed(1) + 's · ' + r.progression.join(' ') + ' · key reads back as ' + read.key.key + ' ' + read.key.mode + ' · rms ' + rms.toFixed(3);
});

check('backing: the view is wired to build, play, export and hand off', () => {
  const doc = window.document;
  const TT = window.TT;
  TT.backing.init();
  const ids = ['bk-key', 'bk-mode', 'bk-style', 'bk-bpm', 'bk-bars', 'bk-meter', 'bk-swing', 'bk-level', 'bk-generate', 'bk-presets', 'bk-status', 'bk-summary'];
  const missing = ids.filter(id => !doc.getElementById(id));
  if (missing.length) throw new Error('missing controls: ' + missing.join(', '));
  if (doc.getElementById('bk-key').options.length !== 12) throw new Error('keys: ' + doc.getElementById('bk-key').options.length);
  if (doc.getElementById('bk-mode').options.length !== 5) throw new Error('modes: ' + doc.getElementById('bk-mode').options.length);
  if (doc.getElementById('bk-style').options.length !== 8) throw new Error('feels: ' + doc.getElementById('bk-style').options.length);
  if (doc.querySelectorAll('#bk-presets .chip').length !== TT.backing.PRESETS.length) throw new Error('presets not rendered');
  /* a preset must load its settings and render */
  doc.querySelectorAll('#bk-presets .chip')[0].click();
  if (TT.backing.state.result === null) throw new Error('the preset did not render');
  if (doc.getElementById('bk-summary').hidden) throw new Error('the summary stayed hidden');
  if (!/BPM/.test(doc.getElementById('bk-summary').textContent)) throw new Error('the summary has no tempo');
  if (!/s$/.test(doc.getElementById('bk-len').textContent)) throw new Error('the length readout is blank');
  /* the hand-off buttons exist and the WAV is a real container */
  ['bk-play', 'bk-wav', 'bk-analyse', 'bk-metro', 'bk-listen', 'bk-stems'].forEach(id => {
    if (!doc.getElementById(id)) throw new Error('no ' + id + ' button');
  });
  const res = TT.backing.state.result;
  const raw = TT.dsp.encodeWav(res.channels, res.sr);
  if (raw.byteLength !== 44 + res.channels[0].length * 4) throw new Error('bad wav: ' + raw.byteLength);
  /* changing a control then building again must produce a new render */
  const bpm = doc.getElementById('bk-bpm');
  bpm.value = '150';
  bpm.dispatchEvent(new window.Event('input', { bubbles: true }));
  if (!/150 BPM/.test(doc.getElementById('bk-bpm-out').textContent)) throw new Error('the tempo readout did not follow');
  doc.getElementById('bk-generate').click();
  if (TT.backing.state.result.bpm !== 150) throw new Error('the new tempo was not used');
  return '3 modes · ' + doc.getElementById('bk-style').options.length + ' feels · ' + TT.backing.PRESETS.length + ' presets · wav ' + (raw.byteLength / 1048576).toFixed(2) + ' MB';
});

check('my stuff: favourites persist, the picker adds songs and the plan builds', () => {
  const doc = window.document;
  const TT = window.TT;
  TT.mine.init();
  /* start clean so the check is about behaviour, not leftovers */
  TT.store.set('favSongs', []);
  TT.mine.render();
  if (doc.querySelectorAll('#mine-songs .mine-row').length !== 0) throw new Error('favourites were not empty to begin with');
  const on = TT.mine.toggleSong('wonderwall');
  if (!on || !TT.mine.isFav('wonderwall')) throw new Error('starring a song did nothing');
  if (!TT.store.get('favSongs', []).length) throw new Error('the favourite was not written to storage');
  TT.mine.render();
  if (!doc.querySelectorAll('#mine-songs .mine-row').length) throw new Error('the favourite did not render');
  if (!/Wonderwall/.test(doc.getElementById('mine-songs').textContent)) throw new Error('the wrong song rendered');
  /* the picker searches the book and toggles */
  const q = doc.getElementById('mine-pick-q');
  q.value = 'dylan';
  q.dispatchEvent(new window.Event('input', { bubbles: true }));
  const chips = [...doc.querySelectorAll('#mine-pick .chip')];
  if (!chips.length) throw new Error('the picker found nothing for “dylan”');
  chips[0].click();
  if (TT.mine.favSongs().length !== 2) throw new Error('the picker did not add a second favourite: ' + TT.mine.favSongs().length);
  /* rigs and tunings */
  TT.mine.saveRig('Test rig', ['ts808', 'analog-delay'], 'deluxe-reverb-65');
  if (!TT.mine.favRigs().length) throw new Error('saving a rig did nothing');
  TT.mine.toggleTuning('drop-d', 'Drop D');
  if (!TT.mine.favTunings().length) throw new Error('starring a tuning did nothing');
  TT.mine.render();
  if (!doc.querySelectorAll('#mine-rigs .mine-row').length) throw new Error('the saved rig did not render');
  if (!doc.querySelectorAll('#mine-tunings .chip').length) throw new Error('the favourite tuning did not render');
  /* the plan: assembled from the favourites, every step runnable */
  TT.store.set('tuningsUsed', ['drop-d', 'standard']);
  const plan = TT.mine.buildPlan(20);
  if (plan.steps.length < 3) throw new Error('plan too thin: ' + plan.steps.length);
  if (plan.total > 26) throw new Error('the plan does not fit the session: ' + plan.total + ' min');
  if (!plan.steps.every(s => typeof s.run === 'function' && s.label)) throw new Error('a plan step is not runnable');
  if (!plan.steps.some(s => /Wonderwall/.test(s.title))) throw new Error('the plan does not use the favourite songs');
  /* a 45-minute plan must be bigger than a 10-minute one */
  const big = TT.mine.buildPlan(45);
  if (big.total < plan.total) throw new Error('a longer session built a shorter plan');
  /* running a step must not throw */
  doc.querySelectorAll('#mine-plan-pick [data-mins]')[1].click();
  const btns = [...doc.querySelectorAll('#mine-plan [data-step]')];
  if (!btns.length) throw new Error('no step buttons rendered');
  btns[0].click();
  if (!doc.getElementById('view-tune').classList.contains('active')) throw new Error('the tune step did not open the tuner');
  TT.metronome.stop();
  TT.store.set('favSongs', []);        /* leave the store tidy for other checks */
  TT.store.set('favRigs', []);
  TT.store.set('favTunings', []);
  return TT.mine.buildPlan(20).steps.length + ' step plan · favourites, rigs and tunings all persist';
});

check('navigation: the three new views are reachable and hold their controls', () => {
  const doc = window.document;
  ['styles', 'backing', 'mine'].forEach(v => {
    if (!doc.querySelector('.nav-btn[data-view="' + v + '"]')) throw new Error('no nav button for ' + v);
    window.TT.app.showView(v);
    if (!doc.getElementById('view-' + v).classList.contains('active')) throw new Error(v + ' did not open');
  });
  const ids = ['sy-q', 'sy-genre', 'sy-sort', 'sy-list', 'sy-detail', 'sy-glossary',
    'bk-key', 'bk-mode', 'bk-style', 'bk-generate', 'bk-presets',
    'mine-plan', 'mine-pick-q', 'mine-songs', 'mine-rigs', 'mine-tunings', 'mine-activity'];
  const missing = ids.filter(id => !doc.getElementById(id));
  if (missing.length) throw new Error('missing: ' + missing.join(', '));
  window.TT.app.showView('tune');
  return ids.length + ' controls · 3 views · ' + doc.querySelectorAll('.nav-btn').length + ' nav buttons';
});

Promise.all(pending).then(() => {
  console.log('\n' + (errors.length ? '❌ ' + errors.length + ' problem(s):' : '✅ all checks passed'));
  errors.forEach(e => console.log('   · ' + e));
  console.log('');
  process.exit(errors.length || failed ? 1 : 0);
});
