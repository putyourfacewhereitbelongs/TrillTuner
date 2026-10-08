/* Trill Tuner — Backing studio.
 *
 * A band that only plays what you tell it to: pick a key, a mode, a style and a
 * tempo and it renders a practice bed — kit, bass, chords and an arpeggio — with
 * the progression written out in roman numerals so you can see what you are
 * playing over. The bed can be played, exported as a WAV, handed to the tab
 * maker (which then reads the chords back out of it), or turned into a metronome
 * and listener session at the same tempo.
 *
 * All the audio maths lives in lib/backing.js so it can be tested in node.
 */
(function () {
  'use strict';

  const BK = {};
  const els = {};
  const state = { playing: false, source: null, result: null, preset: 0 };

  const PRESETS = [
    { name: 'Slow blues in A', key: 'A', mode: 'blues', style: 'shuffle', bpm: 72, bars: 12, swing: 0.22 },
    { name: 'Campfire in G', key: 'G', mode: 'major', style: 'strum', bpm: 96, bars: 8 },
    { name: 'Folk fingerpicking in C', key: 'C', mode: 'major', style: 'arpeggio', bpm: 88, bars: 8, parts: { arp: true } },
    { name: 'Reggae in A', key: 'A', mode: 'minor', style: 'reggae', bpm: 76, bars: 8 },
    { name: 'Funk in E', key: 'E', mode: 'dorian', style: 'funk', bpm: 104, bars: 8 },
    { name: 'Rock in D', key: 'D', mode: 'mixolydian', style: 'rock', bpm: 128, bars: 8 },
    { name: 'Ballad in C', key: 'C', mode: 'major', style: 'ballad', bpm: 68, bars: 8 },
    { name: 'Country in G', key: 'G', mode: 'major', style: 'country', bpm: 120, bars: 8 },
    { name: 'Minor rock in Dm', key: 'D', mode: 'minor', style: 'rock', bpm: 140, bars: 8 },
    { name: 'Jazz in F (ii–V–I)', key: 'F', mode: 'major', style: 'arpeggio', bpm: 132, bars: 12, swing: 0.3 },
    { name: 'Waltz in G (3/4)', key: 'G', mode: 'major', style: 'strum', bpm: 108, bars: 12, meter: 3 },
    { name: 'Blues rock in E', key: 'E', mode: 'blues', style: 'shuffle', bpm: 96, bars: 12, swing: 0.25 }
  ];

  const el = id => document.getElementById(id);
  const T = () => window.TT;

  function setStatus(msg, cls) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.className = 'bk-status' + (cls ? ' ' + cls : '');
  }

  function options() {
    const num = (node, dflt) => (node && node.value !== '' ? +node.value : dflt);
    return {
      key: els.key ? els.key.value : 'C',
      mode: els.mode ? els.mode.value : 'major',
      style: els.style ? els.style.value : 'strum',
      bpm: num(els.bpm, 90),
      bars: num(els.bars, 8),
      meter: num(els.meter, 4),
      swing: num(els.swing, 0) / 100,
      level: num(els.level, 80) / 100,
      seed: num(els.seed, 20251008),
      parts: {
        drums: !!(els.drums && els.drums.checked),
        bass: !!(els.bass && els.bass.checked),
        chords: !!(els.chords && els.chords.checked),
        arp: !!(els.arp && els.arp.checked)
      }
    };
  }

  /* ---------------------------------------------------------------- */
  /* playback                                                          */
  /* ---------------------------------------------------------------- */
  function stop() {
    if (state.source) {
      try { state.source.stop(); } catch (e) {}
      state.source = null;
    }
    state.playing = false;
    if (els.play) els.play.textContent = '▶ Play';
  }

  function play() {
    const audio = T().audio;
    if (!audio || !state.result) return;
    try {
      audio.ensure();
      const ctx = audio.ctx;
      const res = state.result;
      const buf = ctx.createBuffer(2, res.channels[0].length, res.sr);
      for (let c = 0; c < 2; c++) buf.getChannelData(c).set(res.channels[c]);
      stop();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.9;
      src.connect(g);
      g.connect(audio.master || ctx.destination);
      src.start();
      state.source = src;
      state.playing = true;
      if (els.play) els.play.textContent = '■ Stop';
      src.onended = () => stop();
      setStatus('Playing ' + res.styleName + ' in ' + res.key + ' ' + res.modeName + ' at ' + res.bpm + ' BPM — ' + res.seconds.toFixed(1) + 's. Play over it.', 'ok');
    } catch (e) {
      setStatus('Playback is not available here: ' + e.message, 'err');
    }
  }

  /* ---------------------------------------------------------------- */
  /* rendering the bed                                                 */
  /* ---------------------------------------------------------------- */
  function generate() {
    const lib = T().backingLib;
    if (!lib) { setStatus('The backing engine did not load.', 'err'); return null; }
    const t0 = Date.now();
    setStatus('Rendering…');
    let res;
    try {
      res = lib.render(options());
    } catch (e) {
      setStatus('Could not render that: ' + e.message, 'err');
      return null;
    }
    state.result = res;
    try {
      T().store.set('bkSettings', options());
      T().store.set('bkRenders', (T().store.get('bkRenders', 0) || 0) + 1);
      if (T().share && T().share.checkBadges) T().share.checkBadges(true);
    } catch (e) {}
    renderSummary(res, Date.now() - t0);
    setStatus('Rendered ' + res.seconds.toFixed(1) + 's in ' + (Date.now() - t0) + ' ms — ' +
      res.parts.drums ? '' : '(no drums) ', res.parts.drums ? 'ok' : '');
    return res;
  }

  function renderSummary(res, ms) {
    if (!els.summary) return;
    const romans = res.chords.map(c => c.roman);
    els.summary.hidden = false;
    els.summary.innerHTML =
      '<div class="bk-facts">' +
        fact('Key', res.key + ' ' + res.modeName) +
        fact('Tempo', res.bpm + ' BPM' + (res.swing ? ' · swing ' + Math.round(res.swing * 100) + '%' : '')) +
        fact('Feel', res.styleName + (res.beatsPerBar === 3 ? ' · 3/4' : '')) +
        fact('Length', res.bars + ' bars · ' + res.seconds.toFixed(1) + 's') +
        fact('Parts', [res.parts.drums ? 'drums' : '', res.parts.bass ? 'bass' : '', res.parts.chords ? 'chords' : '', res.parts.arp ? 'arpeggio' : ''].filter(Boolean).join(' + ')) +
        fact('Render', ms + ' ms') +
      '</div>' +
      '<div class="card-h small">The progression</div>' +
      '<div class="bk-prog">' + res.chords.map(c =>
        '<div class="bk-chord"><b>' + c.name + '</b><span class="dim">' + c.roman + '</span>' +
        '<span class="dim smallish">' + c.midis.map(m => T().notes.midiName ? T().notes.midiName(m) : m).join(' ') + '</span></div>').join('') + '</div>' +
      '<div class="bk-romans">' + romans.join('  │  ') + '</div>' +
      '<div class="bk-actions">' +
        '<button class="btn btn-primary tiny" id="bk-play">▶ Play</button>' +
        '<button class="btn tiny" id="bk-wav">⬇ Download WAV</button>' +
        '<button class="btn tiny" id="bk-analyse">🔎 Read it back in the Tab maker</button>' +
        '<button class="btn btn-ghost tiny" id="bk-metro">♩ Metronome at this tempo</button>' +
        '<button class="btn btn-ghost tiny" id="bk-listen">🎧 Listen to me play over it</button>' +
        '<button class="btn btn-ghost tiny" id="bk-stems">🧪 Send it to the Stem lab</button>' +
      '</div>' +
      '<div class="dim smallish">Play it, loop it in your own player, or hand it to the tab maker: the analysis engine reads the key, the tempo and the chords straight back out of the render.</div>';

    els.play = el('bk-play');
    if (els.play) els.play.addEventListener('click', () => { if (state.playing) stop(); else play(); });
    const wav = el('bk-wav');
    if (wav) wav.addEventListener('click', () => {
      try {
        const raw = T().dsp.encodeWav(state.result.channels, state.result.sr);
        const blob = new Blob([raw], { type: 'audio/wav' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'trill-tuner-backing-' + state.result.key + '-' + state.result.style + '-' + state.result.bpm + 'bpm.wav';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        setStatus('WAV written (' + (raw.byteLength / 1048576).toFixed(2) + ' MB) — loop it in any player.', 'ok');
      } catch (e) {
        setStatus('Could not write the WAV: ' + e.message, 'err');
      }
    });
    const an = el('bk-analyse');
    if (an) an.addEventListener('click', () => {
      const res = state.result;
      if (!res || !T().tablab) return;
      /* the analysis engine only needs the sample rate and the samples */
      const fake = {
        sampleRate: res.sr, numberOfChannels: 2, length: res.channels[0].length,
        duration: res.seconds,
        getChannelData: i => res.channels[i]
      };
      setStatus('Reading the render back…');
      T().tablab.analyseBuffer(fake, { title: 'Backing bed in ' + res.key + ' ' + res.modeName, artist: 'Trill Tuner backing studio' });
      if (T().app) T().app.showView('maker');
    });
    const met = el('bk-metro');
    if (met) met.addEventListener('click', () => {
      const bpm = state.result.bpm;
      if (T().metronome && T().metronome.setBpm) T().metronome.setBpm(bpm);
      if (T().metronome && T().metronome.launch) T().metronome.launch(bpm);
      if (T().app) T().app.showView('metronome');
    });
    const lis = el('bk-listen');
    if (lis) lis.addEventListener('click', () => {
      if (T().listener && T().listener.init) {
        if (T().app) T().app.showView('listening');
        const sel = document.getElementById('ls-source');
        if (sel) sel.value = 'free';
        setStatus('Open the Listener, hit “Start listening” and play over this bed — it tells you when a note is wrong, and confirms the ones that are right.', 'ok');
      }
    });
    const st = el('bk-stems');
    if (st) st.addEventListener('click', () => {
      const res = state.result;
      const title = res
        ? 'Backing bed — ' + res.key + ' ' + res.modeName + ' · ' + res.styleName + ' · ' + res.bpm + ' BPM'
        : 'Backing bed';
      /* the Stem lab takes the samples straight from memory — no download needed */
      const taken = !!(res && T().stems && T().stems.adopt && T().stems.adopt(res, { title: title }));
      if (T().app) T().app.showView('stems');
      if (taken) setStatus('Sent to the Stem lab — it is loaded there already. Try “Remove the drums” or “Remove the bass” and play over the rest.', 'ok');
      else setStatus('The Stem lab is waiting for a file — drop this render in as a WAV (download it first).', '');
    });
  }

  function fact(label, value) {
    return '<div class="bk-fact"><span class="dim">' + label + '</span><b>' + value + '</b></div>';
  }

  /* ---------------------------------------------------------------- */
  /* presets, metronome sync and init                                  */
  /* ---------------------------------------------------------------- */
  function applyPreset(p) {
    if (!p) return;
    if (els.key) els.key.value = p.key;
    if (els.mode) els.mode.value = p.mode;
    if (els.style) els.style.value = p.style;
    if (els.bpm) els.bpm.value = p.bpm;
    if (els.bars) els.bars.value = p.bars;
    if (els.meter) els.meter.value = p.meter === 3 ? '3' : '4';
    if (els.swing) els.swing.value = Math.round((p.swing || 0) * 100);
    updateReadouts();
    generate();
  }

  function updateReadouts() {
    if (els.bpmOut) els.bpmOut.textContent = els.bpm.value + ' BPM';
    if (els.swingOut) els.swingOut.textContent = els.swing.value + '%';
    if (els.levelOut) els.levelOut.textContent = Math.round(els.level.value) + '%';
    if (els.lenOut) {
      const d = T().backingLib.durations({ bpm: +els.bpm.value, bars: +els.bars.value, meter: els.meter.value === '3' ? 3 : 4 });
      els.lenOut.textContent = d.seconds.toFixed(1) + ' s';
    }
  }

  BK.init = function () {
    if (BK._ready) return;
    BK._ready = true;
    els.key = el('bk-key'); els.mode = el('bk-mode'); els.style = el('bk-style');
    els.bpm = el('bk-bpm'); els.bpmOut = el('bk-bpm-out');
    els.bars = el('bk-bars'); els.meter = el('bk-meter');
    els.swing = el('bk-swing'); els.swingOut = el('bk-swing-out');
    els.level = el('bk-level'); els.levelOut = el('bk-level-out');
    els.lenOut = el('bk-len');
    els.seed = el('bk-seed');
    els.drums = el('bk-drums'); els.bass = el('bk-bass'); els.chords = el('bk-chords'); els.arp = el('bk-arp');
    els.status = el('bk-status'); els.summary = el('bk-summary');
    els.presets = el('bk-presets');

    const lib = T().backingLib;
    if (!lib) { setStatus('The backing engine did not load — check that lib/backing.js is included.', 'err'); return; }

    lib.KEYS.forEach(k => els.key && els.key.appendChild(Object.assign(document.createElement('option'), { value: k, textContent: k })));
    Object.keys(lib.MODES).forEach(m => els.mode && els.mode.appendChild(Object.assign(document.createElement('option'), { value: m, textContent: lib.MODES[m].name }))); 
    lib.STYLES.forEach(s => els.style && els.style.appendChild(Object.assign(document.createElement('option'), { value: s.id, textContent: s.name })));

    if (els.presets) {
      PRESETS.forEach((p, i) => {
        const b = document.createElement('button');
        b.className = 'chip';
        b.type = 'button';
        b.textContent = p.name;
        b.addEventListener('click', () => { state.preset = i; applyPreset(p); });
        els.presets.appendChild(b);
      });
    }
    ['bpm', 'swing', 'level', 'bars', 'meter'].forEach(k => {
      if (els[k]) els[k].addEventListener('input', updateReadouts);
    });
    const styleSel = els.style;
    if (styleSel) styleSel.addEventListener('change', () => {
      const s = lib.STYLES.filter(x => x.id === styleSel.value)[0];
      const note = el('bk-style-note');
      if (note && s) note.textContent = s.desc;
    });
    const gen = el('bk-generate');
    if (gen) gen.addEventListener('click', generate);
    const rnd = el('bk-newtake');
    if (rnd) rnd.addEventListener('click', () => {
      if (els.seed) els.seed.value = String(1 + Math.floor(Math.random() * 999999));
      generate();
    });

    /* remember the last settings */
    let saved = null;
    try { saved = T().store.get('bkSettings', null); } catch (e) {}
    const start = saved || PRESETS[1];
    if (els.key) els.key.value = start.key || 'C';
    if (els.mode) els.mode.value = start.mode || 'major';
    if (els.style) els.style.value = start.style || 'strum';
    if (els.bpm) els.bpm.value = start.bpm || 90;
    if (els.bars) els.bars.value = start.bars || 8;
    if (els.meter) els.meter.value = (start.meter === 3 ? '3' : '4');
    if (els.swing) els.swing.value = Math.round((start.swing || 0) * 100);
    if (els.level) els.level.value = Math.round((start.level == null ? 0.8 : start.level) * 100);
    if (els.seed && start.seed) els.seed.value = String(start.seed);
    if (start.parts) {
      if (els.drums) els.drums.checked = start.parts.drums !== false;
      if (els.bass) els.bass.checked = start.parts.bass !== false;
      if (els.chords) els.chords.checked = start.parts.chords !== false;
      if (els.arp) els.arp.checked = !!start.parts.arp;
    }
    updateReadouts();
    generate();
  };

  BK.stop = stop;
  BK.options = options;
  BK.generate = generate;
  BK.PRESETS = PRESETS;
  BK.state = state;
  window.TT = window.TT || {};
  window.TT.backing = BK;
})();
