/* Trill Tuner — My stuff: favourites and the practice plan.
 *
 * Everything the app knows about you in one place: the songs you starred, the
 * rigs and tunings you keep coming back to, the takes and stems and analyses you
 * ran, and a plan builder that turns those favourites into a session you can run
 * right now — each step of the plan is a button that actually starts the step.
 *
 * Persisted in the same local store as the rest of the app (store keys
 * favSongs / favRigs / favTunings), so it survives a reload with no account.
 */
(function () {
  'use strict';

  const M = {};
  const els = {};
  const state = { plan: null, pick: '' };

  const el = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = () => window.TT.store;

  function get(key, dflt) {
    try { return store().get(key, dflt == null ? [] : dflt); } catch (e) { return dflt == null ? [] : dflt; }
  }
  function set(key, v) {
    try { store().set(key, v); } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* favourites                                                          */
  /* ------------------------------------------------------------------ */
  M.favSongs = () => get('favSongs', []).slice();
  M.toggleSong = id => {
    let f = M.favSongs();
    if (f.indexOf(id) >= 0) f = f.filter(x => x !== id);
    else f.unshift(id);
    set('favSongs', f.slice(0, 60));
    render();
    return f.indexOf(id) >= 0;
  };
  M.isFav = id => M.favSongs().indexOf(id) >= 0;

  M.favRigs = () => get('favRigs', []).slice();
  M.saveRig = (name, ids, ampId) => {
    let f = M.favRigs().filter(x => x.name !== name);
    f.unshift({ name: name, ids: ids || [], amp: ampId || '', at: Date.now() });
    set('favRigs', f.slice(0, 30));
    render();
  };

  M.favTunings = () => get('favTunings', []).slice();
  M.toggleTuning = (id, name) => {
    let f = M.favTunings();
    if (f.some(t => t.id === id)) f = f.filter(t => t.id !== id);
    else f.unshift({ id: id, name: name, at: Date.now() });
    set('favTunings', f.slice(0, 24));
    render();
  };

  /* ------------------------------------------------------------------ */
  /* activity                                                            */
  /* ------------------------------------------------------------------ */
  function activity() {
    const out = [];
    const tab = get('tabHistory', []);
    tab.slice(0, 4).forEach(t => out.push({ kind: 'chart', when: t.at, text: 'Tab maker read “' + (t.title || t.name || 'a song') + '”' + (t.key ? ' — ' + t.key : '') }));
    const stems = get('stemHistory', []);
    stems.slice(0, 4).forEach(s => out.push({ kind: 'stem', when: s.at, text: 'Stem lab: ' + (s.mode || 'separation') + ' on ' + (s.name || s.title || 'a file') + (s.remove ? ' (removed)' : ' (isolated)') }));
    const takes = get('practice', null);
    const best = get('listenerBest', null);
    if (best) out.push({ kind: 'listener', when: best.at, text: 'Listener best: ' + (best.streak || 0) + ' in a row' + (best.accuracy != null ? ' · ' + best.accuracy + '% right' : '') });
    const done = get('lessonsDone', []);
    if (done.length) out.push({ kind: 'learn', when: 0, text: done.length + ' lesson' + (done.length === 1 ? '' : 's') + ' completed' });
    const used = get('tuningsUsed', []);
    if (used.length) out.push({ kind: 'tuning', when: 0, text: used.length + ' tuning' + (used.length === 1 ? '' : 's') + ' tried' });
    const favs = get('lyricsFavs', []);
    if (favs.length) out.push({ kind: 'lyrics', when: favs[0].at, text: favs.length + ' favourite lyric' + (favs.length === 1 ? '' : 's') + ' saved' });
    const badges = get('badges', []);
    if (badges.length) out.push({ kind: 'badges', when: 0, text: badges.length + ' progress badges earned' });
    if (takes) out.push({ kind: 'practice', when: 0, text: 'practice history stored' });
    return out.filter(x => x.text).slice(0, 10);
  }

  function when(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /* ------------------------------------------------------------------ */
  /* the plan builder                                                    */
  /* ------------------------------------------------------------------ */
  const TEMPO_STEPS = [0.7, 0.85, 1.0];

  function hardOf(list) {
    return list.slice().sort((a, b) => (b.level || 1) - (a.level || 1))[0];
  }

  function buildPlan(mins) {
    const minutes = mins || 20;
    const songs = M.favSongs().map(id => TT.catalog.songById(id)).filter(Boolean);
    const steps = [];
    const tuning = M.favTunings()[0];
    const drills = (TT.practiceTools && TT.practiceTools.DRILLS) || [];

    steps.push({
      title: 'Tune up',
      detail: tuning ? 'Switch to ' + tuning.name + ' and get every string green before you play a note.' : 'Get every string green in the tuner — a guitar that is 10 cents out trains your ear wrong.',
      mins: 2,
      run: () => {
        if (tuning && TT.tuner && TT.tuner.setPreset) TT.tuner.setPreset(tuning.id);
        if (TT.app) TT.app.showView('tune');
      },
      label: tuning ? '🎸 Tune to ' + tuning.name : '🎸 Open the tuner'
    });

    if (drills.length) {
      const hardest = songs.length ? hardOf(songs) : null;
      const drill = drills.filter(d => (hardest && hardest.level >= 4 ? d.level === 'advanced' : hardest && hardest.level === 3 ? d.level === 'intermediate' : d.level === 'beginner'))[0] || drills[0];
      steps.push({
        title: 'Warm up: ' + drill.name,
        detail: drill.goal + ' ' + drill.how,
        mins: Math.max(3, drill.mins || 5),
        run: () => {
          if (TT.metronome && TT.metronome.launch) TT.metronome.launch(drill.bpm);
          if (TT.app) TT.app.showView('learn');
          const tab = document.querySelector('#learn-tabs .tab[data-tab="drills"]');
          if (tab) tab.click();
        },
        label: '🏋 Start the drill at ' + drill.bpm + ' BPM'
      });
    }

    songs.slice(0, 3).forEach((s, i) => {
      const pct = Math.round(TEMPO_STEPS[Math.min(i, TEMPO_STEPS.length - 1)] * 100);
      const bpm = Math.max(40, Math.round(s.bpm * (pct / 100)));
      steps.push({
        title: s.title + ' — ' + pct + '%',
        detail: 'Capo ' + (s.capo || 0) + ' · ' + s.chords.join(' ') + ' · ' + s.notes.slice(0, 140) + (s.notes.length > 140 ? '…' : ''),
        mins: 4,
        run: () => {
          if (TT.metronome && TT.metronome.setBpm) TT.metronome.setBpm(bpm);
          if (TT.tablab && TT.tablab.openSong) TT.tablab.openSong(s);
          if (TT.app) TT.app.showView('maker');
        },
        label: '🎸 Play ' + s.title + ' at ' + bpm + ' BPM'
      });
    });

    const song = songs[0];
    steps.push({
      title: 'Play it into the Listener',
      detail: song
        ? 'The listener scores you against the chords of ' + song.title + ': it confirms every right note and names every wrong one, so you hear the mistake in the moment instead of later.'
        : 'The listener scores your playing live against a scale or a set of chords.',
      mins: 4,
      run: () => {
        if (TT.app) TT.app.showView('listening');
        const sel = document.getElementById('ls-source');
        if (sel) {
          sel.value = song ? 'song' : 'free';
          if (song) {
            const pick = document.getElementById('ls-song');
            if (pick) pick.value = song.id;
          }
          sel.dispatchEvent(new window.Event('change', { bubbles: true }));
        }
      },
      label: '🎧 Start listening'
    });

    steps.push({
      title: 'Record one clean pass',
      detail: 'Record it, listen back with headphones on, and note the one bar that falls apart. That bar is tomorrow\'s warm-up.',
      mins: 3,
      run: () => {
        if (TT.app) TT.app.showView('record');
        const b = document.getElementById('btn-record');
        if (b) b.focus();
      },
      label: '⏺ Open the recorder'
    });

    /* fit the plan to the requested length */
    const wanted = minutes;
    let total = steps.reduce((n, s) => n + s.mins, 0);
    let trimmed = steps.slice();
    while (total > wanted + 2 && trimmed.length > 3) {
      total -= trimmed[trimmed.length - 2].mins;      /* drop the middle song first */
      trimmed.splice(trimmed.length - 2, 1);
    }
    return { steps: trimmed, total: trimmed.reduce((n, s) => n + s.mins, 0), minutes: wanted };
  }

  /* ------------------------------------------------------------------ */
  /* rendering                                                           */
  /* ------------------------------------------------------------------ */
  function render() {
    renderSongs();
    renderRigs();
    renderTunings();
    renderActivity();
    renderPlan();
  }

  function renderSongs() {
    if (!els.songs) return;
    const list = M.favSongs().map(id => TT.catalog.songById(id)).filter(Boolean);
    els.songs.innerHTML = '';
    if (!list.length) {
      els.songs.innerHTML = '<div class="dim">No favourite songs yet — search the songbook and hit ★ Star, or pick one below.</div>';
    }
    list.forEach(s => {
      const d = document.createElement('div');
      d.className = 'mine-row';
      d.innerHTML = '<div class="mine-main"><b>' + esc(s.title) + '</b> <span class="dim smallish">' + esc(s.artist) + ' · ' + esc(s.key) + ' · ' + s.bpm + ' BPM · ' + esc(s.chords.join(' ')) + '</span></div>';
      const b1 = document.createElement('button');
      b1.className = 'btn btn-ghost tiny'; b1.type = 'button'; b1.textContent = '🎸 Chart';
      b1.addEventListener('click', () => { if (TT.tablab) TT.tablab.openSong(s); if (TT.app) TT.app.showView('maker'); });
      const b2 = document.createElement('button');
      b2.className = 'btn btn-ghost tiny'; b2.type = 'button'; b2.textContent = '★';
      b2.title = 'Remove from favourites';
      b2.addEventListener('click', () => M.toggleSong(s.id));
      d.appendChild(b1); d.appendChild(b2);
      els.songs.appendChild(d);
    });
    /* the picker: search the book and star something */
    if (els.pick) {
      const q = state.pick.trim();
      const res = q ? TT.catalog.search(q, { cap: 8 }) : { songs: TT.catalog.SONGS.slice(0, 8) };
      els.pick.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'mine-pick';
      box.innerHTML = '<div class="card-h small">Add a song — ' + (q ? res.songs.length + ' match “' + esc(q) + '”' : 'popular picks') + '</div>';
      res.songs.slice(0, 8).forEach(s => {
        const b = document.createElement('button');
        b.className = 'chip';
        b.type = 'button';
        b.textContent = (M.isFav(s.id) ? '★ ' : '☆ ') + s.title;
        b.addEventListener('click', () => M.toggleSong(s.id));
        box.appendChild(b);
      });
      els.pick.appendChild(box);
    }
  }

  function renderRigs() {
    if (!els.rigs) return;
    const list = M.favRigs();
    els.rigs.innerHTML = '';
    if (!list.length) {
      els.rigs.innerHTML = '<div class="dim">No saved rigs yet. In the Rig view, load a genre recipe you like and hit “Save this rig”.</div>';
    }
    list.forEach(r => {
      const d = document.createElement('div');
      d.className = 'mine-row';
      d.innerHTML = '<div class="mine-main"><b>' + esc(r.name) + '</b> <span class="dim smallish">' + (r.ids || []).length + ' pedal' + ((r.ids || []).length === 1 ? '' : 's') +
        (r.amp ? ' · ' + esc(r.amp) : '') + (r.at ? ' · saved ' + when(r.at) : '') + '</span></div>';
      const b1 = document.createElement('button');
      b1.className = 'btn btn-ghost tiny'; b1.type = 'button'; b1.textContent = '🔊 Load';
      b1.addEventListener('click', () => {
        const recipes = (TT.rig && TT.rig.recipes && TT.rig.recipes()) || [];
        const rec = recipes.filter(x => x.name === r.name)[0];
        if (rec && TT.rig.loadRecipe) { TT.rig.loadRecipe(rec); if (TT.app) TT.app.showView('rig'); }
        else if (TT.rig && TT.rig.loadSaved) { TT.rig.loadSaved(r); }
        else if (TT.app) TT.app.toast('That rig was saved from the Rig view — open the Rig tab to load it.');
      });
      const b2 = document.createElement('button');
      b2.className = 'btn btn-ghost tiny'; b2.type = 'button'; b2.textContent = '✕';
      b2.title = 'Forget this rig';
      b2.addEventListener('click', () => {
        set('favRigs', M.favRigs().filter(x => x.name !== r.name));
        render();
      });
      d.appendChild(b1); d.appendChild(b2);
      els.rigs.appendChild(d);
    });
  }

  function renderTunings() {
    if (!els.tunings) return;
    const list = M.favTunings();
    els.tunings.innerHTML = '';
    if (!list.length) {
      els.tunings.innerHTML = '<div class="dim">Star the tunings you actually use — then “Tune up” in the plan goes straight to them.</div>';
    }
    list.forEach(t => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.textContent = '★ ' + t.name;
      b.title = 'Tune to ' + t.name;
      b.addEventListener('click', () => {
        if (TT.tuner && TT.tuner.setPreset) TT.tuner.setPreset(t.id);
        if (TT.app) TT.app.showView('tune');
      });
      els.tunings.appendChild(b);
    });
    /* quick adds: the tunings you have already used */
    const used = get('tuningsUsed', []);
    if (used.length && els.tuningPick) {
      els.tuningPick.innerHTML = '';
      used.slice(0, 10).forEach(id => {
        const t = TT.tunings.byId(id);
        if (!t || list.some(x => x.id === id)) return;
        const b = document.createElement('button');
        b.className = 'chip';
        b.type = 'button';
        b.textContent = '☆ ' + t.name;
        b.addEventListener('click', () => M.toggleTuning(t.id, t.name));
        els.tuningPick.appendChild(b);
      });
    }
  }

  function renderActivity() {
    if (!els.activity) return;
    const list = activity();
    els.activity.innerHTML = list.length
      ? list.map(a => '<div class="mine-act"><span class="mine-kind">' + esc(a.kind) + '</span><span>' + esc(a.text) + '</span><span class="dim smallish">' + esc(when(a.when)) + '</span></div>').join('')
      : '<div class="dim">Nothing yet — run a separation, read a song in the tab maker or take a listener round and it will show up here.</div>';
  }

  function renderPlan() {
    if (!els.plan) return;
    const plan = state.plan;
    if (!plan) {
      els.plan.innerHTML = '<div class="dim">Build a session from your favourites: pick a length and the app lays out what to do, in order, with a button for every step.</div>';
      return;
    }
    els.plan.innerHTML = '<div class="mine-plan-head"><b>' + plan.total + ' minute session</b><span class="dim smallish">' + plan.steps.length + ' steps · built from your favourites and history</span></div>' +
      '<ol class="mine-steps">' + plan.steps.map((s, i) =>
        '<li class="mine-step"><div><b>' + esc(s.title) + '</b> <span class="pill">' + s.mins + ' min</span>' +
        '<div class="dim smallish">' + esc(s.detail) + '</div></div>' +
        '<button class="btn btn-primary tiny" type="button" data-step="' + i + '">' + esc(s.label || 'Start') + '</button></li>').join('') + '</ol>';
    els.plan.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
      const s = plan.steps[+b.dataset.step];
      if (s) s.run();
    }));
  }

  M.init = function () {
    if (M._ready) return;
    M._ready = true;
    els.songs = el('mine-songs');
    els.pick = el('mine-pick');
    els.pickQ = el('mine-pick-q');
    els.rigs = el('mine-rigs');
    els.tunings = el('mine-tunings');
    els.tuningPick = el('mine-tuning-pick');
    els.activity = el('mine-activity');
    els.plan = el('mine-plan');
    els.status = el('mine-status');

    if (els.pickQ) els.pickQ.addEventListener('input', () => { state.pick = els.pickQ.value; renderSongs(); });

    const saveRig = el('mine-save-rig');
    if (saveRig) saveRig.addEventListener('click', () => {
      let rig = null;
      try { rig = TT.rig && TT.rig.getState ? TT.rig.getState() : null; } catch (e) {}
      const ampId = rig && rig.ampId;
      const ids = rig && (rig.pedals || []).map(p => p.id).filter(Boolean);
      const recipes = (TT.rig && TT.rig.recipes && TT.rig.recipes()) || [];
      const match = recipes.filter(r => r.amp === ampId && (r.pedals || []).every(p => (ids || []).indexOf(p) >= 0))[0];
      const name = match ? match.name : ((ampId || 'current') + ' rig · ' + (ids || []).length + ' pedals');
      M.saveRig(name, ids || [], ampId || '');
      if (els.status) els.status.textContent = 'Saved “' + name + '” to your rigs ✓';
    });

    try {
      TT.store.set('minePlans', (TT.store.get('minePlans', 0) || 0) + 1);
      if (TT.share && TT.share.checkBadges) TT.share.checkBadges(true);
    } catch (e) {}

    /* the plan length buttons */
    document.querySelectorAll('#mine-plan-pick [data-mins]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('#mine-plan-pick .btn').forEach(x => x.classList.remove('btn-primary'));
      b.classList.add('btn-primary');
      state.plan = buildPlan(+b.dataset.mins);
      renderPlan();
    }));
    const seed = document.querySelector('#mine-plan-pick [data-mins]');
    if (seed) { seed.classList.add('btn-primary'); state.plan = buildPlan(+seed.dataset.mins); }

    render();
  };

  M.buildPlan = buildPlan;
  M.plan = () => state.plan;
  M.render = render;
  M.activity = activity;
  window.TT = window.TT || {};
  window.TT.mine = M;
})();
