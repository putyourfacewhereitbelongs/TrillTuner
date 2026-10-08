/* Trill Tuner — music / note math */
(function () {
  'use strict';
  const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const BASE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

  function midiToFreq(m, a4) { return (a4 || 440) * Math.pow(2, (m - 69) / 12); }
  function freqToMidi(f, a4) { return 69 + 12 * Math.log2(f / (a4 || 440)); }

  function freqToNote(f, a4) {
    const m = freqToMidi(f, a4);
    const r = Math.round(m);
    const pc = ((r % 12) + 12) % 12;
    const oct = Math.floor(r / 12) - 1;
    return { midi: r, letter: SHARP[pc], octave: oct, cents: Math.round((m - r) * 100), label: SHARP[pc] + oct };
  }

  function nameToMidi(n) {
    const m = /^([A-Ga-g])([#♯b♭]?)(-?\d+)$/.exec(String(n).trim());
    if (!m) return null;
    let v = BASE[m[1].toLowerCase()];
    const acc = m[2];
    if (acc === '#' || acc === '♯') v += 1;
    else if (acc === 'b' || acc === '♭') v -= 1;
    return 12 * (parseInt(m[3], 10) + 1) + v;
  }

  // 'Eb2' -> { letter:'E♭', octave:2, label:'E♭2' }  (keeps flat/sharp intent of the name)
  function prettyName(n) {
    const midi = nameToMidi(n);
    if (midi == null) return { letter: String(n), octave: '', label: String(n) };
    const pc = ((midi % 12) + 12) % 12;
    const oct = Math.floor(midi / 12) - 1;
    const letter = /b|♭/.test(String(n)) ? FLAT[pc] : SHARP[pc];
    return { letter: letter, octave: oct, label: letter + oct };
  }

  function centsOff(f, target) { return 1200 * Math.log2(f / target); }

  const api = { SHARP: SHARP, FLAT: FLAT, midiToFreq: midiToFreq, freqToMidi: freqToMidi, freqToNote: freqToNote, nameToMidi: nameToMidi, prettyName: prettyName, centsOff: centsOff };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TT = window.TT || {}; window.TT.notes = api; }
})();
