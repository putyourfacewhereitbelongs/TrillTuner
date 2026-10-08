/* Trill Tuner — Tab maker: it listens to a song and tells you how to play it.
 *
 * Drop in an audio file (or grab a song from the play-along library) and this
 * runs the offline analysis engine on it: chords, key, tempo, bar chart, capo
 * advice, chord shapes and the whole chord library for that key — then hands
 * you a printable / downloadable tab sheet.
 *
 * All the signal work lives in lib/dsp.js, all the harmony work in lib/chords.js;
 * this file is the listening, the layout and the paper.
 */
(function () {
  'use strict';

  const T = {};
  const state = {
    file: null,
    buffer: null,
    result: null,
    plan: null,
    bpm: 0,
    key: '',
    mode: 'major',
    title: '',
    artist: '',
    transpose: 0,
    busy: false,
    source: ''
  };
  let els = {};

  /* ---------------------------------------------------------------- */
  /* audio in                                                          */
  /* ---------------------------------------------------------------- */
  function decodeFile(file) {
    const ctx = TT.audio.ensure();
    return file.arrayBuffer().then(buf => new Promise((resolve, reject) => {
      const done = b => resolve(b);
      const fail = e => reject(e || new Error('Could not decode that file'));
      const p = ctx.decodeAudioData(buf, done, fail);
      if (p && typeof p.then === 'function') p.then(done, fail);
    }));
  }

  function toChannels(audioBuffer) {
    const ch = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) ch.push(audioBuffer.getChannelData(c));
    return ch;
  }

  /* Analyse a decoded buffer. Returns the engine's result plus our own
   * bookkeeping (bars, tab lines, notes about what was found). */
  T.analyseBuffer = function (audioBuffer, opts) {
    opts = opts || {};
    const sr = audioBuffer.sampleRate;
    const maxSeconds = opts.maxSeconds || 240;
    const channels = toChannels(audioBuffer);
    let chans = channels;
    let truncated = false;
    const cap = Math.round(maxSeconds * sr);
    if (channels[0].length > cap) {
      chans = channels.map(c => c.subarray(0, cap));
      truncated = true;
    }
    const mono = TT.dsp.mixdown(chans);
    const res = TT.dsp.analyseChords(mono, sr, {
      fftSize: opts.fftSize || 4096,
      hop: opts.hop || 2048,
      fMin: 55, fMax: 1600
    });
    res.truncated = truncated;
    res.peak = peakOf(mono);
    res.rms = rmsOf(mono);
    return res;
  };

  function peakOf(x) { let p = 0; for (let i = 0; i < x.length; i += 7) { const v = Math.abs(x[i]); if (v > p) p = v; } return p; }
  function rmsOf(x) { let s = 0; for (let i = 0; i < x.length; i += 3) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length / 3)); }

  /* ---------------------------------------------------------------- */
  /* the shared chord-library panel (used here and in Songs)           */
  /* ---------------------------------------------------------------- */
  function chordSteps(sym) {
    const list = (TT.tools && TT.tools.CHORD_TYPES) || [];
    const t = list.find(t => t.sym === sym) || list.find(t => t.id === 'maj');
    return t ? { steps: t.steps, type: t } : null;
  }
  function voicingsFor(name) {
    if (!TT.tools || !TT.tools.voicingsFor) return [];
    const parsed = TT.catalog.parseChord(name);
    if (!parsed) return [];
    const info = chordSteps(parsed.sym);
    if (!info) return [];
    const rootPc = TT.chords.pc(parsed.root);
    if (rootPc < 0) return [];
    try { return TT.tools.voicingsFor(rootPc, info.steps).map(v => ({ v: v, rootPc: rootPc, name: name })); }
    catch (e) { return []; }
  }
  /* a shape written the way players write it: 6th string → 1st string */
  function shapeText(name, v) {
    if (!v) return '';
    const cells = ['x', 'x', 'x', 'x', 'x', 'x'];
    /* tools.js works in indices where 0 = the high E (string 1) */
    v.v.strings.forEach((si, i) => { cells[si] = String(v.v.frets[i]); });
    return cells.join(' ');
  }
  function diagram(name) {
    const list = voicingsFor(name);
    if (!list.length) return '';
    try { return TT.tools.chordDiagram(list[0].v, list[0].rootPc); } catch (e) { return ''; }
  }

  const STRUM = [
    { max: 70, pattern: 'D   D   D U   (let everything ring)', note: 'Slow song — use long, relaxed downstrokes and let each chord ring.' },
    { max: 95, pattern: 'D   D U   U D U', note: 'The folk/ballad default: down on 1, down-up on 2, then down-up-down-up.' },
    { max: 125, pattern: 'D U D U D U D U', note: 'Straight eighths — the pop/rock engine room.' },
    { max: 150, pattern: 'D   D U   D   D U', note: 'Waltz-ish drive; accent beats 1 and 3 and keep your wrist loose.' },
    { max: 999, pattern: 'D D D D D D D D', note: 'Fast song — all downstrokes, with plenty of mute in between.' }
  ];
  function strumFor(bpm) {
    const b = bpm || 100;
    return STRUM.find(s => b <= s.max) || STRUM[4];
  }

  /* Build the plan: key/chords → what to play, in what order, how. */
  T.plan = function (input) {
    input = input || {};
    const chords = (input.chords || []).slice(0, 14);
    const bars = input.bars || [];
    const plan = TT.chords.planFor({
      key: input.key || 'C', mode: input.mode || 'major',
      chords: chords, tempo: input.tempo || 0
    });
    plan.bars = bars;
    plan.tempo = input.tempo || 0;
    plan.strum = strumFor(input.tempo);
    plan.title = input.title || '';
    plan.artist = input.artist || '';
    plan.bpm = input.tempo || 0;
    return plan;
  };

  function transposeName(name, semis) {
    if (!semis) return name;
    return TT.catalog.transposeChord(name, semis);
  }

  /* ---------------------------------------------------------------- */
  /* the tab sheet                                                     */
  /* ---------------------------------------------------------------- */
  function pad(s, n) { s = String(s); return s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length); }
  function mmss(sec) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  T.tabText = function (plan) {
    if (!plan) return '';
    const semis = plan.transpose || 0;
    const lines = [];
    const rule = '═'.repeat(58);
    lines.push('TRILL TUNER — TAB SHEET');
    lines.push(rule);
    if (plan.title) lines.push('Song      : ' + plan.title);
    if (plan.artist) lines.push('Artist    : ' + plan.artist);
    lines.push('Key       : ' + plan.key + ' ' + (plan.mode === 'minor' ? 'minor' : 'major') +
      (plan.tempo ? '   ·   ' + plan.tempo + ' BPM' : ''));
    if (plan.capo) lines.push('Capo      : ' + plan.capo);
    lines.push('Chords    : ' + (plan.detected.length ? plan.detected.map(d => transposeName(d.name, semis)).join('   ') : '(none detected)'));
    lines.push('');

    const bars = plan.bars || [];
    if (bars.length) {
      lines.push('CHORD CHART' + (plan.bpm ? '  — ' + plan.bpm + ' BPM, 4 beats per bar' : ''));
      lines.push('─'.repeat(58));
      let row = '';
      bars.forEach((b, i) => {
        row += '| ' + pad(transposeName(b.name, semis), 6);
        if ((i + 1) % 4 === 0) { lines.push(row + '|'); row = ''; }
      });
      if (row) lines.push(row + '|');
      lines.push('');
    }

    if (plan.detected.length) {
      lines.push('CHORD SHAPES  (6th string → 1st string, x = do not play)');
      lines.push('─'.repeat(58));
      plan.detected.forEach(d => {
        const name = transposeName(d.name, semis);
        const vs = voicingsFor(name);
        if (!vs.length) { lines.push(pad(name, 8) + 'roman numeral ' + d.roman); return; }
        lines.push(pad(name, 8) + pad(shapeText(name, vs[0]), 18) + ' ' + d.roman + '   ' + d.fn);
        if (vs[1]) lines.push(pad('', 8) + pad(shapeText(name, vs[1]), 18) + ' (up the neck)');
      });
      lines.push('');
    }

    if (plan.library) {
      lines.push('THE CHORD LIBRARY FOR ' + plan.key + ' ' + (plan.mode === 'minor' ? 'MINOR' : 'MAJOR'));
      lines.push('─'.repeat(58));
      plan.library.triads.forEach(d => lines.push(pad(d.roman, 7) + pad(transposeName(d.name, semis), 9) + d.fn));
      lines.push('');
      lines.push('Colour chords: ' + plan.library.colour.map(c => transposeName(c.name, semis)).join('  '));
      lines.push('Borrowed    : ' + plan.library.borrowed.map(c => transposeName(c.name, semis) + ' (' + c.roman + ')').join('  '));
      lines.push('');
    }

    if (plan.progressions && plan.progressions.length) {
      lines.push('PROGRESSIONS THAT FIT');
      lines.push('─'.repeat(58));
      plan.progressions.slice(0, 6).forEach(p => {
        lines.push(pad(p.progression.name, 26) + p.chords.map(c => transposeName(c, semis)).join(' ') + '   [' + p.progression.genres.join('/') + ']');
      });
      lines.push('');
    }

    lines.push('STRUMMING SUGGESTION');
    lines.push('─'.repeat(58));
    lines.push(plan.strum.pattern);
    lines.push(plan.strum.note);
    lines.push('');
    lines.push('HOW TO PLAY IT');
    lines.push('─'.repeat(58));
    (plan.capoNote ? [plan.capoNote] : []).concat(plan.tips || []).forEach(t => lines.push('• ' + t));
    lines.push('• Practice order: ' + plan.learnOrder.map(c => transposeName(c, semis)).join('  →  '));
    lines.push('');
    lines.push('Generated by Trill Tuner — every note above came from analysing the audio on your own device.');
    return lines.join('\n');
  };

  /* ---------------------------------------------------------------- */
  /* rendering                                                         */
  /* ---------------------------------------------------------------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* the chord-library panel — shared with the Songs view */
  T.renderPlan = function (host, plan) {
    if (!host) return;
    host.innerHTML = '';
    if (!plan) return;
    const semis = plan.transpose || 0;

    /* --- key + what it means --------------------------------------- */
    const head = el('div', 'plan-head');
    const keyBox = el('div', 'plan-key');
    keyBox.innerHTML = `<div class="plan-key-name">${plan.key} <span>${plan.mode === 'minor' ? 'minor' : 'major'}</span></div>
      <div class="dim smallish">${plan.detected.length ? plan.detected.length + ' chord' + (plan.detected.length > 1 ? 's' : '') + ' detected' : 'the key your song lives in'}</div>`;
    head.appendChild(keyBox);
    const seg = el('div', 'seg seg-mini');
    [['major', 'Major'], ['minor', 'Minor']].forEach(([m, label]) => {
      const b = el('button', 'seg-btn' + (plan.mode === m ? ' active' : ''), label);
      b.type = 'button';
      b.addEventListener('click', () => {
        plan.mode = m;
        const again = T.plan({ key: plan.key, mode: m, chords: plan.detected.map(d => d.name), tempo: plan.bpm });
        again.transpose = plan.transpose; again.title = plan.title; again.artist = plan.artist;
        T.renderPlan(host, again);
        if (host === els.plan) state.plan = again;
        T.updateTabSheet();
      });
      seg.appendChild(b);
    });
    head.appendChild(seg);
    /* capo + transpose controls */
    const ctl = el('div', 'plan-ctl');
    const tr = el('div', 'plan-transpose');
    tr.appendChild(el('span', 'dim smallish', 'Transpose'));
    const down = el('button', 'btn btn-ghost tiny', '−1'), up = el('button', 'btn btn-ghost tiny', '+1'), val = el('b', 'plan-trval', (semis > 0 ? '+' : '') + semis);
    down.type = up.type = 'button';
    const shift = d => {
      plan.transpose = Math.max(-11, Math.min(11, (plan.transpose || 0) + d));
      T.renderPlan(host, plan);
      T.updateTabSheet();
    };
    down.addEventListener('click', () => shift(-1));
    up.addEventListener('click', () => shift(1));
    tr.appendChild(down); tr.appendChild(val); tr.appendChild(up);
    ctl.appendChild(tr);
    if (plan.capoNote) ctl.appendChild(el('div', 'plan-capo', plan.capoNote));
    head.appendChild(ctl);
    host.appendChild(head);

    /* --- detected chords with roman numerals ----------------------- */
    if (plan.detected.length) {
      host.appendChild(el('div', 'card-h small', 'Found in the song'));
      const wrap = el('div', 'plan-chords');
      let openFig = null;
      plan.detected.forEach(d => {
        const name = transposeName(d.name, semis);
        const chip = el('button', 'plan-chord' + (d.inKey ? '' : ' borrowed'));
        chip.type = 'button';
        chip.innerHTML = `<b>${name}</b><span>${d.roman}${d.inKey ? '' : ' • borrowed'}</span>`;
        chip.title = d.fn || '';
        chip.addEventListener('click', () => {
          if (openFig) openFig.remove();
          openFig = el('div', 'plan-figure');
          const svg = diagram(name);
          const vs = voicingsFor(name);
          openFig.innerHTML = (svg || '<span class="dim">No open shape — barre or capo territory.</span>') +
            (vs[0] ? `<code>${shapeText(name, vs[0])}</code>` : '') +
            `<div class="dim smallish">${d.fn || ''}</div>`;
          chip.after(openFig);
        });
        wrap.appendChild(chip);
      });
      host.appendChild(wrap);
    }

    /* --- the library for this key ---------------------------------- */
    host.appendChild(el('div', 'card-h small', 'The chord library for this key'));
    const lib = plan.library;
    const grid = el('div', 'plan-lib');
    lib.triads.forEach(d => {
      const name = transposeName(d.name, semis);
      const used = plan.detected.some(x => TT.chords.primary(x.name) === TT.chords.primary(d.name));
      const cell = el('div', 'plan-cell' + (used ? ' used' : ''));
      cell.innerHTML = `<span class="plan-rom">${d.roman}</span><b>${name}</b><span class="dim smallish">${d.fn}</span>`;
      grid.appendChild(cell);
    });
    host.appendChild(grid);

    const extra = el('div', 'chipwrap');
    lib.colour.forEach(c => {
      const chip = el('span', 'chip-s', transposeName(c.name, semis));
      chip.title = c.fn; extra.appendChild(chip);
    });
    lib.borrowed.forEach(c => {
      const chip = el('span', 'chip-s chip-s-borrowed', transposeName(c.name, semis) + ' · ' + c.roman);
      chip.title = c.fn; extra.appendChild(chip);
    });
    host.appendChild(extra);

    /* --- progressions --------------------------------------------- */
    if (plan.progressions.length) {
      host.appendChild(el('div', 'card-h small', 'Progressions that fit'));
      const list = el('div', 'plan-progs');
      plan.progressions.slice(0, 8).forEach(p => {
        const row = el('div', 'plan-prog');
        const title = el('div', 'plan-prog-h');
        title.innerHTML = `<b>${p.progression.name}</b> <span class="dim smallish">${p.progression.genres.join(' · ')}</span>`;
        row.appendChild(title);
        row.appendChild(el('div', 'plan-prog-chords', p.chords.map(c => transposeName(c, semis)).join('  ')));
        row.appendChild(el('div', 'dim smallish', p.progression.desc));
        list.appendChild(row);
      });
      host.appendChild(list);
    }

    /* --- practice order + songs ----------------------------------- */
    const two = el('div', 'plan-two');
    const po = el('div');
    po.appendChild(el('div', 'card-h small', 'Learn them in this order'));
    const orderWrap = el('div', 'chipwrap');
    po.appendChild(orderWrap);
    plan.learnOrder.forEach((c, i) => orderWrap.appendChild(el('span', 'chip-s', (i + 1) + '. ' + transposeName(c, semis))));
    two.appendChild(po);

    if (plan.similar && plan.similar.length) {
      const sim = el('div');
      sim.appendChild(el('div', 'card-h small', 'Songs with these chords'));
      const wrap = el('div', 'chipwrap');
      plan.similar.forEach(s => {
        const b = el('button', 'chip-s', s.title + ' · ' + s.artist);
        b.type = 'button';
        b.addEventListener('click', () => {
          if (TT.app) { TT.app.showView('songs'); }
          if (TT.songs && TT.songs.openSong) TT.songs.openSong(s.id);
        });
        wrap.appendChild(b);
      });
      sim.appendChild(wrap);
      two.appendChild(sim);
    }
    host.appendChild(two);

    /* --- tips ------------------------------------------------------ */
    if (plan.tips && plan.tips.length) {
      const tips = el('ul', 'plan-tips');
      plan.tips.forEach(t => tips.appendChild(el('li', null, t)));
      host.appendChild(tips);
    }
  };

  function barRow(bars, semis) {
    const wrap = el('div', 'mk-bars');
    bars.forEach((b, i) => {
      const cell = el('div', 'mk-bar');
      cell.innerHTML = `<span class="mk-bar-n">${b.bar}</span><b>${transposeName(b.name, semis)}</b>`;
      wrap.appendChild(cell);
    });
    return wrap;
  }
  function chordChartLines(bars, semis) {
    const out = [];
    let row = [];
    bars.forEach(b => {
      row.push(transposeName(b.name, semis));
      if (row.length === 4) { out.push(row.join(' | ')); row = []; }
    });
    if (row.length) out.push(row.join(' | '));
    return out;
  }

  T.updateTabSheet = function () {
    if (!els.sheet) return;
    const plan = state.plan;
    if (!plan) { els.sheet.textContent = 'Nothing analysed yet — drop a song in above.'; return; }
    els.sheet.textContent = T.tabText(plan);
    if (els.print) els.print.textContent = T.tabText(plan);
  };

  function renderResult(res) {
    state.busy = false;
    state.result = res;
    const chords = [];
    const seen = {};
    res.chords.forEach(c => { if (!seen[c.name]) { seen[c.name] = 1; chords.push(c.name); } });
    const key = (state.key || res.key.key);
    const mode = (state.key ? state.mode : res.key.mode);
    state.key = key; state.mode = mode; state.bpm = state.bpm || res.tempo.bpm || 100;
    const bars = TT.dsp.toBars(res.chords, state.bpm);
    const plan = T.plan({
      key: key, mode: mode, chords: chords, bars: bars, tempo: state.bpm,
      title: state.title, artist: state.artist
    });
    state.plan = plan;

    /* summary */
    if (els.summary) {
      els.summary.hidden = false;
      const dur = Math.round(res.duration || 0);
      els.summary.innerHTML = `
        <div class="mk-fact"><b>${key} ${mode}</b><span>detected key</span></div>
        <div class="mk-fact"><b>${state.bpm} BPM</b><span>detected tempo</span></div>
        <div class="mk-fact"><b>${chords.length}</b><span>chord${chords.length === 1 ? '' : 's'} used</span></div>
        <div class="mk-fact"><b>${mmss(dur)}</b><span>analysed</span></div>
        <div class="mk-fact"><b>${res.tempo.confidence ? Math.round(res.tempo.confidence * 100) + '%' : '—'}</b><span>tempo confidence</span></div>`;
    }
    if (els.chart) {
      els.chart.innerHTML = '';
      els.chart.appendChild(el('div', 'card-h small', 'Chord chart — one bar per box'));
      els.chart.appendChild(barRow(bars, 0));
      els.chart.appendChild(el('div', 'card-h small', 'On one line'));
      const pre = el('pre', 'tab-pre small', chordChartLines(bars, 0).join('\n'));
      els.chart.appendChild(pre);
    }
    if (els.plan) {
      els.planHost.hidden = false;
      T.renderPlan(els.plan, plan);
    }
    T.updateTabSheet();
    if (els.status) els.status.textContent = 'Analysed ' + Math.round(res.duration) + 's of audio — ' + (res.truncated ? 'the first four minutes only. ' : '') + 'Set the metronome to ' + state.bpm + ' BPM and start with bar 1.';
    if (TT.app && TT.app.assist) TT.app.assist('Tab maker: ' + key + ' ' + mode + ', ' + chords.length + ' chords, ' + state.bpm + ' BPM. ' + plan.capoNote);
  }

  function setBusy(msg) {
    state.busy = true;
    if (els.status) els.status.textContent = msg;
    if (els.spinner) els.spinner.hidden = false;
  }
  function setIdle() { if (els.spinner) els.spinner.hidden = true; }

  T.loadFile = async function (file) {
    if (!file) return;
    if (!/^audio\//.test(file.type || '') && !/\.(mp3|wav|m4a|aac|ogg|opus|flac|webm)$/i.test(file.name || '')) {
      if (els.status) els.status.textContent = 'That does not look like an audio file — try an mp3, wav, m4a, ogg or flac.';
      return;
    }
    state.file = file;
    state.title = (file.name || '').replace(/\.[a-z0-9]+$/i, '');
    state.artist = '';
    state.key = ''; state.bpm = 0; state.mode = 'major';
    if (els.title) els.title.value = state.title;
    setBusy('Decoding ' + file.name + '…');
    try {
      const buf = await decodeFile(file);
      state.buffer = buf;
      setBusy('Listening to the song — reading chords, key and tempo…');
      /* let the browser paint the status before the (synchronous) analysis */
      await new Promise(r => setTimeout(r, 30));
      const res = T.analyseBuffer(buf);
      renderResult(res);
      if (TT.store) {
        const log = TT.store.get('tabHistory', []);
        log.unshift({ title: state.title, key: res.key.key, mode: res.key.mode, bpm: res.tempo.bpm, chords: res.chords.slice(0, 12).map(c => c.name), at: Date.now() });
        TT.store.set('tabHistory', log.slice(0, 20));
        renderHistory();
      }
    } catch (e) {
      if (els.status) els.status.textContent = 'Could not read that file: ' + (e && e.message ? e.message : 'unknown error') + '. WAV and MP3 are the safest formats.';
    } finally {
      setIdle();
      state.busy = false;
    }
  };

  /* record a few seconds from the microphone and analyse it */
  async function listenLive() {
    if (state.busy) return;
    setBusy('Listening on the microphone…');
    try {
      const buf = await TT.audio.captureBuffer(12);
      state.title = 'Microphone take'; state.artist = '';
      if (els.title) els.title.value = 'Microphone take';
      state.key = ''; state.bpm = 0;
      setBusy('Reading chords, key and tempo…');
      await new Promise(r => setTimeout(r, 30));
      const res = T.analyseBuffer(buf);
      renderResult(res);
    } catch (e) {
      if (els.status) els.status.textContent = 'Microphone capture failed: ' + (e && e.message ? e.message : 'no audio') + '. Check the mic permission (and use “Open in a new tab” if this is inside a preview frame).';
    } finally { setIdle(); state.busy = false; }
  }

  /* open a song from the play-along library with no audio at all */
  T.openSong = function (song) {
    if (!song) return;
    state.title = song.title; state.artist = song.artist;
    state.key = song.key; state.bpm = song.bpm; state.mode = song.mode || (/m$/.test(song.key) ? 'minor' : 'major');
    const chords = song.chords.slice();
    const bars = [];
    chords.forEach((c, i) => bars.push({ bar: i + 1, name: c, start: i }));
    state.plan = T.plan({ key: state.key, mode: state.mode, chords: chords, bars: bars, tempo: state.bpm, title: song.title, artist: song.artist });
    state.plan.capoNote = song.capo ? `Capo ${song.capo}.` : 'No capo needed.';
    state.plan.tips = [song.notes, 'Progression: ' + song.progression].concat(state.plan.tips || []);
    state.result = { duration: 0, tempo: { bpm: song.bpm, confidence: 0 }, chords: chords.map((c, i) => ({ name: c, start: i, end: i + 1 })) };
    if (els.title) els.title.value = song.title;
    if (els.summary) {
      els.summary.hidden = false;
      els.summary.innerHTML = `
        <div class="mk-fact"><b>${song.key} ${state.mode}</b><span>key</span></div>
        <div class="mk-fact"><b>${song.bpm} BPM</b><span>tempo</span></div>
        <div class="mk-fact"><b>${chords.length}</b><span>chords</span></div>
        <div class="mk-fact"><b>${song.capo || '—'}</b><span>capo</span></div>
        <div class="mk-fact"><b>${song.level}/5</b><span>difficulty</span></div>`;
    }
    if (els.chart) {
      els.chart.innerHTML = '';
      els.chart.appendChild(el('div', 'card-h small', 'Play-along chart from the library'));
      els.chart.appendChild(barRow(bars, 0));
      els.chart.appendChild(el('div', 'dim smallish', song.progression));
    }
    if (els.plan) { els.planHost.hidden = false; T.renderPlan(els.plan, state.plan); }
    if (els.status) els.status.textContent = song.title + ' — ' + song.artist + '. ' + song.notes;
    T.updateTabSheet();
  };

  /* Hand an already-analysed result to the tab maker (the Stem lab does this
   * after it has separated a part: "what is left in this file?"). */
  T.adopt = function (res, meta) {
    meta = meta || {};
    state.title = meta.title || 'Stem capture';
    state.artist = meta.artist || '';
    state.key = meta.key || '';
    state.mode = meta.mode || 'major';
    state.bpm = meta.bpm || 0;
    state.result = null;
    if (els.title) els.title.value = state.title;
    if (!els.status) return;
    renderResult(res);
  };

  /* ---------------------------------------------------------------- */
  /* history                                                           */
  /* ---------------------------------------------------------------- */
  function renderHistory() {
    if (!els.history) return;
    els.history.innerHTML = '';
    const log = (TT.store && TT.store.get('tabHistory', [])) || [];
    if (!log.length) { els.history.innerHTML = '<span class="dim">Nothing analysed yet.</span>'; return; }
    log.forEach(h => {
      const b = el('button', 'chip-s', h.title + ' · ' + h.key + ' ' + (h.bpm || '?') + ' BPM');
      b.type = 'button';
      b.title = (h.chords || []).join(' ');
      b.addEventListener('click', () => {
        if (els.title) els.title.value = h.title;
        state.title = h.title; state.key = h.key; state.mode = h.mode || 'major'; state.bpm = h.bpm || 100;
        state.plan = T.plan({ key: h.key, mode: state.mode, chords: h.chords || [], bars: (h.chords || []).map((c, i) => ({ bar: i + 1, name: c })), tempo: state.bpm, title: h.title });
        if (els.plan) { els.planHost.hidden = false; T.renderPlan(els.plan, state.plan); }
        T.updateTabSheet();
      });
      els.history.appendChild(b);
    });
  }

  /* ---------------------------------------------------------------- */
  /* wiring                                                            */
  /* ---------------------------------------------------------------- */
  function download() {
    if (!state.plan) return;
    const text = T.tabText(state.plan);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.plan.title || 'trill-tuner-song').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-tab.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  T.init = function () {
    if (T._ready) return;
    T._ready = true;
    els = {
      file: document.getElementById('mk-file'),
      drop: document.getElementById('mk-drop'),
      status: document.getElementById('mk-status'),
      spinner: document.getElementById('mk-spinner'),
      summary: document.getElementById('mk-summary'),
      chart: document.getElementById('mk-chart'),
      plan: document.getElementById('mk-plan'),
      planHost: document.getElementById('mk-plan-host'),
      sheet: document.getElementById('mk-sheet'),
      print: document.getElementById('mk-print'),
      history: document.getElementById('mk-history'),
      title: document.getElementById('mk-title'),
      btnListen: document.getElementById('mk-btn-listen'),
      btnDownload: document.getElementById('mk-btn-download'),
      btnPrint: document.getElementById('mk-btn-print'),
      btnCopy: document.getElementById('mk-btn-copy'),
      btnMetro: document.getElementById('mk-btn-metro'),
      keySelect: document.getElementById('mk-key'),
      bpmInput: document.getElementById('mk-bpm')
    };
    if (els.file) els.file.addEventListener('change', e => { if (e.target.files && e.target.files[0]) T.loadFile(e.target.files[0]); });
    if (els.drop) {
      ['dragenter', 'dragover'].forEach(ev => els.drop.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); els.drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => els.drop.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); els.drop.classList.remove('over'); }));
      els.drop.addEventListener('drop', e => {
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) T.loadFile(f);
      });
      els.drop.addEventListener('click', () => { if (els.file) els.file.click(); });
    }
    if (els.btnListen) els.btnListen.addEventListener('click', listenLive);
    if (els.btnDownload) els.btnDownload.addEventListener('click', download);
    if (els.btnPrint) els.btnPrint.addEventListener('click', () => window.print());
    if (els.btnCopy) els.btnCopy.addEventListener('click', () => {
      if (!state.plan) return;
      const text = T.tabText(state.plan);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => { if (els.status) els.status.textContent = 'Tab sheet copied to the clipboard ✓'; });
      else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); if (els.status) els.status.textContent = 'Tab sheet copied ✓'; }
    });
    if (els.btnMetro) els.btnMetro.addEventListener('click', () => {
      const bpm = state.bpm || 100;
      if (TT.metronome) { TT.metronome.setBpm(bpm); TT.metronome.start(); TT.app.showView('metronome'); TT.app.toast('Metronome at ' + bpm + ' BPM for this song'); }
    });
    if (els.keySelect) {
      TT.chords.KEYS.forEach(k => {
        const o = document.createElement('option');
        o.value = k.name + '|' + k.mode; o.textContent = k.name + ' ' + k.mode;
        els.keySelect.appendChild(o);
      });
      els.keySelect.addEventListener('change', () => {
        const parts = (els.keySelect.value || 'C|major').split('|');
        state.key = parts[0]; state.mode = parts[1];
        state.plan = T.plan({
          key: state.key, mode: state.mode,
          chords: state.plan ? state.plan.detected.map(d => d.name) : [],
          bars: state.plan ? state.plan.bars : [], tempo: state.bpm || 0,
          title: state.title, artist: state.artist
        });
        if (els.plan) { els.planHost.hidden = false; T.renderPlan(els.plan, state.plan); }
        T.updateTabSheet();
        if (els.status) els.status.textContent = 'Key set by hand to ' + state.key + ' ' + state.mode + '.';
      });
    }
    if (els.bpmInput) {
      els.bpmInput.value = '';
      els.bpmInput.addEventListener('change', () => {
        const v = Math.max(30, Math.min(280, Math.round(+els.bpmInput.value || 0)));
        if (!v) return;
        state.bpm = v;
        if (state.plan) {
          state.plan.bars = TT.dsp.toBars(state.result.chords || [], v);
          state.plan.bpm = v;
          state.plan.strum = strumFor(v);
          if (els.chart) {
            els.chart.innerHTML = '';
            els.chart.appendChild(el('div', 'card-h small', 'Chord chart — one bar per box'));
            els.chart.appendChild(barRow(state.plan.bars, state.plan.transpose || 0));
          }
          if (els.plan) T.renderPlan(els.plan, state.plan);
          T.updateTabSheet();
        }
      });
    }
    if (els.title) els.title.addEventListener('change', () => { state.title = els.title.value; if (state.plan) { state.plan.title = state.title; T.updateTabSheet(); } });
    renderHistory();
    T.updateTabSheet();
  };

  window.TT = window.TT || {};
  window.TT.tablab = T;
})();
