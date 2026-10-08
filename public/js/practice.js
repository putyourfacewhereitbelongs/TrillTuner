/* Trill Tuner — Practice suite.
 *
 *   · Technique drills with a tempo ladder and a running timer
 *   · Session builder — a 15, 30 or 45 minute routine laid out for you
 *   · Riff player — tab rendered on screen and played back through the
 *     karplus-strong engine, at any tempo, looped
 *   · Rhythm trainer — tap along and see your error in milliseconds
 *   · Interval trainer — the ear skill that unlocks everything else
 *
 * Everything records into the same practice log as the lessons and the
 * metronome, so the Progress page shows the whole story.
 */
(function () {
  'use strict';

  const PT = {};
  const els = {};
  const state = {};        /* tiny persisted UI state (riff tempo, …) */
  let timer = null;

  /* =================================================================== */
  /* data                                                                 */
  /* =================================================================== */
  const DRILLS = [
    { id: 'spider', name: 'Spider walk (1-2-3-4 across strings)', level: 'beginner', mins: 5, bpm: 60, ladder: [60, 70, 80, 90, 100, 110, 120],
      goal: 'Even, independent fingers and a clean sound on every note.',
      how: 'Fret 1-2-3-4 on the low E, then move up one string, keeping the same pattern. Alternate your pick down-up on every note.',
      tab: 'e|-----------------|\nB|-----------------|\nG|-----------------|\nD|-----------------|\nA|-----------------|\nE|-1-2-3-4---------|' },
    { id: 'chromatic', name: 'Chromatic 1-2-3-4 (climb and descend)', level: 'beginner', mins: 6, bpm: 70, ladder: [70, 80, 90, 100, 110, 120, 130],
      goal: 'Synchronise both hands: one pick stroke per fretting finger.',
      how: 'Play 1-2-3-4 up each string 1-6, then back down 4-3-2-1 without stopping.',
      tab: 'e|-1-2-3-4-|\nB|-1-2-3-4-|\nG|-1-2-3-4-|\nD|-1-2-3-4-|\nA|-1-2-3-4-|\nE|-1-2-3-4-|' },
    { id: 'alternate', name: 'Alternate picking on one string', level: 'beginner', mins: 5, bpm: 80, ladder: [80, 90, 100, 110, 120, 140, 160],
      goal: 'A pick stroke that never gets stuck — the foundation of speed.',
      how: 'Play eight notes per click, strict down-up. If the pick catches, slow down 10 BPM and stay there for a full pass.',
      tab: 'e|-----------------------------------|\nB|-----------------------------------|\nG|-----------------------------------|\nD|-----------------------------------|\nA|-----------------------------------|\nE|-0-0-0-0-0-0-0-0-------------------|' },
    { id: 'legato', name: 'Legato: hammer-ons and pull-offs', level: 'intermediate', mins: 6, bpm: 70, ladder: [70, 80, 90, 100, 110, 120],
      goal: 'A smooth, singing line with no pick noise — the Satriani/Gilmour sound.',
      how: 'Play the first note, then hammer and pull for the rest. Aim for equal volume on every note.',
      tab: 'e|-----------------------------------|\nB|-----------------------------------|\nG|-----------------------------------|\nD|-7h9h7p5h7p5-----------------------|\nA|---------------------------|\nE|---------------------------|' },
    { id: 'skipping', name: 'String skipping', level: 'intermediate', mins: 6, bpm: 60, ladder: [60, 70, 80, 90, 100, 110],
      goal: 'Accuracy across strings — the Paul Gilbert trick that makes solos sound wide.',
      how: 'Jump between the low E and the D, then A and G, keeping every note clean.',
      tab: 'e|-----------------------------------|\nB|-----------------------------------|\nG|-------------------5-7-5-----------|\nD|-----------5-7-5---------7-5-------|\nA|-5-7-5-----------------------------|\nE|-------7-5-------------------------|' },
    { id: 'sweep', name: 'Three-string sweep arpeggio', level: 'advanced', mins: 7, bpm: 50, ladder: [50, 60, 70, 80, 90, 100],
      goal: 'One note at a time, a new note per pick stroke — the neo-classical sound.',
      how: 'Downstroke across three strings, then hammer the top note and pull back up. Roll your fretting fingers; do not let notes ring together.',
      tab: 'e|-----------------12-|\nB|-------------12------|\nG|---------12----------|\nD|-----12--------------|\nA|-12------------------|\nE|---------------------|' },
    { id: 'bends', name: 'Bend accuracy (in tune or bust)', level: 'intermediate', mins: 6, bpm: 60, ladder: [60, 70, 80],
      goal: 'Bend to pitch — the difference between a solo and a noise.',
      how: 'Bend the 7th fret of the G string up a whole tone to match the 9th fret. Play both notes: the bend must match exactly.',
      tab: 'e|-----------------------------------|\nB|-----------------------------------|\nG|-7b9---9----7b9---9----------------|\nD|-----------------------------------|\nA|-----------------------------------|\nE|-----------------------------------|' },
    { id: 'vibrato', name: 'Vibrato control', level: 'intermediate', mins: 5, bpm: 50, ladder: [50, 60, 70, 80],
      goal: 'A wide, even, singing vibrato — the most recognisable part of your sound.',
      how: 'Hold a note and vibrate from the wrist, not the finger. Count four vibrations per click, then six.',
      tab: 'e|-----------------------------------|\nB|-12~~~~~---------------------------|\nG|-----------------------------------|\nD|-----------------------------------|\nA|-----------------------------------|\nE|-----------------------------------|' },
    { id: 'tapping', name: 'Two-hand tapping', level: 'advanced', mins: 7, bpm: 60, ladder: [60, 70, 80, 90, 100, 110],
      goal: 'Even volume between both hands — the Van Halen trick.',
      how: 'Tap the 12th fret with your picking hand, hammer and pull with the left. Keep the volume the same on every note.',
      tab: 'e|-12-t-9-t-7-t-9-t-12-|\nB|----------------------|\nG|----------------------|\nD|----------------------|\nA|----------------------|\nE|----------------------|' }
  ];

  const ROUTINES = {
    15: { name: 'Focused 15', steps: [['warmup', 3], ['spider', 3], ['rhythm', 3], ['chords', 3], ['repertoire', 3]] },
    30: { name: 'Standard 30', steps: [['warmup', 5], ['spider', 5], ['bends', 5], ['rhythm', 5], ['chords', 5], ['repertoire', 5]] },
    45: { name: 'Serious 45', steps: [['warmup', 5], ['spider', 5], ['alternate', 5], ['legato', 5], ['bends', 5], ['vibrato', 5], ['rhythm', 5], ['chords', 5], ['repertoire', 5]] }
  };
  const ROUTINE_LABELS = {
    warmup: ['Warm-up', 'Play something easy you enjoy — no metronome, no judgement.'],
    chords: ['Chords', 'One progression, four chords, changes on the click. Speed will come.'],
    repertoire: ['Repertoire', 'Learn a song or riff by heart — the Riff player has tabs if you need one.'],
    rhythm: ['Rhythm trainer', 'Tap along in the Rhythm tab and chase a lower error number.']
  };

  /* Riffs: notes are [string (6..1), fret, beat] with beat in eighth notes */
  const RIFFS = [
    { id: 'chug', name: 'Drop-D power chug', tuning: 'dropd', bpm: 100, level: 'beginner',
      desc: 'Palm-muted open power chords in Drop D. The foundation of every rock riff.',
      notes: [[6, 0, 0], [6, 0, 0.5], [6, 0, 1], [6, 0, 1.5], [6, 0, 2], [6, 0, 2.5], [6, 3, 3], [6, 3, 3.5], [6, 0, 4], [6, 0, 4.5], [6, 5, 5], [6, 5, 5.5], [6, 3, 6], [6, 3, 6.5], [6, 0, 7], [6, 0, 7.5]] },
    { id: 'blues-a', name: 'Blues shuffle in A', tuning: 'standard', bpm: 90, level: 'beginner',
      desc: 'The two-note shuffle that has launched a million blues jams.',
      notes: [[5, 0, 0], [4, 2, 0.5], [5, 0, 1], [4, 2, 1.5], [5, 0, 2], [4, 2, 2.5], [5, 0, 3], [4, 2, 3.5],
      [5, 0, 4], [4, 4, 4.5], [5, 0, 5], [4, 4, 5.5], [5, 0, 6], [4, 2, 6.5], [5, 0, 7], [4, 2, 7.5]] },
    { id: 'penta-run', name: 'A minor pentatonic run', tuning: 'standard', bpm: 90, level: 'beginner',
      desc: 'Position 1, ascending — the first lead line everybody learns.',
      notes: [[6, 5, 0], [6, 8, 0.5], [5, 5, 1], [5, 7, 1.5], [4, 5, 2], [4, 7, 2.5], [3, 5, 3], [3, 7, 3.5],
      [2, 5, 4], [2, 8, 4.5], [1, 5, 5], [1, 8, 5.5], [2, 8, 6], [2, 5, 6.5], [3, 7, 7], [3, 5, 7.5]] },
    { id: 'riff-teen', name: 'Garage-rock riff (open power chords)', tuning: 'standard', bpm: 110, level: 'beginner',
      desc: 'Two chords, eight hits — the punk/garage staple.',
      notes: [[6, 0, 0], [6, 0, 0.5], [5, 2, 1], [5, 2, 1.5], [6, 0, 2], [6, 0, 2.5], [5, 2, 3], [5, 2, 3.5],
      [6, 3, 4], [6, 3, 4.5], [5, 5, 5], [5, 5, 5.5], [6, 0, 6], [6, 0, 6.5], [6, 0, 7], [6, 0, 7.5]] },
    { id: 'blackdog', name: 'Classic-rock bend phrase', tuning: 'standard', bpm: 80, level: 'intermediate',
      desc: 'Bend, release and a double stop — the vocabulary of 70s rock.',
      notes: [[3, 7, 0], [3, 9, 1], [3, 7, 1.5], [3, 9, 2], [3, 9, 3], [3, 7, 4], [5, 5, 4.5], [4, 7, 5], [4, 5, 5.5], [5, 7, 6], [6, 5, 7]] },
    { id: 'funk16', name: 'Funk 16th strum (single-note)', tuning: 'standard', bpm: 100, level: 'intermediate',
      desc: 'A 16th-note pattern with muted scratches — the core of funk guitar.',
      notes: [[4, 5, 0], [4, 7, 0.25], [4, 5, 0.5], [4, 5, 0.75], [4, 7, 1], [4, 7, 1.25], [4, 5, 1.5], [4, 5, 2],
      [4, 5, 2.25], [4, 7, 2.5], [4, 5, 2.75], [4, 7, 3], [4, 5, 3.5], [4, 5, 3.75]] },
    { id: 'reggae', name: 'Reggae skank (upstrokes)', tuning: 'standard', bpm: 76, level: 'beginner',
      desc: 'Chords on the off-beats and nothing on the down — the whole reggae feel.',
      notes: [[4, 7, 0.5], [3, 7, 0.5], [4, 7, 1.5], [3, 7, 1.5], [4, 7, 2.5], [3, 7, 2.5], [4, 7, 3.5], [3, 7, 3.5],
      [4, 5, 4.5], [3, 5, 4.5], [4, 5, 5.5], [3, 5, 5.5], [4, 5, 6.5], [3, 5, 6.5], [4, 5, 7.5], [3, 5, 7.5]] },
    { id: 'gallop', name: 'Gallop rhythm (Drop C style)', tuning: 'dropc', bpm: 120, level: 'intermediate',
      desc: 'The Iron Maiden gallop — three quick notes followed by a longer one.',
      notes: [[6, 0, 0], [6, 0, 0.25], [6, 0, 0.5], [6, 0, 1], [6, 0, 1.5], [6, 0, 1.75], [6, 0, 2], [6, 0, 2.5],
      [6, 5, 3], [6, 5, 3.25], [6, 5, 3.5], [6, 5, 4], [6, 3, 4.5], [6, 3, 4.75], [6, 3, 5], [6, 3, 5.5], [6, 0, 6], [6, 0, 6.5], [6, 0, 7], [6, 0, 7.5]] },
    { id: 'tap-hook', name: 'Tapping hook', tuning: 'standard', bpm: 92, level: 'advanced',
      desc: 'A two-hand tapping pattern — the sound of 80s rock.',
      notes: [[1, 12, 0], [1, 9, 0.25], [1, 7, 0.5], [1, 9, 0.75], [1, 12, 1], [1, 9, 1.25], [1, 7, 1.5], [1, 5, 1.75],
      [1, 12, 2], [1, 9, 2.25], [1, 7, 2.5], [1, 9, 2.75], [1, 12, 3], [1, 14, 3.25], [1, 12, 3.5], [1, 9, 3.75]] },
    { id: 'jazz251', name: 'Jazz ii–V–I with drop-2 shapes', tuning: 'standard', bpm: 70, level: 'advanced',
      desc: 'The most common chord movement in jazz, played on the top four strings.',
      notes: [[4, 5, 0], [3, 5, 0], [2, 5, 0], [1, 7, 0], [4, 4, 2], [3, 4, 2], [2, 4, 2], [1, 6, 2],
      [4, 3, 4], [3, 4, 4], [2, 4, 4], [1, 6, 4], [4, 2, 6], [3, 2, 6], [2, 3, 6], [1, 4, 6]] },
    { id: 'travis', name: 'Travis picking (fingerstyle)', tuning: 'standard', bpm: 80, level: 'intermediate',
      desc: 'Alternating bass with a melody on top — the folk fingerpicking foundation.',
      notes: [[6, 0, 0], [4, 2, 0.5], [5, 2, 1], [3, 2, 1.5], [6, 0, 2], [4, 2, 2.5], [5, 2, 3], [3, 2, 3.5],
      [6, 0, 4], [4, 2, 4.5], [5, 2, 5], [4, 4, 5.5], [6, 0, 6], [4, 2, 6.5], [5, 2, 7], [3, 5, 7.5]] },
    { id: 'spanish', name: 'Phrygian flamenco phrase', tuning: 'standard', bpm: 96, level: 'advanced',
      desc: 'E Phrygian with a tremolo finish — the Spanish sound.',
      notes: [[1, 0, 0], [1, 1, 0.5], [1, 4, 1], [1, 1, 1.5], [1, 0, 2], [1, 1, 2.5], [1, 4, 3], [1, 5, 3.5],
      [1, 12, 4], [1, 12, 4.25], [1, 12, 4.5], [1, 12, 4.75], [1, 12, 5], [1, 12, 5.25], [1, 12, 5.5], [1, 12, 5.75]] }
  ];

  const RHYTHM_PATTERNS = [
    { id: 'quarters', name: 'Quarter notes (1 2 3 4)', hits: [0, 1, 2, 3] },
    { id: 'eighths', name: 'Eighth notes (1 & 2 & 3 & 4 &)', hits: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
    { id: 'offbeat', name: 'Off-beats (& of every beat)', hits: [0.5, 1.5, 2.5, 3.5] },
    { id: 'shuffle', name: 'Shuffle (swung eighths)', hits: [0, 0.66, 1, 1.66, 2, 2.66, 3, 3.66] },
    { id: 'sixteenths', name: 'Sixteenth notes (1 e & a 2 e & a…)', hits: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75] },
    { id: 'clave', name: 'Son clave 3-2', hits: [0, 1.5, 3, 4, 6] },
    { id: 'tresillo', name: 'Tresillo (3+3+2)', hits: [0, 1.5, 3] },
    { id: 'dembow', name: 'Dembow / reggaeton', hits: [0, 0.75, 1, 1.5, 2, 2.75, 3, 3.5] },
    { id: 'poly34', name: 'Three against four (hemiola)', hits: [0, 1.333, 2.666] }
  ];

  const INTERVALS = [
    { semis: 0, name: 'Unison (same note)' }, { semis: 1, name: 'Minor 2nd (Jaws)' },
    { semis: 2, name: 'Major 2nd (Happy Birthday)' }, { semis: 3, name: 'Minor 3rd (Smoke on the Water)' },
    { semis: 4, name: 'Major 3rd (While My Guitar Gently Weeps intro)' }, { semis: 5, name: 'Perfect 4th (Here Comes the Bride)' },
    { semis: 6, name: 'Tritone (The Simpsons)' }, { semis: 7, name: 'Perfect 5th (Twinkle Twinkle)' },
    { semis: 8, name: 'Minor 6th (The Entertainer)' }, { semis: 9, name: 'Major 6th (NBC chime)' },
    { semis: 10, name: 'Minor 7th (Star Trek theme)' }, { semis: 11, name: 'Major 7th (Take On Me chorus)' },
    { semis: 12, name: 'Octave (Somewhere Over the Rainbow)' }
  ];

  /* =================================================================== */
  /* helpers                                                              */
  /* =================================================================== */
  function el(id) { return document.getElementById(id); }
  function freqOf(midi) { return window.TT.notes.midiToFreq(midi, window.TT.tuner.state.a4 || 440); }
  function midiOf(stringNum, fret) {
    /* stringNum: 1 = high E. Post-it to the neck with string 6 as the lowest. */
    const p = window.TT.tunings.byId(window.TT.tuner.state.presetId);
    const view = p.strings.slice().reverse();      /* index 0 = low string (6) */
    const idx = 6 - stringNum;                     /* string 6 → 0 */
    const s = view[idx] || view[view.length - 1];
    /* use standard tuning if the current preset has a different string count */
    const std = [40, 45, 50, 55, 59, 64];          /* low E (6) … high E (1) */
    const base = s ? s.midi : std[idx];
    return base + fret;
  }
  function pluck(midi, when, gain) { window.TT.audio.pluck(freqOf(midi), when, gain == null ? 0.5 : gain); }
  function logPractice(seconds) { try { window.TT.practice.addSeconds(seconds); } catch (e) {} }
  function toast(m) { window.TT.app.toast(m); }

  /* =================================================================== */
  /* 1 — drills + timer                                                   */
  /* =================================================================== */
  function renderDrills() {
    els.drillList.innerHTML = DRILLS.map(d => `<div class="drill" data-drill="${d.id}">
        <div class="drill-head"><b>${d.name}</b><span class="badge lvl-${d.level}">${d.level}</span></div>
        <div class="drill-goal">${d.goal}</div>
        <div class="drill-meta">${d.mins} minutes · start at <b>${d.bpm} BPM</b> · ladder ${d.ladder.join(' → ')}</div>
        <div class="drill-how">${d.how}</div>
        <pre class="tab-pre">${d.tab}</pre>
        <div class="row-btns">
          <button class="btn tiny btn-primary" data-start="${d.id}">▶ Start ${d.mins} min</button>
          <button class="btn tiny" data-metro="${d.bpm}">⏱ ${d.bpm} BPM</button>
          <button class="btn tiny btn-ghost" data-next="${d.id}">Next tempo step</button>
        </div>
      </div>`).join('');
    els.drillList.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => {
      const d = DRILLS.find(x => x.id === b.dataset.start);
      startTimer(d.mins * 60, d.name);
      window.TT.metronome.launch(d.bpm);
      toast(`${d.name}: ${d.mins} minutes at ${d.bpm} BPM. Stay relaxed — speed follows accuracy.`);
    }));
    els.drillList.querySelectorAll('[data-metro]').forEach(b => b.addEventListener('click', () => window.TT.metronome.launch(+b.dataset.metro)));
    els.drillList.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => {
      const d = DRILLS.find(x => x.id === b.dataset.next);
      const cur = window.TT.metronome.state.bpm;
      const next = d.ladder.find(t => t > cur) || d.ladder[0];
      window.TT.metronome.launch(next);
      toast(`Tempo step: ${next} BPM (${d.name}). Two clean passes before you move again.`);
    }));
  }
  function startTimer(seconds, label) {
    if (timer) { clearInterval(timer.interval); timer = null; }
    const end = Date.now() + seconds * 1000;
    const started = Date.now();
    els.practiceTimer.classList.add('running');
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      const total = Math.floor((Date.now() - started) / 1000);
      els.practiceTimer.innerHTML = `<b>${label}</b> · ${m}:${String(s).padStart(2, '0')} left
        <span class="dim">(${Math.floor(total / 60)} min logged as you go)</span>
        <button class="btn tiny btn-ghost" id="timer-stop">■ Stop</button>`;
      const stopBtn = el('timer-stop');
      if (stopBtn) stopBtn.addEventListener('click', () => stopTimer(true));
      if (total > 0 && total % 30 === 0) logPractice(1);           /* log in 30-second batches */
      if (left <= 0) {
        stopTimer(true);
        window.TT.audio.chime('ok');
        toast(`⏰ ${label} done — great work. Progress saved.`);
        if (window.TT.share) window.TT.share.checkBadges();
        if (window.TT.learn.renderPractice) window.TT.learn.renderPractice();
      }
    };
    timer = { interval: setInterval(tick, 500), label: label };
    tick();
  }
  function stopTimer(log) {
    if (!timer) return;
    clearInterval(timer.interval);
    els.practiceTimer.classList.remove('running');
    els.practiceTimer.innerHTML = `Timer stopped — pick a drill or a session.`;
    timer = null;
  }

  /* =================================================================== */
  /* 2 — session builder                                                  */
  /* =================================================================== */
  function renderRoutine(mins) {
    const r = ROUTINES[mins];
    if (!r) return;
    const total = r.steps.reduce((n, s) => n + s[1], 0);
    els.routineOut.innerHTML = `<div class="routine">
      <div class="routine-head"><b>${r.name}</b> · ${total} minutes
        <button class="btn tiny btn-primary" id="routine-start">▶ Start this session</button></div>
      <ol class="routine-list">${r.steps.map(s => {
        const drill = DRILLS.find(d => d.id === s[0]);
        const lbl = ROUTINE_LABELS[s[0]];
        const name = drill ? drill.name : lbl[0];
        const detail = drill ? drill.goal : lbl[1];
        const bpm = drill ? drill.bpm : (s[0] === 'rhythm' ? 90 : 80);
        return `<li><b>${s[1]} min · ${name}</b><span>${detail}</span>
          ${drill ? `<pre class="tab-pre small">${drill.tab}</pre>` : ''}
          ${s[0] === 'rhythm' ? '<button class="btn tiny" data-goto-rhythm="1">Open the rhythm trainer</button>' : ''}
          ${s[0] === 'repertoire' ? '<button class="btn tiny" data-goto-tab="1">Open the riff player</button>' : ''}
          <button class="btn tiny btn-ghost" data-plan-metro="${bpm}">⏱ ${bpm} BPM</button></li>`;
      }).join('')}</ol></div>`;
    el('routine-start').addEventListener('click', () => {
      startTimer(total * 60, r.name);
      const first = DRILLS.find(d => d.id === r.steps[0][0]);
      window.TT.metronome.launch(first ? first.bpm : 80);
      toast(`${r.name} started — ${total} minutes. Everything you play is logged to your progress.`);
    });
    els.routineOut.querySelectorAll('[data-plan-metro]').forEach(b => b.addEventListener('click', () => window.TT.metronome.launch(+b.dataset.planMetro)));
    const gr = els.routineOut.querySelector('[data-goto-rhythm]');
    if (gr) gr.addEventListener('click', () => selectLearnTab('rhythm'));
    const gt = els.routineOut.querySelector('[data-goto-tab]');
    if (gt) gt.addEventListener('click', () => selectLearnTab('tab'));
  }
  function selectLearnTab(name) {
    const btn = document.querySelector(`#learn-tabs .tab[data-tab="${name}"]`);
    if (btn) btn.click();
  }

  /* =================================================================== */
  /* 3 — riff player with on-screen tab                                   */
  /* =================================================================== */
  let riffState = { playing: false, next: 0, timer: null, bpm: 90, loop: true, speed: 1 };

  function currentRiff() { return RIFFS.find(r => r.id === els.riffSelect.value) || RIFFS[0]; }

  function renderRiff() {
    const r = currentRiff();
    const tuning = window.TT.tunings.byId(r.tuning);
    els.riffSelect.innerHTML = RIFFS.map(x => `<option value="${x.id}">${x.name} — ${x.level}</option>`).join('');
    els.riffSelect.value = r.id;
    els.riffTuning.textContent = tuning.name;
    els.riffBpm.value = state.riffBpm || r.bpm;
    els.riffBpmOut.textContent = els.riffBpm.value;
    els.riffMeta.innerHTML = `<b>${r.name}</b> — ${r.desc} <span class="dim">· ${r.level} · ${r.notes.length} notes · needs <b>${tuning.name}</b></span>`;
    renderTab(r);
  }
  function renderTab(r, activeIdx) {
    /* round the notes up into a bar-per-line grid, 8 eighth-notes per line */
    const total = r.notes.reduce((m, n) => Math.max(m, n[2]), 0) + 1;
    const lines = Math.ceil(total / 8);
    const grid = [];
    r.notes.forEach((n, i) => {
      const line = Math.floor(n[2] / 8), col = Math.round((n[2] % 8) * 2);
      grid[line] = grid[line] || {};
      grid[line][col + '-' + (6 - n[0])] = { fret: n[1], idx: i };
    });
    let out = '';
    for (let s = 6; s >= 1; s--) {
      const name = ['E', 'A', 'D', 'G', 'B', 'e'][6 - s];
      for (let line = 0; line < lines; line++) {
        let str = (line === 0 ? name + '|' : ' |');
        for (let col = 0; col < 16; col++) {
          const cell = grid[line] && grid[line][col + '-' + s];
          if (cell) {
            const txt = String(cell.fret);
            str += `<span class="tab-note ${activeIdx === cell.idx ? 'on' : ''}" data-idx="${cell.idx}">${txt.length > 1 ? txt : '-' + txt}-</span>`;
            col++;
          } else str += '---';
        }
        str += '|';
        out += str + (line === lines - 1 && s === 1 ? '' : '\n');
      }
    }
    els.riffTab.innerHTML = `<pre class="tab-pre">${out}</pre>`;
  }
  function playRiff() {
    const r = currentRiff();
    if (riffState.playing) { stopRiff(); return; }
    riffState.playing = true;
    riffState.next = 0;
    riffState.bpm = +els.riffBpm.value;
    els.riffPlay.textContent = '■ Stop';
    scheduleRiff();
  }
  function stopRiff() {
    riffState.playing = false;
    if (riffState.timer) clearTimeout(riffState.timer);
    els.riffPlay.textContent = '▶ Play';
    renderTab(currentRiff());
  }
  function scheduleRiff() {
    if (!riffState.playing) return;
    const r = currentRiff();
    const beat = 60 / riffState.bpm / (riffState.speed || 1);
    const t0 = window.TT.audio.ctx ? window.TT.audio.ctx.currentTime + 0.08 : 0;
    if (!t0) return;
    const chunk = 8;
    let when = t0;
    const startIdx = riffState.next;
    for (let k = 0; k < chunk && startIdx + k < r.notes.length; k++) {
      const n = r.notes[startIdx + k];
      const at = t0 + n[2] * beat * 0.5;      /* beats are eighth-note units */
      pluck(midiOf(n[0], n[1]), at, 0.55);
    }
    /* highlight sweep (visual only, slightly behind the audio) */
    const hl = () => {
      if (!riffState.playing) return;
      const idx = riffState.next;
      renderTab(r, idx);
      riffState.next = Math.min(idx + chunk, r.notes.length);
      if (riffState.next >= r.notes.length) {
        if (els.riffLoop.checked) riffState.next = 0;
        else { stopRiff(); return; }
      }
      riffState.timer = setTimeout(() => { scheduleRiff(); }, chunk * beat * 0.5 * 1000);
    };
    riffState.timer = setTimeout(hl, chunk * beat * 0.5 * 1000);
  }

  /* =================================================================== */
  /* 4 — rhythm trainer                                                   */
  /* =================================================================== */
  const rhythm = { running: false, taps: [], errors: [], start: 0, pattern: null, bpm: 90 };
  function renderRhythmPatterns() {
    els.rhythmPattern.innerHTML = RHYTHM_PATTERNS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }
  function startRhythm() {
    if (rhythm.running) { stopRhythm(); return; }
    const pat = RHYTHM_PATTERNS.find(p => p.id === els.rhythmPattern.value) || RHYTHM_PATTERNS[0];
    rhythm.pattern = pat;
    rhythm.bpm = +els.rhythmBpm.value;
    rhythm.taps = []; rhythm.errors = [];
    window.TT.audio.ensure();
    rhythm.start = window.TT.audio.ctx.currentTime + 0.2;
    rhythm.running = true;
    els.rhythmStart.textContent = '■ Stop';
    els.rhythmPads.innerHTML = pat.hits.map((h, i) => `<div class="pad" data-i="${i}">${i + 1}</div>`).join('') +
      '<div class="dim tiny-hint">Watch the pads light up with the pattern — tap in time, anywhere on this panel (or press T).</div>';
    scheduleRhythmLoop();
  }
  function scheduleRhythmLoop() {
    if (!rhythm.running) return;
    const beat = 60 / rhythm.bpm;
    const pat = rhythm.pattern;
    const loopBeats = 4;
    const t = window.TT.audio.ctx.currentTime;
    if (rhythm.start < t) rhythm.start = t + 0.1;
    /* schedule the next two bars */
    for (let bar = 0; bar < 2; bar++) {
      const base = rhythm.start + beat * loopBeats * (rhythm.loopBar = (rhythm.loopBar || 0));
      pat.hits.forEach((h, i) => {
        const at = base + (h % loopBeats) * beat;
        window.TT.audio.click(at, h % 1 === 0 && h < 1, 0.7);
        const delay = (at - t) * 1000;
        if (delay >= 0) setTimeout(() => flashPad(i), delay);
      });
    }
    rhythm.loopBar += 2;
    rhythm.timer = setTimeout(scheduleRhythmLoop, beat * loopBeats * 1000);
  }
  function flashPad(i) {
    const p = els.rhythmPads.querySelector(`.pad[data-i="${i}"]`);
    if (!p) return;
    p.classList.add('lit');
    setTimeout(() => p.classList.remove('lit'), 110);
  }
  function stopRhythm() {
    rhythm.running = false;
    if (rhythm.timer) clearTimeout(rhythm.timer);
    els.rhythmStart.textContent = '▶ Start';
    rhythm.loopBar = 0;
  }
  function tapRhythm() {
    if (!rhythm.running) { toast('Hit “Start” first, then tap along with the pads.'); return; }
    const now = window.TT.audio.ctx.currentTime;
    const beat = 60 / rhythm.bpm;
    const rel = (now - rhythm.start) / beat;
    const hits = rhythm.pattern.hits;
    /* nearest expected hit within the loop */
    let best = null, bestD = 1e9;
    for (let bar = -1; bar <= 1; bar++) {
      hits.forEach(h => {
        const d = Math.abs(rel - (h + bar * 4));
        if (d < bestD) { bestD = d; best = h; }
      });
    }
    const errMs = bestD * beat * 1000;
    rhythm.errors.push(errMs);
    if (rhythm.errors.length > 8) rhythm.errors.shift();
    const avg = rhythm.errors.reduce((a, b) => a + b, 0) / rhythm.errors.length;
    const grade = avg < 20 ? '🏆 metronome-tight' : avg < 35 ? '🎯 solid groove' : avg < 55 ? '👍 getting there' : '🐢 listen to the click, not the pad';
    els.rhythmFeedback.innerHTML = `Last tap: <b>${errMs.toFixed(0)} ms</b> off · average of last ${rhythm.errors.length}: <b>${avg.toFixed(0)} ms</b> — ${grade}
      <div class="dim tiny-hint">Behind the beat is normal; the target is consistency, not perfection. Anything under 30 ms sounds tight.</div>`;
    const pad = els.rhythmPads.querySelector('.pad.lit') || els.rhythmPads.querySelector('.pad');
    if (pad) { pad.classList.add('tapped'); setTimeout(() => pad.classList.remove('tapped'), 90); }
    /* remember the best average for achievements */
    if (rhythm.errors.length >= 8) {
      try {
        const best = window.TT.store.get('rhythmBest', { ms: 999 });
        if (avg < best.ms) window.TT.store.set('rhythmBest', { ms: Math.round(avg), at: Date.now() });
      } catch (e) {}
    }
  }

  /* =================================================================== */
  /* 5 — interval trainer                                                 */
  /* =================================================================== */
  const iv = { score: 0, streak: 0, best: 0, cur: null, answered: false, harmonic: false };
  function renderIntervals() {
    els.intervalAnswers.innerHTML = INTERVALS.map(i => `<button class="btn tiny" data-semis="${i.semis}">${i.name}</button>`).join('');
    els.intervalAnswers.querySelectorAll('[data-semis]').forEach(b => b.addEventListener('click', () => answerInterval(+b.dataset.semis)));
    renderIntervalStats();
  }
  function renderIntervalStats() {
    els.intervalStats.innerHTML = `Score <b>${iv.score}</b> · Streak <b>${iv.streak}</b> · Best <b>${iv.best}</b>`;
  }
  function newInterval() {
    const low = 48 + Math.floor(Math.random() * 13);
    const semis = INTERVALS[Math.floor(Math.random() * INTERVALS.length)].semis;
    iv.cur = { low: low, semis: semis };
    iv.answered = false;
    const a = freqOf(low), b = freqOf(low + semis);
    if (iv.harmonic) window.TT.audio.strum([a, b], 0, 0.45);
    else {
      window.TT.audio.pluck(a, 0, 0.5);
      window.TT.audio.pluck(b, window.TT.audio.ctx.currentTime + 0.9, 0.5);
    }
    els.intervalFeedback.textContent = 'Listen… which interval was that?';
  }
  function answerInterval(semis) {
    if (!iv.cur || iv.answered) return;
    iv.answered = true;
    const correct = INTERVALS.find(i => i.semis === iv.cur.semis);
    if (semis === iv.cur.semis) {
      iv.score++; iv.streak++; iv.best = Math.max(iv.best, iv.streak);
      window.TT.audio.chime('ok');
      els.intervalFeedback.innerHTML = `✅ <b>Correct</b> — ${correct.name}. Streak: ${iv.streak}.`;
    } else {
      iv.streak = 0;
      const guess = INTERVALS.find(i => i.semis === semis);
      window.TT.audio.chime('click');
      els.intervalFeedback.innerHTML = `❌ It was <b>${correct.name}</b>, you picked ${guess ? guess.name : semis}. Play both again and sing them back.`;
    }
    try {
      const stored = window.TT.store.get('intervalBest', 0);
      if (iv.best > stored) window.TT.store.set('intervalBest', iv.best);
    } catch (e) {}
    renderIntervalStats();
    setTimeout(newInterval, 1400);
  }

  /* =================================================================== */
  /* init                                                                 */
  /* =================================================================== */
  PT.init = function () {
    els.drillList = el('drill-list');
    if (!els.drillList) return;
    els.practiceTimer = el('practice-timer');
    els.routineOut = el('routine-out');
    els.riffSelect = el('riff-select');
    els.riffTab = el('riff-tab');
    els.riffMeta = el('riff-meta');
    els.riffBpm = el('riff-bpm');
    els.riffBpmOut = el('riff-bpm-out');
    els.riffSpeed = el('riff-speed');
    els.riffSpeedOut = el('riff-speed-out');
    els.riffLoop = el('riff-loop');
    els.riffPlay = el('riff-play');
    els.riffTuning = el('riff-tuning');
    els.rhythmPattern = el('rhythm-pattern');
    els.rhythmBpm = el('rhythm-bpm');
    els.rhythmBpmOut = el('rhythm-bpm-out');
    els.rhythmStart = el('rhythm-start');
    els.rhythmTap = el('rhythm-tap');
    els.rhythmFeedback = el('rhythm-feedback');
    els.rhythmPads = el('rhythm-pads');
    els.intervalAnswers = el('interval-answers');
    els.intervalStats = el('interval-stats');
    els.intervalFeedback = el('interval-feedback');
    els.intervalHarmonic = el('interval-harmonic');
    try { state.riffBpm = window.TT.store.get('riffBpm', 90); } catch (e) {}

    renderDrills();
    renderRiff();
    renderRhythmPatterns();
    renderIntervals();
    document.querySelectorAll('#routine-pick [data-mins]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('#routine-pick .btn').forEach(x => x.classList.remove('btn-primary'));
      b.classList.add('btn-primary');
      renderRoutine(+b.dataset.mins);
    }));
    renderRoutine(15);

    els.riffSelect.addEventListener('change', () => { stopRiff(); renderRiff(); });
    els.riffBpm.addEventListener('input', () => {
      els.riffBpmOut.textContent = els.riffBpm.value;
      try { window.TT.store.set('riffBpm', +els.riffBpm.value); } catch (e) {}
      if (riffState.playing) { stopRiff(); playRiff(); }
    });
    els.riffSpeed.addEventListener('input', () => {
      riffState.speed = +els.riffSpeed.value / 100;
      els.riffSpeedOut.textContent = els.riffSpeed.value + '%';
    });
    els.riffPlay.addEventListener('click', playRiff);
    el('riff-metronome').addEventListener('click', () => {
      window.TT.metronome.launch(+els.riffBpm.value);
      toast('Metronome running at the riff tempo — play it yourself before you hear me play it.');
    });
    els.rhythmPattern.addEventListener('change', () => { if (rhythm.running) { stopRhythm(); startRhythm(); } });
    els.rhythmBpm.addEventListener('input', () => {
      els.rhythmBpmOut.textContent = els.rhythmBpm.value;
      rhythm.bpm = +els.rhythmBpm.value;
      if (rhythm.running) { stopRhythm(); startRhythm(); }
    });
    els.rhythmStart.addEventListener('click', startRhythm);
    els.rhythmTap.addEventListener('click', tapRhythm);
    document.addEventListener('keydown', e => {
      if ((e.key === 't' || e.key === 'T') && document.getElementById('view-learn').classList.contains('active')
        && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) {
        e.preventDefault(); tapRhythm();
      }
    });
    el('interval-play').addEventListener('click', newInterval);
    els.intervalHarmonic.addEventListener('change', () => { iv.harmonic = els.intervalHarmonic.checked; });
    try {
      iv.best = window.TT.store.get('intervalBest', 0);
      renderIntervalStats();
    } catch (e) {}
  };

  PT.DRILLS = DRILLS;
  PT.RIFFS = RIFFS;
  PT.INTERVALS = INTERVALS;
  PT.RHYTHM_PATTERNS = RHYTHM_PATTERNS;
  PT.stop = function () { stopRiff(); stopRhythm(); stopTimer(false); };
  window.TT = window.TT || {};
  window.TT.practiceTools = PT;
})();
