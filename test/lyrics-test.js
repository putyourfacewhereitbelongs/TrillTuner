/* Trill Tuner — built-in lyric library tests.
 *
 *   node test/lyrics-test.js
 */
'use strict';

const L = require('../public/js/lib/lyricsdb.js');
const C = require('../public/js/lib/catalog.js');

let failures = 0;
function ok(cond, label, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra != null ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

ok(L.LYRICS.length >= 100, 'the lyric library is a real collection', L.LYRICS.length + ' songs');
ok(C.SONGS.length >= 350, 'the play-along catalog grew with the extra book', C.SONGS.length + ' songs');

const grace = L.search('Amazing Grace');
ok(grace.length && /sweet the sound/i.test(grace[0].lyrics),
  'title search returns public-domain lyrics', grace[0] && grace[0].title);

const first = L.search('how sweet the sound');
ok(first.length && /Amazing Grace/i.test(first[0].title),
  'a first line finds the hymn', first[0] && first[0].title);

const sailor = L.search('drunken sailor');
ok(sailor.length && /early in the morning/i.test(sailor[0].lyrics),
  'shanty search works', sailor[0] && sailor[0].title);

const trad = L.search('Traditional');
ok(trad.length >= 10, 'an artist name on its own is enough', trad.length + ' traditional songs');

const miss = L.search('zzzznotareallyric');
ok(miss.length === 0, 'a miss is an empty list, not an error', 'clean');

const chart = L.chartFromSong(C.SONGS.find(s => s.title === 'Dreams') || C.SONGS[0]);
ok(chart && chart.lyrics.length > 100 && /Play-along chart/i.test(chart.lyrics),
  'catalog songs become a play-along sheet, not a copyright dump', chart.lyrics.length + ' chars');

const dreams = L.bestMatch('Dreams', C.search('Dreams', { cap: 8 }).songs);
ok(dreams && /Dreams/i.test(dreams.title) && /Fleetwood/i.test(dreams.artist),
  '“Dreams” prefers the Fleetwood Mac chart over a hymn that mentions dreaming',
  dreams ? dreams.title + ' — ' + dreams.artist : 'nothing');

const beatles = C.search('beatles', { cap: 40 });
ok(beatles.songs.length >= 10, 'Beatles search covers a real set', beatles.songs.length + ' songs');

const fleetwood = C.search('Fleetwood Mac', { cap: 20 });
ok(fleetwood.songs.length >= 4 && fleetwood.songs.some(s => /Dreams/i.test(s.title)),
  'Fleetwood Mac still finds Dreams', fleetwood.songs.map(s => s.title).slice(0, 5).join(', '));

console.log(failures === 0 ? '\n✅ ALL LYRIC LIBRARY TESTS PASSED' : `\n❌ ${failures} LYRIC LIBRARY TEST(S) FAILED`);
process.exit(failures ? 1 : 0);
