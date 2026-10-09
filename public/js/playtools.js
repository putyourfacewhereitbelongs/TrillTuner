/* Trill Tuner — play-focused tools: looper, drone, CAGED, harmonics,
 * intonation and the bend lab.
 *
 * These are the things that make sitting down with a guitar more useful than
 * another theory page: a loop to play over, a drone to stay in tune against,
 * the five CAGED maps of the neck, natural-harmonic nodes, a 12th-fret
 * intonation check, and a live bend lab that tells you when you actually
 * hit the note.
 */
(function () {
  'use strict';

  const P = {};
  const S = {
    loop: { rec: false, playing: false, samples: null, prev: null, sr: 44100, node: null, gain: null, rate: 1, recChunks: [], recGot: 0, recSp: null },
    drone: { on: false, osc: [], gain: null, root: 7, fifth: true, oct: true },
    caged: { root: 4, quality: 'maj' },
    harm: { string: 0, listening: false, raf: 0 },
    into: { string: 0, openHz: null, twelfthHz: null },
    bend: { listening: false, refHz: null, target: 200, raf: 0 }
  };
  const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const OPEN = [40, 45, 50, 55, 59, 64]; /* E2 A2 D3 G3 B3 E4 */
  const STR_NAMES = ['Low E', 'A', 'D', 'G', 'B', 'High E'];

  /* Natural-harmonic nodes. `ratio` is the sounding pitch vs the open string. */
  const HARMONICS = [
    { fret: 12, ratio: 2, name: 'octave' },
    { fret: 7, ratio: 3, name: 'octave + 5th' },
    { fret: 19, ratio: 3, name: 'octave + 5th (upper node)' },
    { fret: 5, ratio: 4, name: 'two octaves' },
    { fret: 24, ratio: 4, name: 'two octaves (upper node)' },
    { fret: 4, ratio: 5, name: 'two octaves + major 3rd' },
    { fret: 9, ratio: 5, name: 'two octaves + major 3rd' },
    { fret: 16, ratio: 5, name: 'two octaves + major 3rd (upper)' },
    { fret: 3.2, ratio: 6, name: 'two octaves + 5th' }
  ];

  function el(id) { return document.getElementById(id); }
  function a4() { return (window.TT && TT.tuner && TT.tuner.state && TT.tuner.state.a4) || 440; }
  function midiToHz(m) { return a4() * Math.pow(2, (m - 69) / 12); }
  function hzToMidi(hz) { return 69 + 12 * Math.log2(hz / a4()); }
  function cents(a, b) { return 1200 * Math.log2(a / b); }
  function prettyHz(hz) {
    if (!hz) return '–';
    const m = hzToMidi(hz);
    const pc = ((Math.round(m) % 12) + 12) % 12;
    const oct = Math.floor(Math.round(m) / 12) - 1;
    return NOTES[pc] + oct + ' · ' + hz.toFixed(1) + ' Hz';
  }
  function openMidis() {
    try {
      const p = TT.tunings.byId(TT.tuner.state.presetId);
      if (p && p.strings && p.strings.length) return p.strings.map(s => s.midi);
    } catch (e) {}
    return OPEN.slice();
  }
  function strLabels() {
    try {
      const p = TT.tunings.byId(TT.tuner.state.presetId);
      if (p && p.strings && p.strings.length) {
        return p.strings.map((s, i) => {
          const n = String(s.name || '').replace(/[0-9]/g, '');
          if (i === 0) return 'Low ' + n + ' (' + s.name + ')';
          if (i === p.strings.length - 1) return 'High ' + n + ' (' + s.name + ')';
          return n + ' (' + s.name + ')';
        });
      }
    } catch (e) {}
    return STR_NAMES.slice();
  }

  /* =================================================================== */
  /* CAGED shapes                                                         */
  /* =================================================================== */
  /* Movable shapes. `f` is the fret of the shape’s index finger / barre.
   * String order low E → high e. -1 = muted. Negative frets (G/C forms)
   * mean “behind the nut” — we bump the whole shape up an octave. */
  const CAGED_MAJ = [
    { id: 'E', name: 'E shape (barre)', fOf: pc => (pc - 4 + 12) % 12, frets: f => [f, f + 2, f + 2, f + 1, f, f], tip: 'The full barre. Root on the 6th and 1st strings.' },
    { id: 'A', name: 'A shape (barre)', fOf: pc => (pc - 9 + 12) % 12, frets: f => [-1, f, f + 2, f + 2, f + 2, f], tip: 'Root on the 5th. The workhorse “A-form” barre.' },
    { id: 'G', name: 'G shape', fOf: pc => (pc - 4 + 12) % 12, frets: f => [f, f - 1, f - 3, f - 3, f - 3, f], tip: 'Three fingers behind the barre. Root on 6th + 1st.' },
    { id: 'C', name: 'C shape', fOf: pc => (pc - 9 + 12) % 12, frets: f => [-1, f, f - 1, f - 3, f - 2, f - 3], tip: 'Root on the 5th (and 2nd). The “C-form” stretch.' },
    { id: 'D', name: 'D shape', fOf: pc => (pc - 2 + 12) % 12, frets: f => [-1, -1, f, f + 2, f + 3, f + 2], tip: 'Root on the 4th. Tiny, bright, great for triads up high.' }
  ];
  const CAGED_MIN = [
    { id: 'Em', name: 'Em shape (barre)', fOf: pc => (pc - 4 + 12) % 12, frets: f => [f, f + 2, f + 2, f, f, f], tip: 'Barre with the minor 3rd on the G string. Root on 6th.' },
    { id: 'Am', name: 'Am shape (barre)', fOf: pc => (pc - 9 + 12) % 12, frets: f => [-1, f, f + 2, f + 2, f + 1, f], tip: 'The Am barre. Root on the 5th.' },
    { id: 'Dm', name: 'Dm shape', fOf: pc => (pc - 2 + 12) % 12, frets: f => [-1, -1, f, f + 2, f + 3, f + 1], tip: 'Root on the 4th. The small Dm moved up the neck.' }
  ];

  function shapeFrets(quality, id, pc) {
    const pack = quality === 'min' ? CAGED_MIN : CAGED_MAJ;
    const sh = pack.find(s => s.id === id);
    if (!sh) return null;
    let f = sh.fOf(pc);
    let drawn = sh.frets(f);
    const played = drawn.filter(x => x !== -1);
    if (played.length && Math.min.apply(null, played) < 0) {
      f += 12;
      drawn = sh.frets(f);
    }
    return drawn;
  }

  function chordBox(frets) {
    const valid = frets.filter(x => x >= 0);
    const lo = valid.length ? Math.min.apply(null, valid) : 0;
    const span = 4;
    const W = 92, H = 118, padL = 16, padT = 18, bw = 60, bh = 84;
    let s = '<svg class="caged-box" viewBox="0 0 ' + W + ' ' + H + '">';
    for (let i = 0; i <= span; i++) {
      const y = padT + bh * i / span;
      s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (padL + bw) + '" y2="' + y + '" stroke="currentColor" stroke-width="' + (i === 0 && lo === 0 ? 3 : 1) + '" opacity=".55"/>';
    }
    for (let st = 0; st < 6; st++) {
      const x = padL + bw * st / 5;
      s += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (padT + bh) + '" stroke="currentColor" stroke-width="1.2" opacity=".55"/>';
    }
    if (lo > 0) s += '<text x="4" y="' + (padT + 10) + '" font-size="10" fill="currentColor">' + lo + '</text>';
    frets.forEach((f, st) => {
      const x = padL + bw * st / 5;
      if (f < 0) {
        s += '<text x="' + x + '" y="' + (padT - 5) + '" text-anchor="middle" font-size="10" fill="currentColor">×</text>';
      } else if (f === 0 && lo === 0) {
        s += '<circle cx="' + x + '" cy="' + (padT - 6) + '" r="3.2" fill="none" stroke="currentColor"/>';
      } else {
        const rel = f - lo;
        if (rel < 0 || rel > span) return;
        const y = padT + bh * (rel - 0.5) / span;
        s += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="currentColor"/>';
        s += '<text x="' + x + '" y="' + (y + 3) + '" text-anchor="middle" font-size="' + (f > 9 ? 7 : 8) + '" fill="#0b0d12">' + f + '</text>';
      }
    });
    s += '</svg>';
    return s;
  }

  function renderCaged() {
    const host = el('pt-caged-out');
    if (!host) return;
    const pc = S.caged.root;
    const pack = S.caged.quality === 'min' ? CAGED_MIN : CAGED_MAJ;
    host.innerHTML = pack.map(sh => {
      const drawn = shapeFrets(S.caged.quality, sh.id, pc);
      const name = NOTES[pc] + (S.caged.quality === 'min' ? 'm' : '') + ' · ' + sh.name;
      return '<button type="button" class="caged-card" data-frets="' + drawn.join(',') + '" title="' + sh.tip + '">' +
        '<b>' + name + '</b>' + chordBox(drawn) + '<span class="dim smallish">' + sh.tip + '</span></button>';
    }).join('');
    host.querySelectorAll('.caged-card').forEach(b => b.addEventListener('click', () => {
      const frets = b.dataset.frets.split(',').map(Number);
      const midis = frets.map((f, i) => f < 0 ? null : OPEN[i] + f).filter(x => x != null);
      if (TT.audio && TT.audio.strum) TT.audio.strum(midis.map(m => midiToHz(m)), 28, 0.55);
    }));
  }

  /* =================================================================== */
  /* looper                                                               */
  /* =================================================================== */
  function snapLoop(samples, sr, bpm, bpb) {
    if (!samples || !sr || !bpm) return samples;
    bpb = bpb || 4;
    const bar = (60 / bpm) * bpb;
    const dur = samples.length / sr;
    if (dur < bar * 0.35) return samples;
    const bars = Math.max(1, Math.round(dur / bar));
    const n = Math.min(samples.length, Math.max(1, Math.round(bars * bar * sr)));
    return samples.subarray ? samples.subarray(0, n) : samples.slice(0, n);
  }

  function loopStatus(t) { const n = el('pt-loop-status'); if (n) n.textContent = t; }

  function loopDraw() {
    const c = el('pt-loop-wave');
    if (!c) return;
    const d = S.loop.samples;
    const w = Math.max(2, c.clientWidth || 320);
    const h = Math.max(2, c.clientHeight || 64);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext && c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, w, h);
    if (!d || !d.length) return;
    ctx.strokeStyle = (typeof getComputedStyle === 'function' && getComputedStyle(c).color) || '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(d.length / w));
    for (let x = 0; x < w; x++) {
      let peak = 0;
      const i0 = x * step;
      for (let i = 0; i < step && i0 + i < d.length; i++) peak = Math.max(peak, Math.abs(d[i0 + i]));
      const y = peak * h * 0.46;
      ctx.moveTo(x, h / 2 - y);
      ctx.lineTo(x, h / 2 + y);
    }
    ctx.stroke();
  }

  function loopStopNode() {
    const L = S.loop;
    if (L.node) { try { L.node.stop(); } catch (e) {} try { L.node.disconnect(); } catch (e) {} L.node = null; }
    L.playing = false;
    const b = el('pt-loop-play'); if (b) b.textContent = '▶ Play loop';
  }

  function loopPlay() {
    const L = S.loop;
    if (!L.samples || !L.samples.length) return;
    const ctx = TT.audio.ensure();
    loopStopNode();
    const buf = ctx.createBuffer(1, L.samples.length, L.sr);
    buf.getChannelData(0).set(L.samples);
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    node.playbackRate.value = L.rate;
    const g = ctx.createGain();
    g.gain.value = el('pt-loop-vol') ? +el('pt-loop-vol').value : 0.9;
    node.connect(g); g.connect(ctx.destination);
    node.start(0);
    L.node = node; L.gain = g; L.playing = true;
    const b = el('pt-loop-play'); if (b) b.textContent = '■ Stop loop';
  }

  function loopDetachRec() {
    const L = S.loop;
    L.rec = false;
    if (L.recSp) {
      try { L.recSp.onaudioprocess = null; } catch (e) {}
      try { const tap = TT.audio && TT.audio.tapNode && TT.audio.tapNode(); if (tap) tap.disconnect(L.recSp); } catch (e) {}
      try { L.recSp.disconnect(); } catch (e) {}
      L.recSp = null;
    }
    const rb = el('pt-loop-rec'); if (rb) { rb.textContent = '● Rec'; rb.classList.remove('rec-on'); }
  }

  function loopAbortRec() {
    loopDetachRec();
    S.loop.recChunks = []; S.loop.recGot = 0;
  }

  function loopRecStop() {
    const L = S.loop;
    loopDetachRec();
    if (L.recGot > 2048) {
      const out = new Float32Array(L.recGot);
      let o = 0;
      L.recChunks.forEach(c => { out.set(c, o); o += c.length; });
      let take = out;
      const snap = el('pt-loop-snap') && el('pt-loop-snap').checked;
      if (snap && TT.metronome && TT.metronome.state) {
        take = snapLoop(take, TT.audio.ctx.sampleRate, TT.metronome.state.bpm, TT.metronome.state.bpb);
      }
      L.prev = L.samples;
      if (L.samples && el('pt-loop-overdub') && el('pt-loop-overdub').checked) {
        const n = Math.min(take.length, L.samples.length);
        const mix = new Float32Array(Math.max(take.length, L.samples.length));
        mix.set(L.samples);
        for (let i = 0; i < n; i++) mix[i] = Math.max(-1, Math.min(1, mix[i] + take[i]));
        L.samples = mix;
      } else {
        L.samples = take instanceof Float32Array ? take : new Float32Array(take);
      }
      L.sr = TT.audio.ctx.sampleRate;
      const sec = (L.samples.length / L.sr).toFixed(1);
      loopStatus('Loop · ' + sec + 's' + (L.rate !== 1 ? ' · half-speed' : '') + ' — play over it, or overdub another pass.');
      loopDraw();
      loopPlay();
    } else {
      loopStatus('That take was too short — hold Rec for a bar or two.');
    }
    L.recChunks = []; L.recGot = 0;
  }

  async function loopRecStart() {
    const L = S.loop;
    try {
      TT.audio.ensure();
      if (TT.audio.micState !== 'on') await TT.audio.startMic();
    } catch (e) {
      loopStatus((e && e.message) || 'Microphone is needed to record a loop.');
      return;
    }
    const overdub = el('pt-loop-overdub') && el('pt-loop-overdub').checked && L.samples;
    if (!overdub) loopStopNode();
    const ctx = TT.audio.ctx;
    L.rec = true; L.recChunks = []; L.recGot = 0;
    const sp = ctx.createScriptProcessor(4096, 1, 1);
    if (!TT.audio._silent) { TT.audio._silent = ctx.createGain(); TT.audio._silent.gain.value = 0; TT.audio._silent.connect(ctx.destination); }
    const tap = TT.audio.tapNode();
    tap.connect(sp); sp.connect(TT.audio._silent);
    sp.onaudioprocess = e => {
      if (!L.rec) return;
      const d = e.inputBuffer.getChannelData(0);
      L.recChunks.push(new Float32Array(d));
      L.recGot += d.length;
      if (L.recGot > ctx.sampleRate * 30) loopRecStop();
      loopStatus('Recording… ' + (L.recGot / ctx.sampleRate).toFixed(1) + 's');
    };
    L.recSp = sp;
    const rb = el('pt-loop-rec'); if (rb) { rb.textContent = '■ Stop rec'; rb.classList.add('rec-on'); }
    loopStatus(overdub ? 'Overdubbing — play the next layer, then press Stop rec.' : 'Recording — play the phrase, then press Stop rec.');
  }

  function loopClear() {
    if (S.loop.rec) loopAbortRec();
    loopStopNode();
    S.loop.samples = null;
    S.loop.prev = null;
    S.loop.rate = 1;
    const hs = el('pt-loop-half'); if (hs) hs.textContent = '½ speed';
    loopStatus('Empty — record a phrase, then play over it.');
    loopDraw();
  }

  function loopUndo() {
    if (!S.loop.prev) { loopStatus('Nothing to undo.'); return; }
    const cur = S.loop.samples;
    S.loop.samples = S.loop.prev;
    S.loop.prev = cur;
    loopDraw();
    if (S.loop.playing) loopPlay();
    loopStatus('Undid the last pass.');
  }

  function loopHalf() {
    S.loop.rate = S.loop.rate === 1 ? 0.5 : 1;
    const hs = el('pt-loop-half');
    if (hs) hs.textContent = S.loop.rate === 1 ? '½ speed' : 'Full speed';
    if (S.loop.playing) loopPlay();
    loopStatus(S.loop.rate === 1 ? 'Full speed.' : 'Half speed — pitch drops an octave, like tape.');
  }

  /* =================================================================== */
  /* drone                                                                */
  /* =================================================================== */
  function droneFreqs(rootPc, fifth, oct) {
    const rootMidi = 40 + ((rootPc - 4 + 12) % 12);
    const freqs = [midiToHz(rootMidi)];
    if (fifth) freqs.push(midiToHz(rootMidi + 7));
    if (oct) freqs.push(midiToHz(rootMidi + 12));
    return freqs;
  }

  function droneStop() {
    S.drone.osc.forEach(o => { try { o.stop(); } catch (e) {} try { o.disconnect(); } catch (e) {} });
    S.drone.osc = [];
    if (S.drone.gain) { try { S.drone.gain.disconnect(); } catch (e) {} S.drone.gain = null; }
    S.drone.on = false;
    const b = el('pt-drone-btn'); if (b) b.textContent = '▶ Start drone';
  }

  function droneStart() {
    droneStop();
    const ctx = TT.audio.ensure();
    const g = ctx.createGain();
    g.gain.value = el('pt-drone-vol') ? +el('pt-drone-vol').value : 0.18;
    g.connect(ctx.destination);
    const freqs = droneFreqs(S.drone.root, S.drone.fifth, S.drone.oct);
    const type = (el('pt-drone-wave') && el('pt-drone-wave').value) || 'triangle';
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.value = i === 0 ? 1 : 0.55;
      o.connect(gg); gg.connect(g);
      o.start();
      S.drone.osc.push(o);
    });
    S.drone.gain = g;
    S.drone.on = true;
    const b = el('pt-drone-btn'); if (b) b.textContent = '■ Stop drone';
  }

  /* =================================================================== */
  /* pitch sample                                                         */
  /* =================================================================== */
  function samplePitch() {
    if (!TT.audio || !TT.audio.analyser || !TT.yin) return null;
    const n = TT.audio.analyser.fftSize || 4096;
    const buf = new Float32Array(n);
    TT.audio.analyser.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
    if (peak < 0.01) return null;
    return TT.yin.yin(buf, TT.audio.ctx.sampleRate, 0.15);
  }

  async function ensureMic() {
    TT.audio.ensure();
    if (TT.audio.micState !== 'on') await TT.audio.startMic();
  }

  /* =================================================================== */
  /* harmonics                                                            */
  /* =================================================================== */
  function renderHarmonics() {
    const host = el('pt-harm-out');
    if (!host) return;
    const opens = openMidis();
    const si = Math.max(0, Math.min(opens.length - 1, S.harm.string));
    const openHz = midiToHz(opens[si]);
    host.innerHTML = HARMONICS.map(h => {
      const hz = openHz * h.ratio;
      return '<button type="button" class="harm-card" data-hz="' + hz.toFixed(2) + '">' +
        '<b>Fret ' + h.fret + '</b>' +
        '<span>' + h.name + '</span>' +
        '<span class="dim">' + prettyHz(hz) + '</span>' +
        '<small>×' + h.ratio + '</small></button>';
    }).join('');
    host.querySelectorAll('.harm-card').forEach(b => b.addEventListener('click', () => {
      const hz = +b.dataset.hz;
      if (TT.audio && TT.audio.pluck) TT.audio.pluck(hz, 0, 0.7);
    }));
  }

  function harmTick() {
    S.harm.raf = 0;
    if (!S.harm.listening) return;
    const det = samplePitch();
    const v = el('pt-harm-verdict');
    if (det && det.freq) {
      const openHz = midiToHz(openMidis()[S.harm.string]);
      let best = HARMONICS[0], bestErr = 999;
      HARMONICS.forEach(h => {
        const err = Math.abs(cents(det.freq, openHz * h.ratio));
        if (err < bestErr) { bestErr = err; best = h; }
      });
      if (v) {
        if (bestErr < 18) v.textContent = 'Fret ' + best.fret + ' harmonic ✓  (' + best.name + ', ' + bestErr.toFixed(0) + ' ¢)';
        else v.textContent = prettyHz(det.freq) + ' — not a node of this string yet.';
        v.className = 'pt-verdict' + (bestErr < 18 ? ' g' : '');
      }
    }
    S.harm.raf = requestAnimationFrame(harmTick);
  }

  async function harmToggle() {
    if (S.harm.listening) {
      S.harm.listening = false;
      if (S.harm.raf) cancelAnimationFrame(S.harm.raf);
      const b = el('pt-harm-listen'); if (b) b.textContent = '▶ Listen';
      return;
    }
    try { await ensureMic(); } catch (e) {
      const v = el('pt-harm-verdict'); if (v) v.textContent = (e && e.message) || 'Microphone needed.';
      return;
    }
    S.harm.listening = true;
    const b = el('pt-harm-listen'); if (b) b.textContent = '■ Stop';
    harmTick();
  }

  /* =================================================================== */
  /* intonation                                                           */
  /* =================================================================== */
  function intoStatus(t) { const n = el('pt-into-status'); if (n) n.textContent = t; }

  function intoCapture(which) {
    ensureMic().then(() => {
      const det = samplePitch();
      if (!det) { intoStatus('Play the note clearly — no pitch yet.'); return; }
      if (which === 'open') S.into.openHz = det.freq;
      else S.into.twelfthHz = det.freq;
      renderInto();
    }).catch(e => intoStatus((e && e.message) || 'Microphone needed.'));
  }

  function renderInto() {
    const open = S.into.openHz, tw = S.into.twelfthHz;
    const a = el('pt-into-open'), b = el('pt-into-12');
    if (a) a.textContent = prettyHz(open);
    if (b) b.textContent = prettyHz(tw);
    if (open && tw) {
      const want = open * 2;
      const c = cents(tw, want);
      const abs = Math.abs(c);
      let advice;
      if (abs < 3) advice = 'In tune at the 12th — leave the saddle.';
      else if (c > 0) advice = '12th is sharp by ' + c.toFixed(1) + ' ¢ — move the saddle back (away from the neck).';
      else advice = '12th is flat by ' + abs.toFixed(1) + ' ¢ — move the saddle forward (toward the neck).';
      intoStatus(advice);
      const needle = el('pt-into-needle');
      if (needle) needle.style.transform = 'translateX(' + (Math.max(-40, Math.min(40, c)) * 2) + 'px)';
    }
  }

  /* =================================================================== */
  /* bend lab                                                             */
  /* =================================================================== */
  function bendTick() {
    S.bend.raf = 0;
    if (!S.bend.listening) return;
    const det = samplePitch();
    const read = el('pt-bend-read');
    const bar = el('pt-bend-fill');
    const verdict = el('pt-bend-verdict');
    if (det && det.freq) {
      if (!S.bend.refHz) S.bend.refHz = det.freq;
      const c = cents(det.freq, S.bend.refHz);
      const t = S.bend.target;
      const err = c - t;
      if (read) read.textContent = (c >= 0 ? '+' : '') + c.toFixed(0) + ' ¢  (want +' + t + ' ¢)';
      if (bar) bar.style.width = Math.max(0, Math.min(100, (c / (t * 1.4 || 1)) * 100)) + '%';
      if (Math.abs(err) <= 12 && c > t * 0.5) {
        if (verdict) { verdict.textContent = 'In tune ✓'; verdict.className = 'pt-verdict g'; }
        if (bar) bar.style.background = 'var(--green)';
      } else if (c > t + 12) {
        if (verdict) { verdict.textContent = 'Too far — release a little'; verdict.className = 'pt-verdict r'; }
        if (bar) bar.style.background = 'var(--red)';
      } else {
        if (verdict) { verdict.textContent = c < 8 ? 'Play the unbent note, then bend' : 'Keep bending…'; verdict.className = 'pt-verdict'; }
        if (bar) bar.style.background = 'var(--accent)';
      }
    } else {
      if (read) read.textContent = 'Listening…';
    }
    S.bend.raf = requestAnimationFrame(bendTick);
  }

  async function bendToggle() {
    if (S.bend.listening) {
      S.bend.listening = false;
      if (S.bend.raf) cancelAnimationFrame(S.bend.raf);
      const b = el('pt-bend-btn'); if (b) b.textContent = '▶ Listen';
      return;
    }
    try { await ensureMic(); } catch (e) {
      const v = el('pt-bend-verdict'); if (v) v.textContent = (e && e.message) || 'Microphone needed.';
      return;
    }
    S.bend.listening = true;
    S.bend.refHz = null;
    const b = el('pt-bend-btn'); if (b) b.textContent = '■ Stop';
    bendTick();
  }

  function fillStringSelect(id, selected) {
    const sel = el(id);
    if (!sel) return;
    const labels = strLabels();
    sel.innerHTML = labels.map((n, i) => '<option value="' + i + '"' + (i === selected ? ' selected' : '') + '>' + n + '</option>').join('');
  }

  /* =================================================================== */
  /* init                                                                 */
  /* =================================================================== */
  P.init = function () {
    if (P._ready) return;
    if (!el('pt-loop-rec')) return;
    P._ready = true;

    NOTES.forEach((n, i) => {
      const o = document.createElement('option');
      o.value = String(i); o.textContent = n;
      if (el('pt-drone-root')) el('pt-drone-root').appendChild(o.cloneNode(true));
      if (el('pt-caged-root')) el('pt-caged-root').appendChild(o);
    });
    if (el('pt-drone-root')) el('pt-drone-root').value = '7';
    if (el('pt-caged-root')) el('pt-caged-root').value = '4';

    fillStringSelect('pt-into-string', 0);
    fillStringSelect('pt-harm-string', 0);

    el('pt-loop-rec').addEventListener('click', () => S.loop.rec ? loopRecStop() : loopRecStart());
    el('pt-loop-play').addEventListener('click', () => S.loop.playing ? loopStopNode() : loopPlay());
    el('pt-loop-clear').addEventListener('click', loopClear);
    el('pt-loop-undo').addEventListener('click', loopUndo);
    el('pt-loop-half').addEventListener('click', loopHalf);
    if (el('pt-loop-vol')) el('pt-loop-vol').addEventListener('input', () => { if (S.loop.gain) S.loop.gain.gain.value = +el('pt-loop-vol').value; });

    el('pt-drone-btn').addEventListener('click', () => S.drone.on ? droneStop() : droneStart());
    el('pt-drone-root').addEventListener('change', () => { S.drone.root = +el('pt-drone-root').value; if (S.drone.on) droneStart(); });
    el('pt-drone-fifth').addEventListener('change', () => { S.drone.fifth = el('pt-drone-fifth').checked; if (S.drone.on) droneStart(); });
    el('pt-drone-oct').addEventListener('change', () => { S.drone.oct = el('pt-drone-oct').checked; if (S.drone.on) droneStart(); });
    el('pt-drone-wave').addEventListener('change', () => { if (S.drone.on) droneStart(); });
    if (el('pt-drone-vol')) el('pt-drone-vol').addEventListener('input', () => { if (S.drone.gain) S.drone.gain.gain.value = +el('pt-drone-vol').value; });

    el('pt-caged-root').addEventListener('change', () => { S.caged.root = +el('pt-caged-root').value; renderCaged(); });
    el('pt-caged-qual').addEventListener('change', () => { S.caged.quality = el('pt-caged-qual').value; renderCaged(); });
    renderCaged();

    el('pt-harm-string').addEventListener('change', () => { S.harm.string = +el('pt-harm-string').value; renderHarmonics(); });
    el('pt-harm-listen').addEventListener('click', harmToggle);
    renderHarmonics();

    el('pt-into-open-btn').addEventListener('click', () => intoCapture('open'));
    el('pt-into-12-btn').addEventListener('click', () => intoCapture('12'));
    el('pt-into-string').addEventListener('change', () => {
      S.into.string = +el('pt-into-string').value;
      S.into.openHz = S.into.twelfthHz = null;
      renderInto();
      intoStatus('Play the open ' + strLabels()[S.into.string] + ', then the 12th-fret octave.');
    });

    el('pt-bend-btn').addEventListener('click', bendToggle);
    el('pt-bend-reset').addEventListener('click', () => { S.bend.refHz = null; });
    el('pt-bend-target').addEventListener('change', () => { S.bend.target = +el('pt-bend-target').value; });
  };

  P.stop = function () {
    if (S.loop.rec) loopAbortRec();
    loopStopNode();
    droneStop();
    S.bend.listening = false;
    if (S.bend.raf) cancelAnimationFrame(S.bend.raf);
    S.harm.listening = false;
    if (S.harm.raf) cancelAnimationFrame(S.harm.raf);
  };

  P.renderCaged = renderCaged;
  P.renderHarmonics = renderHarmonics;
  P.shapeFrets = shapeFrets;
  P.chordBox = chordBox;
  P.snapLoop = snapLoop;
  P.droneFreqs = droneFreqs;
  P.midiToHz = midiToHz;
  P.HARMONICS = HARMONICS;
  P.CAGED_MAJ = CAGED_MAJ;
  P.CAGED_MIN = CAGED_MIN;
  P.state = S;
  window.TT = window.TT || {};
  window.TT.playtools = P;
})();
