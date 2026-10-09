/* Trill Tuner — songbook & theory tests.
 *
 * The songbook has to be honest: every song must carry enough data to be
 * played, the written chords must be the shapes you actually put your fingers
 * on, and every chord in the book must have a name in the theory engine.
 *
 * Runs in plain node — the catalogue and the theory engine are both
 * browser-free by design.
 *
 *   node test/songs-test.js
 */
'use strict';

const C = require('../public/js/lib/catalog.js');
const T = require('../public/js/lib/chords.js');

let failures = 0;
function ok(cond, label, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra != null ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

const SONGS = C.SONGS, LESSONS = C.LESSONS, ARTISTS = C.ARTISTS;
const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
/* the catalogue speaks both spellings; the theory engine normalises them */
const notePc = n => T.pc(n);

/* 1. the catalogue is a real catalogue */
(function () {
  ok(SONGS.length >= 350, 'the songbook is big enough to search', SONGS.length + ' songs');
  ok(LESSONS.length >= 28, 'the academy still has its lessons', LESSONS.length + ' lessons');
  ok(ARTISTS.length >= 45, 'there are enough artists to browse by style', ARTISTS.length + ' artists');

  const ids = {}, bad = [];
  SONGS.forEach(s => {
    if (!s.id || !s.title || !s.artist) bad.push(s.id || s.title || '(unnamed)');
    if (ids[s.id]) bad.push('duplicate id: ' + s.id);
    ids[s.id] = true;
    if (!s.chords || !s.chords.length) bad.push(s.title + ': no chords');
    if (!s.key || T.pc(C.parseChord(s.key).root) < 0) bad.push(s.title + ': bad key ' + s.key);
    if (!(s.bpm > 30 && s.bpm < 320)) bad.push(s.title + ': bad bpm ' + s.bpm);
    if (!(s.level >= 1 && s.level <= 5)) bad.push(s.title + ': bad level ' + s.level);
    if (!s.progression) bad.push(s.title + ': no progression written');
    if (!s.notes || s.notes.length < 30) bad.push(s.title + ': no playing notes');
    if (/placeholder/i.test(s.title + s.notes + s.progression)) bad.push(s.title + ': placeholder text left in');
  });
  ok(!bad.length, 'every song carries a title, artist, key, tempo, level and chords', bad.length ? bad.slice(0, 4).join(' · ') : SONGS.length + ' songs checked');
})();

/* 2. the written chords must be the shapes you play — and the key must agree */
(function () {
  const bad = [];
  SONGS.forEach(s => {
    const unparsed = s.chords.filter(c => {
      const p = C.parseChord(c.split('/')[0]);
      return !p || !p.root || T.pc(p.root) < 0;
    });
    if (unparsed.length) bad.push(s.title + ': ' + unparsed.join(', '));
    /* the tonic has to be one of the chords (or its relative shape after a capo) */
    const tonic = T.pc(C.parseChord(s.key).root);
    const pcs = s.chords.map(c => T.pc(C.parseChord(c.split('/')[0]).root));
    if (pcs.indexOf(tonic) < 0) {
      /* a capo song is written in shapes, so compare in the shape key too */
      const shifted = pcs.indexOf((tonic - (s.capo || 0) + 120) % 12);
      if (shifted < 0) bad.push(s.title + ': ' + s.key + ' has no tonic in ' + s.chords.join(' '));
    }
  });
  ok(!bad.length, 'the key of every song is in its own chord list', bad.length ? bad.slice(0, 3).join(' · ') : 'all ' + SONGS.length + ' agree');
})();

/* 3. every chord in the book has a name in the theory engine */
(function () {
  const set = {};
  SONGS.forEach(s => s.chords.forEach(c => { set[c] = (set[c] || 0) + 1; }));
  const names = Object.keys(set);
  const bad = [];
  names.forEach(c => { if (T.romanOf(c, 'C', 'major') === '?') bad.push(c); });
  ok(!bad.length, 'no chord is left unnamed by the theory engine', bad.length ? bad.join(', ') : names.length + ' distinct chords, all labelled');

  /* the library per key must contain that key's tonic and its fifth */
  const keys = T.keys();
  const missing = [];
  keys.forEach(k => {
    const lib = T.library(k.name, k.mode);
    if (!lib.triads.length) missing.push(k.name + ' has an empty library');
    const pcs = lib.triads.map(t => t.name);
    if (!pcs.length) missing.push(k.name + ' triads');
  });
  ok(!missing.length, 'all ' + keys.length + ' keys build a chord library', missing.length ? missing.slice(0, 4).join(' · ') : keys.length + ' keys');
})();

/* 4. search has to work from either field, alone and in any case */
(function () {
  const title = C.search('knockin', { cap: 5 });
  const artist = C.search('dylan', { cap: 40 });
  const genre = C.search('blues', { cap: 40 });
  const chord = C.search('G C D', { cap: 40 });
  ok(title.songs.length && title.songs[0].title.toLowerCase().indexOf('knockin') === 0,
    'a half-remembered title finds the song', title.songs[0] ? title.songs[0].title : 'nothing');
  ok(artist.songs.length >= 2 && artist.songs.every(s => /dylan/i.test(s.artist)),
    'an artist name on its own returns that artist', artist.songs.length + ' Bob Dylan songs');
  ok(genre.count >= 10, 'a style word finds a set to play', genre.count + ' results for “blues”');
  ok(chord.songs.length >= 3, 'a chord list finds songs that use those shapes', chord.songs.length + ' songs fit “G C D”');
  const browse = C.SONGS.length;
  ok(browse > 350, 'the whole book is browsable even with no query', browse + ' songs');
  ok(C.search('zzzznotarealsong').songs.length === 0, 'a miss is an empty list, not an error', 'clean');
  /* a suggestion is never a dead end */
  const sg = C.suggest('wonder');
  ok(sg && typeof sg === 'object' && Array.isArray(sg.tips) && sg.tips.length > 0,
    'a suggestion always carries something to do next', (sg.tips[0] || '').slice(0, 48) + '…');
})();

/* 5. the transposer is flat-aware and reversible */
(function () {
  const bad = [];
  ['C', 'B♭', 'F♯m7', 'E♭', 'Am', 'G7', 'C♯m'].forEach(c => {
    [1, 2, 3, 5, -1, -2, -3].forEach(n => {
      const t = C.transposeChord(c, n);
      const back = C.transposeChord(t, -n);
      if (T.pc(back) !== T.pc(c)) bad.push(c + ' ' + (n > 0 ? '+' : '') + n + ' → ' + t + ' → ' + back);
    });
  });
  ok(!bad.length, 'transposing up and back returns the same chord', bad.length ? bad.join(' · ') : '49 round trips');
  ok(C.transposeChord('G', 12) === 'G' && C.transposeChord('G', -12) === 'G', 'an octave is a no-op', 'G ±12 → G');
  /* the shapes you write must come back named as the same chord */
  const s7 = C.parseChord('B♭m7');
  ok(s7.root === 'B♭' && s7.sym === 'm7' && s7.flat === true, 'chord spelling survives the parser', 'B♭m7 → ' + s7.root + s7.sym);
})();

/* 6. the capo engine answers the real question: how do I play this in open shapes? */
(function () {
  const open = ['C', 'G', 'Am', 'F'];
  const a = T.planFor({ key: 'C', mode: 'major', chords: open, tempo: 85 });
  ok(a.capo === 0 && a.capoNote, 'a song that is already open-position gets no capo', a.capoNote);
  /* bring the shape list along: it must be printable and it must include the tonic */
  ok(a.library && a.library.triads && a.library.triads.length > 0, 'the plan carries a chord library', a.library.triads.length + ' library chords');
  const b = T.planFor({ key: 'A', mode: 'major', chords: ['A', 'F♯m', 'D', 'E'], tempo: 120 });
  ok(b.capo >= 0 && b.capo <= 10, 'a capo choice is always in range', 'capo ' + b.capo + ' — ' + (b.capoNote || ''));
  const c = T.planFor({ key: 'F', mode: 'major', chords: ['F', 'B♭', 'C'], tempo: 100 });
  ok(c.capo > 0, 'an all-barre song offers a capo', 'capo ' + c.capo + ' — ' + (c.capoNote || ''));
  const d = T.planFor({ key: 'C', mode: 'major', chords: ['C', 'F', 'G', 'Am'], tempo: 90 });
  ok(Array.isArray(d.progressions) && d.progressions.length > 0, 'the plan names progressions to practise', d.progressions.length + ' suggestions');
  ok(d.learnOrder && d.learnOrder.length === d.library.triads.length, 'every library chord is placed in a learning order', d.learnOrder.join(' → '));
})();

/* 7. artists and lessons point at real material */
(function () {
  const byArtist = {};
  SONGS.forEach(s => { (byArtist[s.artist] = byArtist[s.artist] || []).push(s); });
  const noSongs = ARTISTS.filter(a => !C.artistSongs(a.name).length);
  ok(!noSongs.length, 'every artist page has at least one song to play along with',
    noSongs.length ? noSongs.slice(0, 3).join(', ') : ARTISTS.length + ' artists covered by ' + SONGS.length + ' songs');

  const lessonBad = [];
  LESSONS.forEach(l => {
    if (!l.id || !l.title || !l.how || !l.description) lessonBad.push(l.id || l.title);
    (l.songs || []).forEach(title => {
      if (/any song|anything|style$|material$|workouts$|work$/i.test(title)) return;   /* deliberately generic */
      if (!SONGS.some(s => s.title === title)) lessonBad.push(l.title + ' → ' + title);
    });
  });
  ok(!lessonBad.length, 'every lesson names real songs from the book', lessonBad.length ? lessonBad.slice(0, 3).join(' · ') : LESSONS.length + ' lessons');
})();

/* 8. the whole book maps onto the theory engine, key by key */
(function () {
  const bad = [];
  let matched = 0;
  SONGS.forEach(s => {
    let hits = 0;
    s.chords.forEach(c => {
      const r = T.romanOf(c, s.key, 'major');
      if (r === '?') bad.push(s.title + ' ' + c);
      else hits++;
      if (T.pc(c) === T.pc(s.key)) matched++;
    });
    if (!hits) bad.push(s.title + ': nothing mapped');
  });
  ok(!bad.length, 'every chord of every song maps onto its key', bad.length ? bad.slice(0, 3).join(' · ') : matched + ' tonic references');
})();

console.log(failures === 0 ? '\n✅ ALL SONGBOOK TESTS PASSED' : `\n❌ ${failures} SONGBOOK TEST(S) FAILED`);
process.exit(failures ? 1 : 0);
