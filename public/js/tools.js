/* Trill Tuner — Tools: the advanced guitarist's toolkit.
 *
 *   · Scale & mode explorer  — every position on a real fretboard
 *   · Circle of fifths       — click any key to see its chords and signature
 *   · Chord builder          — 30+ chord types with auto-generated voicings
 *   · Fretboard trainer      — a game that teaches the whole neck
 *   · String tension         — physics-accurate lbs/kg for any set & tuning
 *   · Setup & specs          — relief, action, pickup height, fret positions
 *   · Capo & transpose       — what shapes to play, in any key
 *   · Pickups & mods         — how to change the sound of the instrument itself
 *
 * All state is remembered in TT.store under `tools`.
 */
(function () {
  'use strict';

  const N = window.TT.notes;
  const T = {};
  const els = {};
  let state = { root: 9, scale: 'major', chordRoot: 4, chordType: 'maj', gameMode: 'find', gameScore: 0, gameStreak: 0, gameBest: 0, gamePrompt: '', flats: false, capoKey: 0, capoPos: 0, scale: 'major' };

  /* =================================================================== */
  /* music theory data                                                    */
  /* =================================================================== */
  const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const DEGREE = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

  const SCALES = [
    { id: 'major', name: 'Major (Ionian)', steps: [0, 2, 4, 5, 7, 9, 11], desc: 'The parent scale of Western music. Bright, resolved, the sound of nursery rhymes and anthems.', use: 'Pop, folk, country, rock' },
    { id: 'dorian', name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10], desc: 'Minor with a raised 6th — cool, jazzy and optimistic rather than sad.', use: 'Jazz, funk, modal rock, Celtic' },
    { id: 'phrygian', name: 'Phrygian', steps: [0, 1, 3, 5, 7, 8, 10], desc: 'Minor with a ♭2 — the Spanish/flamenco bite.', use: 'Flamenco, metal, film music' },
    { id: 'lydian', name: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11], desc: 'Major with a ♯4 — dreamy, floating, cinematic.', use: 'Film scores, prog, Steve Vai' },
    { id: 'mixolydian', name: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10], desc: 'Major with a ♭7 — the dominant/rock sound. Lean on it over a blues in E.', use: 'Blues, rock, funk, folk' },
    { id: 'aeolian', name: 'Minor (Aeolian)', steps: [0, 2, 3, 5, 7, 8, 10], desc: 'The natural minor: the sad, powerful default minor scale.', use: 'Every genre' },
    { id: 'locrian', name: 'Locrian', steps: [0, 1, 3, 5, 6, 8, 10], desc: 'The unstable one: minor with a ♭5. Difficult, unsettling, great for metal riffs.', use: 'Metal, jazz, horror' },
    { id: 'penta-minor', name: 'Minor Pentatonic', steps: [0, 3, 5, 7, 10], desc: 'Five notes, no wrong choices — the first scale every rock player learns, and still the most useful.', use: 'Rock, blues, metal solos' },
    { id: 'penta-major', name: 'Major Pentatonic', steps: [0, 2, 4, 7, 9], desc: 'The country/sweet pentatonic. Fewer notes, more melody.', use: 'Country, pop, gospel' },
    { id: 'blues', name: 'Blues Scale', steps: [0, 3, 5, 6, 7, 10], desc: 'Minor pentatonic plus the ♭5 “blue note” that gives the blues its ache.', use: 'Blues, rock, jazz' },
    { id: 'harmonic-minor', name: 'Harmonic Minor', steps: [0, 2, 3, 5, 7, 8, 11], desc: 'Natural minor with a raised 7th — the classical/neo-classical sound with a huge dominant pull.', use: 'Neo-classical metal, classical' },
    { id: 'melodic-minor', name: 'Melodic Minor (jazz)', steps: [0, 2, 3, 5, 7, 9, 11], desc: 'Minor with raised 6 and 7 — smooth, sophisticated, the gateway to altered jazz vocabulary.', use: 'Jazz, fusion' },
    { id: 'phrygian-dominant', name: 'Phrygian Dominant', steps: [0, 1, 4, 5, 7, 8, 10], desc: 'Major 3rd with a ♭2 and ♭7 — the flamenco/exotic metal sound.', use: 'Flamenco, metal, Middle-Eastern' },
    { id: 'lydian-dominant', name: 'Lydian Dominant', steps: [0, 2, 4, 6, 7, 9, 10], desc: 'Major with ♯4 and ♭7 — the “Simpsons theme” scale; perfect over dominant chords.', use: 'Jazz, fusion' },
    { id: 'whole-tone', name: 'Whole Tone', steps: [0, 2, 4, 6, 8, 10], desc: 'All whole steps: dreamy, ambiguous, no home note.', use: 'Jazz, impressionist, film' },
    { id: 'dim-half', name: 'Diminished (half-whole)', steps: [0, 1, 3, 4, 6, 7, 9, 10], desc: 'Symmetrical tension scale — over dominant 7♭9 chords.', use: 'Jazz, metal' },
    { id: 'dim-whole', name: 'Diminished (whole-half)', steps: [0, 2, 3, 5, 6, 8, 9, 11], desc: 'Symmetrical: minor thirds stacked. The creepy diminished sound.', use: 'Classical, metal, film' },
    { id: 'altered', name: 'Altered (super locrian)', steps: [0, 1, 3, 4, 6, 8, 10], desc: 'Every note altered — the ultimate jazz tension over a V7.', use: 'Jazz fusion' },
    { id: 'hungarian', name: 'Hungarian Minor', steps: [0, 2, 3, 6, 7, 8, 11], desc: 'Minor with ♯4 and raised 7 — gypsy and metal flavour.', use: 'Romani, metal, film' },
    { id: 'hirajoshi', name: 'Hirajoshi (Japanese)', steps: [0, 2, 3, 7, 8], desc: 'The Japanese pentatonic: 1 2 ♭3 5 ♭6. Kabuki, koto and metal riffs.', use: 'Japanese traditional, metal' },
    { id: 'in-sen', name: 'In Sen (Japanese)', steps: [0, 1, 5, 7, 10], desc: 'A haunting, gamelan-adjacent pentatonic with a ♭2 and no 3rd.', use: 'Japanese traditional, ambient' },
    { id: 'egyptian', name: 'Egyptian (sus2 pentatonic)', steps: [0, 2, 5, 7, 10], desc: 'No 3rd — neither major nor minor. Sounds ancient and open.', use: 'World, film, rock riffs' },
    { id: 'kumoi', name: 'Kumoi', steps: [0, 2, 3, 7, 9], desc: 'Japanese pentatonic with a major 6th — sweet and melancholy.', use: 'Japanese traditional' },
    { id: 'augmented', name: 'Augmented', steps: [0, 3, 4, 7, 8, 11], desc: 'Symmetrical major 3rds — the dream/mystery chord scale.', use: 'Jazz, film' },
    { id: 'bebop-dominant', name: 'Bebop Dominant', steps: [0, 2, 4, 5, 7, 9, 10, 11], desc: 'Mixolydian plus a natural 7 — the bebop passing tone.', use: 'Bebop, jazz' },
    { id: 'dorian-b2', name: 'Dorian ♭2', steps: [0, 1, 3, 5, 7, 9, 10], desc: 'Dorian with a ♭2 — darker and more exotic.', use: 'Jazz, fusion' }
  ];

  const CHORD_TYPES = [
    { id: 'maj', name: 'Major', sym: '', steps: [0, 4, 7], desc: 'Root, major 3rd, perfect 5th — the happy default.' },
    { id: 'min', name: 'Minor', sym: 'm', steps: [0, 3, 7], desc: 'Root, minor 3rd, perfect 5th — the sad default.' },
    { id: '5', name: 'Power chord', sym: '5', steps: [0, 7], desc: 'Root + 5th. Neither major nor minor — the rock chord.' },
    { id: 'dim', name: 'Diminished', sym: 'dim', steps: [0, 3, 6], desc: 'Two minor 3rds — tense, unstable, wants to resolve.' },
    { id: 'aug', name: 'Augmented', sym: 'aug', steps: [0, 4, 8], desc: 'Two major 3rds — dreamy, unresolved.' },
    { id: 'sus2', name: 'Sus2', sym: 'sus2', steps: [0, 2, 7], desc: 'Third replaced by the 2nd — open and airy.' },
    { id: 'sus4', name: 'Sus4', sym: 'sus4', steps: [0, 5, 7], desc: 'Third replaced by the 4th — suspended, unresolved.' },
    { id: '6', name: 'Major 6', sym: '6', steps: [0, 4, 7, 9], desc: 'Sweet, vintage, jazzy-pop.' },
    { id: 'm6', name: 'Minor 6', sym: 'm6', steps: [0, 3, 7, 9], desc: 'Minor with a major 6th — sophisticated and noir.' },
    { id: 'maj7', name: 'Major 7', sym: 'maj7', steps: [0, 4, 7, 11], desc: 'Lush and dreamy — jazz, bossa, mellow pop.' },
    { id: '7', name: 'Dominant 7', sym: '7', steps: [0, 4, 7, 10], desc: 'The blues/rock 7th — wants to resolve down a 5th.' },
    { id: 'm7', name: 'Minor 7', sym: 'm7', steps: [0, 3, 7, 10], desc: 'Smooth and mellow — the most useful minor chord.' },
    { id: 'm7b5', name: 'Half diminished (m7♭5)', sym: 'm7♭5', steps: [0, 3, 6, 10], desc: 'The ii chord in minor keys; jazz tension.' },
    { id: 'dim7', name: 'Diminished 7', sym: 'dim7', steps: [0, 3, 6, 9], desc: 'Perfectly symmetrical tension — a stack of minor 3rds.' },
    { id: 'mMaj7', name: 'Minor major 7', sym: 'mMaj7', steps: [0, 3, 7, 11], desc: 'Minor with a major 7th — the James Bond chord.' },
    { id: 'aug7', name: 'Augmented 7', sym: '7♯5', steps: [0, 4, 8, 10], desc: 'Dominant with a raised 5th.' },
    { id: '9', name: 'Dominant 9', sym: '9', steps: [0, 4, 7, 10, 2], desc: 'Funk and soul in one chord.' },
    { id: 'maj9', name: 'Major 9', sym: 'maj9', steps: [0, 4, 7, 11, 2], desc: 'Gorgeous, sophisticated pop/jazz.' },
    { id: 'm9', name: 'Minor 9', sym: 'm9', steps: [0, 3, 7, 10, 2], desc: 'Neo-soul in a shape.' },
    { id: '7b9', name: 'Dominant 7♭9', sym: '7♭9', steps: [0, 4, 7, 10, 1], desc: 'The classic tension chord before a minor resolution.' },
    { id: '7s9', name: 'Dominant 7♯9', sym: '7♯9', steps: [0, 4, 7, 10, 3], desc: 'The “Hendrix” chord — both major and minor 3rd at once.' },
    { id: '13', name: 'Dominant 13', sym: '13', steps: [0, 4, 7, 10, 9], desc: 'Big, bluesy jazz-funk chord.' },
    { id: 'add9', name: 'Add 9', sym: 'add9', steps: [0, 4, 7, 2], desc: 'Major plus a 9th — shimmer without jazz complexity.' },
    { id: 'madd9', name: 'Minor add 9', sym: 'm(add9)', steps: [0, 3, 7, 2], desc: 'Minor with a 9th — pretty and slightly wistful.' },
    { id: '6add9', name: '6/9', sym: '6/9', steps: [0, 4, 7, 9, 2], desc: 'The “Steely Dan” chord — smooth and ambiguous.' },
    { id: 'sus4add9', name: 'Sus4 add9', sym: 'sus4add9', steps: [0, 5, 7, 2], desc: 'Wide open, folky, no 3rd.' },
    { id: '7sus4', name: 'Dominant 7 sus4', sym: '7sus4', steps: [0, 5, 7, 10], desc: 'The gospel/funk sus chord.' },
    { id: '11', name: 'Dominant 11', sym: '11', steps: [0, 4, 7, 10, 5], desc: 'A big, lazy dominant with the 4th stacked on top.' },
    { id: 'm11', name: 'Minor 11', sym: 'm11', steps: [0, 3, 7, 10, 5], desc: 'Soul, jazz, and a thousand intros.' },
    { id: 'maj7s11', name: 'Major 7♯11', sym: 'maj7♯11', steps: [0, 4, 7, 11, 6], desc: 'Lydian shimmer — film-score gorgeous.' },
    { id: '5addb6', name: 'Power ♭6 (metal)', sym: '5♭6', steps: [0, 7, 8], desc: 'Power chord with a ♭6 — the “doom” stab.' }
  ];

  /* =================================================================== */
  /* shared helpers                                                       */
  /* =================================================================== */
  function el(id) { return document.getElementById(id); }
  function label(pc) { return (state.flats ? FLAT : SHARP)[((pc % 12) + 12) % 12]; }
  function tuningStrings() {
    const p = window.TT.tunings.byId(window.TT.tuner.state.presetId);
    return p.strings.slice().reverse().map(s => s.midi); /* index 0 = high E */
  }
  function a4() { return window.TT.tuner.state.a4 || 440; }
  function playMidi(midis, spread) {
    const freqs = (Array.isArray(midis) ? midis : [midis]).map(m => N.midiToFreq(m, a4()));
    window.TT.audio.strum(freqs, spread == null ? 26 : spread, 0.5);
  }
  function save() {
    const s = { root: state.root, scale: state.scale, chordRoot: state.chordRoot, chordType: state.chordType, gameBest: state.gameBest, flats: state.flats, capoKey: state.capoKey, capoPos: state.capoPos };
    try { window.TT.store.set('tools', s); } catch (e) {}
  }
  function load() {
    try {
      const s = window.TT.store.get('tools', null);
      if (s) Object.assign(state, s);
    } catch (e) {}
  }

  /* ---------- fretboard SVG (horizontal, 0–15 frets) ---------- */
  const FRETS = 15;
  function fretboardSVG(opts) {
    opts = opts || {};
    const W = 940, H = 232, padL = 34, padR = 16, padT = 36, padB = 26;
    const bw = W - padL - padR, bh = H - padT - padB;
    const nStrings = 6;
    const sx = i => padL + (bw - 4) * i / (nStrings - 1);           /* string index 0 = low E (6th) */
    const sIndexMap = [0, 1, 2, 3, 4, 5];                            /* visual order: low→high */
    const lo = 0, hi = FRETS;
    const fx = f => padL + (bw * (f - lo) / (hi - lo));
    const fy = i => padT + bh * i / (nStrings - 1);
    let s = `<svg class="fb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;

    /* nut + frets + inlays */
    s += `<rect x="${padL - 4}" y="${padT}" width="4" height="${bh}" fill="currentColor" opacity=".8"/>`;
    for (let f = lo; f <= hi; f++) {
      const x = fx(f);
      s += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + bh}" stroke="currentColor" stroke-opacity="${f === 0 ? 0 : 0.25}" stroke-width="${f === 0 ? 3 : 1.4}"/>`;
      if (f > 0 && f % 12 !== 0) s += `<text class="fb-fret-num" x="${x + 1}" y="${H - 8}">${f}</text>`;
    }
    [3, 5, 7, 9, 15].forEach(f => {
      if (f <= hi) s += `<circle class="fb-inlay" cx="${fx(f)}" cy="${padT + bh / 2}" r="4.5"/>`;
    });
    s += `<circle class="fb-inlay" cx="${fx(12)}" cy="${padT + bh / 4}" r="4.5"/><circle class="fb-inlay" cx="${fx(12)}" cy="${padT + bh * 3 / 4}" r="4.5"/>`;

    /* strings (thicker for lower strings) */
    for (let i = 0; i < nStrings; i++) {
      const y = fy(i);
      s += `<line x1="${padL - 4}" y1="${y}" x2="${padL + bw}" y2="${y}" stroke="currentColor" stroke-opacity=".55" stroke-width="${3.2 - i * 0.42}"/>`;
      s += `<text class="fb-string-name" x="${padL - 30}" y="${y + 4}">${opts.stringLabels ? opts.stringLabels[i] : 'EADGBE'[i]}</text>`;
    }

    /* note dots */
    const steps = opts.steps || null;   /* pitch-class set to mark */
    const rootPc = opts.rootPc;
    const strings = opts.strings || tuningStrings();
    strings.slice().reverse().forEach((openMidi, visual) => {
      for (let f = 0; f <= FRETS; f++) {
        const midi = openMidi + f;
        const pc = ((midi % 12) + 12) % 12;
        const inSet = !steps || steps.indexOf(((pc - rootPc) % 12 + 12) % 12) !== -1;
        if (!inSet) continue;
        const x = f === 0 ? padL + 9 : fx(f) - (fx(f) - fx(f - 1)) / 2;
        const y = fy(visual);
        const isRoot = rootPc != null && pc === ((rootPc % 12) + 12) % 12;
        const lbl = opts.showNames === false ? '' : label(pc);
        s += `<g class="fb-dot ${isRoot ? 'root' : ''}" data-st="${visual}" data-f="${f}">
            <circle cx="${x}" cy="${y}" r="11"/>
            <text x="${x}" y="${y + 4}" text-anchor="middle">${lbl || (isRoot ? '1' : DEGREE[((pc - rootPc) % 12 + 12) % 12])}</text>
          </g>`;
      }
    });
    s += '</svg>';
    return s;
  }

  /* =================================================================== */
  /* 1 — scale & mode explorer                                            */
  /* =================================================================== */
  function renderScales() {
    const sc = SCALES.find(s => s.id === state.scale) || SCALES[0];
    els.scaleRoot.value = state.root;
    els.scaleType.value = state.scale;
    els.scaleFlats.checked = state.flats;
    els.scaleFretboard.innerHTML = fretboardSVG({ steps: sc.steps, rootPc: state.root, showNames: sc.steps.length <= 9 });
    const names = sc.steps.map(i => label((state.root + i) % 12));
    const degrees = sc.steps.map(i => DEGREE[i]);
    const sixth = (function () {
      /* relative major/minor helper */
      if (sc.id === 'major' || sc.id === 'aeolian') {
        const rel = sc.id === 'major' ? (state.root + 9) % 12 : (state.root + 3) % 12;
        return ` relative ${sc.id === 'major' ? 'minor' : 'major'}: <b>${label(rel)} ${sc.id === 'major' ? 'minor' : 'major'}</b>`;
      }
      return '';
    })();
    els.scaleInfo.innerHTML = `<div class="scale-head"><b>${label(state.root)} ${sc.name}</b>
        <button class="btn tiny" data-play-scale="1">🔊 Play scale</button></div>
      <div class="scale-notes">${names.map((n, i) => `<span class="chip-note ${degIndex(sc.steps[i])}">${n}<small>${degrees[i]}</small></span>`).join('')}</div>
      <div class="hint">${sc.desc} <b>Use it for:</b> ${sc.use}. Formula: <b>${degrees.join(' – ')}</b>.${sixth}</div>`;
    /* harmonised chords (triads + 7ths) */
    const degrees7 = sc.steps.map((_, i) => {
      const root = (state.root + sc.steps[i]) % 12;
      const third = (state.root + sc.steps[(i + 2) % sc.steps.length] + (i + 2 >= sc.steps.length ? 12 : 0)) % 12;
      const fifth = (state.root + sc.steps[(i + 4) % sc.steps.length] + (i + 4 >= sc.steps.length ? 12 : 0)) % 12;
      const seventh = sc.steps.length > 6 ? (state.root + sc.steps[(i + 6) % sc.steps.length] + (i + 6 >= sc.steps.length ? 12 : 0)) % 12 : null;
      const i2 = ((third - root) % 12 + 12) % 12, i4 = ((fifth - root) % 12 + 12) % 12, i6 = seventh == null ? null : ((seventh - root) % 12 + 12) % 12;
      let quality = i2 === 4 && i4 === 7 ? '' : i2 === 3 && i4 === 7 ? 'm' : i2 === 3 && i4 === 6 ? 'dim' : i2 === 4 && i4 === 8 ? 'aug' : '?';
      let quality7 = '';
      if (i6 != null) {
        if (i2 === 4 && i4 === 7 && i6 === 11) quality7 = 'maj7';
        else if (i2 === 4 && i4 === 7 && i6 === 10) quality7 = '7';
        else if (i2 === 3 && i4 === 7 && i6 === 10) quality7 = 'm7';
        else if (i2 === 3 && i4 === 6 && i6 === 10) quality7 = 'm7♭5';
        else if (i2 === 3 && i4 === 6 && i6 === 9) quality7 = 'dim7';
        else if (i2 === 4 && i4 === 8 && i6 === 10) quality7 = '7♯5';
        else if (i2 === 4 && i4 === 8 && i6 === 11) quality7 = 'maj7♯5';
        else if (i2 === 3 && i4 === 7 && i6 === 11) quality7 = 'mMaj7';
      }
      return { root: root, triad: label(root) + quality, seventh: quality7 ? label(root) + quality7 : '', rootPc: root, notes: [root, third, fifth].concat(seventh == null ? [] : [seventh]) };
    });
    els.scaleChords.innerHTML = `<div class="card-h small">Chords inside this scale (click to hear)</div>
      <div class="chord-row">${degrees7.map((d, i) => `<button class="chip-btn chord-play" data-notes="${d.notes.join(',')}">
          <b>${d.triad}</b>${d.seventh ? `<small>${d.seventh}</small>` : ''}</button>`).join('')}</div>
      <div class="dim tiny-hint">Building chords on each note of the scale gives you the chord family you can solo over with that scale — this is the trick behind “the chords in the key”.</div>`;
    els.scaleChords.querySelectorAll('.chord-play').forEach(b => b.addEventListener('click', () => {
      const notes = b.dataset.notes.split(',').map(Number);
      playMidi(notes.map(pc => 48 + pc), 30);
    }));
  }
  function degIndex(step) { return step === 0 ? 'root' : (step === 3 || step === 4 || step === 10) ? 'third' : (step === 6 || step === 7 || step === 8) ? 'fifth' : 'other'; }

  /* =================================================================== */
  /* 2 — circle of fifths                                                 */
  /* =================================================================== */
  const CIRCLE = [
    { pc: 0, sig: '—', name: 'C', minor: 'A' }, { pc: 7, sig: '1♯', name: 'G', minor: 'E' },
    { pc: 2, sig: '2♯', name: 'D', minor: 'B' }, { pc: 9, sig: '3♯', name: 'A', minor: 'F♯' },
    { pc: 4, sig: '4♯', name: 'E', minor: 'C♯' }, { pc: 11, sig: '5♯/7♭', name: 'B/C♭', minor: 'G♯' },
    { pc: 6, sig: '6♭', name: 'G♭/F♯', minor: 'E♭/D♯' }, { pc: 1, sig: '5♭', name: 'D♭', minor: 'B♭' },
    { pc: 8, sig: '4♭', name: 'A♭', minor: 'F' }, { pc: 3, sig: '3♭', name: 'E♭', minor: 'C' },
    { pc: 10, sig: '2♭', name: 'B♭', minor: 'G' }, { pc: 5, sig: '1♭', name: 'F', minor: 'D' }
  ];
  function renderCircle() {
    const R1 = 118, R2 = 158, cx = 190, cy = 190;
    let s = `<svg class="cof-svg" viewBox="0 0 380 380">`;
    CIRCLE.forEach((k, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + Math.cos(a) * R1, y1 = cy + Math.sin(a) * R1;
      const x2 = cx + Math.cos(a) * R2, y2 = cy + Math.sin(a) * R2;
      const sel = k.pc === state.root;
      s += `<g class="cof-key ${sel ? 'sel' : ''}" data-pc="${k.pc}">
          <circle cx="${x1}" cy="${y1}" r="26" data-kind="major"/>
          <text x="${x1}" y="${y1 + 1}" data-kind="major">${SHARP[k.pc]}</text>
          <circle cx="${x2}" cy="${y2}" r="20" data-kind="minor" class="minor"/>
          <text x="${x2}" y="${y2 + 1}" class="minor-text" data-kind="minor">${k.minor}</text>
          ${sel ? '' : `<text class="cof-sig" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 4}">${k.sig}</text>`}
        </g>`;
    });
    s += `<circle cx="${cx}" cy="${cy}" r="86" class="cof-hole"/>`;
    s += `<text class="cof-center" x="${cx}" y="${cy - 6}" text-anchor="middle">Key of</text>`;
    s += `<text class="cof-center-big" x="${cx}" y="${cy + 22}" text-anchor="middle">${label(state.root)}</text>`;
    s += `</svg>`;
    els.cofSvg.innerHTML = s;
    els.cofSvg.querySelectorAll('.cof-key').forEach(g => g.addEventListener('click', () => {
      state.root = +g.dataset.pc; save(); renderCircle(); renderScales();
      playMidi(48 + state.root, 20);
    }));
    /* info panel: key signature, diatonic chords, relatives */
    const major = SCALES[0].steps.map(i => (state.root + i) % 12);
    const scaleName = (pc, i2, i4, i6) => '';
    const triads = [0, 1, 2, 3, 4, 5, 6].map(i => {
      const r = major[i], t = major[(i + 2) % 7], f = major[(i + 4) % 7], s7 = major[(i + 6) % 7];
      const i2 = ((t - r) % 12 + 12) % 12, i4 = ((f - r) % 12 + 12) % 12, i6 = ((s7 - r) % 12 + 12) % 12;
      const q = i2 === 4 && i4 === 7 ? '' : i2 === 3 && i4 === 7 ? 'm' : i2 === 3 && i4 === 6 ? 'dim' : '?';
      const q7 = i2 === 4 && i4 === 7 && i6 === 11 ? 'maj7' : i2 === 4 && i4 === 7 && i6 === 10 ? '7' : i2 === 3 && i4 === 7 && i6 === 10 ? 'm7' : i2 === 3 && i4 === 6 && i6 === 10 ? 'm7♭5' : '7';
      return { roman: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][i], triad: label(r) + q, seventh: label(r) + q7, notes: [r, t, f, s7] };
    });
    const entry = CIRCLE.find(k => k.pc === state.root) || CIRCLE[0];
    els.cofInfo.innerHTML = `<div class="card-h small">Key of ${label(state.root)} major</div>
      <div class="dim">Key signature: <b>${entry.sig}</b> · relative minor: <b>${entry.minor} minor</b> · parallel minor: <b>${label(state.root)} minor</b></div>
      <div class="cof-chords">${triads.map(t => `<button class="chip-btn chord-play" data-notes="${t.notes.join(',')}"><b>${t.roman}</b> ${t.triad}<small>${t.seventh}</small></button>`).join('')}</div>
      <div class="hint">The three most important chords in any key are <b>I</b>, <b>IV</b> and <b>V</b> — the neighbours on the circle. Practice changes between them and you can play thousands of songs.</div>
      <div class="row-btns"><button class="btn tiny" id="cof-play-scale">🔊 ${label(state.root)} major scale</button>
      <button class="btn tiny btn-ghost" id="cof-play-145">🎸 I–IV–V–I</button></div>`;
    const ps = el('cof-play-scale'), p145 = el('cof-play-145');
    if (ps) ps.addEventListener('click', () => playMidi(major.map(pc => 48 + pc).concat(60 + state.root), 60));
    if (p145) p145.addEventListener('click', () => {
      const seq = [triads[0], triads[3], triads[4], triads[0]];
      seq.forEach((c, i) => setTimeout(() => playMidi(c.notes.map(pc => 48 + pc), 22), i * 700));
    });
    els.cofInfo.querySelectorAll('.chord-play').forEach(b => b.addEventListener('click', () => {
      playMidi(b.dataset.notes.split(',').map(Number).map(pc => 48 + pc), 26);
    }));
  }

  /* =================================================================== */
  /* 3 — chord builder + auto voicings                                    */
  /* =================================================================== */
  const STRING_SETS = [[6, 5, 4, 3], [5, 4, 3, 2], [4, 3, 2, 1], [6, 5, 4], [5, 4, 3], [4, 3, 2], [3, 2, 1]];
  function voicingsFor(rootPc, intervals) {
    const strings = tuningStrings();           /* index 0 = high E */
    const wanted = intervals.map(i => (rootPc + i) % 12);
    const found = [];
    STRING_SETS.forEach(set => {
      /* set is in string numbers (1 = high E). Convert to index in `strings` (0 = high E) */
      const idxs = set.map(n => n - 1);        /* 5 = low E */
      const [a, b] = [Math.min.apply(null, idxs), Math.max.apply(null, idxs)];
      if (a < 0 || b > 5) return;
      for (let base = 0; base <= 11; base++) {
        const frets = idxs.map(() => 0);
        for (let s = 0; s < idxs.length; s++) {
          /* search frets in a 4-fret window starting at base */
          const open = strings[idxs[s]];
          /* find the fret whose pitch class matches any wanted note, preferring the lowest */
          let best = null;
          for (let f = Math.max(0, base); f <= base + 4; f++) {
            if (f > 14) continue;
            const pc = (open + f) % 12;
            if (wanted.indexOf(pc) !== -1) { best = f; break; }
          }
          frets[s] = best;
        }
        if (frets.some(f => f == null)) continue;
        const pcs = frets.map((f, s) => (strings[idxs[s]] + f) % 12);
        /* must contain the root and the 3rd (if the chord has one) */
        if (pcs.indexOf(rootPc % 12) === -1) continue;
        if (intervals.length > 2) {
          const third = intervals[1];
          if (pcs.indexOf((rootPc + third) % 12) === -1) continue;
        }
        /* root must be the lowest sounding string */
        const sorted = frets.map((f, s) => ({ f: f, open: strings[idxs[s]], s: s })).sort((x, y) => (x.open + x.f) - (y.open + y.f));
        if ((sorted[0].open + sorted[0].f) % 12 !== rootPc % 12) continue;
        const key = set.join(',') + ':' + frets.join(',');
        if (!found.some(v => v.key === key)) {
          found.push({ key: key, strings: idxs, frets: frets, span: Math.max.apply(null, frets) - Math.min.apply(null, frets), sum: frets.reduce((x, y) => x + y, 0) });
        }
      }
    });
    found.sort((x, y) => (x.span - y.span) || (x.sum - y.sum));
    return found.slice(0, 6);
  }
  function chordDiagram(voice, rootPc) {
    const strings = tuningStrings();
    const W = 138, H = 176, padT = 26;
    const yOf = f => padT + f * 20;
    const xOf = i => 18 + i * 18;
    const openMidis = voice.strings.map(i => strings[i]);
    const midis = openMidis.map((m, i) => m + voice.frets[i]);
    const minFret = Math.min.apply(null, voice.frets);
    const maxFret = Math.max.apply(null, voice.frets);
    let s = `<svg class="chord-svg" viewBox="0 0 ${W} ${H}">`;
    /* frets */
    const topFret = maxFret > 4 ? minFret : 0;
    for (let f = 0; f <= 5; f++) {
      s += `<line x1="${xOf(0) - 8}" y1="${yOf(f)}" x2="${xOf(voice.strings.length - 1) + 8}" y2="${yOf(f)}" stroke="currentColor" stroke-opacity="${f === 0 ? 0.85 : 0.35}" stroke-width="${f === 0 ? 3 : 1.2}"/>`;
    }
    s += `<text class="chord-pos" x="${W - 6}" y="${padT + 12}" text-anchor="end">${topFret > 0 ? topFret + 'fr' : ''}</text>`;
    /* strings + dots */
    voice.strings.forEach((si, i) => {
      s += `<line x1="${xOf(i)}" y1="${yOf(0)}" x2="${xOf(i)}" y2="${yOf(5)}" stroke="currentColor" stroke-opacity=".5" stroke-width="1.2"/>`;
      const f = voice.frets[i];
      const rel = f - topFret;
      const isRoot = ((openMidis[i] + f) % 12) === (rootPc % 12);
      if (f === 0) s += `<circle class="chord-open" cx="${xOf(i)}" cy="${yOf(0) - 12}" r="4.5"/>`;
      else s += `<circle class="chord-dot ${isRoot ? 'root' : ''}" cx="${xOf(i)}" cy="${yOf(rel) - 10}" r="7.5"/>
                 <text class="chord-dot-t" x="${xOf(i)}" y="${yOf(rel) - 6}">${isRoot ? 'R' : label((openMidis[i] + f) % 12)}</text>`;
    });
    /* muted strings on top */
    voice.strings.forEach((si, i) => {});
    s += `</svg>`;
    return s;
  }
  function renderBuilder() {
    const type = CHORD_TYPES.find(c => c.id === state.chordType) || CHORD_TYPES[0];
    els.chordRoot.value = state.root;
    els.chordType.value = state.chordType;
    el('chord-title').textContent = label(state.root) + type.sym;
    const voices = voicingsFor(state.root, type.steps);
    els.chordDiagrams.innerHTML = voices.length
      ? voices.map(v => `<div class="chord-cell">${chordDiagram(v, state.root)}
          <div class="chord-cell-foot"><span class="dim">${v.strings.map(s => 6 - s).sort().join('')} string set</span>
          <button class="btn tiny" data-voice="${v.strings.join(',')}|${v.frets.join(',')}">▶ Hear it</button></div></div>`).join('')
      : '<div class="hint">No playable voicing for that root inside the first 15 frets — try a different root or chord type.</div>';
    const noteNames = type.steps.map(i => label((state.root + i) % 12));
    els.chordInfo.innerHTML = `<b>${label(state.root)}${type.sym}</b> = ${noteNames.join(' · ')} — ${type.desc}`;
    els.chordDiagrams.querySelectorAll('[data-voice]').forEach(b => b.addEventListener('click', () => {
      const [ss, ff] = b.dataset.voice.split('|');
      const strings = tuningStrings();
      const idxs = ss.split(',').map(Number), frets = ff.split(',').map(Number);
      playMidi(idxs.map((si, i) => strings[si] + frets[i]), 40);
    }));
  }

  /* =================================================================== */
  /* 4 — fretboard trainer                                                */
  /* =================================================================== */
  const NOTE_NAMES = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
  function newGameRound() {
    if (state.gameMode === 'find') {
      state.gamePrompt = label(Math.floor(Math.random() * 12));
      els.gamePrompt.innerHTML = `Find every <b>${state.gamePrompt}</b> on the neck (frets 0–12)`;
      state.gameTarget = state.gamePrompt;
    } else {
      const f = Math.floor(Math.random() * 13);
      const visual = Math.floor(Math.random() * 6);
      const open = tuningStrings().slice().reverse()[visual];
      state.gameTarget = label((open + f) % 12);
      state.gamePos = { st: visual, f: f };
      els.gamePrompt.innerHTML = `Which note is the highlighted fret?`;
    }
    renderGameBoard();
  }
  function renderGameBoard() {
    const strings = tuningStrings();
    let inner;
    if (state.gameMode === 'find') {
      /* no pitch markers; clickable cells */
      inner = fretboardSVG({ steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rootPc: null, showNames: false, strings: strings });
    } else {
      inner = fretboardSVG({ steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rootPc: null, showNames: false, strings: strings });
    }
    els.gameBoard.innerHTML = inner;
    const dots = els.gameBoard.querySelectorAll('.fb-dot');
    dots.forEach(d => d.classList.add('game-cell'));
    if (state.gameMode === 'find') {
      dots.forEach(d => {
        const f = +d.dataset.f; const st = +d.dataset.st;
        if (f > 12) { d.style.display = 'none'; return; }
        d.addEventListener('click', () => {
          const open = strings.slice().reverse()[st];
          const pc = label((open + f) % 12);
          if (pc === state.gameTarget) {
            d.classList.add('hit'); state.gameScore++; state.gameStreak++;
            state.gameBest = Math.max(state.gameBest, state.gameStreak);
            window.TT.audio.chime('ok');
            renderGameStats();
            if (state.gameBoard.querySelectorAll('.fb-dot.hit').length >= countTarget()) { setTimeout(newGameRound, 420); }
          } else {
            d.classList.add('miss'); state.gameStreak = 0; renderGameStats();
            window.TT.audio.chime('click');
            setTimeout(() => d.classList.remove('miss'), 400);
          }
        });
      });
    } else {
      dots.forEach(d => { d.addEventListener('click', () => guessName(d, strings)); });
      /* highlight the target */
      const target = els.gameBoard.querySelector(`.game-cell[data-st="${state.gamePos.st}"][data-f="${state.gamePos.f}"]`);
      if (target) target.classList.add('ask');
      renderNameChoices();
    }
    renderGameStats();
  }
  function countTarget() {
    const strings = tuningStrings();
    let n = 0;
    for (let st = 0; st < 6; st++) for (let f = 0; f <= 12; f++) if (label((strings[st] + f) % 12) === state.gameTarget) n++;
    return Math.min(n, 6);
  }
  function renderNameChoices() {
    const box = el('game-choices');
    if (!box) return;
    const opts = [];
    while (opts.length < 4) {
      const c = NOTE_NAMES[Math.floor(Math.random() * 12)];
      if (opts.indexOf(c) === -1 && (state.gameTarget === c || opts.length < 3)) opts.push(c);
    }
    if (opts.indexOf(state.gameTarget) === -1) opts[0] = state.gameTarget;
    opts.sort(() => Math.random() - 0.5);
    box.innerHTML = opts.map(o => `<button class="btn tiny" data-guess="${o}">${o}</button>`).join('');
    box.querySelectorAll('[data-guess]').forEach(b => b.addEventListener('click', () => {
      const ok = b.dataset.guess === state.gameTarget;
      if (ok) { state.gameScore++; state.gameStreak++; state.gameBest = Math.max(state.gameBest, state.gameStreak); window.TT.audio.chime('ok'); setTimeout(newGameRound, 300); }
      else { state.gameStreak = 0; window.TT.audio.chime('click'); b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 400); }
      save(); renderGameStats();
    }));
  }
  function guessName(d, strings) {
    const st = +d.dataset.st, f = +d.dataset.f;
    const pc = label((strings.slice().reverse()[st] + f) % 12);
    if (pc === state.gameTarget || NOTE_NAMES[(strings.slice().reverse()[st] + f) % 12] === state.gameTarget) {
      state.gameScore++; state.gameStreak++; state.gameBest = Math.max(state.gameBest, state.gameStreak);
      window.TT.audio.chime('ok'); setTimeout(newGameRound, 300);
    } else {
      state.gameStreak = 0; window.TT.audio.chime('click');
      d.classList.add('miss'); setTimeout(() => d.classList.remove('miss'), 400);
    }
    save(); renderGameStats();
  }
  function renderGameStats() {
    const s = el('game-stats');
    if (s) s.innerHTML = `Score <b>${state.gameScore}</b> · Streak <b>${state.gameStreak}</b> · Best <b>${state.gameBest}</b>`;
  }

  /* =================================================================== */
  /* 5 — string tension                                                   */
  /* =================================================================== */
  const GAUGE_SETS = {
    '09-42 (super light)': [0.009, 0.011, 0.016, 0.024, 0.032, 0.042],
    '10-46 (regular light)': [0.010, 0.013, 0.017, 0.026, 0.036, 0.046],
    '10-52 (heavy bottom)': [0.010, 0.013, 0.017, 0.030, 0.042, 0.052],
    '11-49 (medium)': [0.011, 0.014, 0.018, 0.028, 0.038, 0.049],
    '12-54 (acoustic light)': [0.012, 0.016, 0.024, 0.032, 0.042, 0.054],
    '13-56 (acoustic medium)': [0.013, 0.017, 0.026, 0.036, 0.046, 0.056],
    '12-60 (baritone/Drop C)': [0.012, 0.016, 0.024, 0.036, 0.048, 0.060],
    'Custom (edit below)': null
  };
  /* Tension from first principles:
   *   T = (2·L·f)² · w / 386.4      (L in inches, f in Hz, T in lbf)
   * with the string's mass per unit length w = ρ·π·d²/4 (lb/in).
   * Plain steel ρ ≈ 0.2836 lb/in³ → w = 0.2227·d² .
   * Wound strings have gaps between the windings, so their effective density is
   * lower: measured against D'Addario's published chart, nickel round-wound is
   * ≈ 0.80 × a solid steel wire of the same diameter (.026 → 18.4 lb vs 22.9 lb
   * solid) and phosphor bronze ≈ 0.86 (heavier wrap material).           */
  const K_PLAIN = 0.2227, K_NICKEL = 0.80, K_BRONZE = 0.86;
  function unitWeight(gauge, wound, bronze) {
    const k = wound ? (bronze ? K_BRONZE : K_NICKEL) : 1;
    return K_PLAIN * k * gauge * gauge;
  }
  function tensionOf(gauge, scaleIn, freq, wound, bronze) {
    const w = unitWeight(gauge, wound, bronze);
    return Math.pow(2 * scaleIn * freq, 2) * w / 386.4;
  }
  function stringWound(gauge) { return gauge >= 0.020; }
  function renderTension() {
    const scale = +el('tension-scale').value || 25.5;
    const key = el('tension-preset').value;
    let gauges = GAUGE_SETS[key];
    const bronze = /acoustic/.test(key);
    if (!gauges) {
      gauges = Array.from(el('tension-gauges').querySelectorAll('input')).map(i => parseFloat(i.value) || 0);
      if (gauges.length !== 6) gauges = [0.010, 0.013, 0.017, 0.026, 0.036, 0.046];
    }
    /* gauges are listed 1st string (high E) first */
    el('tension-gauges').innerHTML = gauges.map((g, i) =>
      `<label class="gauge-input"><span>String ${6 - i}</span><input type="number" step="0.001" min="0.006" max="0.080" value="${g.toFixed(3)}"></label>`).join('');
    el('tension-gauges').querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
      el('tension-preset').value = 'Custom (edit below)';
      renderTension();
    }));
    const preset = window.TT.tunings.byId(el('tension-tuning').value);
    const strings = preset.strings;             /* thickest first */
    const rows = strings.map((s, i) => {
      const gauge = gauges[gauges.length - 1 - i] != null ? gauges[gauges.length - 1 - i] : gauges[0];
      const f = N.midiToFreq(s.midi, a4());
      const wound = stringWound(gauge);
      const t = tensionOf(gauge, scale, f, wound, bronze);
      return { name: N.prettyName(s.name).label, gauge: gauge, hz: f, t: t, wound: wound };
    });
    const total = rows.reduce((n, r) => n + r.t, 0);
    const perString = rows.length ? total / rows.length : 0;
    el('tension-out').innerHTML = `<table class="tension-table">
        <thead><tr><th>String</th><th>Gauge</th><th>Pitch</th><th>Tension</th><th>Feel</th></tr></thead>
        <tbody>${rows.map(r => {
          const feel = r.t < 12 ? 'slack — will buzz' : r.t < 15 ? 'loose' : r.t < 21 ? 'comfortable' : r.t < 26 ? 'firm' : 'very tight';
          return `<tr><td><b>${r.name}</b></td><td>.${(r.gauge * 1000).toFixed(0)}${r.wound ? 'w' : ''}</td><td>${r.hz.toFixed(1)} Hz</td>
            <td><b>${r.t.toFixed(1)} lb</b> · ${(r.t * 0.4536).toFixed(2)} kg</td><td class="${r.t < 12 || r.t > 26 ? 'warn' : ''}">${feel}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td colspan="3"><b>Total neck tension</b></td><td><b>${total.toFixed(0)} lb · ${(total * 0.4536).toFixed(1)} kg</b></td>
        <td>${total > 175 ? 'high — consider lighter gauges or tuning down' : total < 85 ? 'very low — expect buzz' : 'healthy range'}</td></tr></tfoot></table>`;
    el('tension-info').innerHTML = `<div class="dim">
      ${preset.name} at ${scale}" · average <b>${perString.toFixed(1)} lb</b> per string.
      Targets: electric ≈ 13–21 lb per string (85–130 lb total) · acoustic ≈ 20–27 lb per string (150–170 lb total) · bass ≈ 35–50 lb per string.
      Wound strings computed with a winding-density factor (nickel 0.80, bronze 0.86) so the numbers match published string charts within a few percent.</div>`;
  }

  /* =================================================================== */
  /* 6 — setup specs + fret math                                          */
  /* =================================================================== */
  const SETUP = [
    { id: 'fender', name: 'Fender-style electric (25.5")', relief: '0.008"–0.012" at the 8th fret', action6: '4/64"–5/64" (1.6–2.0 mm) at the 17th', action1: '3/64"–4/64" (1.2–1.6 mm)', pickup: 'Humbucker 4/64" treble, 5/64" bass · single coil 5/64"/6/64"', notes: 'Fender necks are flatter; 10–46 strings and standard tuning.' },
    { id: 'gibson', name: 'Gibson-style electric (24.75")', relief: '0.010"–0.012"', action6: '3/64"–5/64" (1.2–2.0 mm)', action1: '2/64"–3/64" (0.8–1.2 mm)', pickup: 'Humbucker 3/64" treble, 4/64" bass', notes: 'Shorter scale = slinkier feel; a little more relief suits big bends.' },
    { id: 'acoustic', name: 'Steel-string acoustic', relief: '0.010"–0.014"', action6: '7/64"–8/64" (2.8–3.2 mm) at the 12th', action1: '5/64"–6/64" (2.0–2.4 mm)', pickup: 'n/a — check saddle height instead', notes: 'Measure at the 12th fret, top of fret to bottom of string.' },
    { id: 'classical', name: 'Classical / nylon', relief: '0.012"–0.016"', action6: '8/64"–10/64" (3.2–4.0 mm)', action1: '6/64"–7/64" (2.4–2.8 mm)', pickup: 'n/a', notes: 'Nylon needs more room to vibrate — do not set it up like an electric.' },
    { id: 'bass', name: 'Bass', relief: '0.012"–0.016"', action6: '5/64"–7/64" (2.0–2.8 mm)', action1: '4/64"–6/64" (1.6–2.4 mm)', pickup: '3/32"–5/32" from the pole to the string', notes: 'Set action with the bass held in playing position.' },
    { id: 'highgain', name: 'High-gain / shred', relief: '0.006"–0.010"', action6: '3/64"–4/64" (1.2–1.6 mm)', action1: '2/64"–3/64" (0.8–1.2 mm)', pickup: 'Low pickups (6/64"+) for clarity under gain', notes: 'Low action plus light strings plus high gain: expect buzz and set the gate to cover it.' }
  ];
  const SETUP_STEPS = [
    'New strings first. Setting up a guitar with dead strings is a waste of time — strings change tension as they age.',
    'Check the neck relief: capo at fret 1, hold the low E at the last fret, measure the gap at the 8th fret with a feeler gauge.',
    'Adjust the truss rod if relief is out of spec: 1/4 turn at a time, then re-measure. Never force it.',
    'Set the action at the bridge (electric) or saddle (acoustic), measuring at the 17th fret for electrics and the 12th for acoustics.',
    'Check every fret for buzz with a medium pick attack. Raise the action slightly until the buzz stops on your hardest strum.',
    'Set intonation: compare the open string to the 12th-fret harmonic. Sharp → saddle back. Flat → saddle forward.',
    'Set pickup height: closer = louder and darker, farther = cleaner with more clarity. Start at the factory spec.',
    'Check the nut: open strings should buzz slightly less than fretted ones. If the nut is too low, open chords will buzz and the guitar will play flat in the first position.',
    'Re-tune, play for 10 minutes, then check everything again. Wood moves after you touch a truss rod.'
  ];
  function renderSetup() {
    el('setup-info').innerHTML = `<table class="tension-table"><thead><tr><th>Guitar</th><th>Relief</th><th>Low E action</th><th>High E action</th><th>Pickup height</th></tr></thead>
      <tbody>${SETUP.map(s => `<tr><td><b>${s.name}</b><div class="dim tiny-hint">${s.notes}</div></td><td>${s.relief}</td><td>${s.action6}</td><td>${s.action1}</td><td>${s.pickup}</td></tr>`).join('')}</tbody></table>`;
    el('setup-steps').innerHTML = SETUP_STEPS.map(s => `<li>${s}</li>`).join('');
    renderFrets();
  }
  function renderFrets() {
    const scale = +el('fret-scale').value || 25.5;
    let s = '<table class="tension-table"><thead><tr><th>Fret</th><th>Distance from nut</th><th>Distance from previous fret</th><th>Note (E string)</th></tr></thead><tbody>';
    let remaining = scale;
    for (let f = 1; f <= 22; f++) {
      const d = remaining / 17.817;
      const fromNut = scale - remaining + d;
      s += `<tr><td>${f}</td><td>${fromNut.toFixed(3)}" · ${(fromNut * 25.4).toFixed(1)} mm</td><td>${d.toFixed(3)}"</td><td>${N.prettyName(N.freqToNote(N.midiToFreq(40 + f, a4())).label).label || ''}</td></tr>`;
      remaining -= d;
    }
    s += '</tbody></table>';
    el('fret-table').innerHTML = s;
  }

  /* =================================================================== */
  /* 7 — capo & transpose                                                 */
  /* =================================================================== */
  const KEYS = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
  function renderCapo() {
    const songKey = +el('capo-key').value;
    const capo = +el('capo-pos').value;
    const shapePc = (songKey - capo + 12) % 12;
    const shapeKey = KEYS[shapePc];
    const openChords = ['C', 'D', 'E', 'G', 'A'];
    const easy = ['C', 'G', 'D', 'A', 'E', 'Am', 'Em', 'Dm'];
    el('capo-out').innerHTML = `<div class="capo-big">Play in <b>${KEYS[songKey]}</b> with the capo on fret <b>${capo}</b> → use <b>${shapeKey}</b> shapes</div>
      <div class="hint">So with the capo at ${capo}, an open <b>${shapeKey}</b> chord sounds as <b>${KEYS[songKey]}</b>. The chords you already know keep working — they just move.</div>
      <div class="chord-row">${easy.map(c => {
        const pc = KEYS.indexOf(c.replace('m', ''));
        const shift = (songKey - capo + 12) % 12;
        const target = KEYS[(pc + shift) % 12];
        return `<span class="chip-btn"><b>${c}</b> sounds as <b>${target}${c.indexOf('m') !== -1 ? 'm' : ''}</b></span>`;
      }).join('')}</div>`;
    const by = +el('transpose-by').value;
    const src = el('transpose-in').value || '';
    el('transpose-out').innerHTML = src.trim()
      ? `<div class="transpose-row">${src.trim().split(/\s+/).map(tok => {
          const res = transposeChord(tok, by);
          return res === tok ? `<span class="chip-btn">${tok}</span>` : `<span class="chip-btn"><b>${res}</b><small>was ${tok}</small></span>`;
        }).join('')}</div>`
      : '<div class="dim tiny-hint">Type some chords above to transpose them.</div>';
  }
  function transposeChord(tok, semis) {
    const m = /^([A-G])([#b♯♭]?)(.*)$/.exec(tok.trim());
    if (!m) return tok;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    let acc = 0;
    if (m[2] === '#' || m[2] === '♯') acc = 1; else if (m[2] === 'b' || m[2] === '♭') acc = -1;
    const pc = ((base + acc + semis) % 12 + 12) % 12;
    return KEYS[pc] ? KEYS[pc].split('/')[0] + m[3] : m[1] + m[2] + m[3];
  }

  /* =================================================================== */
  /* 8 — pickups & mods                                                   */
  /* =================================================================== */
  const MODS = [
    { id: 'pots', title: 'Potentiometers — the cheapest tone change there is', body: '250k pots (Fender single coils) sound warmer and roll off the high end sooner; 500k (humbuckers) sound brighter and louder. Audio-taper (log) pots give a more useful sweep than linear. A 1Meg pot is even brighter — sometimes too bright.', action: 'If your guitar sounds dark, check the pot values and the tone cap before you buy a pickup.' },
    { id: 'caps', title: 'Tone capacitors — where the tone control sounds "right"', body: '0.022 µF is the standard humbucker cap: it rolls off from about 700 Hz and beyond. 0.047 µF (single coils) starts much lower and sounds darker. Paper-in-oil caps are expensive and, blind-tested, nearly identical to a £2 poly film cap. Capacitor type matters far less than value.', action: 'Try 0.015 µF for a subtle, jazzy roll-off, or 0.1 µF for a full-on woman-tone effect.' },
    { id: '50s', title: '50s wiring vs modern wiring', body: 'Modern wiring puts the tone control before the volume: turning the volume down darkens the sound slightly. 50s (vintage) wiring moves the tone control after the volume: the tone stays bright as you roll the volume down, and volume changes are more gradual.', action: 'On a Les Paul/335, 50s wiring is a 10-minute mod that many players never undo.' },
    { id: 'treble-bleed', title: 'Treble bleed — keep the top end as you turn down', body: 'A small capacitor (often with a resistor) across the volume pot keeps the high frequencies present as you roll the volume back. Values around 0.001 µF (or 0.001 µF + 150k in parallel) are common. Some players hate it because it sounds "thin" when clean.', action: 'Great for pedalboards where the amp is already dirty: you can clean up with the volume and stay bright.' },
    { id: 'split', title: 'Coil split / tap and series-parallel', body: 'Splitting a humbucker to one coil gives you a thinner, brighter, single-coil sound. Series-parallel switching keeps the humbucking character but with less output and more top end. A push-pull pot or a 5-way superswitch does either without drilling.', action: 'Wire the split to the neck pickup only, so you keep a strong bridge humbucker for solos.' },
    { id: 'phase', title: 'Out-of-phase', body: 'Reversing one pickup’s leads puts two pickups out of phase, scooping the mids dramatically — the Peter Green / Brian May "nasal" tone. Not to be confused with coil splitting, although they are often on the same switch.', action: 'Useful in the middle position only, and best with a lower-gain amp setting.' },
    { id: 'shielding', title: 'Shielding & grounding', body: 'Copper tape in the control cavities and around the pickguard can kill single-coil hum, but it must be grounded and must not touch any live terminals. Check with a multimeter: all shielding should read continuity with ground.', action: 'If your guitar hums and stops when you touch the strings, your bridge ground is fine but shielding may help the buzz. If it hums louder when you touch the strings, your ground is wrong — fix it.' },
    { id: 'pickup-height', title: 'Pickup height — free tone shaping', body: 'Closer to the strings gives more output, more bass and more compression, but the magnet can pull the string and cause wolf notes and poor intonation. Lower pickups sound more open and dynamic. Start at the factory spec, then move each side 1/64" at a time.', action: 'Single coils are sensitive to height: raise them until they sound lively, then back off when the low end gets muddy.' },
    { id: 'trems', title: 'Tremolo setup & guitar balance', body: 'A two-post trem should float level with the body for full up-and-down range; decking it (flush to the body) gives tuning stability and a more solid feel. Keep the claw tension balanced against the strings, and make sure the nut slots are cut cleanly — most tuning problems after a whammy dive are nut problems.', action: 'Lubricate the nut slots (graphite or Nut Sauce) before blaming the tuners.' },
    { id: 'gauge', title: 'String gauge changes everything', body: 'Heavier strings mean more tension, more output and a rounder tone — but also more neck relief, higher action and (on a tremolo) a claw adjustment. Going from 9s to 10s on a floating trem can pull it sharply forward, so check the setup.', action: 'Change one thing at a time: gauge, then relief, then action, then intonation.' }
  ];
  function renderMods() {
    el('mods-out').innerHTML = MODS.map(m => `<div class="mod-card"><b>${m.title}</b><p>${m.body}</p><p class="mod-action">👉 ${m.action}</p></div>`).join('');
  }

  /* =================================================================== */
  /* tabs + init                                                          */
  /* =================================================================== */
  T.setTab = function (name) {
    document.querySelectorAll('#tools-tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('#view-tools .tabpane').forEach(p => p.classList.toggle('active', p.id === 'tools-' + name));
    try { window.TT.store.set('toolsTab', name); } catch (e) {}
    if (name === 'circle') renderCircle();
    if (name === 'builder') renderBuilder();
    if (name === 'tension') renderTension();
    if (name === 'setup') renderSetup();
    if (name === 'capo') renderCapo();
    if (name === 'game' && !state.gamePrompt) newGameRound();
    if (window.TT.playtools) {
      TT.playtools.init();
      if (name === 'caged' && TT.playtools.renderCaged) TT.playtools.renderCaged();
      if (name === 'harmonics' && TT.playtools.renderHarmonics) TT.playtools.renderHarmonics();
    }
  };

  T.playScale = function () {
    const sc = SCALES.find(s => s.id === state.scale) || SCALES[0];
    const midis = sc.steps.map(i => 48 + state.root + i);
    midis.push(60 + state.root);
    playMidi(midis, 110);
  };

  T.init = function () {
    els.scaleRoot = el('scale-root'); if (!els.scaleRoot) return;
    els.scaleType = el('scale-type');
    els.scaleFlats = el('scale-flats');
    els.scaleFretboard = el('scale-fretboard');
    els.scaleInfo = el('scale-info');
    els.scaleChords = el('scale-chords');
    els.cofSvg = el('cof-svg'); els.cofInfo = el('cof-info');
    els.chordRoot = el('chord-root');
    els.chordType = el('chord-type');
    els.chordDiagrams = el('chord-diagrams'); els.chordInfo = el('chord-info');
    els.gameBoard = el('game-board');
    els.gamePrompt = el('game-prompt');
    load();
    /* fills */
    const rootOpts = SHARP.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    els.scaleRoot.innerHTML = rootOpts;
    els.scaleType.innerHTML = SCALES.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    els.chordRoot.innerHTML = rootOpts;
    els.chordType.innerHTML = CHORD_TYPES.map(c => `<option value="${c.id}">${c.name}${c.sym ? ' · ' + c.sym : ''}</option>`).join('');
    /* tension */
    const tp = el('tension-preset');
    tp.innerHTML = Object.keys(GAUGE_SETS).map(k => `<option>${k}</option>`).join('');
    el('tension-tuning').innerHTML = window.TT.tunings.PRESETS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    el('tension-tuning').value = 'standard';
    /* capo */
    el('capo-key').innerHTML = KEYS.map((k, i) => `<option value="${i}">${k}</option>`).join('');
    el('capo-key').value = state.capoKey || 0;
    el('capo-pos').innerHTML = [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<option value="${i}">${i === 0 ? 'No capo' : 'Fret ' + i}</option>`).join('');
    el('capo-pos').value = state.capoPos || 0;
    el('transpose-by').innerHTML = [-12, -7, -5, -3, -2, -1, 0, 1, 2, 3, 4, 5, 7, 12].map(s => `<option value="${s}">${s > 0 ? '+' + s : s} semitones</option>`).join('');
    el('transpose-by').value = 0;
    el('transpose-in').value = 'C G Am F';
    renderMods();

    /* events */
    els.scaleRoot.addEventListener('change', () => { state.root = +els.scaleRoot.value; state.chordRoot = state.root; save(); renderScales(); });
    els.scaleType.addEventListener('change', () => { state.scale = els.scaleType.value; save(); renderScales(); });
    els.scaleFlats.addEventListener('change', () => { state.flats = els.scaleFlats.checked; save(); renderScales(); renderBuilder(); renderCircle(); });
    el('btn-play-scale').addEventListener('click', T.playScale);
    els.chordRoot.addEventListener('change', () => { state.root = +els.chordRoot.value; state.chordRoot = state.root; save(); renderBuilder(); });
    els.chordType.addEventListener('change', () => { state.chordType = els.chordType.value; save(); renderBuilder(); });
    el('game-mode').addEventListener('change', e => { state.gameMode = e.target.value; newGameRound(); });
    el('game-reset').addEventListener('click', () => { state.gameScore = 0; state.gameStreak = 0; save(); renderGameStats(); });
    el('tension-scale').addEventListener('input', renderTension);
    el('tension-preset').addEventListener('change', renderTension);
    el('tension-tuning').addEventListener('change', renderTension);
    el('fret-scale').addEventListener('input', renderFrets);
    el('capo-key').addEventListener('change', () => { state.capoKey = +el('capo-key').value; save(); renderCapo(); });
    el('capo-pos').addEventListener('change', () => { state.capoPos = +el('capo-pos').value; save(); renderCapo(); });
    el('transpose-by').addEventListener('change', renderCapo);
    el('transpose-in').addEventListener('input', renderCapo);
    document.querySelectorAll('#tools-tabs .tab').forEach(b => b.addEventListener('click', () => T.setTab(b.dataset.tab)));

    /* remember the last tab */
    let tab = 'scales';
    try { tab = window.TT.store.get('toolsTab', 'scales') || 'scales'; } catch (e) {}
    T.setTab(tab);
    renderScales(); renderBuilder();
  };

  T.SCALES = SCALES;
  T.CHORD_TYPES = CHORD_TYPES;
  T.STRING_SETS = STRING_SETS;
  T.voicingsFor = voicingsFor;          /* used by the tab maker + song library */
  T.chordDiagram = chordDiagram;
  T.renderScales = renderScales;
  window.TT = window.TT || {};
  window.TT.tools = T;
})();
