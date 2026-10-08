/* Trill Tuner — the chord library engine.
 *
 * Given a key (from the tuner, from a catalog song, or from the tab maker's
 * analysis of a recording), this works out which chords belong in it, what each
 * one is doing there (its Roman numeral / function), which progressions it
 * unlocks, and what capo position makes it easiest to play. Everything is
 * derived from theory — no song tables — so it works in all 24 keys.
 */
(function () {
  'use strict';
  const G = (typeof window !== 'undefined') ? window : globalThis;

  const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const SHARP_OF = { 'D♭': 'C♯', 'E♭': 'D♯', 'G♭': 'F♯', 'A♭': 'G♯', 'B♭': 'A♯', 'C♭': 'B', 'F♭': 'E' };
  const FLAT_OF = { 'C♯': 'D♭', 'D♯': 'E♭', 'F♯': 'G♭', 'G♯': 'A♭', 'A♯': 'B♭' };
  /* keys conventionally written with flats: F, B♭, E♭, A♭, D♭, G♭ */
  const FLAT_MAJOR_PC = [5, 10, 3, 8, 1, 6];

  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  function pc(name) {
    if (name == null) return -1;
    const n = String(name).replace(/b/g, '♭').replace(/#/g, '♯');
    if (SHARP.indexOf(n) >= 0) return SHARP.indexOf(n);
    if (SHARP_OF[n] != null) return SHARP.indexOf(SHARP_OF[n]);
    return -1;
  }
  function rootOf(name) {
    const m = /^([A-G][#♯b♭]?)/.exec(String(name || '').trim());
    return m ? m[1].replace('#', '♯').replace('b', '♭') : '';
  }
  function suffixOf(name) { return String(name || '').trim().slice(rootOf(name).length); }

  /* Which accidental family is this key written in? */
  function family(key, mode) {
    const r = rootOf(key);
    if (/♭/.test(r)) return 'flat';
    if (/♯/.test(r)) return 'sharp';
    let majorPc = pc(r);
    if (mode === 'minor') majorPc = (majorPc + 3) % 12;
    return FLAT_MAJOR_PC.indexOf(majorPc) >= 0 ? 'flat' : 'sharp';
  }
  function names(key, mode) { return family(key, mode) === 'flat' ? FLAT : SHARP; }
  function speller(key, mode) {
    const arr = names(key, mode);
    const rootPc = pc(rootOf(key));
    return semis => arr[((rootPc + semis) % 12 + 12) % 12];
  }
  function degreeName(key, mode, steps, index) { return speller(key, mode)(steps[index]); }

  const MAJOR_QUALITIES = [
    { sym: '', quality: 'major', roman: 'I', seventh: 'maj7', steps: [0, 4, 7], seventhSteps: [0, 4, 7, 11], fn: 'home — the chord that resolves everything' },
    { sym: 'm', quality: 'minor', roman: 'ii', seventh: 'm7', steps: [0, 3, 7], seventhSteps: [0, 3, 7, 10], fn: 'the set-up chord; usually goes to V' },
    { sym: 'm', quality: 'minor', roman: 'iii', seventh: 'm7', steps: [0, 3, 7], seventhSteps: [0, 3, 7, 10], fn: 'soft substitute for I' },
    { sym: '', quality: 'major', roman: 'IV', seventh: 'maj7', steps: [0, 4, 7], seventhSteps: [0, 4, 7, 11], fn: 'the lift — moves the song forward' },
    { sym: '', quality: 'major', roman: 'V', seventh: '7', steps: [0, 4, 7], seventhSteps: [0, 4, 7, 10], fn: 'tension — it wants to go home to I' },
    { sym: 'm', quality: 'minor', roman: 'vi', seventh: 'm7', steps: [0, 3, 7], seventhSteps: [0, 3, 7, 10], fn: 'the sad one that sounds sweet in a major key' },
    { sym: 'dim', quality: 'diminished', roman: 'vii°', seventh: 'm7♭5', steps: [0, 3, 6], seventhSteps: [0, 3, 6, 10], fn: 'unstable — it pulls back to I' }
  ];
  const MINOR_QUALITIES = [
    { sym: 'm', quality: 'minor', roman: 'i', seventh: 'm7', steps: [0, 3, 7], seventhSteps: [0, 3, 7, 10], fn: 'home in a minor key' },
    { sym: 'dim', quality: 'diminished', roman: 'ii°', seventh: 'm7♭5', steps: [0, 3, 6], seventhSteps: [0, 3, 6, 10], fn: 'the ii chord of minor — jazz loves it' },
    { sym: '', quality: 'major', roman: 'III', seventh: 'maj7', steps: [0, 4, 7], seventhSteps: [0, 4, 7, 11], fn: 'the relative major — a lift out of the dark' },
    { sym: 'm', quality: 'minor', roman: 'iv', seventh: 'm7', steps: [0, 3, 7], seventhSteps: [0, 3, 7, 10], fn: 'the minor fourth — sadder than IV' },
    { sym: 'm', quality: 'minor', roman: 'v', seventh: 'm7', steps: [0, 3, 7], seventhSteps: [0, 3, 7, 10], fn: 'the natural fifth — no leading tone, folk-pop feel' },
    { sym: '', quality: 'major', roman: 'VI', seventh: 'maj7', steps: [0, 4, 7], seventhSteps: [0, 4, 7, 11], fn: 'the big minor-key surprise chord' },
    { sym: '', quality: 'major', roman: 'VII', seventh: '7', steps: [0, 4, 7], seventhSteps: [0, 4, 7, 10], fn: 'the rock bVII — do not resolve it' }
  ];
  /* chords outside the natural scale that everyone plays */
  const EXTRA = {
    major: [
      { roman: 'V7', semis: 7, sym: '7', note: 'the strongest pull home — a dominant seventh on V' },
      { roman: 'III', semis: 4, sym: '', note: 'secondary dominant into vi (V of vi)' },
      { roman: '♭VII', semis: 10, sym: '', note: 'borrowed from mixolydian — the rock staple' },
      { roman: '♭III', semis: 3, sym: '', note: 'borrowed from the parallel minor' },
      { roman: '♭VI', semis: 8, sym: '', note: 'borrowed — big, cinematic lift' },
      { roman: 'iv', semis: 5, sym: 'm', note: 'minor fourth — the classic “there and back” move' },
      { roman: 'II7', semis: 2, sym: '7', note: 'secondary dominant that pushes into V' }
    ],
    minor: [
      { roman: 'V', semis: 7, sym: '', note: 'harmonic minor dominant — makes a minor key resolve' },
      { roman: 'V7', semis: 7, sym: '7', note: 'harmonic minor dominant 7 — the darkest tension' },
      { roman: '♭II', semis: 1, sym: '', note: 'Neapolitan — a semitone above the tonic, very dramatic' },
      { roman: 'IV', semis: 5, sym: '', note: 'major fourth borrowed from the parallel major' },
      { roman: 'VII7', semis: 10, sym: '7', note: 'mixolydian seventh — rock minor' },
      { roman: 'III7', semis: 3, sym: '7', note: 'dominant of VI — a lift before the chorus' }
    ]
  };

  function scale(key, mode) {
    const steps = mode === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
    const quals = mode === 'minor' ? MINOR_QUALITIES : MAJOR_QUALITIES;
    return quals.map((q, i) => ({
      degree: i + 1,
      roman: q.roman,
      root: degreeName(key, mode, steps, i),
      name: degreeName(key, mode, steps, i) + q.sym,
      seventh: degreeName(key, mode, steps, i) + q.seventh,
      quality: q.quality,
      fn: q.fn,
      steps: q.steps,
      seventhSteps: q.seventhSteps,
      keyTone: i === 0
    }));
  }

  /* every chord you might reasonably want in this key, grouped for display */
  function library(key, mode) {
    mode = mode === 'minor' ? 'minor' : 'major';
    const sc = scale(key, mode);
    const n = speller(key, mode);
    const triads = sc.map(d => ({ name: d.name, roman: d.roman, quality: d.quality, fn: d.fn }));
    const sevenths = sc.map(d => ({ name: d.seventh, roman: d.roman + '7', quality: 'seventh', fn: d.fn }));
    const colour = [
      { name: n(0) + 'sus2', roman: 'Isus2', fn: 'open and airy — the third is missing' },
      { name: n(0) + 'sus4', roman: 'Isus4', fn: 'suspended — it wants to fall back to the third' },
      { name: n(0) + 'add9', roman: 'Iadd9', fn: 'a major triad with a 9th on top' },
      { name: n(0) + '6', roman: 'I6', fn: 'sweet, vintage, jazzy-pop' },
      { name: n(0) + (mode === 'minor' ? 'm7' : 'maj7'), roman: 'Imaj7', fn: mode === 'minor' ? 'the i chord with a soft 7th' : 'lush and dreamy — jazz, bossa, mellow pop' },
      { name: n(5) + (mode === 'minor' ? 'm7' : '9'), roman: 'IV', fn: 'funk in one shape' },
      { name: n(7) + 'sus4', roman: 'Vsus4', fn: 'tension without commitment' },
      { name: n(7) + '7sus4', roman: 'V7sus4', fn: 'the gospel / Motown V chord' },
      { name: n(mode === 'minor' ? 5 : 2) + 'm7', roman: mode === 'minor' ? 'iv7' : 'ii7', fn: 'the jazz colour chord — it makes any progression sound smoother' }
    ];
    /* a chord labelled ♭III / ♭VI / ♭VII is always written with a flat */
    const nBorrowed = (semis, roman) => (/♭/.test(roman) ? FLAT : names(key, mode))[((pc(rootOf(key)) + semis) % 12 + 12) % 12];
    const borrowed = EXTRA[mode].map(e => ({ name: nBorrowed(e.semis, e.roman) + e.sym, roman: e.roman, fn: e.note, borrowed: true }));
    return { key: rootOf(key), mode: mode, triads: triads, sevenths: sevenths, colour: colour, borrowed: borrowed, scale: sc };
  }

  /* ------ progressions ------------------------------------------------- */
  function P(name, romans, genres, level, desc, mode) {
    return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: name, romans: romans, genres: genres || [], level: level || 1, desc: desc || '', mode: mode || 'any' };
  }
  const PROGRESSIONS = [
    P('I–V–vi–IV', ['I', 'V', 'vi', 'IV'], ['pop', 'rock', 'everything'], 1, 'The four chords of a thousand hits. Learn it in every key and you can busk for a living.'),
    P('I–vi–IV–V', ['I', 'vi', 'IV', 'V'], ['50s', 'doo-wop', 'pop'], 1, 'The doo-wop progression — the “heart and soul” loop.'),
    P('vi–IV–I–V', ['vi', 'IV', 'I', 'V'], ['pop', 'punk', 'anthem'], 1, 'The same four numbers starting on the minor: sad verse, hopeful chorus.'),
    P('I–IV–V–IV', ['I', 'IV', 'V', 'IV'], ['rock', 'blues', 'country'], 1, 'The three-chord rock engine.'),
    P('ii–V–I', ['ii', 'V', 'I'], ['jazz', 'standards', 'pop'], 3, 'The most important three chords in jazz — the resolution home.'),
    P('I–V–vi–iii–IV–I–IV–V', ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], ['pop', 'ballad'], 3, 'The “Pachelbel” progression — canon in D, reworked by everyone.'),
    P('12-bar blues', ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'], ['blues', 'rock and roll', 'jam'], 2, 'The form every player must know. Twelve bars, three chords, endless solos.'),
    P('I–♭VII–IV', ['I', '♭VII', 'IV'], ['rock', 'mixolydian', 'classic rock'], 2, 'The mixolydian rock move — no leading tone, all swagger.'),
    P('I–♭III–♭VII–IV', ['I', '♭III', '♭VII', 'IV'], ['rock', 'hard rock'], 3, 'Bluesy rock: bIII and bVII, both borrowed from the parallel minor.'),
    P('Andalusian descent', ['i', 'VII', 'VI', 'V'], ['flamenco', 'rock', 'metal'], 3, 'The Spanish descent: i–VII–VI–V, straight down the scale to a major V.', 'minor'),
    P('i–VI–III–VII', ['i', 'VI', 'III', 'VII'], ['pop', 'minor rock'], 2, 'A minor loop that never resolves — hugely common in modern pop.', 'minor'),
    P('i–iv–v–i', ['i', 'iv', 'v', 'i'], ['folk', 'modal', 'folk rock'], 2, 'Natural minor, no leading tone — the medieval / film-score sound.', 'minor'),
    P('i–V–i–iv', ['i', 'V', 'i', 'iv'], ['classical', 'metal', 'blues'], 3, 'Harmonic minor: the major V in a minor key is where the drama lives.', 'minor'),
    P('I–IV–vi–V', ['I', 'IV', 'vi', 'V'], ['pop punk', 'emo', '2000s'], 2, 'The 2000s radio progression — bright, then suddenly wistful.'),
    P('I–iii–IV–iv', ['I', 'iii', 'IV', 'iv'], ['jazz pop', 'singer-songwriter'], 4, 'Major fourth into minor fourth — the single saddest finger move in pop.'),
    P('I–V–IV–I (12/8 ballad)', ['I', 'V', 'IV', 'I'], ['soul', 'doo-wop', 'gospel'], 2, 'Play it in 12/8 with a triplet feel and it becomes a slow soul ballad.'),
    P('I–vi–ii–V', ['I', 'vi', 'ii', 'V'], ['jazz', 'standards', 'trad pop'], 3, 'The circle of fifths in four chords — it keeps rolling.'),
    P('Imaj7–vi7–ii7–V7', ['Imaj7', 'vi7', 'ii7', 'V7'], ['jazz', 'bossa', 'lounge'], 4, 'The same circle with sevenths everywhere: instant jazz.'),
    P('i–VII–VI–VII', ['i', 'VII', 'VI', 'VII'], ['rock', 'metal', 'film'], 3, 'The “epic minor” loop — huge and endlessly reusable.', 'minor'),
    P('I–♭VI–♭VII–I', ['I', '♭VI', '♭VII', 'I'], ['rock', 'anthem', 'post-grunge'], 3, 'Both flattened chords come from the parallel minor, then resolve up to I.')
  ];

  const QUALITY_OF = name => {
    const sym = suffixOf(name);
    if (/^dim/.test(sym)) return 'diminished';
    if (/^aug/.test(sym)) return 'augmented';
    if (/^m(?!aj)/.test(sym)) return 'minor';
    return 'major';
  };
  function SEVENTH_OF(sym) {
    if (/maj9/.test(sym)) return 'maj9';
    if (/maj7/.test(sym)) return 'maj7';
    if (/m7♭5/.test(sym)) return 'm7♭5';
    if (/^m9$/.test(sym)) return 'm9';
    if (/^m7$/.test(sym)) return 'm7';
    if (/^m6$/.test(sym)) return 'm6';
    if (/^7♯5$/.test(sym)) return '7♯5';
    if (/^7b9$|^7♭9$/.test(sym)) return '7♭9';
    if (/^9$/.test(sym)) return '9';
    if (/^7$/.test(sym)) return '7';
    if (/^6$/.test(sym)) return '6';
    if (/^sus2$/.test(sym)) return 'sus2';
    if (/^sus4$/.test(sym)) return 'sus4';
    if (/^7sus4$/.test(sym)) return '7sus4';
    if (/^add9$/.test(sym)) return 'add9';
    return '';
  }

  /* roman numerals -> concrete chord names, honouring the case of the numeral
   * (uppercase = major, lowercase = minor) exactly as classical notation does */
  function concrete(key, mode, romans) {
    mode = mode === 'minor' ? 'minor' : 'major';
    const sc = scale(key, mode);
    const n = speller(key, mode);
    const steps = mode === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
    return romans.map(raw => {
      const r = String(raw).replace(/([♭b])/g, '♭').replace(/^b/, '♭');
      const m = /^(♭?)([ivIV]+|VII|VI|V|IV|III|II|I)(°?)(.*)$/.exec(r);
      if (!m) return raw;
      const flatPrefix = m[1] === '♭';
      const numeral = m[2];
      const diminished = m[3] === '°';
      const tail = m[4] || '';
      const index = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'].indexOf(numeral.toUpperCase());
      if (index < 0) return raw;
      let semis = steps[index] + (flatPrefix ? -1 : 0);
      const minorish = numeral === numeral.toLowerCase();
      const symbols = { '': '', maj7: 'maj7', m7: 'm7', '7': '7', '9': '9', sus4: 'sus4', sus2: 'sus2', '7sus4': '7sus4', 'm7♭5': 'm7♭5', m: 'm', add9: 'add9', maj9: 'maj9', m6: 'm6', '6': '6' };
      const sym = symbols[tail] != null ? symbols[tail] : tail;
      const root = n(semis);
      if (diminished) return root + (sym === '7' ? 'dim7' : (sym === 'm7♭5' ? 'm7♭5' : 'dim'));
      if (minorish) return root + (sym === 'm' ? 'm' : 'm' + sym);
      /* uppercase numeral with a bare 7 means a dominant seventh */
      return root + (sym === '7' && !/maj/.test(tail) ? '7' : sym);
    });
  }

  /* what is this chord doing in this key? */
  function romanOf(chord, key, mode) {
    mode = mode === 'minor' ? 'minor' : 'major';
    const r = rootOf(chord), sym = suffixOf(chord);
    const rpc = pc(r);
    const sc = scale(key, mode);
    const quality = QUALITY_OF(chord);
    const seventh = SEVENTH_OF(sym);
    const degree = sc.findIndex(d => pc(d.root) === rpc);
    if (degree >= 0) {
      const d = sc[degree];
      let roman = d.roman;
      if (quality !== d.quality) {
        /* a major chord on a minor degree (or vice versa) is a secondary dominant
         * or a borrowed colour — label it in the case it is actually played */
        if (quality === 'major') roman = roman.toUpperCase().replace('°', '');
        else if (quality === 'minor') roman = roman.toLowerCase().replace('°', '');
        else roman = roman + (quality === 'diminished' ? '°' : 'aug');
        /* a dominant resolves a fifth down — three scale steps up */
        const next = sc[(degree + 3) % sc.length];
        return {
          roman: roman + seventh, fn: 'secondary dominant — it pulls to ' + next.roman + ' (' + next.name + ')',
          inKey: false, borrowed: true, secondary: true, degree: degree + 1
        };
      }
      return { roman: roman + seventh, fn: d.fn, inKey: true, degree: degree + 1 };
    }
    const lib = library(key, mode);
    const exact = lib.borrowed.find(b => b.name === chord) ||
                  lib.colour.find(c => c.name === chord) ||
                  lib.sevenths.find(x => x.name === chord) ||
                  lib.triads.find(t => t.name === chord);
    if (exact) return { roman: exact.roman + (/maj9$|maj7$|m6$|^6$/.test(exact.roman) ? '' : ''), fn: exact.fn || '', inKey: false, borrowed: true };
    return { roman: '?', fn: 'outside the key — a modulation, or a modal borrowing', inKey: false, borrowed: true };
  }

  /* which library progressions use the chords we actually found? */
  function matchingProgressions(key, mode, chords) {
    mode = mode === 'minor' ? 'minor' : 'major';
    const norm = s => String(s).replace(/♭/g, 'b').replace(/♯/g, '#').toLowerCase();
    const wanted = chords.map(norm);
    return PROGRESSIONS
      .filter(p => p.mode === 'any' || p.mode === mode)
      .map(p => {
        const namesInKey = concrete(key, p.mode === 'any' ? mode : p.mode, p.romans);
        const uniqueList = namesInKey.filter((x, i) => namesInKey.indexOf(x) === i);
        const hit = uniqueList.filter(x => wanted.indexOf(norm(x)) >= 0).length;
        /* a progression of twelve bars is not a better guess than one of four
         * just because it repeats the tonic — score on distinct chords */
        return { progression: p, chords: namesInKey, hits: hit, score: hit / Math.max(1, uniqueList.length) };
      })
      .filter(x => x.hits >= Math.min(2, x.progression.romans.length))
      .sort((a, b) => (b.score - a.score) || (b.hits - a.hits) || (a.progression.romans.length - b.progression.romans.length));
  }

  /* the headline function: given a song's analysis, what should you play? */
  function planFor(opts) {
    opts = opts || {};
    const key = opts.key || 'C';
    const mode = opts.mode === 'minor' ? 'minor' : 'major';
    const detected = (opts.chords || []).filter(Boolean);
    const lib = library(key, mode);
    const annotated = detected.map(c => {
      const info = romanOf(c, key, mode);
      return { name: c, roman: info.roman, fn: info.fn, inKey: info.inKey, borrowed: info.borrowed, secondary: info.secondary };
    });
    const missing = lib.triads.filter(t => !detected.some(c => primary(c) === primary(t.name)));
    const seen = [];
    detected.forEach(c => { const p = primary(c); if (seen.indexOf(p) === -1) seen.push(p); });
    lib.triads.forEach(t => { const p = primary(t.name); if (seen.indexOf(p) === -1) seen.push(p); });
    const out = {
      key: rootOf(key), mode: mode, library: lib, detected: annotated,
      progressions: matchingProgressions(key, mode, detected),
      missing: missing, learnOrder: seen, capo: 0, capoNote: '', similar: [], tips: []
    };
    try {
      if (G.TT && G.TT.catalog && G.TT.catalog.suggest) {
        const s = G.TT.catalog.suggest({ chords: detected, key: key, mode: mode, tempo: opts.tempo || 0 });
        out.capo = s.capo; out.capoNote = s.capoNote; out.similar = s.similar; out.tips = s.tips;
      }
    } catch (e) { out.capo = 0; }
    if (!out.capoNote && detected.length) out.capoNote = 'No capo needed — the chords sit in open position.';
    return out;
  }
  function primary(name) {
    const r = rootOf(name);
    const sym = suffixOf(name);
    if (/^dim/.test(sym) || /^m7♭5/.test(sym)) return r + 'dim';
    if (/^aug/.test(sym)) return r + 'aug';
    if (/^m(?!aj)/.test(sym)) return r + 'm';
    if (/^sus2$/.test(sym)) return r + 'sus2';
    if (/^sus4$/.test(sym)) return r + 'sus4';
    return r;
  }

  const api = {
    scale, library, concrete, romanOf, matchingProgressions, planFor, primary,
    pc, rootOf, suffixOf, family, names, speller, PROGRESSIONS,
    NOTE_SHARP: SHARP, NOTE_FLAT: FLAT, FLAT_OF: FLAT_OF, SHARP_OF: SHARP_OF,
    KEYS: (function () {
      const out = [];
      ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].forEach(r => out.push({ name: r, mode: 'major' }));
      ['A', 'B♭', 'B', 'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯'].forEach(r => out.push({ name: r, mode: 'minor' }));
      return out;
    })(),
    keys: function () { return api.KEYS; }
  };
  G.TT = G.TT || {};
  G.TT.chords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
