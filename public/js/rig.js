/* Trill Tuner — the Rig: a virtual amplifier and pedalboard, plus the wiring
 * guide you would need to build the real thing.
 *
 * The audio is real Web Audio: your microphone (or the built-in test riffs)
 * goes through the pedals you put on the board, in the order you choose, and
 * into a modelled amp — preamp, tone stack, power sag and cabinet voicing.
 *
 * Nothing leaves the browser, and nothing needs a cable. If you do have an
 * interface with instrument inputs, route your guitar into it and monitor
 * through this chain with headphones on.
 */
(function () {
  'use strict';

  const R = { state: null };
  const els = {};
  let ctx = null, nodes = { input: null, pedals: [], amp: null, out: null, master: null };
  let micConnected = false;

  /* =================================================================== */
  /* state                                                                */
  /* =================================================================== */
  function defaultState() {
    return {
      ampId: 'deluxe-reverb-65',
      ampSettings: {},
      cab: 'jensen-c12k',
      mic: 'capedge',
      pedals: [],           /* [{id, on:true, params:{}}] */
      master: 0.55,
      monitor: false,
      monitorVol: 0.25,
      userPresets: []
    };
  }
  function load() {
    let s = null;
    try { s = window.TT.store.get('rig', null); } catch (e) {}
    R.state = Object.assign(defaultState(), s || {});
    if (!Array.isArray(R.state.pedals)) R.state.pedals = [];
  }
  function save() { try { window.TT.store.set('rig', R.state); } catch (e) {} }

  function ampById(id) { return window.TT.amps.byId(id); }
  function pedalById(id) { return window.TT.pedals.byId(id); }
  function ampControls() { return ampById(R.state.ampId).controls || []; }
  function ampValue(name) {
    const a = ampById(R.state.ampId);
    const c = (a.controls || []).find(x => x.name === name);
    if (!c) return 5;
    const v = R.state.ampSettings[name];
    return v == null ? c.def : v;
  }
  function pedalParam(pedalState, ctl) {
    const v = pedalState.params && pedalState.params[ctl.name];
    return v == null ? ctl.def : v;
  }

  /* =================================================================== */
  /* audio engine                                                         */
  /* =================================================================== */
  function ensureCtx() {
    window.TT.audio.ensure();
    ctx = window.TT.audio.ctx;
    if (!nodes.master) {
      nodes.master = ctx.createGain();
      nodes.master.gain.value = R.state.master;
      nodes.out = nodes.master;
      nodes.master.connect(ctx.destination);
    }
    return ctx;
  }

  function makeDriveCurve(amount, kind) {
    const n = 1024, curve = new Float32Array(n);
    const k = Math.max(0.0001, amount) * (kind === 'fuzz' ? 60 : kind === 'dist' ? 30 : 12);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = kind === 'fuzz' ? Math.tanh(k * x) * (1 - 0.35 * Math.abs(x)) : Math.tanh(k * x) / Math.tanh(k);
    }
    return curve;
  }

  function buildPedal(pedalState) {
    const def = pedalById(pedalState.id);
    if (!def) return null;
    const cat = def.cat;
    /* knob lookup by keyword so real pedal knob names map sensibly onto DSP */
    const want = words => {
      const ctl = (def.controls || []).find(c => words.some(w => c.name.toLowerCase().indexOf(w) !== -1));
      return ctl ? { ctl: ctl, v: pedalParam(pedalState, ctl) } : null;
    };
    const inG = ctx.createGain(), outG = ctx.createGain();
    const byp = ctx.createGain();     /* dry path gain when bypassed */
    let wet = null;

    if (cat === 'overdrive' || cat === 'distortion' || cat === 'fuzz' || cat === 'boost' ||
        cat === 'amp-in-a-box' || cat === 'compressor' || cat === 'eq') {
      const g = want(['drive', 'gain', 'dist', 'sustain', 'fuzz', 'distortion']);
      const level = want(['level', 'volume', 'output', 'balance', 'master', 'volume boost']);
      const tone = want(['tone', 'treble', 'filter', 'spectrum', 'high']);
      const bass = want(['bass', 'low', 'bass cut']);
      const mid = want(['mid', 'middle']);
      const gainVal = g ? (g.v / 10) : 0.35;
      const pre = ctx.createGain();
      pre.gain.value = 1 + gainVal * 6;
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeDriveCurve(Math.max(0.05, gainVal), cat === 'fuzz' ? 'fuzz' : cat === 'distortion' ? 'dist' : 'od');
      shaper.oversample = '4x';
      const toneF = ctx.createBiquadFilter();
      toneF.type = 'lowpass';
      toneF.frequency.value = tone ? 800 + tone.v * 220 : 4200;
      const bassF = ctx.createBiquadFilter();
      bassF.type = 'lowshelf'; bassF.frequency.value = 220;
      bassF.gain.value = bass ? (bass.v - 5) * 4 : 0;
      const midF = ctx.createBiquadFilter();
      midF.type = 'peaking'; midF.frequency.value = 800; midF.Q.value = 0.9;
      midF.gain.value = mid ? (mid.v - 5) * 5 : 0;
      const post = ctx.createGain();
      post.gain.value = level ? Math.max(0.05, level.v / 6) : 0.8;
      if (cat === 'compressor') {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -(g && g.ctl.name.indexOf('Sensitivity') !== -1 ? 10 + g.v * 3 : 24);
        comp.ratio.value = 4;
        comp.attack.value = 0.006;
        comp.release.value = 0.12;
        inG.connect(comp); comp.connect(post);
      } else if (cat === 'eq') {
        const bands = (def.controls || []).filter(c => /hz|khz/.test(c.name.toLowerCase()));
        let last = inG;
        bands.forEach(b => {
          const f = ctx.createBiquadFilter();
          const hz = /khz/.test(b.name.toLowerCase()) ? parseFloat(b.name) * 1000 : parseFloat(b.name);
          f.type = 'peaking'; f.frequency.value = hz || 1000; f.Q.value = 0.7;
          f.gain.value = pedalParam(pedalState, b);
          last.connect(f); last = f;
        });
        last.connect(post);
      } else {
        inG.connect(pre); pre.connect(shaper); shaper.connect(bassF); bassF.connect(midF); midF.connect(toneF); toneF.connect(post);
      }
      wet = post;
    } else if (cat === 'wah' || cat === 'filter') {
      const pos = want(['treadle', 'position', 'manual', 'range', 'rate', 'sensitivity']);
      const q = want(['q', 'peak', 'contour', 'resonance']);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = pos ? 250 + (pos.v / 10) * 2200 : 900;
      bp.Q.value = q ? 0.6 + q.v * 0.9 : 2.2;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const auto = cat === 'filter' || (def.controls || []).some(c => /rate|sensitivity/i.test(c.name));
      lfo.frequency.value = 0.6;
      lfoGain.gain.value = auto ? 220 : 0;
      lfo.connect(lfoGain); lfoGain.connect(bp.frequency); lfo.start();
      const g = ctx.createGain(); g.gain.value = 1.1;
      inG.connect(bp); bp.connect(g); wet = g;
    } else if (cat === 'chorus' || cat === 'flanger' || cat === 'phaser' || cat === 'vibe' || cat === 'tremolo') {
      const rate = want(['rate', 'speed']);
      const depth = want(['depth', 'intensity']);
      const d = ctx.createDelay(0.05);
      d.delayTime.value = cat === 'flanger' ? 0.0025 : cat === 'vibe' ? 0.004 : 0.012;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate ? 0.1 + (rate.v / 10) * 4 : 0.8;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = depth ? (cat === 'flanger' ? 0.002 : 0.004) * (depth.v / 5) : 0.002;
      lfo.connect(lfoGain); lfoGain.connect(d.delayTime); lfo.start();
      const mix = ctx.createGain();
      mix.gain.value = depth ? 0.15 + (depth.v / 10) * 0.5 : 0.5;
      inG.connect(d); d.connect(mix); wet = mix;
      if (cat === 'tremolo') {
        const trem = ctx.createGain();
        trem.gain.value = 1;
        const tLfo = ctx.createOscillator();
        tLfo.frequency.value = rate ? 0.5 + (rate.v / 10) * 8 : 3;
        const tg = ctx.createGain();
        tg.gain.value = depth ? (depth.v / 10) * 0.45 : 0.3;
        tLfo.connect(tg); tg.connect(trem.gain); tLfo.start();
        inG.connect(trem); trem.connect(mix); wet = mix;
      }
    } else if (cat === 'delay') {
      const time = want(['delay', 'time']);
      const fb = want(['regen', 'feedback', 'repeats']);
      const mix = want(['mix', 'level', 'blend', 'echo']);
      const d = ctx.createDelay(8);
      d.delayTime.value = time ? 0.05 + (time.v / 10) * 1.2 : 0.35;
      const fbg = ctx.createGain();
      fbg.gain.value = fb ? Math.min(0.92, (fb.v / 10) * 0.95) : 0.35;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass'; tone.frequency.value = 3200;
      const wetG = ctx.createGain();
      wetG.gain.value = mix ? 0.1 + (mix.v / 10) * 0.9 : 0.4;
      inG.connect(d); d.connect(tone); tone.connect(fbg); fbg.connect(d); tone.connect(wetG);
      wet = wetG;
    } else if (cat === 'reverb') {
      const mix = want(['mix', 'reverb', 'level', 'blend']);
      const decay = want(['decay', 'dwell', 'time']);
      const len = Math.floor(ctx.sampleRate * (decay ? 0.6 + (decay.v / 10) * 4 : 2.2));
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay ? 1.2 + (10 - decay.v) / 8 : 2.2);
        }
      }
      const conv = ctx.createConvolver();
      conv.buffer = ir;
      const wetG = ctx.createGain();
      wetG.gain.value = mix ? 0.1 + (mix.v / 10) * 0.9 : 0.35;
      inG.connect(conv); conv.connect(wetG); wet = wetG;
    } else {
      /* pitch, looper, utility, tuner, switcher: honest pass-through */
      wet = ctx.createGain();
      wet.gain.value = 1;
      inG.connect(wet);
    }

    /* dry/wet wiring: active pedals add their wet path; bypassed ones pass dry */
    inG.connect(outG);
    if (wet) wet.connect(outG);
    return { id: pedalState.id, in: inG, out: outG, wet: wet };
  }

  function ampCurve(drive) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
    }
    return curve;
  }

  function buildAmp() {
    const a = ampById(R.state.ampId);
    const input = ctx.createGain();
    const preCtl = (a.controls || []).find(c => /gain|preamp|volume.*treble|high treble/i.test(c.name));
    const masterCtl = (a.controls || []).find(c => /master|output|post gain/i.test(c.name));
    const pre = ctx.createGain();
    const preVal = preCtl ? ampValue(preCtl.name) : 5;
    pre.gain.value = 0.4 + (preVal / 10) * 2.4;
    const shaper = ctx.createWaveShaper();
    shaper.curve = ampCurve(1.4 + (preVal / 10) * 6);
    shaper.oversample = '4x';
    const bass = ctx.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 110;
    const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 750; mid.Q.value = 0.8;
    const treb = ctx.createBiquadFilter(); treb.type = 'highshelf'; treb.frequency.value = 3200;
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 4200; pres.Q.value = 0.7;
    const cabLp = ctx.createBiquadFilter(); cabLp.type = 'lowpass';
    const cabHp = ctx.createBiquadFilter(); cabHp.type = 'highpass'; cabHp.frequency.value = 70;
    const output = ctx.createGain();
    const masterVal = masterCtl ? ampValue(masterCtl.name) : 5;
    output.gain.value = 0.5 + (masterVal / 10) * 1.6;

    const cab = (window.TT.amps.CABS || []).find(c => c.id === R.state.cab) || { id: 'v30-412', name: '4×12" V30' };
    const cabTone = /blue|jensen|twin|greenback/i.test(cab.name) ? 4600 : /svt|bass/i.test(cab.name) ? 3500 : 4000;
    cabLp.frequency.value = cabTone;

    input.connect(pre); pre.connect(shaper);
    shaper.connect(bass); bass.connect(mid); mid.connect(treb); treb.connect(pres); pres.connect(cabHp); cabHp.connect(cabLp); cabLp.connect(output);

    const bassCtl = (a.controls || []).find(c => /bass|low/i.test(c.name));
    const midCtl = (a.controls || []).find(c => /mid/i.test(c.name));
    const trebCtl = (a.controls || []).find(c => /treble|treble\/top/i.test(c.name));
    const presCtl = (a.controls || []).find(c => /presence/i.test(c.name));
    const scale = c => ((c && ampValue(c.name)) || 5);
    bass.gain.value = bassCtl ? (scale(bassCtl) - 5) * 3.2 : 0;
    mid.gain.value = midCtl ? (scale(midCtl) - 6) * 3.4 : 0;
    treb.gain.value = trebCtl ? (scale(trebCtl) - 5) * 3.2 : 0;
    pres.gain.value = presCtl ? (scale(presCtl) - 5) * 2.6 : 0;
    return { input: input, output: output, filters: { bass: bass, mid: mid, treb: treb, pres: pres, cabLp: cabLp } };
  }

  function teardown() {
    if (nodes.pedals) nodes.pedals.forEach(p => { try { p.in.disconnect(); p.out.disconnect(); } catch (e) {} });
    nodes.pedals = [];
    if (nodes.amp) {
      const f = nodes.amp.filters || {};
      Object.keys(f).forEach(k => { try { f[k].disconnect(); } catch (e) {} });
      try { nodes.amp.input.disconnect(); nodes.amp.output.disconnect(); } catch (e) {}
      nodes.amp = null;
    }
  }

  function rebuild() {
    if (!ctx) return;
    teardown();
    let prev = nodes.input;
    if (!prev) {
      prev = nodes.input = ctx.createGain();
      prev.gain.value = 1;
    } else {
      try { prev.disconnect(); } catch (e) {}
    }
    /* pedals in board order */
    R.state.pedals.forEach(ps => {
      if (!ps.on) return;
      const built = buildPedal(ps);
      if (!built) return;
      prev.connect(built.in);
      prev = built.out;
      nodes.pedals.push(built);
    });
    nodes.amp = buildAmp();
    prev.connect(nodes.amp.input);
    nodes.amp.output.connect(nodes.master);
    updateMicRoute();
    renderSignalChain();
    renderActiveCount();
  }

  function setMaster(v) { R.state.master = v; if (nodes.master) nodes.master.gain.value = v; save(); }

  function updateMicRoute() {
    const src = window.TT.audio.micSource;
    if (!nodes.input) return;
    if (!nodes.monGain) {
      nodes.monGain = ctx.createGain();
      nodes.monGain.gain.value = R.state.monitorVol;
      nodes.monGain.connect(nodes.input);
    }
    if (R.state.monitor && src && !micConnected) {
      try { src.connect(nodes.monGain); micConnected = true; } catch (e) {}
    } else if ((!R.state.monitor || !src) && micConnected) {
      try { src && src.disconnect(nodes.monGain); } catch (e) {}
      micConnected = false;
    }
    nodes.monGain.gain.value = R.state.monitorVol;
  }

  /* =================================================================== */
  /* test riffs through the rig                                           */
  /* =================================================================== */
  function pluckThroughChain(freq, when, gain) {
    window.TT.audio.pluck(freq, when, gain == null ? 0.5 : gain, nodes.input || undefined);
  }
  function testRiff(kind) {
    ensureCtx(); rebuild();
    const ctxNow = ctx.currentTime + 0.05;
    const std = [40, 45, 50, 55, 59, 64];               /* low E … high E */
    const freqs = std.map(m => window.TT.notes.midiToFreq(m, window.TT.tuner.state.a4 || 440));
    if (kind === 'chord') {
      freqs.forEach((f, i) => pluckThroughChain(f, ctxNow + i * 0.02, 0.5));
      [64, 67, 72].forEach((m, i) => pluckThroughChain(window.TT.notes.midiToFreq(m, 440), ctxNow + 1.1 + i * 0.05, 0.35));
    } else if (kind === 'chug') {
      for (let i = 0; i < 8; i++) {
        const f = freqs[0];
        pluckThroughChain(f, ctxNow + i * 0.22, i % 4 === 0 ? 0.6 : 0.42);
      }
      pluckThroughChain(window.TT.notes.midiToFreq(45, 440), ctxNow + 1.9, 0.5);
    } else {
      const line = [64, 67, 71, 74, 76, 79];
      line.forEach((m, i) => pluckThroughChain(window.TT.notes.midiToFreq(m, 440), ctxNow + i * 0.17, 0.5));
    }
  }

  /* =================================================================== */
  /* rendering — amp                                                      */
  /* =================================================================== */
  function knobHTML(id, name, val, min, max, opts) {
    opts = opts || {};
    const pct = (val - min) / (max - min);
    const angle = -135 + pct * 270;
    const options = opts.options;
    const text = options ? options[Math.round(val)] : (max <= 12 && !opts.integer ? (+val).toFixed(1) : String(Math.round(val)));
    return `<div class="knob" data-ctl="${id}" data-name="${name}">
        <div class="knob-dial" style="--a:${angle}deg"><i></i><span>${text}</span></div>
        <div class="knob-label">${name}</div>
      </div>`;
  }

  function renderAmp() {
    const a = ampById(R.state.ampId);
    els.ampSelect.innerHTML = (window.TT.amps.families() || []).map(brand =>
      `<optgroup label="${brand}">` + window.TT.amps.AMPS.filter(x => x.brand === brand)
        .map(x => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${x.model}${x.year ? ' (' + x.year + ')' : ''}</option>`).join('') + '</optgroup>').join('');
    els.ampFace.innerHTML = `<div class="amp-head"><span class="amp-brand">${a.brand}</span><span class="amp-model">${a.model}</span>
        <span class="amp-watts">${a.watts} W</span></div>
      <div class="amp-knobs">${(a.controls || []).map(c => knobHTML('amp', c.name, ampValue(c.name), c.min, c.max, { options: c.options })).join('')}</div>`;
    const tones = (a.tones || []).map((t, i) => `<button class="btn tiny" data-tone="${i}">${t.name}</button>`).join('');
    const cab = (window.TT.amps.CABS || []).find(c => c.id === R.state.cab);
    const mic = (window.TT.amps.MIKING || []).find(m => m.id === R.state.mic);
    els.ampInfo.innerHTML = `<p class="amp-desc">${a.desc}</p>
      <div class="amp-specs">
        <span><b>${a.type}</b></span><span><b>${a.watts} watts</b></span><span>${a.tube}</span>
        <span>Speakers: <b>${a.speakers || '—'}</b></span>${a.price ? `<span>Street price: ${a.price}</span>` : ''}
        ${a.artists.length ? `<span>Played by: <b>${a.artists.join(' · ')}</b></span>` : ''}
      </div>
      <div class="card-h small">Dialed-in sounds (click to load every knob)</div>
      <div class="chord-row">${tones}</div>
      <div class="card-h small">Cabinet &amp; microphone</div>
      <div class="tools-controls">
        <label class="field inline"><span>Cabinet</span><select id="rig-cab">${(window.TT.amps.CABS || []).map(c => `<option value="${c.id}" ${c.id === R.state.cab ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
        <label class="field inline"><span>Mic position</span><select id="rig-mic">${(window.TT.amps.MIKING || []).map(m => `<option value="${m.id}" ${m.id === R.state.mic ? 'selected' : ''}>${m.name}</option>`).join('')}</select></label>
      </div>
      <div class="dim tiny-hint">${cab ? cab.character : ''} ${mic ? '· ' + mic.effect : ''}</div>`;

    els.ampFace.querySelectorAll('.knob').forEach(k => bindKnob(k, (name, v) => {
      R.state.ampSettings[name] = v; save(); applyAmpParams(); renderAmpValues();
    }));
    els.ampInfo.querySelectorAll('[data-tone]').forEach(b => b.addEventListener('click', () => {
      const t = a.tones[+b.dataset.tone];
      R.state.ampSettings = Object.assign({}, t.settings);
      save(); renderAmp(); rebuild();
      window.TT.app.toast(`Loaded “${t.name}”${t.song ? ' — ' + t.song : ''}. ${t.notes}`);
    }));
    const cabSel = el2('rig-cab'); if (cabSel) cabSel.addEventListener('change', () => { R.state.cab = cabSel.value; save(); rebuild(); renderAmp(); });
    const micSel = el2('rig-mic'); if (micSel) micSel.addEventListener('change', () => { R.state.mic = micSel.value; save(); rebuild(); renderAmp(); });
  }
  function applyAmpParams() {
    if (!nodes.amp) return;
    const a = ampById(R.state.ampId);
    const f = nodes.amp.filters;
    const find = re => (a.controls || []).find(c => re.test(c.name));
    const b = find(/bass|low/i), m = find(/mid/i), t = find(/treble/i), p = find(/presence/i);
    if (f.bass && b) f.bass.gain.value = (ampValue(b.name) - 5) * 3.2;
    if (f.mid && m) f.mid.gain.value = (ampValue(m.name) - 6) * 3.4;
    if (f.treb && t) f.treb.gain.value = (ampValue(t.name) - 5) * 3.2;
    if (f.pres && p) f.pres.gain.value = (ampValue(p.name) - 5) * 2.6;
  }
  function renderAmpValues() {
    els.ampFace.querySelectorAll('.knob').forEach(k => {
      const name = k.dataset.name, v = ampValue(name);
      const c = ampControls().find(x => x.name === name) || { min: 0, max: 10 };
      const pct = (v - c.min) / (c.max - c.min || 1);
      k.querySelector('.knob-dial').style.setProperty('--a', (-135 + pct * 270) + 'deg');
      k.querySelector('.knob-dial span').textContent = c.options ? c.options[Math.round(v)] : (+v).toFixed(1);
    });
  }
  function bindKnob(knobEl, onChange) {
    const name = knobEl.dataset.name;
    const ctl = knobEl.dataset.ctl === 'amp' ? ampControls().find(c => c.name === name) : null;
    let dragging = false;
    const move = e => {
      if (!dragging) return;
      const rect = knobEl.getBoundingClientRect();
      const py = (e.touches ? e.touches[0].clientY : e.clientY);
      const py0 = knobEl._y0 == null ? (knobEl._y0 = py) : knobEl._y0;
      const dv = (py0 - py) / 120;
      let v = knobEl._v0 + dv * ((ctl ? ctl.max : 10) - (ctl ? ctl.min : 0));
      v = Math.max(ctl ? ctl.min : 0, Math.min(ctl ? ctl.max : 10, Math.round(v * 10) / 10));
      onChange(name, v);
      if (e.cancelable) e.preventDefault();
    };
    const up = () => { dragging = false; knobEl._y0 = null; document.removeEventListener('pointermove', move); };
    knobEl.addEventListener('pointerdown', e => {
      dragging = true;
      knobEl._v0 = ctl ? ampValue(name) : 5;
      knobEl._y0 = null;
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up, { once: true });
      move(e);
    });
    knobEl.addEventListener('wheel', e => {
      e.preventDefault();
      const base = ctl ? ampValue(name) : 5;
      const step = ctl && (ctl.max - ctl.min) > 20 ? 1 : 0.5;
      const v = Math.max(ctl ? ctl.min : 0, Math.min(ctl ? ctl.max : 10, base + (e.deltaY < 0 ? step : -step)));
      onChange(name, v);
    }, { passive: false });
  }

  /* =================================================================== */
  /* rendering — board                                                    */
  /* =================================================================== */
  function renderBoard() {
    els.boardCount.textContent = R.state.pedals.length + (R.state.pedals.length === 1 ? ' pedal' : ' pedals');
    els.boardChain.innerHTML = R.state.pedals.map((ps, i) => {
      const def = pedalById(ps.id);
      if (!def) return '';
      const knobs = (def.controls || []).map(c =>
        `<label class="board-knob"><span>${c.name}</span>
          <input type="range" min="${c.min}" max="${c.max}" step="${(c.max - c.min) > 20 ? 1 : 0.1}" value="${pedalParam(ps, c)}" data-p="${i}" data-k="${c.name}">
          <b>${(+pedalParam(ps, c)).toFixed(0)}</b></label>`).join('');
      const tone = def.iconic && def.iconic[0];
      return `<div class="board-row ${ps.on ? 'on' : 'off'}">
        <div class="board-head">
          <span class="board-num">${i + 1}</span>
          <div class="board-title"><b>${def.name}</b><span class="dim">${def.brand} · ${def.cat}</span></div>
          <div class="board-buttons">
            <button class="btn tiny ${ps.on ? '' : 'btn-ghost'}" data-toggle="${i}">${ps.on ? '● on' : '○ off'}</button>
            <button class="btn tiny btn-ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn tiny btn-ghost" data-down="${i}" ${i === R.state.pedals.length - 1 ? 'disabled' : ''}>▼</button>
            <button class="btn tiny btn-ghost" data-detail="${i}">info</button>
            <button class="btn tiny btn-ghost" data-remove="${i}">✕</button>
          </div>
        </div>
        <div class="board-knobs">${knobs}</div>
        ${tone ? `<div class="dim tiny-hint">Try: <b>${tone.song}</b>${tone.artist && tone.artist !== '—' ? ' — ' + tone.artist : ''} · ${Object.keys(tone.settings).map(k => k + ' ' + tone.settings[k]).join(' · ')}</div>` : ''}
      </div>`;
    }).join('') || '<div class="dim">Board is empty. Search below to add your first pedal — I recommend a wah or a Tube Screamer.</div>';

    els.boardChain.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => { R.state.pedals[+b.dataset.toggle].on = !R.state.pedals[+b.dataset.toggle].on; save(); rebuild(); renderBoard(); }));
    els.boardChain.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => movePedal(+b.dataset.up, -1)));
    els.boardChain.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => movePedal(+b.dataset.down, 1)));
    els.boardChain.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { R.state.pedals.splice(+b.dataset.remove, 1); save(); rebuild(); renderBoard(); }));
    els.boardChain.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => showDetail(+b.dataset.detail)));
    els.boardChain.querySelectorAll('input[type=range]').forEach(inp => inp.addEventListener('input', () => {
      const i = +inp.dataset.p, k = inp.dataset.k;
      const ps = R.state.pedals[i];
      ps.params = ps.params || {};
      ps.params[k] = +inp.value;
      inp.parentElement.querySelector('b').textContent = (+inp.value).toFixed(0);
      /* live-ish: param changes rebuild the chain (Web Audio nodes are cheap here) */
      debounceRebuild();
    }));
  }
  let rebuildTimer = null;
  function debounceRebuild() {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => { save(); rebuild(); }, 220);
  }
  function movePedal(i, dir) {
    const to = i + dir;
    if (to < 0 || to >= R.state.pedals.length) return;
    const tmp = R.state.pedals[i];
    R.state.pedals[i] = R.state.pedals[to];
    R.state.pedals[to] = tmp;
    save(); rebuild(); renderBoard();
  }
  function showDetail(i) {
    const ps = R.state.pedals[i];
    const def = pedalById(ps.id);
    if (!def) return;
    els.pedalDetail.innerHTML = `<div class="detail-head"><b>${def.name}</b><span class="dim">${def.brand} · ${def.year} · ${def.cat}</span></div>
      <p>${def.desc}</p>
      <div class="amp-specs"><span>Power: ${def.power}</span><span>Bypass: ${def.bypass}</span>${def.price ? `<span>Price: ${def.price}</span>` : ''}<span>Chain position: <b>${def.slot}</b></span></div>
      <div class="card-h small">Knobs</div>
      <ul class="ctl-tips">${(def.controls || []).map(c => `<li><b>${c.name}</b> (${c.min}–${c.max}, default ${c.def}) — ${c.tip}</li>`).join('')}</ul>
      <div class="card-h small">Settings that made it famous</div>
      ${(def.iconic || []).map(ic => `<div class="iconic"><b>${ic.song}</b>${ic.artist && ic.artist !== '—' ? ' · ' + ic.artist : ''}
        <div class="iconic-set">${Object.keys(ic.settings).map(k => `<span class="chip">${k}: ${ic.settings[k]}</span>`).join('')}</div>
        ${ic.note ? `<div class="dim tiny-hint">${ic.note}</div>` : ''}</div>`).join('')}
      ${def.stack ? `<div class="warn-note">🧩 Stacking: ${def.stack}</div>` : ''}
      <div class="row-btns">
        <button class="btn tiny" data-apply-iconic="${i}">Load the first famous setting</button>
        <button class="btn tiny btn-ghost" data-move-top="${i}">Move to front of board</button>
      </div>`;
    els.pedalDetail.querySelectorAll('[data-apply-iconic]').forEach(b => b.addEventListener('click', () => {
      const iconic = def.iconic[0];
      if (!iconic) return;
      ps.params = {};
      Object.keys(iconic.settings).forEach(k => {
        const c = (def.controls || []).find(x => x.name === k);
        if (c) ps.params[c.name] = iconic.settings[k];
      });
      save(); rebuild(); renderBoard(); showDetail(i);
      window.TT.app.toast(`Loaded: ${iconic.song}`);
    }));
    els.pedalDetail.querySelectorAll('[data-move-top]').forEach(b => b.addEventListener('click', () => {
      const p = R.state.pedals.splice(i, 1)[0];
      R.state.pedals.unshift(p);
      save(); rebuild(); renderBoard();
    }));
  }
  function renderPedalSearch() {
    const q = (els.pedalSearch.value || '').toLowerCase().trim();
    const cat = els.pedalCat.value;
    let list = window.TT.pedals.all();
    if (cat !== 'all') list = list.filter(p => p.cat === cat);
    if (q) list = list.filter(p => (p.brand + ' ' + p.name + ' ' + p.cat + ' ' + p.desc).toLowerCase().indexOf(q) !== -1);
    els.pedalResults.innerHTML = list.slice(0, 40).map(p => `<button class="pedal-hit" data-add="${p.id}">
        <b>${p.name}</b><span class="dim">${p.brand} · ${p.cat}${p.year ? ' · ' + p.year : ''}</span></button>`).join('')
      + (list.length > 40 ? `<div class="dim tiny-hint">${list.length - 40} more — keep typing to narrow it down.</div>` : '')
      || '<div class="dim">No pedal matches that. Try “fuzz”, “delay”, “wah” or a brand name.</div>';
    els.pedalResults.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addPedal(b.dataset.add)));
  }
  function addPedal(id) {
    if (R.state.pedals.length >= 16) { window.TT.app.toast('Sixteen pedals is already more than most pro boards — remove one first.'); return; }
    const def = pedalById(id);
    if (!def) return;
    const ps = { id: id, on: true, params: {} };
    (def.controls || []).forEach(c => { ps.params[c.name] = c.def; });
    /* order pedals sensibly the first time: by the classic chain position */
    const order = { guitar: 0, dirt: 1, comp: 1, filter: 1, eq: 2, mod: 3, time: 4, utility: 5 };
    R.state.pedals.push(ps);
    R.state.pedals.sort((a, b) => (order[pedalById(a.id).slot] || 3) - (order[pedalById(b.id).slot] || 3));
    save(); rebuild(); renderBoard(); showDetail(R.state.pedals.findIndex(x => x === ps));
    window.TT.app.toast(`${def.name} added${def.brand ? ' (' + def.brand + ')' : ''}. ${def.desc.slice(0, 90)}…`);
  }
  function renderSignalChain() {
    const parts = ['Guitar → cable'];
    R.state.pedals.filter(p => p.on).forEach(p => parts.push(pedalById(p.id).name));
    const a = ampById(R.state.ampId);
    parts.push(a.brand + ' ' + a.model);
    const cab = (window.TT.amps.CABS || []).find(c => c.id === R.state.cab);
    parts.push(cab ? cab.name : 'cabinet');
    parts.push('microphone → speakers');
    els.signalChain.innerHTML = parts.map((p, i) => `<span class="sig-step ${i === 0 ? 'start' : ''} ${i === parts.length - 1 ? 'end' : ''}">${p}</span>`).join('<span class="sig-arrow">›</span>');
  }
  function renderActiveCount() { els.activeCount.textContent = R.state.pedals.filter(p => p.on).length + ' active'; }

  /* =================================================================== */
  /* famous rigs + user presets                                           */
  /* =================================================================== */
  function famousRigs() {
    return ((window.TT.wiring && window.TT.wiring.CHAINS) || []).filter(c => c.ampId);
  }
  function renderPresets() {
    const famous = famousRigs().map((c, i) => `<button class="btn tiny" data-famous="${i}">🎸 ${c.name}</button>`).join('');
    const user = (R.state.userPresets || []).map((p, i) => `<button class="btn tiny" data-user="${i}">📼 ${p.name}</button>`).join('');
    els.presets.innerHTML = `<div class="card-h small">Famous rigs — one click loads the amp and the board</div>
      <div class="chord-row">${famous}</div>
      <div class="card-h small">My rigs</div>
      <div class="chord-row">${user || '<span class="dim">No saved rigs yet.</span>'}
        <button class="btn tiny btn-primary" id="rig-save">💾 Save this rig</button></div>`;
    const sv = el2('rig-save');
    if (sv) sv.addEventListener('click', () => {
      const name = prompt('Name this rig:', ampById(R.state.ampId).model + ' board');
      if (!name) return;
      R.state.userPresets = R.state.userPresets || [];
      R.state.userPresets.push({ name: name, at: Date.now(), ampId: R.state.ampId, ampSettings: JSON.parse(JSON.stringify(R.state.ampSettings)), cab: R.state.cab, pedals: JSON.parse(JSON.stringify(R.state.pedals)) });
      save(); renderPresets(); window.TT.app.toast(`Saved “${name}”. It is stored in your browser and included in your backup file.`);
    });
    els.presets.querySelectorAll('[data-famous]').forEach(b => b.addEventListener('click', () => loadFamous(famousRigs()[+b.dataset.famous])));
    els.presets.querySelectorAll('[data-user]').forEach(b => b.addEventListener('click', () => {
      const p = R.state.userPresets[+b.dataset.user];
      R.state.ampId = p.ampId; R.state.ampSettings = p.ampSettings || {}; R.state.cab = p.cab || R.state.cab;
      R.state.pedals = p.pedals || [];
      save(); rebuild(); renderAmp(); renderBoard();
      window.TT.app.toast(`Loaded “${p.name}”.`);
    }));
  }
  function loadFamous(chain) {
    if (!chain) return;
    R.state.ampId = chain.ampId;
    R.state.ampSettings = {};
    R.state.pedals = (chain.pedalIds || chain.pedals || []).map(id => {
      const def = pedalById(id);
      const ps = { id: id, on: true, params: {} };
      if (def) (def.controls || []).forEach(c => { ps.params[c.name] = c.def; });
      return ps;
    }).filter(ps => pedalById(ps.id));
    /* apply the recipe settings the rig description carries (if any) */
    if (chain.recipe) {
      Object.keys(chain.recipe).forEach(pedalId => {
        const ps = R.state.pedals.find(p => p.id === pedalId);
        if (!ps) return;
        Object.keys(chain.recipe[pedalId]).forEach(k => { ps.params[k] = chain.recipe[pedalId][k]; });
      });
    }
    save(); rebuild(); renderAmp(); renderBoard(); renderPresets();
    window.TT.app.toast(`${chain.name}: ${chain.amp} with ${R.state.pedals.length} pedals. ${chain.note || ''}`);
  }

  /* one click: amp + cab + the pedals a genre is actually made of */
  function loadRecipe(g) {
    if (!g) return;
    R.state.ampId = g.amp;
    R.state.ampSettings = {};
    if (g.cabs && (window.TT.amps.CABS || []).some(c => c.id === g.cabs)) R.state.cab = g.cabs;
    R.state.pedals = (g.pedals || []).map(id => {
      const def = pedalById(id);
      const ps = { id: id, on: true, params: {} };
      if (def) (def.controls || []).forEach(c => { ps.params[c.name] = c.def; });
      return ps;
    }).filter(ps => pedalById(ps.id));
    save(); rebuild(); renderAmp(); renderBoard(); renderPresets(); renderSignalChain(); renderActiveCount();
    window.TT.app.toast(`${g.name}: ${R.state.pedals.length ? R.state.pedals.length + ' pedals loaded' : 'no pedals — straight into the amp'}. ${g.settings.slice(0, 80)}…`);
  }

  /* =================================================================== */
  /* wiring guide                                                         */
  /* =================================================================== */
  function renderGuide(tab) {
    const W = window.TT.wiring || {};
    const item = (title, why, extra) => `<div class="guide-item"><b>${title}</b><div class="guide-why">${why || ''}</div>${extra ? `<div class="dim tiny-hint">${extra}</div>` : ''}</div>`;
    const asList = (arr, render) => `<div class="guide-list">${(arr || []).map(render).join('')}</div>`;
    /* some sections are written as bold-markdown-ish strings; render the bold */
    const md = str => String(str || '')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
    let html = '';
    if (tab === 'order') {
      html = `<p class="hint">The classic pedal order — there is no law, but following it solves 95% of problems before they start. ${W.ORDER.length} steps, in the order your signal should meet them.</p>` +
        asList(W.ORDER, o => item(o.pos + '. ' + o.name, md(o.why), o.pedal ? 'Usually: ' + md(o.pedal) : ''));
    } else if (tab === 'loop') {
      html = `<p class="hint">Your amp’s effects loop sits after the preamp and before the power amp, so delay and reverb stay clean instead of turning to mush.</p>` +
        asList(W.FX_LOOP, t => `<div class="guide-item"><div class="guide-why">${md(t)}</div></div>`);
    } else if (tab === 'power') {
      html = `<p class="hint">Power is where pedalboard noise comes from. Read this before you buy a £20 daisy chain for ten pedals.</p>` +
        asList(W.POWER, t => `<div class="guide-item"><div class="guide-why">${md(t)}</div></div>`);
    } else if (tab === 'cables') {
      html = `<p class="hint">Every cable in the chain is a tone control you did not ask for. These are the ones worth owning.</p>` +
        asList(W.CABLES, c => item(c.name, md(c.use), c.tip ? 'Tip: ' + md(c.tip) : ''));
    } else if (tab === 'impedance') {
      html = `<p class="hint">Speaker impedance mistakes destroy output transformers. This is the one section to read twice.</p>` +
        asList(W.IMPEDANCE, t => `<div class="guide-item"><div class="guide-why">${md(t)}</div></div>`);
    } else if (tab === 'trouble') {
      html = `<p class="hint">${W.TROUBLE.length} things that go wrong at the worst moment, and how to fix each one fast.</p>` +
        asList(W.TROUBLE, t => item('🔎 ' + t.symptom, '<b>Cause:</b> ' + md(t.cause) + '<br><b>Fix:</b> ' + md(t.fix)));
    } else if (tab === 'recording') {
      html = `<p class="hint">How to get this rig onto a recording — from a single SM57 to a re-amped DI track.</p>` +
        asList(W.RECORDING, t => `<div class="guide-item"><div class="guide-why">${md(t)}</div></div>`);
    } else if (tab === 'cabs') {
      html = asList(window.TT.amps.CABS, c => item(c.name, c.character, 'Use: ' + c.use + ' · Pairs with: ' + c.pairing + ' · Tip: ' + c.tips));
    } else if (tab === 'miking') {
      html = asList(window.TT.amps.MIKING, m => item(m.name, m.effect, 'How: ' + m.how)) +
        '<div class="card-h small">Microphones</div>' +
        asList(window.TT.amps.MICS, m => item(m.name + (m.cost ? ' · ' + m.cost : ''), m.tone, 'Best for: ' + m.best + ' · Placement: ' + m.position));
    } else if (tab === 'recipes') {
      html = `<p class="hint">${(window.TT.amps.GENRES || []).length} genre recipes — the amp, the cab, the pedals and the settings that genre is actually made of. Load one and the whole rig is set up for you.</p>` +
        asList(window.TT.amps.GENRES, (g, i) => `<div class="guide-item"><b>${g.name}</b>
          <div class="guide-why">${g.settings}</div>
          <div class="dim tiny-hint">Amp: <b>${ampById(g.amp) ? ampById(g.amp).brand + ' ' + ampById(g.amp).model : g.amp}</b> · Cab: ${g.cabs} · Pedals: ${(g.pedals || []).map(pid => pedalById(pid) ? pedalById(pid).name : pid).join(' → ') || 'straight in'}</div>
          ${g.song ? `<div class="dim tiny-hint">Sounds like: ${g.song}</div>` : ''}
          ${g.note ? `<div class="dim tiny-hint">${g.note}</div>` : ''}
          <button class="btn tiny" data-load-recipe="${i}">Load this recipe</button></div>`);
      setTimeout(() => {
        els.guideBody.querySelectorAll('[data-load-recipe]').forEach(b => b.addEventListener('click', () => loadRecipe(window.TT.amps.GENRES[+b.dataset.loadRecipe])));
      }, 0);
    } else if (tab === 'rigs') {
      html = `<p class="hint">${famousRigs().length} rigs from the records — click “load” and the amp and the whole board load into the Rig above.</p>` +
        asList(famousRigs(), (c, i) => `<div class="guide-item"><b>${c.name || c.id}</b>
          <div class="guide-why">${c.artist} · ${c.amp}</div>
          <div class="dim tiny-hint">${(c.chain || []).join(' → ')}</div>
          ${c.notes ? `<div class="dim tiny-hint">${md(c.notes)}</div>` : ''}
          ${c.guitar ? `<div class="dim tiny-hint">Guitar: ${c.guitar}</div>` : ''}
          <button class="btn tiny" data-load-rig="${i}">Load this rig</button></div>`);
      setTimeout(() => {
        els.guideBody.querySelectorAll('[data-load-rig]').forEach(b => b.addEventListener('click', () => loadFamous(famousRigs()[+b.dataset.loadRig])));
      }, 0);
    } else if (tab === 'amps') {
      html = asList(window.TT.amps.AMPS, a => item(a.brand + ' ' + a.model, a.desc,
        `${a.watts} W · ${a.type} · ${a.speakers}${a.price ? ' · ' + a.price : ''} · ${(a.tones || []).length} dialed-in sounds`) +
        `<button class="btn tiny" data-load-amp="${a.id}" style="margin-bottom:8px">Load this amp</button>`);
      setTimeout(() => {
        els.guideBody.querySelectorAll('[data-load-amp]').forEach(b => b.addEventListener('click', () => {
          R.state.ampId = b.dataset.loadAmp;
          R.state.ampSettings = {};
          save(); rebuild(); renderAmp(); renderPresets();
          window.TT.app.toast('Amp loaded: ' + ampById(R.state.ampId).model);
        }));
      }, 0);
    } else if (tab === 'board') {
      html = `<p class="hint">Board-building advice from people who have done it for a living.</p>` +
        asList(W.BOARD_TIPS, t => `<div class="guide-item"><div class="guide-why">${md(t)}</div></div>`);
    }
    els.guideBody.innerHTML = html || '<div class="dim">Nothing here yet.</div>';
  }

  /* =================================================================== */
  /* init                                                                 */
  /* =================================================================== */
  function el2(id) { return document.getElementById(id); }

  R.init = function () {
    els.ampSelect = el2('rig-amp-select');
    if (!els.ampSelect) return;
    els.ampFace = el2('rig-amp-face');
    els.ampInfo = el2('rig-amp-info');
    els.boardChain = el2('rig-board-chain');
    els.boardCount = el2('rig-board-count');
    els.pedalSearch = el2('rig-pedal-search');
    els.pedalCat = el2('rig-pedal-cat');
    els.pedalResults = el2('rig-pedal-results');
    els.pedalDetail = el2('rig-pedal-detail');
    els.presets = el2('rig-presets');
    els.guideTabs = el2('rig-guide');
    els.guideBody = el2('rig-guide-body');
    els.signalChain = el2('rig-signal-chain');
    els.activeCount = el2('rig-active-count');
    load();

    ensureCtx();
    renderAmp(); renderBoard(); renderPedalSearch(); renderPresets(); renderGuide('order');
    rebuild();

    els.ampSelect.addEventListener('change', () => {
      R.state.ampId = els.ampSelect.value;
      R.state.ampSettings = {};
      save(); renderAmp(); rebuild();
      const a = ampById(R.state.ampId);
      window.TT.app.toast(`${a.brand} ${a.model} loaded — ${a.watts} watts. Try one of the dialed-in sounds below the knobs.`);
    });
    els.pedalSearch.addEventListener('input', renderPedalSearch);
    /* build the type filter from the library itself so it can never drift out of
     * sync with the pedal list (counts included) */
    if (els.pedalCat) {
      const LABEL = { 'amp-in-a-box': 'Amp in a box', eq: 'EQ', od: 'Overdrive' };
      const order = ['overdrive', 'distortion', 'fuzz', 'boost', 'eq', 'compressor', 'wah', 'filter',
        'chorus', 'flanger', 'phaser', 'vibe', 'tremolo', 'delay', 'reverb', 'pitch', 'looper', 'amp-in-a-box', 'utility'];
      const counts = {};
      window.TT.pedals.all().forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
      const cats = Object.keys(counts).sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      els.pedalCat.innerHTML = `<option value="all">All types (${window.TT.pedals.all().length})</option>` +
        cats.map(c => `<option value="${c}">${LABEL[c] || c.charAt(0).toUpperCase() + c.slice(1)} (${counts[c]})</option>`).join('');
    }
    els.pedalCat.addEventListener('change', renderPedalSearch);
    els.pedalSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = els.pedalResults.querySelector('[data-add]');
        if (first) addPedal(first.dataset.add);
      }
    });
    els.guideTabs.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
      els.guideTabs.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderGuide(b.dataset.tab);
    }));
    document.querySelectorAll('[data-test-riff]').forEach(b => b.addEventListener('click', () => {
      testRiff(b.dataset.testRiff);
      window.TT.app.toast('Test riff through the live chain — turn the output up and the gain down if it clips.');
    }));
    const mon = el2('rig-monitor');
    mon.addEventListener('change', async () => {
      R.state.monitor = mon.checked;
      if (mon.checked && window.TT.audio.micState !== 'on') {
        try { await window.TT.audio.startMic(); } catch (e) { window.TT.app.toast('Microphone permission is needed to monitor through the rig.'); mon.checked = false; R.state.monitor = false; }
      }
      save(); updateMicRoute();
      if (R.state.monitor) window.TT.app.toast('Monitoring through the rig. Use headphones — a mic plus open speakers will howl.');
    });
    const mv = el2('rig-monitor-vol');
    mv.value = R.state.monitorVol;
    mv.addEventListener('input', () => { R.state.monitorVol = +mv.value; save(); updateMicRoute(); });
    const master = el2('rig-master');
    master.value = R.state.master;
    master.addEventListener('input', () => setMaster(+master.value));
    /* the tuner may turn the mic on/off behind our back — chain to whatever
     * handler was already registered instead of replacing it */
    const prevOnMic = window.TT.audio.onMic;
    window.TT.audio.onMic = function (state, err) {
      micConnected = false;
      updateMicRoute();
      if (typeof prevOnMic === 'function') prevOnMic(state, err);
    };
    if (window.TT.app && window.TT.app.assist) window.TT.app.assist('Rig ready: pick an amp, add pedals, and try the test riffs. It is all virtual — no cables needed.', { toast: false });
  };

  R.rebuild = rebuild;
  R.addPedal = addPedal;
  R.getState = function () { return R.state; };   /* R.state is the data object itself */
  R.testRiff = testRiff;
  R.loadFamous = loadFamous;
  R.loadRecipe = loadRecipe;
  R.recipes = function () { return (window.TT.amps.GENRES || []).slice(); };
  window.TT = window.TT || {};
  window.TT.rig = R;
})();
