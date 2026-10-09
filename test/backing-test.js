/* Trill Tuner — backing studio tests.
 *
 * The generator is ordinary arithmetic, so it can be measured: a render has to
 * be stereo, the right length for its tempo, normalised, audible — and then it
 * has to survive the analysis engine the tab maker uses, which is what makes it
 * useful as a practice bed you can also have read back to you.
 *
 *   node test/backing-test.js
 */
'use strict';

const B = require('../public/js/lib/backing.js');
const D = require('../public/js/lib/dsp.js');

let failures = 0;
function ok(cond, label, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra != null ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

const rms = ch => {
  let s = 0;
  for (let i = 0; i < ch.length; i++) s += ch[i] * ch[i];
  return Math.sqrt(s / ch.length);
};

/* 1. the shape of a render */
(function () {
  const r = B.render({ key: 'C', mode: 'major', style: 'strum', bpm: 90, bars: 4, sr: 22050 });
  ok(r.channels.length === 2, 'a render is stereo', '2 channels');
  const want = Math.ceil(4 * 4 * (60 / 90) * 22050);
  ok(r.channels[0].length > want && r.channels[0].length < want + 22050,
    'the length follows the tempo and the bar count', r.seconds.toFixed(2) + 's for 4 bars at 90 BPM');
  ok(r.peak > 0.85 && r.peak <= 0.91, 'the render is normalised, not clipped', 'peak ' + r.peak.toFixed(3));
  ok(rms(r.channels[0]) > 0.02, 'there is audio in it', 'rms ' + rms(r.channels[0]).toFixed(3));
  ok(r.progression.join(' ') === 'C G Am F', 'the default progression is I–V–vi–IV', r.progression.join(' '));
})();

/* 2. the harmony is real, and it belongs to the key you asked for */
(function () {
  const bad = [];
  [['C', 'major'], ['G', 'major'], ['A', 'minor'], ['E', 'blues'], ['D', 'dorian'], ['F', 'mixolydian']].forEach(([key, mode]) => {
    const r = B.render({ key: key, mode: mode, style: 'arpeggio', bpm: 100, bars: 4, sr: 22050 });
    const names = B.progression(key, mode, 'strum', 4).map(c => c.name);
    if (!r.progression.length || r.progression.join(' ') !== names.join(' ')) bad.push(key + ' ' + mode);
    /* every chord must contain its own root */
    r.chords.forEach(c => {
      if (c.midis.length < 3) bad.push(key + ' ' + mode + ': thin chord ' + c.name);
      if (((c.midis[0] % 12) + 12) % 12 !== c.pc) bad.push(c.name + ' does not sit on its own root');
      if (c.midis.some(m => !(m > 30 && m < 76))) bad.push(c.name + ' is out of the guitar range: ' + c.midis.join(','));
    });
  });
  ok(!bad.length, 'every key and mode builds chords around its own root', bad.length ? bad.slice(0, 3).join(' · ') : '6 keys × 4 chords');
  /* the blues degrees come out as dominant sevenths */
  const blues = B.chordOf('A', 'blues', 'I7');
  ok(/7$/.test(blues.name) && blues.midis.length === 4, 'a blues I7 is a dominant seventh', blues.name + ' ' + blues.midis.join(' '));
})();

/* 3. the parts switches matter */
(function () {
  const full = B.render({ key: 'C', mode: 'major', style: 'rock', bpm: 120, bars: 4, sr: 22050 });
  const quiet = B.render({ key: 'C', mode: 'major', style: 'rock', bpm: 120, bars: 4, sr: 22050, parts: { drums: false, bass: false, chords: true } });
  const none = B.render({ key: 'C', mode: 'major', style: 'rock', bpm: 120, bars: 4, sr: 22050, parts: { drums: false, bass: false, chords: false } });
  ok(rms(quiet.channels[0]) < rms(full.channels[0]) * 0.98, 'turning the kit and the bass off makes it quieter',
    'rms ' + rms(quiet.channels[0]).toFixed(3) + ' vs ' + rms(full.channels[0]).toFixed(3));
  ok(rms(none.channels[0]) < rms(quiet.channels[0]) * 0.9, 'turning everything off leaves almost nothing behind',
    'rms ' + rms(none.channels[0]).toFixed(4));
  const silent = B.render({ key: 'C', mode: 'major', style: 'strum', bpm: 90, bars: 2, sr: 22050, sparkle: false, parts: { drums: false, bass: false, chords: false } });
  const keys = B.render({ key: 'C', mode: 'major', style: 'strum', bpm: 90, bars: 2, sr: 22050, sparkle: false, parts: { drums: false, bass: false, chords: false, piano: true } });
  ok(rms(keys.channels[0]) > rms(silent.channels[0]) * 8, 'piano-only is an audible bed',
    'rms ' + rms(keys.channels[0]).toFixed(3) + ' vs empty ' + rms(silent.channels[0]).toFixed(4));
  ok(keys.parts.piano === true && keys.parts.drums === false, 'the piano flag is on the render');
  const extra = B.render({ key: 'C', mode: 'major', style: 'ballad', bpm: 72, bars: 2, sr: 22050, sparkle: false, parts: { drums: false, bass: false, chords: false, strings: true, organ: true } });
  ok(rms(extra.channels[0]) > rms(silent.channels[0]) * 8, 'strings + organ also render',
    'rms ' + rms(extra.channels[0]).toFixed(3));
})();

/* 4. odd meters, swing and determinism */
(function () {
  const waltz = B.render({ key: 'G', mode: 'major', style: 'strum', bpm: 120, bars: 3, meter: 3, sr: 22050 });
  ok(waltz.beatsPerBar === 3, '3/4 is honoured', waltz.beatsPerBar + ' beats per bar');
  ok(Math.abs(B.durations({ bpm: 120, bars: 3, meter: 3 }).seconds - waltz.seconds) < 1.1,
    'the length readout matches the render', waltz.seconds.toFixed(2) + 's');
  const a = B.render({ key: 'D', mode: 'mixolydian', style: 'funk', bpm: 104, bars: 2, swing: 0.25, seed: 42, sr: 22050 });
  const b = B.render({ key: 'D', mode: 'mixolydian', style: 'funk', bpm: 104, bars: 2, swing: 0.25, seed: 42, sr: 22050 });
  let same = true;
  for (let i = 0; i < a.channels[0].length; i += 97) if (a.channels[0][i] !== b.channels[0][i]) { same = false; break; }
  ok(same, 'the same seed renders the same take', 'seed 42 twice');
  const c = B.render({ key: 'D', mode: 'mixolydian', style: 'funk', bpm: 104, bars: 2, swing: 0.25, seed: 43, sr: 22050 });
  let diff = 0;
  for (let i = 0; i < a.channels[0].length; i += 97) if (a.channels[0][i] !== c.channels[0][i]) diff++;
  ok(diff > 20, 'a new seed is a new take', diff + ' samples differ');
})();

/* 5. round trip: the analysis engine has to be able to read it back */
(function () {
  const r = B.render({ key: 'G', mode: 'major', style: 'strum', bpm: 100, bars: 8, sr: 22050 });
  const mono = r.channels[0].slice(0, 22050 * 6);
  const out = D.analyseChords(mono, r.sr, { fftSize: 4096, hop: 2048 });
  ok(out.key && out.key.key === 'G', 'the tab maker reads the key straight back out of the render',
    JSON.stringify(out.key && out.key.key) + ' ' + (out.key && out.key.mode));
  const strip = n => String(n).replace(/7|maj7|m7|sus\d|add\d|\/.*|\d/g, '');
  const detected = [...new Set(out.chords.map(c => strip(c.name)))];
  const wanted = [...new Set(r.progression.map(strip))];
  const hits = wanted.filter(n => detected.indexOf(n) >= 0);
  ok(hits.length >= wanted.length - 1, 'and it reads the chords back',
    'wanted ' + wanted.join(' ') + ' · heard ' + hits.join(' ') + (hits.length < wanted.length ? ' (missed ' + wanted.filter(n => hits.indexOf(n) < 0).join(' ') + ')' : ''));
  const tempo = out.tempo;
  ok(tempo && tempo.bpm > 0 && Math.abs(tempo.bpm - r.bpm) <= 12, 'and the tempo', (tempo && tempo.bpm) + ' BPM vs ' + r.bpm);
  /* the WAV container has to be the right size for what was rendered */
  const raw = D.encodeWav(r.channels, r.sr);
  ok(raw.byteLength === 44 + r.channels[0].length * 4, 'the WAV export matches the render', (raw.byteLength / 1048576).toFixed(2) + ' MB');
})();

console.log(failures === 0 ? '\n✅ ALL BACKING STUDIO TESTS PASSED' : `\n❌ ${failures} BACKING STUDIO TEST(S) FAILED`);
process.exit(failures ? 1 : 0);
