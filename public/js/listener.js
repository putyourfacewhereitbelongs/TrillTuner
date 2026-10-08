/* Trill Tuner — the Listener: live note-accuracy coaching.
 *
 * The tuner tells you whether one string is in tune. This tells you whether the
 * note you just *played* is the note you meant to play — both ways round: it
 * confirms the right ones and calls out the wrong ones, saying which note it
 * heard, which note it expected, and how far apart they were.
 *
 * Everything runs on the microphone in the browser: YIN pitch detection
 * (lib/yin.js) on the live stream, a stability gate so a stray noise cannot
 * score, and a target list you can build from the tuning, a scale, a song's
 * chords or your own note names.
 */
(function () {
  'use strict';

  const L = {};
  const N = window.TT.notes;
  const state = {
    running: false,
    free: false,
    target: [],            /* midi numbers */
    labels: [],
    index: 0,
    tolCents: 35,
    requireTune: true,
    last: null,
    stable: 0,
    sounding: 0,
    silenceFrames: 0,
    score: { correct: 0, wrong: 0, close: 0, streak: 0, best: 0, centsSum: 0, centsN: 0, misses: [], took: 0 },
    history: []
  };
  let els = {};
  let raf = null;

  /* ---------------------------------------------------------------- */
  /* target builders                                                   */
  /* ---------------------------------------------------------------- */
  function tuningStrings() {
    try {
      const preset = TT.tunings.byId(TT.tuner.state.presetId) || TT.tunings.byId('standard');
      return preset.strings.map(s => (typeof s === 'string' ? s : s.name));
    } catch (e) { return ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']; }
  }
  /* Which notes are we listening for? Exposed so the UI, the tests and the
   * practice tools can all ask the same question. */
  L.buildTargets = function (source) {
    const notes = notesFor(source);
    const labels = [], midis = [];
    notes.forEach(n => {
      const m = N.nameToMidi(n);
      if (m == null) return;
      labels.push(n);
      midis.push(m);
    });
    return { labels: labels, midis: midis, raw: notes };
  };
  function notesFor(source) {
    /* the tuning libraries store strings low string first, which is the order
     * you play them when you check a guitar */
    if (source === 'open') return tuningStrings();
    if (source === 'open12') { const s = tuningStrings(); return s.concat(s); }
    if (source === 'scale') {
      const root = els.scaleRoot ? els.scaleRoot.value : 'A';
      const id = els.scaleType ? els.scaleType.value : 'penta-minor';
      const scale = (TT.tools.SCALES || []).find(s => s.id === id) || { steps: [0, 2, 4, 5, 7, 9, 11] };
      const rootMidi = N.nameToMidi(root + '3') + 12;   /* start around E4 area */
      let out = [];
      [0, 12].forEach(oct => scale.steps.forEach(st => out.push(rootMidi + st + oct)));
      return out.map(m => midiName(m));
    }
    if (source === 'chords') {
      const key = els.chordKey ? els.chordKey.value : 'C';
      const mode = els.chordMode ? els.chordMode.value : 'major';
      const lib = TT.chords.library(key, mode);
      const names = lib.triads.map(t => t.name);
      const base = N.nameToMidi(key.replace('♭', 'b') + '3');
      const out = [];
      names.forEach((nm, i) => {
        /* root, third and fifth of the chord, one note per step */
        const semi = TT.chords.pc(TT.chords.rootOf(nm));
        const rootMidi = 48 + ((semi - TT.chords.pc(key) + 12) % 12);
        const minor = /m(?!aj)/.test(TT.chords.suffixOf(nm));
        const dim = /dim|m7♭5/.test(TT.chords.suffixOf(nm));
        const third = dim ? 3 : (minor ? 3 : 4);
        const fifth = dim ? 6 : 7;
        out.push(midiName(rootMidi), midiName(rootMidi + third), midiName(rootMidi + fifth));
      });
      return out;
    }
    if (source === 'song') {
      const id = els.songPick ? els.songPick.value : '';
      const song = TT.catalog.songById(id) || TT.catalog.SONGS[0];
      const out = [];
      song.chords.forEach(nm => {
        const semi = TT.chords.pc(TT.chords.rootOf(nm));
        const rootPc = TT.chords.pc(song.key.replace('♭', 'b'));
        const rootMidi = 48 + ((semi - rootPc + 12) % 12);
        const minor = /m(?!aj)/.test(TT.chords.suffixOf(nm));
        out.push(midiName(rootMidi), midiName(rootMidi + (minor ? 3 : 4)), midiName(rootMidi + 7), midiName(rootMidi + 12));
      });
      return out;
    }
    if (source === 'custom') {
      return (els.custom.value || '').trim().split(/[\s,]+/).filter(Boolean);
    }
    return [];
  }
  function midiName(midi) { return N.prettyName(N.SHARP[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1)).label; }

  /* ---------------------------------------------------------------- */
  /* the live loop                                                     */
  /* ---------------------------------------------------------------- */
  function frame() {
    if (!state.running) return;
    raf = requestAnimationFrame(frame);
    const buf = TT.audio.sample();
    if (!buf || !TT.audio.ctx) return;

    let rms = 0;
    for (let i = 0; i < buf.length; i += 4) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / (buf.length / 4));
    const loud = rms > 0.008;

    let note = null, freq = 0, cents = 0;
    if (loud) {
      const work = buf.subarray(buf.length - 2048);
      const det = TT.yin.yin(work, TT.audio.ctx.sampleRate, 0.15);
      if (det && det.clarity > 0.6) {
        freq = det.freq;
        const m = N.freqToMidi(freq);
        const r = Math.round(m);
        note = { midi: r, cents: (m - r) * 100, label: N.freqToNote(freq).label, freq: freq, clarity: det.clarity };
      }
    }

    if (!note) {
      state.silenceFrames++;
      state.stable = 0;
      if (state.silenceFrames > 8) renderLive(null);
      return;
    }
    state.silenceFrames = 0;

    /* stability: same note, similar pitch, for a few frames in a row */
    if (state.last && state.last.midi === note.midi && Math.abs(note.cents - state.last.cents) < 45 &&
        performance.now() - state.last.at < 220) {
      state.stable++;
    } else {
      state.stable = 1;
    }
    const fresh = !state.last || state.last.midi !== note.midi || performance.now() - state.last.at > 260;
    state.last = { midi: note.midi, cents: note.cents, at: performance.now() };
    renderLive(note);

    if (state.stable >= 3 && fresh && note.freq > 60) {
      register(note);
    }
  }

  /* The comparison — the heart of the app. Given what was heard, decide whether
   * it is the expected note, the expected note out of tune, or the wrong note
   * altogether, and say so in plain words. Exposed as L.check() so the DOM test
   * (and any future drill mode) can drive it directly. */
  L.check = function (note) {
    if (!note || note.midi == null) return null;
    state.score.took++;
    const record = {
      at: Date.now(), heard: note.label, cents: Math.round(note.cents || 0),
      expected: state.free ? '—' : (state.labels[state.index] || '—')
    };
    state.history.unshift(record);
    if (state.history.length > 40) state.history.pop();

    if (state.free) {
      const verdict = Math.abs(note.cents || 0) <= state.tolCents ? 'ok' : 'close';
      banner(verdict, `${note.label} ${verdict === 'ok' ? '— nicely in tune' : (note.cents > 0 ? `${Math.round(note.cents)}¢ sharp` : `${Math.round(Math.abs(note.cents))}¢ flat`)}`);
      return { verdict: verdict };
    }
    const want = state.target[state.index];
    if (want == null) return null;
    const wantLabel = state.labels[state.index];
    const diff = note.midi - want;
    const cents = note.cents || 0;

    if (diff === 0 && (!state.requireTune || Math.abs(cents) <= state.tolCents)) {
      state.score.correct++;
      state.score.streak++;
      if (state.score.streak > state.score.best) state.score.best = state.score.streak;
      state.score.centsSum += Math.abs(cents); state.score.centsN++;
      let msg = `${wantLabel} ✓ — ${Math.abs(cents) <= 5 ? 'dead on' : (cents > 0 ? Math.round(cents) + '¢ sharp but the right note' : Math.round(Math.abs(cents)) + '¢ flat but the right note')}. Streak ${state.score.streak}.`;
      state.index++;
      if (state.index >= state.target.length) {
        state.index = 0;
        msg += ` That is the whole set — round complete: ${state.score.correct} correct, ${state.score.wrong} wrong, ${state.score.close} out of tune.`;
      }
      banner('ok', msg);
      renderTarget(); renderScore(); saveStats();
      return { verdict: 'ok', expected: wantLabel };
    }
    if (diff === 0) {
      state.score.close++;
      banner('close', `Right note, wrong pitch: ${wantLabel} is ${cents > 0 ? Math.round(cents) + '¢ sharp' : Math.round(Math.abs(cents)) + '¢ flat'}. ${cents > 0 ? 'Loosen the string or ease the bend down.' : 'Tighten the string or bend up to it.'}`);
      renderTarget(); renderScore();
      return { verdict: 'close', expected: wantLabel, cents: cents };
    }
    state.score.wrong++;
    state.score.streak = 0;
    const dir = diff > 0 ? 'too high' : 'too low';
    const semis = Math.abs(diff);
    const miss = {
      want: wantLabel, heard: note.label, semis: semis, dir: dir, at: Date.now(),
      why: semis === 1 ? (diff > 0 ? 'one fret above' : 'one fret below') :
           (semis === 12 ? (diff > 0 ? 'a whole octave above' : 'a whole octave below') : semis + ' semitones apart')
    };
    state.score.misses.unshift(miss);
    if (state.score.misses.length > 12) state.score.misses.pop();
    record.wrong = true;
    banner('bad', `That was ${note.label} — ${dir} by ${semis} semitone${semis > 1 ? 's' : ''} (${miss.why}). I was listening for ${wantLabel}.`);
    renderTarget(); renderScore(); saveStats();
    return { verdict: 'bad', expected: wantLabel, heard: note.label, semis: semis, direction: dir };
  };

  /* called by the live loop once a note has been stable long enough to trust */
  function register(note) { L.check(note); }

  function banner(kind, text) {
    if (!els.banner) return;
    els.banner.className = 'ls-banner ' + kind;
    els.banner.textContent = text;
    if (kind !== 'idle') {
      els.banner.classList.add('pulse');
      setTimeout(() => { if (els.banner) els.banner.classList.remove('pulse'); }, 420);
    }
  }

  function renderLive(note) {
    if (els.heard) {
      els.heard.textContent = note ? note.label : '–';
      els.heard.className = 'ls-heard ' + (!note ? 'idle' : (Math.abs(note.cents) <= state.tolCents ? 'ok' : 'close'));
    }
    if (els.cents) els.cents.textContent = note ? (note.cents > 0 ? '+' : '') + Math.round(note.cents) + '¢' : '';
    if (els.meter) {
      const pct = note ? Math.max(-50, Math.min(50, note.cents)) : 0;
      els.meter.style.setProperty('--cents', pct.toFixed(1));
      els.meter.className = 'ls-meter' + (note ? (Math.abs(note.cents) <= state.tolCents ? ' ok' : ' close') : '');
    }
  }

  function renderTarget() {
    if (!els.target) return;
    els.target.innerHTML = '';
    if (state.free) {
      els.target.innerHTML = '<div class="ls-free">Free mode — play anything and it tells you what it heard.</div>';
    } else {
      state.target.forEach((m, i) => {
        const span = document.createElement('span');
        span.className = 'ls-step' + (i === state.index ? ' current' : (i < state.index ? ' done' : ''));
        span.textContent = state.labels[i];
        span.dataset.midi = m;
        els.target.appendChild(span);
      });
    }
    if (els.progress) els.progress.textContent = state.free ? 'free play' : (state.index + 1) + ' / ' + state.target.length;
  }

  function renderScore() {
    const s = state.score;
    if (els.score) {
      const total = s.correct + s.wrong + s.close;
      const acc = total ? Math.round((s.correct / total) * 100) : 0;
      const avg = s.centsN ? (s.centsSum / s.centsN).toFixed(1) : '—';
      els.score.innerHTML = `
        <div class="ls-stat"><b>${s.correct}</b><span>correct</span></div>
        <div class="ls-stat bad"><b>${s.wrong}</b><span>wrong</span></div>
        <div class="ls-stat close"><b>${s.close}</b><span>right note, off pitch</span></div>
        <div class="ls-stat"><b>${acc}%</b><span>accuracy</span></div>
        <div class="ls-stat"><b>${s.best}</b><span>best streak</span></div>
        <div class="ls-stat"><b>${avg}${avg === '—' ? '' : '¢'}</b><span>average error</span></div>`;
    }
    if (els.misses) {
      els.misses.innerHTML = '';
      if (!s.misses.length) els.misses.innerHTML = '<span class="dim">No wrong notes yet.</span>';
      s.misses.forEach(m => {
        const row = document.createElement('div');
        row.className = 'ls-miss';
        row.innerHTML = `<b>${m.heard}</b> where <b>${m.want}</b> was expected — ${m.why}.`;
        els.misses.appendChild(row);
      });
    }
    if (els.history) {
      els.history.innerHTML = '';
      if (!state.history.length) els.history.innerHTML = '<span class="dim">Nothing heard yet.</span>';
      state.history.slice(0, 12).forEach(h => {
        const row = document.createElement('div');
        row.className = 'ls-hist' + (h.wrong ? ' bad' : '');
        row.innerHTML = `<span>${h.heard}</span><span class="dim">${h.cents > 0 ? '+' : ''}${h.cents}¢</span><span class="dim">${h.expected ? 'wanted ' + h.expected : ''}</span>`;
        els.history.appendChild(row);
      });
    }
  }

  function saveStats() {
    const s = state.score;
    try {
      TT.store.set('listenerBest', {
        best: Math.max((TT.store.get('listenerBest', {}).best || 0), s.best),
        accuracy: Math.round((s.correct / Math.max(1, s.correct + s.wrong + s.close)) * 100),
        at: Date.now()
      });
    } catch (e) {}
  }

  /* ---------------------------------------------------------------- */
  /* control                                                           */
  /* ---------------------------------------------------------------- */
  L.start = async function () {
    if (state.running) return;
    const source = els.source ? els.source.value : 'open';
    const built = L.buildTargets(source);
    state.labels = built.labels;
    state.target = built.midis;
    state.free = source === 'free';
    state.source = source;
    state.index = 0;
    if (!state.free && !state.target.length) {
      banner('bad', 'Pick a target first — open strings, a scale, a song or your own notes.');
      return;
    }
    if (TT.audio.micState !== 'on') {
      banner('idle', 'Waiting for the microphone…');
      try { await TT.audio.startMic(); } catch (e) {}
      if (TT.audio.micState !== 'on') {
        banner('bad', 'No microphone: ' + (TT.audio.micError || 'permission denied') + '. If this app is inside a preview frame, use “Open in a new tab”.');
        return;
      }
    }
    state.running = true;
    state.last = null; state.stable = 0; state.silenceFrames = 0;
    if (els.btnStart) els.btnStart.textContent = '■ Stop listening';
    if (els.btnStart) els.btnStart.classList.add('stop');
    banner('idle', state.free ? 'Play anything — I will name every note and tell you if it is in tune.' :
      'Listening. Next note: ' + (state.labels[state.index] || ''));
    if (!raf) raf = requestAnimationFrame(frame);
    if (TT.app && TT.app.assist) TT.app.assist('Listener on — ' + (state.free ? 'free mode' : state.target.length + ' notes to play') + '. Every note is checked both ways.');
  };

  L.stop = function () {
    state.running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (els.btnStart) { els.btnStart.textContent = '▶ Start listening'; els.btnStart.classList.remove('stop'); }
    banner('idle', 'Stopped.');
  };

  L.reset = function () {
    state.score = { correct: 0, wrong: 0, close: 0, streak: 0, best: 0, centsSum: 0, centsN: 0, misses: [], took: 0 };
    state.history = [];
    state.index = 0;
    renderTarget(); renderScore();
    banner('idle', 'Score reset.');
  };

  L.init = function () {
    if (L._ready) return;
    L._ready = true;
    els = {
      source: document.getElementById('ls-source'),
      scaleRoot: document.getElementById('ls-scale-root'),
      scaleType: document.getElementById('ls-scale-type'),
      chordKey: document.getElementById('ls-chord-key'),
      chordMode: document.getElementById('ls-chord-mode'),
      songPick: document.getElementById('ls-song'),
      custom: document.getElementById('ls-custom'),
      extraScale: document.getElementById('ls-extra-scale'),
      extraChords: document.getElementById('ls-extra-chords'),
      extraSong: document.getElementById('ls-extra-song'),
      extraCustom: document.getElementById('ls-extra-custom'),
      btnStart: document.getElementById('ls-btn-start'),
      btnReset: document.getElementById('ls-btn-reset'),
      tol: document.getElementById('ls-tol'),
      tolVal: document.getElementById('ls-tol-val'),
      requireTune: document.getElementById('ls-require-tune'),
      banner: document.getElementById('ls-banner'),
      heard: document.getElementById('ls-heard'),
      cents: document.getElementById('ls-cents'),
      meter: document.getElementById('ls-meter'),
      target: document.getElementById('ls-target'),
      progress: document.getElementById('ls-progress'),
      score: document.getElementById('ls-score'),
      misses: document.getElementById('ls-misses'),
      history: document.getElementById('ls-history')
    };
    if (els.scaleRoot) {
      TT.notes.SHARP.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; els.scaleRoot.appendChild(o); });
      els.scaleRoot.value = 'A';
    }
    if (els.scaleType) {
      (TT.tools.SCALES || []).forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; els.scaleType.appendChild(o); });
      els.scaleType.value = 'penta-minor';
    }
    [els.chordKey, els.chordMode].forEach((node, i) => {
      if (!node) return;
      const list = i === 0 ? TT.chords.KEYS.filter(k => k.mode === 'major').map(k => k.name) : ['major', 'minor'];
      list.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; node.appendChild(o); });
    });
    if (els.songPick) {
      TT.catalog.SONGS.slice().sort((a, b) => a.title.localeCompare(b.title)).forEach(s => {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.title + ' — ' + s.artist;
        els.songPick.appendChild(o);
      });
    }
    function syncSource() {
      const v = els.source ? els.source.value : 'open';
      if (els.extraScale) els.extraScale.hidden = v !== 'scale';
      if (els.extraChords) els.extraChords.hidden = v !== 'chords';
      if (els.extraSong) els.extraSong.hidden = v !== 'song';
      if (els.extraCustom) els.extraCustom.hidden = v !== 'custom';
    }
    if (els.source) els.source.addEventListener('change', () => { syncSource(); if (state.running) { L.stop(); L.start(); } });
    ['scaleRoot', 'scaleType', 'chordKey', 'chordMode', 'songPick'].forEach(k => {
      if (els[k]) els[k].addEventListener('change', () => { if (state.running) { L.stop(); L.start(); } });
    });
    if (els.btnStart) els.btnStart.addEventListener('click', () => { state.running ? L.stop() : L.start(); });
    if (els.btnReset) els.btnReset.addEventListener('click', L.reset);
    if (els.tol) els.tol.addEventListener('input', () => {
      state.tolCents = +els.tol.value;
      if (els.tolVal) els.tolVal.textContent = state.tolCents + '¢';
    });
    if (els.requireTune) els.requireTune.addEventListener('change', () => { state.requireTune = els.requireTune.checked; });
    syncSource();
    renderTarget(); renderScore(); renderLive(null);
  };

  L.state = state;
  window.TT = window.TT || {};
  window.TT.listener = L;
})();
