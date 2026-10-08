/* Trill Tuner — Metronome: lookahead Web Audio scheduler, pendulum, tap tempo,
 * time signatures with compound accents, subdivisions, practice tracking. */
(function () {
  'use strict';

  const M = { state: { bpm: 100, bpb: 4, subdiv: 1, vol: 0.9 } };
  let els = {};
  let timer = 0, rafId = 0, playing = false;
  let nextTime = 0, beat = 0;
  let drawQueue = [];
  let hooks = [];
  let pendPhase = 0, lastPendTs = 0;
  let taps = [];
  let practiceSecs = 0;

  const accentFor = (i, bpb) => i === 0 || (bpb === 6 && i === 3) || (bpb === 9 && (i === 3 || i === 6));

  function spb() { return 60 / M.state.bpm; }

  function sched() {
    const ctx = TT.audio.ctx;
    while (nextTime < ctx.currentTime + 0.12) {
      const beatIdx = beat % M.state.bpb;
      const accent = accentFor(beatIdx, M.state.bpb);
      TT.audio.click(nextTime, accent, M.state.vol);
      drawQueue.push({ time: nextTime, beatIdx: beatIdx, accent: accent });
      hooks.slice().forEach(h => { try { h.cb(nextTime, beatIdx, accent); } catch (e) {} });
      for (let s = 1; s < M.state.subdiv; s++) {
        TT.audio.click(nextTime + spb() * s / M.state.subdiv, false, M.state.vol * 0.45);
      }
      beat++;
      nextTime += spb();
    }
  }

  function pend(ts) {
    if (!playing) return;
    rafId = requestAnimationFrame(pend);
    const dt = lastPendTs ? (ts - lastPendTs) / 1000 : 0;
    lastPendTs = ts;
    pendPhase += dt * Math.PI / spb();
    const ang = Math.cos(pendPhase) * 26;
    if (els.arm) els.arm.style.transform = `rotate(${ang.toFixed(1)}deg)`;

    const ctx = TT.audio.ctx;
    while (drawQueue.length && drawQueue[0].time <= ctx.currentTime + 0.02) {
      const ev = drawQueue.shift();
      setLED(ev.beatIdx, ev.accent);
    }
    // practice tracking
    if (dt > 0 && TT.practice) {
      practiceSecs += dt;
      if (practiceSecs >= 5) { TT.practice.addSeconds(practiceSecs); practiceSecs = 0; }
    }
  }

  function setLED(idx, accent) {
    els.leds.querySelectorAll('.led').forEach((l, i) => {
      l.classList.toggle('on', i === idx);
      l.classList.toggle('accent', i === idx && !!accent);
    });
  }

  function buildLEDs() {
    els.leds.innerHTML = '';
    for (let i = 0; i < M.state.bpb; i++) {
      const d = document.createElement('div');
      d.className = 'led' + (accentFor(i, M.state.bpb) ? ' beat-accent' : '');
      els.leds.appendChild(d);
    }
  }

  function updateBtn() {
    if (els.btnStart) {
      els.btnStart.textContent = playing ? '⏸ Stop' : '▶ Start';
      els.btnStart.classList.toggle('stop', playing);
    }
  }

  function save() {
    TT.store.set('settings', Object.assign(TT.store.get('settings', {}), {
      bpm: M.state.bpm, bpb: M.state.bpb, subdiv: M.state.subdiv, metroVol: M.state.vol
    }));
  }

  /* ---------- public ---------- */
  M.isPlaying = function () { return playing; };

  M.start = function () {
    TT.audio.ensure();
    if (playing) return;
    playing = true;
    beat = 0; drawQueue = [];
    nextTime = TT.audio.ctx.currentTime + 0.08;
    pendPhase = 0; lastPendTs = 0;
    timer = setInterval(sched, 25);
    rafId = requestAnimationFrame(pend);
    updateBtn();
  };
  M.stop = function () {
    if (!playing) return;
    playing = false;
    clearInterval(timer); timer = 0;
    cancelAnimationFrame(rafId); rafId = 0;
    if (practiceSecs > 1 && TT.practice) { TT.practice.addSeconds(practiceSecs); practiceSecs = 0; }
    drawQueue = [];
    els.leds && els.leds.querySelectorAll('.led').forEach(l => l.classList.remove('on'));
    if (els.arm) els.arm.style.transform = 'rotate(0deg)';
    updateBtn();
  };
  M.toggle = function () { playing ? M.stop() : M.start(); };

  M.setBpm = function (bpm) {
    M.state.bpm = Math.max(30, Math.min(280, Math.round(bpm)));
    els.bpmNum.textContent = M.state.bpm;
    els.bpmRange.value = M.state.bpm;
    save();
  };

  M.onBeat = function (cb) {
    const h = { cb: cb };
    hooks.push(h);
    return function remove() { hooks = hooks.filter(x => x !== h); };
  };

  M.init = function () {
    els = {
      bpmNum: document.getElementById('bpm-num'),
      bpmRange: document.getElementById('bpm-range'),
      btnStart: document.getElementById('btn-metro-start'),
      btnTap: document.getElementById('btn-tap'),
      leds: document.getElementById('beat-leds'),
      arm: document.getElementById('pendulum-arm'),
      selectSig: document.getElementById('select-sig'),
      selectSubdiv: document.getElementById('select-subdiv'),
      metroVol: document.getElementById('metro-vol')
    };
    const s = TT.store.get('settings', {});
    if (s.bpm) M.state.bpm = Math.max(30, Math.min(280, +s.bpm));
    if (s.bpb) M.state.bpb = +s.bpb;
    if (s.subdiv) M.state.subdiv = +s.subdiv;
    if (s.metroVol != null) M.state.vol = +s.metroVol;

    els.bpmNum.textContent = M.state.bpm;
    els.bpmRange.value = M.state.bpm;
    els.selectSig.value = String(M.state.bpb);
    els.selectSubdiv.value = String(M.state.subdiv);
    els.metroVol.value = M.state.vol;
    buildLEDs();

    els.bpmRange.addEventListener('input', () => M.setBpm(+els.bpmRange.value));
    document.querySelectorAll('.bpm-step').forEach(b =>
      b.addEventListener('click', () => M.setBpm(M.state.bpm + (+b.dataset.d))));
    document.querySelectorAll('#metro-presets button').forEach(b =>
      b.addEventListener('click', () => M.setBpm(+b.dataset.bpm)));
    els.btnStart.addEventListener('click', M.toggle);
    els.btnTap.addEventListener('click', () => {
      const now = performance.now();
      taps = taps.filter(t => now - t < 2500);
      taps.push(now);
      if (taps.length >= 2) {
        const ints = [];
        for (let i = 1; i < taps.length; i++) ints.push(taps[i] - taps[i - 1]);
        const avg = ints.reduce((a, b) => a + b, 0) / ints.length;
        M.setBpm(60000 / avg);
        els.btnTap.textContent = `Tap ${taps.length}`;
      }
      setTimeout(() => { els.btnTap.textContent = 'Tap tempo'; }, 1200);
    });
    els.selectSig.addEventListener('change', () => {
      M.state.bpb = +els.selectSig.value;
      buildLEDs();
      save();
    });
    els.selectSubdiv.addEventListener('change', () => { M.state.subdiv = +els.selectSubdiv.value; save(); });
    els.metroVol.addEventListener('input', () => { M.state.vol = +els.metroVol.value; save(); });
  };

  /* Used by learning tools: set tempo, switch view is handled by caller */
  M.launch = function (bpm) {
    M.setBpm(bpm);
    if (!playing) M.start();
  };

  window.TT = window.TT || {};
  window.TT.metronome = M;
})();
