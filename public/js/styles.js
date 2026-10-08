/* Trill Tuner — Styles & players.
 *
 * The songbook answers "what can I play?". This view answers "whose playing do
 * I want to sound like — and how do I get there?" Every artist in the book gets
 * a page: what they are known for, the gear and the techniques that make the
 * sound, the songs of theirs we can hand you, a rig recipe that is actually set
 * up for that genre, and the lessons that teach the skill. Underneath is a
 * technique glossary that says what each move is, who is famous for it, and the
 * drill that builds it.
 */
(function () {
  'use strict';

  const SY = {};
  const els = {};
  const state = { genre: '', sort: 'az', q: '', open: '' };

  const el = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------------ */
  /* genre → rig recipe. A style page should be able to hand you a sound. */
  /* ------------------------------------------------------------------ */
  const GENRE_RULES = [
    [/djent|progressive metal|math rock/, 'modern-metal'],
    [/metalcore|drop/, 'droptuned'],
    [/thrash|80s metal/, '80s-metal'],
    [/death metal/, 'swedish-death'],
    [/sludge|doom|stoner/, 'stoner'],
    [/shoegaze|noise pop/, 'shoegaze'],
    [/dream pop|ambient|post-rock|atmospheric/, 'dream-pop'],
    [/psychedelic|garage/, 'garage'],
    [/alt.?country|country|nashville|bluegrass|americana/, 'country'],
    [/blues rock|southern rock/, 'blues-rock'],
    [/blues|delta|chicago/, 'blues'],
    [/funk|soul|r&b|groove/, 'funk'],
    [/jazz|swing|bebop|standards|bossa|samba/, 'jazz'],
    [/surf|instrumental rock|spaghetti/, 'surf'],
    [/punk|grunge|hard rock|garage rock|90s/, 'hard-rock'],
    [/indie|alternative|britpop|new wave|post-punk/, 'indie'],
    [/acoustic|folk|singer.?songwriter|fingerstyle|travis/, 'acoustic'],
    [/rockabilly|rock & roll|rock and roll|50s/, 'rockabilly'],
    [/classic rock|rock|pop|soul/, 'classic-rock']
  ];

  function recipeFor(genres) {
    const list = (genres || []).join(' ').toLowerCase();
    for (let i = 0; i < GENRE_RULES.length; i++) {
      if (GENRE_RULES[i][0].test(list)) return GENRE_RULES[i][1];
    }
    return '';
  }

  function recipes() {
    try { return (TT.rig && TT.rig.recipes && TT.rig.recipes()) || []; } catch (e) { return []; }
  }

  function recipeName(id) {
    const r = recipes().filter(x => x.id === id)[0];
    return r ? r.name : '';
  }

  /* ------------------------------------------------------------------ */
  /* the technique glossary                                              */
  /* ------------------------------------------------------------------ */
  const TECHNIQUES = [
    { name: 'Alternate picking', level: 'core', what: 'Every pick stroke alternates down, up, down, up — so the pick never has to reset.', who: 'Paul Gilbert, John Petrucci', drill: 'One string, eight notes per click, strict down-up. Bump the metronome 4 BPM only when a full minute is clean.' },
    { name: 'Economy picking', level: 'advanced', what: 'Down-strokes sweep across adjacent strings and up-strokes only when the direction changes — fewer wasted movements than strict alternate.', who: 'Frank Gambale, Eric Johnson', drill: 'Three-notes-per-string runs: two down strokes then up, on each string change.' },
    { name: 'Legato', level: 'core', what: 'Hammer-ons and pull-offs do the work; the pick only starts the phrase.', who: 'Joe Satriani, Allan Holdsworth', drill: 'Play a five-note phrase with one pick stroke, aiming for equal volume on every note.' },
    { name: 'String skipping', level: 'intermediate', what: 'Jumping over a string instead of crossing it — a wide, angular sound.', who: 'Paul Gilbert, Guthrie Govan', drill: 'Alternate low E and D, then A and G, keeping the pick moving in the air.' },
    { name: 'Palm muting', level: 'core', what: 'The edge of the picking hand rests on the strings at the bridge, choking the sustain into a percussive thump.', who: 'James Hetfield, Malcolm Young', drill: 'One chord, eight muted notes per click — the pitch should be audible but choked.' },
    { name: 'Down-picking', level: 'core', what: 'Every note is a down stroke: heavier, more even, and the reason thrash riffs sound like a machine.', who: 'James Hetfield, Scott Ian', drill: 'Chug on the low E at 100 BPM, sixteenths, no up-strokes at all.' },
    { name: 'Tremolo picking', level: 'intermediate', what: 'Very fast alternate picking on one note or a pair of notes.', who: 'Dick Dale, Black Metal players', drill: 'Pick one note as fast as you can hold it even for ten seconds, then slow down until it is even.' },
    { name: 'Sweep picking', level: 'advanced', what: 'An arpeggio played as one continuous up or down stroke across strings, one note at a time.', who: 'Yngwie Malmsteen, Jason Becker', drill: 'Three-string triad, rolled fingers, metronome at 50 — no two notes may overlap.' },
    { name: 'Hybrid picking', level: 'advanced', what: 'A pick plus the free fingers, so you can play chords and a melody with the same hand.', who: 'Danny Gatton, Albert Lee', drill: 'Hold a chord and pluck the top two strings with the middle and ring fingers.' },
    { name: 'Two-hand tapping', level: 'advanced', what: 'The picking hand hammers notes on the fretboard, producing lines a pick cannot reach.', who: 'Eddie Van Halen, Tosin Abasi', drill: 'Tap the 12th fret, hammer 9 and 7, pull back. Match the volume of both hands.' },
    { name: 'Bending to pitch', level: 'core', what: 'Pushing a string sideways until it reaches the target note — the vocal part of a solo.', who: 'David Gilmour, B.B. King', drill: 'Bend the G string 7th fret to match the 9th fret exactly, then check with the tuner.' },
    { name: 'Vibrato', level: 'core', what: 'Regular, controlled pitch movement on a held note — the most recognisable part of a player\'s voice.', who: 'B.B. King, Angus Young', drill: 'Four even vibrations per click, then six. Wrist, not finger.' },
    { name: 'Sliding & glissando', level: 'core', what: 'Moving to a note by sliding, so the ear hears the journey rather than a jump.', who: 'Duane Allman, David Gilmour', drill: 'Play a phrase, then play it again with every change of position as a slide.' },
    { name: 'Harmonics (natural & artificial)', level: 'intermediate', what: 'Touching a string at a node to silence the fundamental and ring a bell-like overtone.', who: 'Eddie Van Halen, Zakk Wylde', drill: 'Natural harmonics over frets 12, 7, 5. Then pinch harmonics by graze-then-pick.' },
    { name: 'Volume-knob dynamics', level: 'core', what: 'The guitar\'s volume knob as part of the playing: cleaning up a distorted amp for the verse.', who: 'Jeff Beck, Gary Moore', drill: 'Loop a distorted riff and ride the volume knob; find the clean point and stay just under it.' },
    { name: 'Fingerstyle independence', level: 'intermediate', what: 'Thumb on the bass notes while fingers pick a melody on top — two parts at once.', who: 'Chet Atkins, Mark Knopfler', drill: 'Thumb plays quarter notes on the low strings while the fingers pick the melody; never let the thumb stop.' },
    { name: 'Travis picking', level: 'intermediate', what: 'A repeating thumb pattern on the bass with a syncopated melody in the fingers.', who: 'Merle Travis, Paul Simon', drill: 'Alternate bass strings 6-4-5-4 under the chords of a song you know.' },
    { name: 'Funk 16ths', level: 'intermediate', what: 'Tight, muted sixteenth-note scratching with an accented right hand.', who: 'Nile Rodgers, Cory Wong', drill: 'Mute everything with the fretting hand and play sixteenths at 90 BPM — all rhythm, no pitch.' },
    { name: 'Wah as a voice', level: 'intermediate', what: 'The wah pedal used rhythmically, so it becomes part of the phrasing rather than an effect.', who: 'Jimi Hendrix, Kirk Hammett', drill: 'Play a single note and move the wah in time with the click before you add any other notes.' },
    { name: 'CAGED shapes', level: 'core', what: 'Five moveable chord shapes that between them cover the whole fretboard for any chord.', who: 'everyone — it is how the neck is mapped', drill: 'Play one chord in all five shapes up the neck, then name the notes on the lowest string.' },
    { name: 'Barre chords', level: 'core', what: 'One finger holding down all six strings, which makes every shape moveable.', who: 'every rock and punk player ever', drill: 'Slide an F shape to G, A, B♭. Aim for every string ringing, no buzz.' },
    { name: 'Power chords', level: 'core', what: 'Root and fifth only — no third, so the chord works whether the song is happy or sad.', who: 'Punk, metal and grunge', drill: 'Two-string shapes up and down the low strings with palm muting between changes.' },
    { name: 'Open-string drones', level: 'intermediate', what: 'Melody notes played against one or two strings left open, ringing underneath.', who: 'Jimmy Page, Jimmy Page-style folk rock', drill: 'Hold an E drone and play a scale on the strings above it; keep the drone ringing.' },
    { name: 'Odd metres', level: 'advanced', what: 'Riffs grouped in 5, 7 or 9 — the groove comes from where the grouping starts again.', who: 'Periphery, Tool', drill: 'Count the grouping out loud (1-2-3 · 1-2-3 · 1-2) against a metronome on the beat.' },
    { name: 'Chord melody', level: 'advanced', what: 'The melody and the harmony are played at the same time, in the same hand and the same breath.', who: 'Joe Pass, Bill Frisell', drill: 'Take a melody you know and put a chord under every note, one chord per melody note.' },
    { name: 'Motif development', level: 'advanced', what: 'A short idea is repeated, transposed and stretched instead of a stream of new licks.', who: 'B.B. King, David Gilmour', drill: 'Improvise for two minutes using only three notes; move the phrase, never the shape.' },
    { name: 'Call and response', level: 'core', what: 'Play a phrase, then answer it — the solo becomes a conversation instead of a monologue.', who: 'every blues player, Chuck Berry', drill: 'One bar of playing, one bar of silence; the silence has to be in time.' },
    { name: 'Tone from the right hand', level: 'core', what: 'Attack, angle and pick position change the sound more than any pedal.', who: 'Albert Collins, Mark Knopfler', drill: 'Play the same phrase with the pick near the neck, then near the bridge, then with fingers.' }
  ];

  /* ------------------------------------------------------------------ */
  /* rendering                                                           */
  /* ------------------------------------------------------------------ */
  function artistSongs(a) {
    try { return TT.catalog.artistSongs(a.name) || []; } catch (e) { return []; }
  }

  function songsAnywhere(a) {
    return (a.songs || []).filter(t => {
      try { return TT.catalog.SONGS.some(s => s.title === t); } catch (e) { return false; }
    });
  }

  /* famous titles we do not carry yet — still useful as a listening list */
  function songsMissing(a) {
    const have = songsAnywhere(a);
    return (a.songs || []).filter(t => have.indexOf(t) < 0);
  }

  function lessonsFor(a) {
    let ls = [];
    try { ls = TT.catalog.LESSONS || []; } catch (e) { return []; }
    const titles = artistSongs(a).map(s => s.title);
    const techniques = (a.techniques || []).map(t => t.toLowerCase());
    return ls.filter(l => {
      const hay = (l.title + ' ' + l.skill + ' ' + (l.tags || []).join(' ') + ' ' + (l.songs || []).join(' ')).toLowerCase();
      if (titles.some(t => hay.indexOf(t.toLowerCase()) >= 0)) return true;
      return techniques.some(t => t.split(/\s+/).some(w => w.length > 4 && hay.indexOf(w) >= 0));
    }).slice(0, 4);
  }

  function genres() {
    const set = {};
    try { TT.catalog.ARTISTS.forEach(a => (a.genres || []).forEach(g => { set[g] = (set[g] || 0) + 1; })); } catch (e) {}
    return Object.keys(set).sort();
  }

  function filtered() {
    let list = [];
    try { list = (TT.catalog.ARTISTS || []).slice(); } catch (e) {}
    const q = state.q.trim().toLowerCase();
    if (state.genre) list = list.filter(a => (a.genres || []).indexOf(state.genre) >= 0);
    if (q) {
      list = list.filter(a => {
        const hay = [a.name, (a.genres || []).join(' '), a.knownFor, a.signature, (a.techniques || []).join(' '), (a.songs || []).join(' ')].join(' ').toLowerCase();
        return hay.indexOf(q) >= 0;
      });
    }
    if (state.sort === 'songs') list.sort((x, y) => artistSongs(y).length - artistSongs(x).length || x.name.localeCompare(y.name));
    else if (state.sort === 'genre') list.sort((x, y) => String(x.genres[0]).localeCompare(String(y.genres[0])) || x.name.localeCompare(y.name));
    else list.sort((x, y) => x.name.localeCompare(y.name));
    return list;
  }

  function card(a) {
    const songs = artistSongs(a);
    const d = document.createElement('div');
    d.className = 'card sy-card' + (state.open === a.name ? ' open' : '');
    d.dataset.artist = a.name;
    d.innerHTML =
      '<div class="sy-name">' + esc(a.name) + '</div>' +
      '<div class="sy-genres">' + (a.genres || []).map(g => '<span class="pill">' + esc(g) + '</span>').join('') + '</div>' +
      '<div class="sy-known">' + esc(a.knownFor || '') + '</div>' +
      '<div class="sy-counts">' + songs.length + ' song' + (songs.length === 1 ? '' : 's') + ' in the songbook' +
      (recipeFor(a.genres) ? ' · rig: ' + esc(recipeName(recipeFor(a.genres))) : '') + '</div>';
    d.addEventListener('click', () => open_(a.name));
    return d;
  }

  function open_(name) {
    state.open = state.open === name ? '' : name;
    renderList();
    renderDetail();
    if (state.open && els.detail) els.detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function renderList() {
    if (!els.list) return;
    const list = filtered();
    els.list.innerHTML = '';
    if (!list.length) {
      els.list.appendChild(Object.assign(document.createElement('div'), { className: 'dim', textContent: 'No player matches that — try a genre like “blues”, “funk”, “jazz” or “shoegaze”.' }));
    } else {
      list.forEach(a => els.list.appendChild(card(a)));
    }
    if (els.count) els.count.textContent = list.length + ' of ' + (TT.catalog.ARTISTS || []).length + ' players' + (state.genre ? ' · ' + state.genre : '');
  }

  function renderDetail() {
    if (!els.detail) return;
    const a = (TT.catalog.ARTISTS || []).filter(x => x.name === state.open)[0];
    if (!a) {
      els.detail.innerHTML = '<div class="card-h">Pick a player</div><div class="dim">Every artist in the book has a page: what they are known for, the gear, the techniques, the songs we can hand you, a rig recipe and the lessons that teach the skill.</div>';
      return;
    }
    const songs = artistSongs(a);
    const missing = songsMissing(a);
    const rig = recipeFor(a.genres);
    const lessons = lessonsFor(a);
    const techs = a.techniques || [];

    els.detail.innerHTML =
      '<div class="sy-head">' +
        '<div><div class="sy-title">' + esc(a.name) + '</div>' +
        '<div class="sy-genres">' + (a.genres || []).map(g => '<span class="pill">' + esc(g) + '</span>').join('') + '</div></div>' +
        '<button class="btn btn-ghost tiny" id="sy-random">🎲 Surprise me</button>' +
      '</div>' +
      '<div class="sy-block"><b>Known for</b><div>' + esc(a.knownFor || '') + '</div></div>' +
      '<div class="sy-block"><b>The sound</b><div>' + esc(a.signature || '') + '</div></div>' +
      '<div class="sy-block"><b>The moves</b><div class="chipwrap">' +
        techs.map(t => '<button class="chip" data-tech="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div></div>' +
      '<div class="sy-block"><b>Play these</b>' +
        (songs.length ? '<div class="sy-songs">' + songs.map(s =>
          '<div class="sy-song" data-song="' + esc(s.id) + '">' +
            '<div class="sy-song-t">' + esc(s.title) + '<span class="dim smallish"> · ' + esc(s.key) + ' · ' + s.bpm + ' BPM' + (s.capo ? ' · capo ' + s.capo : '') + '</span></div>' +
            '<div class="dim smallish">' + esc((s.chords || []).join('  ')) + '</div>' +
            '<div class="sy-song-b"><button class="btn btn-ghost tiny" data-chart="' + esc(s.id) + '">🎸 Play-along chart</button>' +
            '<button class="btn btn-ghost tiny" data-lyr="' + esc(s.id) + '">Lyrics</button></div>' +
          '</div>').join('') + '</div>'
        : '<div class="dim">Nothing of theirs in the songbook yet — use the search below.</div>') +
      '</div>' +
      (missing.length ? '<div class="sy-block"><b>Also listen to</b><div class="chipwrap">' +
        missing.map(t => '<button class="chip" data-listen="' + esc(t) + '">' + esc(t) + '</button>').join('') +
        '</div><div class="dim smallish">Not in the offline songbook — these open a lyric search for the title.</div></div>' : '') +
      '<div class="sy-actions">' +
        (rig ? '<button class="btn btn-primary tiny" id="sy-rig">🔊 Load the ' + esc(recipeName(rig)) + ' rig</button>' : '') +
        '<button class="btn tiny" id="sy-search">🔍 Search the songbook for ' + esc(a.name.split(' ')[0]) + '</button>' +
        '<button class="btn btn-ghost tiny" id="sy-bpm">♩ Set the metronome to 100</button>' +
      '</div>' +
      (lessons.length ? '<div class="sy-block"><b>Lessons that build this</b><div class="sy-lessons">' +
        lessons.map(l => '<div class="sy-lesson" data-lesson="' + esc(l.id) + '">' +
          '<b>' + esc(l.title) + '</b><div class="dim smallish">' + esc(l.skill) + ' · ' + esc(l.description) + '</div></div>').join('') +
        '</div></div>' : '');

    /* hand-offs */
    const song = id => (TT.catalog.SONGS || []).filter(s => s.id === id)[0];
    els.detail.querySelectorAll('[data-chart]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      if (TT.tablab && TT.tablab.openSong) { TT.tablab.openSong(song(b.dataset.chart)); if (TT.app) TT.app.showView('maker'); }
    }));
    els.detail.querySelectorAll('[data-lyr]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const s = song(b.dataset.lyr);
      if (TT.lyrics && s) { TT.lyrics.search({ title: s.title, artist: s.artist }); if (TT.app) TT.app.showView('lyrics'); }
    }));
    els.detail.querySelectorAll('[data-listen]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      if (TT.lyrics) { TT.lyrics.search(b.dataset.listen); if (TT.app) TT.app.showView('lyrics'); }
    }));
    els.detail.querySelectorAll('[data-tech]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      if (els.techQ) els.techQ.value = b.dataset.tech;
      renderGlossary();
      if (els.glossary) els.glossary.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
    els.detail.querySelectorAll('[data-song]').forEach(d => d.addEventListener('click', () => {
      const s = song(d.dataset.song);
      if (s && TT.tablab && TT.tablab.openSong) { TT.tablab.openSong(s); if (TT.app) TT.app.showView('maker'); }
    }));
    els.detail.querySelectorAll('[data-lesson]').forEach(d => d.addEventListener('click', () => {
      if (TT.learn && TT.learn.focus) { TT.learn.focus(d.dataset.lesson); if (TT.app) TT.app.showView('learn'); }
    }));
    const rb = el('sy-rig');
    if (rb) rb.addEventListener('click', () => {
      const rec = recipes().filter(x => x.id === rig)[0];
      if (rec && TT.rig && TT.rig.loadRecipe) {
        TT.rig.loadRecipe(rec);
        if (TT.app) TT.app.showView('rig');
        if (TT.app && TT.app.assist) TT.app.assist('Loaded the ' + rec.name + ' rig — amp, cab, pedals and settings are all set for ' + a.name + '\'s side of the world.');
      }
    });
    const sb = el('sy-search');
    if (sb) sb.addEventListener('click', () => {
      if (TT.songs && TT.songs.search) TT.songs.search(a.name);
      if (TT.app) TT.app.showView('songs');
    });
    const bb = el('sy-bpm');
    if (bb) bb.addEventListener('click', () => {
      if (TT.metronome && TT.metronome.setBpm) { TT.metronome.setBpm(100); if (TT.metronome.launch) TT.metronome.launch(100); }
      if (TT.app) TT.app.showView('metronome');
    });
    const rnd = el('sy-random');
    if (rnd) rnd.addEventListener('click', () => {
      const list = TT.catalog.ARTISTS || [];
      open_(list[Math.floor(Math.random() * list.length)].name);
    });
  }

  function renderGlossary() {
    if (!els.glossary) return;
    const q = (els.techQ && els.techQ.value || '').trim().toLowerCase();
    const list = TECHNIQUES.filter(t => !q || (t.name + ' ' + t.what + ' ' + t.who).toLowerCase().indexOf(q) >= 0);
    els.glossary.innerHTML = '<div class="card-h small">Technique glossary — ' + list.length + ' of ' + TECHNIQUES.length + ' moves</div>' +
      list.map(t => '<div class="sy-tech"><div class="sy-tech-h"><b>' + esc(t.name) + '</b><span class="pill">' + esc(t.level) + '</span></div>' +
        '<div>' + esc(t.what) + '</div>' +
        '<div class="dim smallish">Heard on: ' + esc(t.who) + '</div>' +
        '<div class="sy-drill"><b>Drill</b> ' + esc(t.drill) + '</div></div>').join('');
  }

  SY.init = function () {
    if (SY._ready) return;
    SY._ready = true;
    els.q = el('sy-q'); els.form = el('sy-form'); els.genre = el('sy-genre');
    els.sort = el('sy-sort'); els.count = el('sy-count'); els.list = el('sy-list');
    els.detail = el('sy-detail'); els.glossary = el('sy-glossary'); els.techQ = el('sy-tech-q');

    if (els.genre) {
      genres().forEach(g => els.genre.appendChild(Object.assign(document.createElement('option'), { value: g, textContent: g })));
    }
    if (els.form) els.form.addEventListener('submit', e => {
      e.preventDefault();
      state.q = els.q ? els.q.value : '';
      renderList();
    });
    if (els.q) els.q.addEventListener('input', () => { state.q = els.q.value; renderList(); });
    if (els.genre) els.genre.addEventListener('change', () => { state.genre = els.genre.value; renderList(); });
    if (els.sort) els.sort.addEventListener('change', () => { state.sort = els.sort.value; renderList(); });
    if (els.techQ) els.techQ.addEventListener('input', renderGlossary);
    const clr = el('sy-clear');
    if (clr) clr.addEventListener('click', () => {
      state.q = ''; state.genre = ''; state.sort = 'az'; state.open = '';
      if (els.q) els.q.value = '';
      if (els.genre) els.genre.value = '';
      if (els.sort) els.sort.value = 'az';
      renderList(); renderDetail();
    });
    const rnd = el('sy-random-top');
    if (rnd) rnd.addEventListener('click', () => {
      const list = TT.catalog.ARTISTS || [];
      open_(list[Math.floor(Math.random() * list.length)].name);
    });

    /* a default page so the view is never empty */
    const first = (TT.catalog.ARTISTS || []).filter(a => (a.songs || []).indexOf('Little Wing') >= 0)[0];
    if (first) state.open = first.name;
    renderList();
    renderDetail();
    renderGlossary();
  };

  SY.filtered = filtered;
  SY.TECHNIQUES = TECHNIQUES;
  SY.recipeFor = recipeFor;
  SY.open = open_;
  window.TT = window.TT || {};
  window.TT.styles = SY;
})();
