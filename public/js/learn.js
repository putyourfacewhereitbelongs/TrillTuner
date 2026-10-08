/* Trill Tuner — Learning tools: structured lessons (beginner → advanced),
 * playable chord library, ear-training game, practice tracker. */
(function () {
  'use strict';
  const N = window.TT.notes;
  const STD_MIDI = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4

  /* ===================== practice tracker ===================== */
  const P = { _acc: 0 };
  function todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  P.addSeconds = function (secs) {
    P._acc += secs;
    if (P._acc >= 30) { // commit at most ~ every 30s of practice
      const mins = Math.max(1, Math.round(P._acc / 60));
      const days = TT.store.get('practice', {});
      days[todayKey()] = (days[todayKey()] || 0) + mins;
      TT.store.set('practice', days);
      P._acc = 0;
      renderPractice();
    }
  };
  function renderPractice() {
    const days = TT.store.get('practice', {});
    const today = days[todayKey()] || 0;
    let week = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      week += days[k] || 0;
    }
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (days[k]) streak++; else if (i > 0) break;
    }
    const html = `🔥 Practiced <b>${today} min</b> today · <b>${week} min</b> this week · <b>${streak}-day</b> streak`;
    const a = document.getElementById('practice-strip');
    const b = document.getElementById('practice-stats');
    if (a) a.innerHTML = html;
    if (b) b.innerHTML = html;
  }

  /* ===================== chord library ===================== */
  const CHORDS = [
    { name: 'E', cat: 'Open', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    { name: 'Em', cat: 'Open', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    { name: 'Am', cat: 'Open', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    { name: 'A', cat: 'Open', frets: [-1, 0, 2, 2, 2, 0] },
    { name: 'C', cat: 'Open', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    { name: 'G', cat: 'Open', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
    { name: 'D', cat: 'Open', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    { name: 'Dm', cat: 'Open', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    { name: 'E7', cat: 'Open', frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
    { name: 'A7', cat: 'Open', frets: [-1, 0, 2, 0, 2, 0] },
    { name: 'Em7', cat: 'Open', frets: [0, 2, 0, 0, 0, 0] },
    { name: 'Am7', cat: 'Open', frets: [-1, 0, 2, 0, 1, 0] },
    { name: 'Dsus4', cat: 'Open', frets: [-1, -1, 0, 2, 3, 3] },
    { name: 'Cadd9', cat: 'Open', frets: [-1, 3, 2, 0, 3, 3] },
    { name: 'Cmaj7', cat: 'Open', frets: [-1, 3, 2, 0, 0, 0] },
    { name: 'F', cat: 'Barre', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
    { name: 'Bm', cat: 'Barre', frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1] },
    { name: 'F#m', cat: 'Barre', frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1] },
    { name: 'B7', cat: 'Barre', frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
    { name: 'E5', cat: 'Power', frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 3, 0, 0, 0] },
    { name: 'A5', cat: 'Power', frets: [-1, 0, 2, 2, -1, -1] },
    { name: 'G5', cat: 'Power', frets: [3, 5, 5, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
    { name: 'D5', cat: 'Power', frets: [-1, -1, 0, 2, 3, -1] }
  ];

  function chordSVG(ch) {
    const W = 150, H = 196, x0 = 24, x1 = 138, nx = 6, dx = (x1 - x0) / (nx - 1);
    const y0 = 40, fh = 28, rows = 5;
    const played = ch.frets.filter(f => f > 0);
    const minF = played.length ? Math.min.apply(null, played) : 0;
    const maxF = played.length ? Math.max.apply(null, played) : 0;
    const base = Math.max(1, Math.min(minF || 1, Math.max(1, maxF - 4)));
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chord-svg">`;
    for (let i = 0; i < nx; i++) s += `<line class="c-str" x1="${x0 + i * dx}" y1="${y0}" x2="${x0 + i * dx}" y2="${y0 + rows * fh}"/>`;
    for (let r = 0; r <= rows; r++) {
      const nut = r === 0 && base === 1;
      s += `<line class="${nut ? 'c-nut' : 'c-fret'}" x1="${x0}" y1="${y0 + r * fh}" x2="${x1}" y2="${y0 + r * fh}"/>`;
    }
    if (base > 1) s += `<text class="c-base" x="${x0 - 16}" y="${y0 + fh / 2 + 4}">${base}fr</text>`;
    ch.frets.forEach((f, i) => {
      const x = x0 + i * dx;
      if (f < 0) s += `<text class="c-mute" x="${x}" y="${y0 - 12}">✕</text>`;
      else if (f === 0) s += `<circle class="c-open" cx="${x}" cy="${y0 - 14}" r="4.5"/>`;
      else {
        const r = f - base + 1;
        const y = y0 + (r - 0.5) * fh;
        s += `<circle class="c-dot" cx="${x}" cy="${y}" r="9.5"/>`;
        if (ch.fingers && ch.fingers[i]) s += `<text class="c-fin" x="${x}" y="${y + 3.5}">${ch.fingers[i]}</text>`;
      }
    });
    s += `<text class="c-name" x="${W / 2}" y="${H - 8}">${ch.name}</text></svg>`;
    return s;
  }

  function playChord(ch) {
    TT.audio.ensure();
    const freqs = [];
    ch.frets.forEach((f, i) => { if (f >= 0) freqs.push(N.midiToFreq(STD_MIDI[i] + f)); });
    TT.audio.strum(freqs, 22, 0.75);
  }

  function renderChords(filter) {
    const grid = document.getElementById('chord-grid');
    grid.innerHTML = '';
    CHORDS.filter(ch => !filter || ch.name.toLowerCase().includes(filter) || ch.cat.toLowerCase().includes(filter))
      .forEach(ch => {
        const card = document.createElement('div');
        card.className = 'chord-card';
        card.innerHTML = chordSVG(ch) + `<button class="btn tiny">🔊 Hear it</button>`;
        card.querySelector('button').addEventListener('click', () => playChord(ch));
        grid.appendChild(card);
      });
    if (!grid.children.length) grid.innerHTML = '<p class="dim">No chords match that search.</p>';
  }

  /* ===================== lessons ===================== */
  const LESSONS = [
    { id: 'b1', level: 'beginner', stars: 1, mins: 5, title: 'Meet Your Guitar', summary: 'Parts, posture and how to hold a pick.', steps: [
      'Learn the parts: headstock (tuning pegs), neck & fretboard, body, sound hole or pickups, and the bridge.',
      'Sit up straight, guitar resting on your right leg (flip everything if you play left-handed), arm relaxed over the body.',
      'Hold the pick between thumb and index finger, tip pointing at the strings — firm, not tight.',
      'Rest your fretting thumb behind the neck, roughly opposite your fingers.',
      'Strum all six open strings with a loose wrist. Congratulations — that\'s an open strum, and you\'re officially playing!'
    ]},
    { id: 'b2', level: 'beginner', stars: 1, mins: 6, title: 'Tune Up Every Time', summary: 'A guitar out of tune teaches your ear the wrong things.', steps: [
      'Open the Tuner tab and start the mic — the waveform turns green when a string is in tune.',
      'Strum the low E string and let it ring. Watch the cents readout and the ▲/▼ arrows.',
      'If a string is far off, loosen it a little first, then tune up to pitch — tuning up keeps the string seated in the peg.',
      'New strings slip: tune, gently stretch each string, then tune again.',
      'You can also tune by ear — tap ▶ on any string chip to hear a reference tone and match it.'
    ], widgets: [{ type: 'link', view: 'tune', label: '🎸 Open the tuner' }]},
    { id: 'b3', level: 'beginner', stars: 1, mins: 8, title: 'Your First Chord: E Minor', summary: 'Two fingers, all six strings — the friendliest first chord.', steps: [
      'Finger 2 (middle) goes on the A string, fret 2. Finger 3 (ring) on the D string, fret 2.',
      'Curve your fingers so the G, B and high E strings can ring open.',
      'Press just behind the fret, not on top of it — you need less force and get a cleaner sound.',
      'Strum slowly from the low E to the high E. Every string should ring clearly.',
      'Lift off, shake out your hand, and do it again — ten clean reps beats fifty sloppy ones.'
    ], widgets: [{ type: 'chord', chord: 'Em' }]},
    { id: 'b4', level: 'beginner', stars: 1, mins: 10, title: 'Am & C: Your First Songs', summary: 'Am and C unlock hundreds of classic songs.', steps: [
      'Am: middle finger on the D string fret 2, ring finger on the G string fret 2, index on the B string fret 1.',
      'C: index on the B string fret 1, middle on the D string fret 2, ring on the A string fret 3.',
      'Practice the switch Am → C → Am → C slowly, moving fingers as one shape, not one at a time.',
      'Say the chord name out loud as you land it — it builds the mental map.',
      'Goal: 20 clean switches without stopping.'
    ], widgets: [{ type: 'chord', chord: 'Am' }, { type: 'chord', chord: 'C' }]},
    { id: 'b5', level: 'beginner', stars: 2, mins: 12, title: 'Strumming Patterns', summary: 'Downs, ups and the groove that makes it music.', steps: [
      'Count out loud: "1 and 2 and 3 and 4 and". Downs land on numbers, ups on the "and"s.',
      'Pattern 1 — all downs on every count: steady like a metronome.',
      'Pattern 2 — D D U D U D U: keep the wrist loose, like shaking water off your hand.',
      'Pattern 3 — D DU UDU: the classic pop strum. Mute lightly with your palm between accents for groove.',
      'Practice with the metronome at 60 BPM, then push to 80 when it feels easy.'
    ], widgets: [{ type: 'metronome', bpm: 60 }, { type: 'chord', chord: 'Em' }]},
    { id: 'b6', level: 'beginner', stars: 2, mins: 10, title: 'One-Minute Changes', summary: 'The fastest proven way to smooth chord changes.', steps: [
      'Pick two chords — Em → Am is a perfect start.',
      'Start a 60-second timer and count how many clean changes you can make.',
      'Slow down until every change is clean — speed comes from smoothness, not effort.',
      'Write down your number. Beat it next session. 60 changes a minute is pro territory.',
      'Rotate pairs each day: Am→C, C→G, G→D…'
    ], widgets: [{ type: 'metronome', bpm: 80 }]},
    { id: 'i1', level: 'intermediate', stars: 2, mins: 15, title: 'Power Chords', summary: 'Two fingers. Infinite rock.', steps: [
      'E5: index finger on the A string, fret 2 — that\'s your root (B).',
      'Add your ring finger on the D string, fret 4. Mute the unused strings with your palm and fretting-hand touch.',
      'Slide the whole shape up and down the neck: same shape, new root, new chord.',
      'Fatten it up with your pinky on the same fret as the ring finger, one string up (the octave).',
      'Palm-mute and chug on E5 with the metronome at 100 BPM — that\'s the sound of a thousand rock songs.'
    ], widgets: [{ type: 'chord', chord: 'E5' }, { type: 'chord', chord: 'A5' }, { type: 'chord', chord: 'G5' }]},
    { id: 'i2', level: 'intermediate', stars: 2, mins: 15, title: 'The Minor Pentatonic', summary: 'The 5-note scale behind most solos you love.', steps: [
      'E minor pentatonic, position 1: E–G–A–B–D. Frets per string (low to high): 0/3, 0/2/2, 0/2/2, 0/2, 0/3.',
      'Play it up and down with one note per metronome click. Start at 70 BPM.',
      'Now improvise: any note, any order, any rhythm — over an Em groove nothing in this scale sounds wrong.',
      'Add vibrato on long notes. Bend the G (fret 5, B string) up a whole step to an A.',
      'Five minutes of scale + five of improvisation daily beats an hour of noodling.'
    ], widgets: [{ type: 'metronome', bpm: 70 }]},
    { id: 'i3', level: 'intermediate', stars: 3, mins: 20, title: 'Barre Chords: F & Bm', summary: 'The gateway to playing any chord anywhere.', steps: [
      'Lay your index finger flat behind the fret, rolled slightly toward its bony edge.',
      'F major: barre fret 1 (all strings), middle finger on G string fret 2, ring and pinky on A/D strings fret 3.',
      'Bm: barre fret 2, then add the Am shape on top with your remaining fingers.',
      'Buzzing? Press closer to the fret, pull your elbow in, and let the weight of your arm help.',
      'Barres tire everyone at first — five focused minutes a day beats an hour of pain.'
    ], widgets: [{ type: 'chord', chord: 'F' }, { type: 'chord', chord: 'Bm' }]},
    { id: 'i4', level: 'intermediate', stars: 2, mins: 15, title: 'Fingerpicking Foundations', summary: 'Thumb and three fingers — a whole band in one hand.', steps: [
      'Assignments: thumb → E/A/D strings, index → G, middle → B, ring → high E.',
      'Pattern "p i m a m i" on an Em chord: thumb-index-middle-ring-middle-index, round and round.',
      'Keep it deadly slow and robotically even — the groove IS the skill.',
      'Try it over Am and C next. Then try thumb alternating between E and A strings.',
      '"Dust in the Wind" and "Hallelujah" live right here.'
    ], widgets: [{ type: 'metronome', bpm: 60 }, { type: 'chord', chord: 'Em' }]},
    { id: 'i5', level: 'intermediate', stars: 2, mins: 10, title: 'Ear Training: Major vs Minor', summary: 'Major sounds happy. Minor sounds moody. That\'s most of it.', steps: [
      'Play a random major or minor chord in the Ear Trainer and guess before looking.',
      'Major = bright, resolved, happy. Minor = darker, serious, a little sad.',
      'Attach songs you know to each sound to lock it in.',
      'Five minutes a day — your ear is the ultimate shortcut for learning songs by ear.',
      'Hit 10 in a row and level up to the note-naming modes.'
    ], widgets: [{ type: 'ear', mode: 'majmin' }]},
    { id: 'a1', level: 'advanced', stars: 3, mins: 20, title: 'Bending & Vibrato', summary: 'The two techniques that make a note sing.', steps: [
      'Bend with your wrist and forearm — rotate like turning a doorknob — not by cramming your fingers.',
      'Target practice: play the high E string fret 10. Then bend fret 8 up until it matches. That\'s a whole step.',
      'Check yourself with the tuner: bend until the readout is +200¢ — a perfect whole step, verified.',
      'Vibrato = tiny rhythmic bends. Wide and slow for blues, tight and fast for rock.',
      'Always bend to a target note in the scale, never "somewhere up there".'
    ], widgets: [{ type: 'link', view: 'tune', label: '🎸 Check bends in the tuner' }]},
    { id: 'a2', level: 'advanced', stars: 3, mins: 20, title: 'Alternate Picking Speed', summary: 'Down-up discipline — clean speed for life.', steps: [
      'Strict down-up-down-up, starting on a downstroke, on a single string with the metronome at 100 BPM (eighths).',
      'Switch to sixteenths at 60 BPM. Every note attacks at the click or exactly between clicks.',
      'Push the tempo +5 BPM per day only when the previous tempo is completely clean.',
      'Move through a scale position, then across string pairs — string changes are where it gets real.',
      'Speed without timing is noise. The metronome is the judge.'
    ], widgets: [{ type: 'metronome', bpm: 100 }]},
    { id: 'a3', level: 'advanced', stars: 3, mins: 25, title: 'Modes & Improvisation', summary: 'Same notes, new moods — the theory that frees you.', steps: [
      'Modes are the major scale starting on different degrees: same notes, different center of gravity.',
      'Ionian = major (bright). Dorian = minor with a lifted 6th (cool, jazzy). Mixolydian = major with a flat 7 (classic rock).',
      'Loop Am – G – F – G and solo using C major notes (all white keys) — you\'ll feel Dorian\'s mood appear.',
      'Learn the fretboard in octaves, not just box shapes, so your ear — not the shape — picks the next note.',
      'End practice by improvising for 5 minutes with no plan. That\'s where the theory becomes music.'
    ], widgets: [{ type: 'metronome', bpm: 90 }]},
    { id: 'a4', level: 'advanced', stars: 3, mins: 15, title: 'Ear Training Pro: All 12 Notes', summary: 'Name any note you hear — the final superpower.', steps: [
      'Use a reference you always carry: the open E string\'s sound, or middle C.',
      'In the chromatic mode, hum the note, find it relative to your reference, then answer.',
      'Aim for 10 in a row. Then try naming notes from songs you know ("that\'s a G…").',
      'Ten focused minutes a day. This skill compounds for the rest of your life.'
    ], widgets: [{ type: 'ear', mode: 'chrom' }]}
  ];

  function stars(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

  function renderWidget(w) {
    const wrap = document.createElement('div');
    wrap.className = 'widget';
    if (w.type === 'chord') {
      const ch = CHORDS.find(c => c.name === w.chord);
      if (ch) {
        wrap.className = 'widget chord-widget';
        wrap.innerHTML = chordSVG(ch) + `<button class="btn tiny">🔊 Strum it</button>`;
        wrap.querySelector('button').addEventListener('click', () => playChord(ch));
      }
    } else if (w.type === 'metronome') {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = '⏱ Practice at ' + w.bpm + ' BPM';
      b.addEventListener('click', () => {
        TT.app.showView('metronome');
        TT.metronome.launch(w.bpm);
        TT.app.assist('Metronome set to ' + w.bpm + ' BPM and started for your practice.');
      });
      wrap.appendChild(b);
    } else if (w.type === 'link') {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = w.label;
      b.addEventListener('click', () => TT.app.showView(w.view));
      wrap.appendChild(b);
    } else if (w.type === 'ear') {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = '👂 Launch ear training';
      b.addEventListener('click', () => {
        document.querySelector('#learn-tabs .tab[data-tab="ear"]').click();
        const sel = document.getElementById('ear-mode');
        if (sel) sel.value = w.mode;
        TT.ear && TT.ear.newRound(true);
      });
      wrap.appendChild(b);
    }
    return wrap;
  }

  function doneIds() { return TT.store.get('lessonsDone', []); }

  function renderLessons(level) {
    const pane = document.getElementById('tab-' + level);
    if (!pane) return;
    const list = pane.querySelector('.lesson-list');
    list.innerHTML = '';
    LESSONS.filter(l => l.level === level).forEach(l => {
      const card = document.createElement('div');
      card.className = 'lesson' + (doneIds().includes(l.id) ? ' done' : '');
      const head = document.createElement('div');
      head.className = 'lesson-head';
      head.innerHTML =
        `<div><div class="lesson-title">${l.title} ${doneIds().includes(l.id) ? '<span class="done-mark">✓</span>' : ''}</div>` +
        `<div class="lesson-meta">${l.mins} min · <span class="stars">${stars(l.stars)}</span></div></div>`;
      card.appendChild(head);
      const p = document.createElement('p');
      p.className = 'lesson-sum';
      p.textContent = l.summary;
      card.appendChild(p);
      const ol = document.createElement('ol');
      l.steps.forEach(s => { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
      card.appendChild(ol);
      if (l.widgets && l.widgets.length) {
        const row = document.createElement('div');
        row.className = 'widget-row';
        l.widgets.forEach(w => row.appendChild(renderWidget(w)));
        card.appendChild(row);
      }
      const btn = document.createElement('button');
      const isDone = doneIds().includes(l.id);
      btn.className = 'btn ' + (isDone ? 'btn-ghost' : 'btn-primary');
      btn.textContent = isDone ? '✓ Completed — undo' : 'Mark complete';
      btn.addEventListener('click', () => {
        let d = doneIds();
        if (d.includes(l.id)) d = d.filter(x => x !== l.id);
        else { d.push(l.id); TT.app.toast('Lesson complete! 🎉'); }
        TT.store.set('lessonsDone', d);
        renderLessons(level);
        updateProgress();
      });
      card.appendChild(btn);
      list.appendChild(card);
    });
    updateProgress();
  }

  function updateProgress() {
    const d = doneIds().length;
    const pct = Math.round(d / LESSONS.length * 100);
    document.getElementById('learn-progress').style.width = pct + '%';
    document.getElementById('learn-progress-text').textContent = pct + '% (' + d + '/' + LESSONS.length + ')';
  }

  /* ===================== ear training ===================== */
  const EAR = { score: 0, streak: 0, best: 0, answer: null, noteMidi: null };

  const EAR_SETS = {
    open: { label: 'Open strings (easy)', notes: [40, 45, 50, 55, 59, 64] },
    cmaj: { label: 'C major scale (medium)', notes: [60, 62, 64, 65, 67, 69, 71, 72] },
    chrom: { label: 'All 12 notes (hard)', notes: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71] },
    majmin: { label: 'Major vs minor (medium)', chords: true }
  };

  function playEarNote() {
    TT.audio.ensure();
    if (EAR_SETS[currentEarMode].chords) {
      const root = 40 + Math.floor(Math.random() * 8); // E2..B2
      const isMaj = Math.random() < 0.5;
      const triad = isMaj ? [0, 4, 7] : [0, 3, 7];
      EAR.answer = isMaj ? 'Major' : 'Minor';
      TT.audio.strum(triad.map(i => N.midiToFreq(root + i)), 30, 0.75);
    } else {
      const set = EAR_SETS[currentEarMode].notes;
      EAR.noteMidi = set[Math.floor(Math.random() * set.length)];
      EAR.answer = N.SHARP[((EAR.noteMidi % 12) + 12) % 12];
      TT.audio.pluck(N.midiToFreq(EAR.noteMidi), 0, 0.85);
    }
  }

  function renderAnswers() {
    const wrap = document.getElementById('ear-answers');
    wrap.innerHTML = '';
    let opts;
    if (EAR_SETS[currentEarMode].chords) opts = ['Major', 'Minor'];
    else opts = [...new Set(EAR_SETS[currentEarMode].notes.map(m => N.SHARP[((m % 12) + 12) % 12]))];
    opts.forEach(o => {
      const b = document.createElement('button');
      b.className = 'btn ear-btn';
      b.textContent = o;
      b.addEventListener('click', () => answerEar(o, b));
      wrap.appendChild(b);
    });
  }

  function answerEar(guess, btn) {
    if (!EAR.answer) return;
    const fb = document.getElementById('ear-feedback');
    if (guess === EAR.answer) {
      EAR.score++; EAR.streak++;
      if (EAR.streak > EAR.best) { EAR.best = EAR.streak; TT.store.set('earBest', { mode: currentEarMode, best: EAR.best }); }
      btn.classList.add('right');
      fb.textContent = '✓ Correct!';
      fb.className = 'ear-feedback ok';
      setTimeout(() => { if (EAR.streak) newRound(); }, 900);
    } else {
      EAR.streak = 0;
      btn.classList.add('wrong');
      fb.textContent = '✗ It was ' + EAR.answer;
      fb.className = 'ear-feedback bad';
      document.querySelectorAll('.ear-btn').forEach(b => {
        if (b.textContent === EAR.answer) b.classList.add('right');
      });
      setTimeout(() => { playEarNote(); renderAnswers(); }, 1200);
    }
    document.getElementById('ear-score').textContent = EAR.score;
    document.getElementById('ear-streak').textContent = EAR.streak;
    document.getElementById('ear-best').textContent = EAR.best;
  }

  let currentEarMode = 'open';

  function newRound(quiet) {
    const fb = document.getElementById('ear-feedback');
    if (fb) { fb.textContent = quiet ? 'Hit “Play note” when you\'re ready.' : ''; fb.className = 'ear-feedback'; }
    EAR.answer = null;
    renderAnswers();
    updateEarStats();
  }
  function updateEarStats() {
    document.getElementById('ear-score').textContent = EAR.score;
    document.getElementById('ear-streak').textContent = EAR.streak;
    document.getElementById('ear-best').textContent = EAR.best;
  }

  function initEar() {
    const sel = document.getElementById('ear-mode');
    const saved = TT.store.get('earMode', 'open');
    sel.value = saved;
    currentEarMode = saved;
    const best = TT.store.get('earBest', {});
    EAR.best = (best && best.mode === currentEarMode) ? best.best : 0;
    sel.addEventListener('change', () => {
      currentEarMode = sel.value;
      TT.store.set('earMode', currentEarMode);
      const b = TT.store.get('earBest', {});
      EAR.best = (b && b.mode === currentEarMode) ? b.best : 0;
      EAR.streak = 0;
      newRound(true);
    });
    document.getElementById('ear-play').addEventListener('click', () => { playEarNote(); });
    document.getElementById('ear-repeat').addEventListener('click', () => { if (EAR.answer || EAR.noteMidi) playEarNote(); });
    newRound(true);
  }

  /* ===================== init ===================== */
  window.TT.ear = { newRound: newRound };

  window.TT.learn = {
    init: function () {
      const tabs = document.getElementById('learn-tabs');
      tabs.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
        tabs.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const pane = t.dataset.tab;
        document.querySelectorAll('#view-learn .tabpane').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-' + pane).classList.add('active');
        if (pane === 'chords') renderChords(document.getElementById('chord-search').value.trim().toLowerCase());
      }));
      document.getElementById('chord-search').addEventListener('input', e => renderChords(e.target.value.trim().toLowerCase()));
      ['beginner', 'intermediate', 'advanced'].forEach(renderLessons);
      renderChords('');
      initEar();
      renderPractice();
    },
    renderPractice: renderPractice
  };

  window.TT = window.TT || {};
  window.TT.practice = P;
})();
