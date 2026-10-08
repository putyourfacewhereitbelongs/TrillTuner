/* Trill Tuner — backing track generator (browser-free).
 *
 * Turns a key, a mode, a style and a tempo into an audio buffer you can play,
 * export as a WAV, or feed straight back into the analysis engine. Everything
 * here is plain arithmetic on Float32Arrays: no Web Audio, no files, so the
 * whole generator is testable in node and identical in the browser.
 *
 * The instrument models are deliberately simple and physically motivated:
 *   · strings are Karplus-Strong (noise burst → averaging delay line), which is
 *     why a generated chord is harmonic and decays like a plucked note;
 *   · the kit is a sine sweep for the kick, filtered noise plus a small tone for
 *     the snare, and a very short noise burst for hats.
 *
 * render() is deterministic for a given seed, so a "practice bed" can be
 * reproduced note for note.
 */
(function (root) {
  'use strict';

  const A4 = 440, NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const FLAT = { 'C♯': 'D♭', 'D♯': 'E♭', 'F♯': 'G♭', 'G♯': 'A♭', 'A♯': 'B♭' };

  function midiToFreq(m) { return A4 * Math.pow(2, (m - 69) / 12); }
  function pcOf(name) {
    const i = NAMES.indexOf(String(name).replace('♭', '♯'));
    if (i >= 0) return i;
    const flat = { 'D♭': 1, 'E♭': 3, 'G♭': 6, 'A♭': 8, 'B♭': 10 };
    return flat[name] != null ? flat[name] : 0;
  }
  function nameOf(pc, preferFlat) {
    pc = ((pc % 12) + 12) % 12;
    return preferFlat && FLAT[NAMES[pc]] ? FLAT[NAMES[pc]] : NAMES[pc];
  }

  /* ---------------------------------------------------------------- */
  /* keys, modes and progressions                                      */
  /* ---------------------------------------------------------------- */
  const MODES = {
    major: { name: 'Major', steps: [0, 2, 4, 5, 7, 9, 11], thirds: ['', 'm', 'm', '', '', 'm', 'dim'],
      degrees: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    minor: { name: 'Natural minor', steps: [0, 2, 3, 5, 7, 8, 10], thirds: ['m', 'dim', '', 'm', 'm', '', ''],
      degrees: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'] },
    dorian: { name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10], thirds: ['m', 'm', '', '', 'm', 'dim', ''],
      degrees: ['i', 'ii', 'III', 'IV', 'v', 'vi°', 'VII'] },
    mixolydian: { name: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10], thirds: ['', 'm', 'dim', '', 'm', 'm', ''],
      degrees: ['I', 'ii', 'iii°', 'IV', 'v', 'vi', 'VII'] },
    blues: { name: 'Blues', steps: [0, 3, 5, 6, 7, 10], thirds: ['7', '7', '7', '7', '7', '7'],
      degrees: ['I7', 'IV7', 'V7', '♭VII7', '♭III7', '♭VI7'] }
  };

  const STYLES = [
    { id: 'strum', name: 'Acoustic strum', desc: 'Down-strums on every beat with a light off-beat, the campfire default.',
      patterns: { kick: [1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 1, 0, 0, 0, 1, 0], hat: [1, 0, 1, 0, 1, 0, 1, 0], bass: 'root', chord: 'beats' } },
    { id: 'arpeggio', name: 'Fingerpicked arpeggio', desc: 'Rolling eighth-note arpeggio with a bass note on every beat.',
      patterns: { kick: [1, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 0, 1, 0, 1, 0, 1, 0], bass: 'beats', chord: 'arp' } },
    { id: 'rock', name: 'Rock / palm mute', desc: 'Straight eighths, kick on 1 and 3, snare on 2 and 4 — the rehearsal-room sound.',
      patterns: { kick: [1, 0, 0, 0, 1, 0, 1, 0], snare: [0, 0, 1, 0, 0, 0, 1, 0], hat: [1, 1, 1, 1, 1, 1, 1, 1], bass: 'eighths', chord: 'eighths' } },
    { id: 'shuffle', name: 'Shuffle / blues', desc: 'Swung eighths with a walking feel — the blues default.',
      patterns: { kick: [1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 1, 0, 0, 0, 1, 0], hat: [1, 1, 1, 1, 1, 1, 1, 1], bass: 'walk', chord: 'beats' } },
    { id: 'funk', name: 'Funk 16ths', desc: 'Syncopated sixteenths, ghost notes and a snapped snare.',
      patterns: { kick: [1, 0, 0, 1, 0, 0, 1, 0], snare: [0, 0, 1, 0, 0, 1, 1, 0], hat: [1, 1, 1, 1, 1, 1, 1, 1], bass: 'sync', chord: 'stabs' } },
    { id: 'reggae', name: 'Reggae / off-beat', desc: 'Chords on the off-beats, one-drop kick, rimshot snare.',
      patterns: { kick: [0, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 0, 0, 1, 0], hat: [1, 1, 1, 1, 1, 1, 1, 1], bass: 'dub', chord: 'skank' } },
    { id: 'ballad', name: 'Ballad', desc: 'Sparse, slow, with the chord on every bar and a big backbeat.',
      patterns: { kick: [1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 0, 0, 0, 1, 0, 0, 0], bass: 'root', chord: 'beats' } },
    { id: 'country', name: 'Country boom-chick', desc: 'Alternating bass with the chord on the off-beats.',
      patterns: { kick: [1, 0, 1, 0, 1, 0, 1, 0], snare: [0, 0, 1, 0, 0, 0, 1, 0], hat: [1, 0, 1, 0, 1, 0, 1, 0], bass: 'alt', chord: 'offbeat' } }
  ];

  const PROGRESSIONS = {
    major: [['I', 'V', 'vi', 'IV'], ['I', 'IV', 'V', 'IV'], ['ii', 'V', 'I', 'I'], ['I', 'vi', 'ii', 'V'], ['I', 'IV', 'vi', 'V']],
    minor: [['i', 'VI', 'III', 'VII'], ['i', 'iv', 'v', 'i'], ['i', 'VII', 'VI', 'VII'], ['i', 'iv', 'VII', 'III']],
    dorian: [['i', 'IV', 'VII', 'i'], ['i', 'VII', 'IV', 'i']],
    mixolydian: [['I', 'VII', 'IV', 'I'], ['I', 'IV', 'VII', 'I']],
    blues: [['I7', 'IV7', 'I7', 'V7'], ['I7', 'IV7', 'V7', 'IV7'], ['I7', '♭VII7', 'IV7', 'I7']]
  };

  /* ---------------------------------------------------------------- */
  /* harmony                                                           */
  /* ---------------------------------------------------------------- */
  function degreeIndex(mode, roman) {
    const m = MODES[mode] || MODES.major;
    const clean = String(roman).replace(/[7°]/g, '');
    let i = m.degrees.map(d => d.replace(/[7°]/g, '')).indexOf(clean);
    if (i < 0) {
      /* chromatic degrees (blues): ♭III ♭VI ♭VII */
      const flat = { '♭III': 4, '♭VI': 8, '♭VII': 10, '♭II': 1, '♭V': 6 };
      const key = Object.keys(flat).filter(k => clean.indexOf(k) >= 0)[0];
      if (key) return -1 - flat[key];      /* negative = absolute semitone */
    }
    return i < 0 ? 0 : i;
  }

  function triad(rootPc, quality, rootMidi) {
    const iv = quality === 'm' ? [0, 3, 7] : quality === 'dim' ? [0, 3, 6] : quality === '7' ? [0, 4, 7, 10] : [0, 4, 7];
    return iv.map(i => rootMidi + i);
  }

  function chordOf(key, mode, roman) {
    const m = MODES[mode] || MODES.major;
    const idx = degreeIndex(mode, roman);
    const rootPc = pcOf(key);
    let pc, quality;
    if (idx < 0) { pc = (rootPc - idx - 1) % 12; quality = '7'; }
    else { pc = (rootPc + m.steps[idx]) % 12; quality = m.thirds[idx] || ''; }
    const seventh = /7/.test(String(roman));
    const q = seventh && quality !== '7' ? (quality === 'm' ? 'm7' : quality === 'dim' ? 'm7♭5' : 'maj7') : quality;
    const iv = q === 'm7' ? [0, 3, 7, 10] : q === 'maj7' ? [0, 4, 7, 11] : q === 'm7♭5' ? [0, 3, 6, 10]
      : q === '7' ? [0, 4, 7, 10] : q === 'm' ? [0, 3, 7] : q === 'dim' ? [0, 3, 6] : [0, 4, 7];
    /* voicing root: the lowest octave at or above E2 (midi 40), so the bass sits
     * in the guitar's range rather than in the piano's */
    const rootMidi = 40 + ((pc - 4 + 12) % 12);
    const suffix = q === 'm' ? 'm' : q === 'dim' ? 'dim' : q === 'm7' ? 'm7' : q === 'maj7' ? 'maj7' : q === '7' ? '7' : q === 'm7♭5' ? 'm7♭5' : '';
    return { roman: roman, pc: pc, name: nameOf(pc, /♭/.test(String(roman)) || pcOf(key) === 5 || pcOf(key) === 10 || pcOf(key) === 3 || pcOf(key) === 8) + suffix, midis: iv.map(i => rootMidi + i), quality: q };
  }

  function progression(key, mode, style, bars) {
    const m = MODES[mode] || MODES.major;
    const sets = PROGRESSIONS[mode] || PROGRESSIONS.major;
    const pick = sets[0];
    const out = [];
    const n = Math.max(2, Math.min(64, bars || pick.length));
    for (let i = 0; i < n; i++) out.push(chordOf(key, mode, pick[i % pick.length]));
    return out;
  }

  /* ---------------------------------------------------------------- */
  /* instruments                                                       */
  /* ---------------------------------------------------------------- */
  function rng(seed) {
    let s = (seed | 0) || 1;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  /* Karplus-Strong plucked string, added into (l, r) at `start` samples. */
  function pluck(l, r, sr, freq, start, gain, dur, pan, random) {
    if (!(freq > 20) || gain <= 0) return;
    const N = Math.max(2, Math.round(sr / freq));
    const len = Math.min(Math.floor(sr * dur), l.length - start);
    if (len <= 0) return;
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = random() * 2 - 1;
    const gl = gain * (1 - Math.max(0, pan)) , gr = gain * (1 + Math.min(0, pan));
    let idx = 0;
    /* damping: a bass string rings longer than a thin top string */
    const damp = freq < 150 ? 0.4995 : freq < 350 ? 0.4985 : 0.4975;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx], nxt = ring[(idx + 1) % N];
      ring[idx] = (cur + nxt) * damp;
      const v = cur * gl, w = cur * gr;
      l[start + i] += v;
      r[start + i] += w;
      idx = (idx + 1) % N;
    }
    /* tail fade so a truncated note never clicks */
    const fade = Math.min(len, Math.floor(sr * 0.02));
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      l[start + len - 1 - i] *= k;
      r[start + len - 1 - i] *= k;
    }
  }

  function kick(l, r, sr, at, gain) {
    const len = Math.min(Math.floor(sr * 0.28), l.length - at);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const f = 120 * Math.exp(-t * 28) + 45;
      ph += 2 * Math.PI * f / sr;
      const e = Math.exp(-t * 11);
      const v = Math.sin(ph) * e * gain;
      l[at + i] += v; r[at + i] += v;
    }
  }

  function snare(l, r, sr, at, gain, random) {
    const len = Math.min(Math.floor(sr * 0.22), l.length - at);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const e = Math.exp(-t * 26);
      const n = random() * 2 - 1;
      lp = lp * 0.55 + n * 0.45;                  /* a little body */
      const v = (n - lp * 0.6) * e * gain + Math.sin(2 * Math.PI * 185 * t) * e * gain * 0.35;
      l[at + i] += v * 0.9; r[at + i] += v * 1.1;
    }
  }

  function hat(l, r, sr, at, gain, random, open) {
    const len = Math.min(Math.floor(sr * (open ? 0.16 : 0.045)), l.length - at);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const e = Math.exp(-t / (open ? 0.06 : 0.012));
      const n = random() * 2 - 1;
      const hp = n - prev; prev = n;              /* difference = high-pass-ish */
      const v = hp * e * gain * 0.5;
      l[at + i] += v; r[at + i] += v;
    }
  }

  /* a hammered piano: bright attack, partials that die faster the higher they are */
  function pianoVoice(l, r, sr, at, freq, dur, gain, pan) {
    if (!(freq > 20) || gain <= 0) return;
    const len = Math.min(Math.floor(sr * dur), l.length - at);
    if (len <= 0) return;
    const gl = gain * (1 - Math.max(0, pan || 0)), gr = gain * (1 + Math.min(0, pan || 0));
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.003) * Math.exp(-t * 2.6);
      let v = 0;
      for (let h = 1; h <= 8; h++) v += Math.sin(2 * Math.PI * freq * h * t) / (h * h) * Math.exp(-t * h * 1.6);
      v += Math.sin(2 * Math.PI * freq * 11 * t) * Math.exp(-t * 50) * 0.05;
      l[at + i] += v * env * gl;
      r[at + i] += v * env * gr;
    }
  }

  /* slow-attack strings / pad */
  function stringsVoice(l, r, sr, at, freq, dur, gain, pan) {
    if (!(freq > 20) || gain <= 0) return;
    const len = Math.min(Math.floor(sr * dur), l.length - at);
    if (len <= 0) return;
    const gl = gain * (1 - Math.max(0, pan || 0)), gr = gain * (1 + Math.min(0, pan || 0));
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.08) * Math.min(1, (dur - t) / 0.08);
      const v = (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * t)
        + 0.12 * Math.sin(2 * Math.PI * freq * 3 * t)) * env;
      l[at + i] += v * gl;
      r[at + i] += v * gr;
    }
  }

  /* organ: a few drawbar-ish sines, no decay until the cut-off */
  function organVoice(l, r, sr, at, freq, dur, gain, pan) {
    if (!(freq > 20) || gain <= 0) return;
    const len = Math.min(Math.floor(sr * dur), l.length - at);
    if (len <= 0) return;
    const gl = gain * (1 - Math.max(0, pan || 0)), gr = gain * (1 + Math.min(0, pan || 0));
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.01) * Math.min(1, (dur - t) / 0.03);
      const v = (Math.sin(2 * Math.PI * freq * t) + 0.7 * Math.sin(2 * Math.PI * freq * 2 * t)
        + 0.4 * Math.sin(2 * Math.PI * freq * 3 * t) + 0.18 * Math.sin(2 * Math.PI * freq * 4 * t)) * env * 0.45;
      l[at + i] += v * gl;
      r[at + i] += v * gr;
    }
  }

  function tone(l, r, sr, at, freq, dur, gain, pan) {
    const len = Math.min(Math.floor(sr * dur), l.length - at);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const e = Math.min(1, t / 0.005) * Math.exp(-t * 3.2);
      const v = Math.sin(2 * Math.PI * freq * t) * e * gain;
      l[at + i] += v * (1 - Math.max(0, pan || 0));
      r[at + i] += v * (1 + Math.min(0, pan || 0));
    }
  }

  /* ---------------------------------------------------------------- */
  /* the renderer                                                      */
  /* ---------------------------------------------------------------- */
  function render(opts) {
    opts = opts || {};
    const sr = opts.sr || 22050;
    const bpm = Math.max(40, Math.min(240, opts.bpm || 90));
    const bars = Math.max(1, Math.min(64, opts.bars || 8));
    const style = STYLES.filter(s => s.id === opts.style)[0] || STYLES[0];
    const key = opts.key || 'C';
    const mode = MODES[opts.mode] ? opts.mode : 'major';
    const parts = Object.assign({ drums: true, bass: true, chords: true, arp: false, piano: false, strings: false, organ: false }, opts.parts || {});
    const level = opts.level == null ? 0.8 : Math.max(0, Math.min(1.5, opts.level));
    const swing = Math.max(0, Math.min(0.45, opts.swing || 0));
    const beatsPerBar = opts.meter === 3 ? 3 : 4;
    const random = rng(opts.seed == null ? 20251008 : opts.seed);

    const beatSec = 60 / bpm;
    const stepSec = beatSec / 4;                       /* sixteenths */
    const total = Math.ceil(bars * beatsPerBar * beatSec * sr) + Math.floor(sr * 0.6);
    const L = new Float32Array(total), R = new Float32Array(total);
    const chords = progression(key, mode, style, bars);

    const at = (bar, step) => Math.floor((bar * beatsPerBar + step / 4) * beatSec * sr
      + (step % 2 === 1 ? swing * stepSec * sr : 0));

    for (let bar = 0; bar < bars; bar++) {
      const ch = chords[bar % chords.length];
      const bass = ch.midis[0] - 12;
      for (let step = 0; step < beatsPerBar * 4; step++) {
        const beat = step / 4;
        const when = at(bar, step);
        const jitter = (random() - 0.5) * 0.004 * sr;              /* human timing */

        if (parts.drums) {
          if (style.patterns.kick[step % 8] && step % 4 === 0) kick(L, R, sr, when + jitter, 0.9 * level);
          if (style.patterns.kick[step % 8] && step % 4 === 2 && style.patterns.kick[(step % 8) + 1]) kick(L, R, sr, when + jitter, 0.55 * level);
          if (style.patterns.snare[step % 8] && step % 4 === 0) snare(L, R, sr, when + jitter, 0.5 * level, random);
          if (style.patterns.hat[step % 8] && step % 2 === 0) hat(L, R, sr, when + jitter, 0.28 * level, random, step % 4 === 2);
          if (style.patterns.hat[step % 8] && step % 2 === 1 && random() < 0.35) hat(L, R, sr, when + jitter, 0.12 * level, random, false);
        }
        if (!parts.bass) continue;
        const pat = style.patterns.bass;
        if (pat === 'root' && step % 4 === 0) pluck(L, R, sr, midiToFreq(bass), when, 0.5 * level, 1.4, 0, random);
        else if (pat === 'beats' && step % 4 === 0) pluck(L, R, sr, midiToFreq(bass), when, 0.45 * level, 1.0, 0, random);
        else if (pat === 'eighths' && step % 2 === 0) pluck(L, R, sr, midiToFreq(bass), when, 0.4 * level, 0.5, 0, random);
        else if (pat === 'alt' && step % 4 === 0) pluck(L, R, sr, midiToFreq(bass + (beat % 2 ? 7 : 0)), when, 0.45 * level, 0.8, 0, random);
        else if (pat === 'walk' && step % 4 === 0) {
          const scale = (MODES[mode] || MODES.major).steps;
          const nxt = (step / 4 + 1) % beatsPerBar === 0 ? 0 : scale[((step / 4 | 0) + 1) % scale.length];
          pluck(L, R, sr, midiToFreq(bass + (step === 0 ? 0 : nxt - scale[(step / 4 | 0) % scale.length])), when, 0.42 * level, 0.7, 0, random);
        } else if (pat === 'sync' && (step % 8 === 0 || step % 8 === 3 || step % 8 === 6)) pluck(L, R, sr, midiToFreq(bass + (step % 8 === 3 ? 12 : 0)), when, 0.5 * level, 0.4, 0, random);
        else if (pat === 'dub' && step % 8 === 4) pluck(L, R, sr, midiToFreq(bass), when, 0.55 * level, 1.1, 0, random);
      }

      /* chords / arpeggios on top of the bass */
      if (parts.piano) {
        ch.midis.forEach((n, i) => pianoVoice(L, R, sr, at(bar, 0) + i * 12, midiToFreq(n), beatsPerBar * beatSec * 0.95, 0.22 * level, (i - 1) * 0.2));
      }
      if (parts.strings) {
        ch.midis.forEach((n, i) => stringsVoice(L, R, sr, at(bar, 0), midiToFreq(n), beatsPerBar * beatSec, 0.12 * level, (i - 1) * 0.28));
      }
      if (parts.organ) {
        ch.midis.forEach((n, i) => organVoice(L, R, sr, at(bar, 0), midiToFreq(n + (i === 0 ? -12 : 0)), beatsPerBar * beatSec * 0.92, 0.14 * level, (i - 1) * 0.16));
      }
      if (parts.chords) {
        const top = ch.midis.slice(1).concat(ch.midis[0] + 12);
        const mode2 = style.patterns.chord;
        if (mode2 === 'arp' || parts.arp) {
          for (let step = 0; step < beatsPerBar * 4; step++) {
            const note = top[step % top.length];
            pluck(L, R, sr, midiToFreq(note), at(bar, step), 0.3 * level, 0.9, (step % 2 ? 0.18 : -0.18), random);
          }
        } else if (mode2 === 'eighths') {
          for (let step = 0; step < beatsPerBar * 4; step += 2) {
            top.forEach((n, i) => pluck(L, R, sr, midiToFreq(n), at(bar, step) + i * 12, 0.22 * level, 0.5, (i - 1) * 0.25, random));
          }
        } else if (mode2 === 'skank') {
          for (let step = 1; step < beatsPerBar * 4; step += 2) {
            top.forEach((n, i) => pluck(L, R, sr, midiToFreq(n), at(bar, step) + i * 8, 0.3 * level, 0.28, (i - 1) * 0.25, random));
          }
        } else if (mode2 === 'stabs') {
          [0, 3, 6, 11].forEach(step => {
            top.forEach((n, i) => pluck(L, R, sr, midiToFreq(n), at(bar, step) + i * 6, 0.26 * level, 0.22, (i - 1) * 0.25, random));
          });
        } else if (mode2 === 'offbeat') {
          for (let step = 2; step < beatsPerBar * 4; step += 4) {
            top.forEach((n, i) => pluck(L, R, sr, midiToFreq(n), at(bar, step) + i * 10, 0.24 * level, 0.5, (i - 1) * 0.25, random));
          }
        } else {
          for (let step = 0; step < beatsPerBar * 4; step += 4) {
            top.forEach((n, i) => pluck(L, R, sr, midiToFreq(n), at(bar, step) + i * 14, 0.3 * level, 1.1, (i - 1) * 0.28, random));
          }
        }
      }
    }

    /* a hint of the harmony on top so the ear hears the key (and the analyser
     * has something to lock onto) */
    if (opts.sparkle !== false) {
      for (let bar = 0; bar < bars; bar += 2) {
        const ch = chords[bar % chords.length];
        tone(L, R, sr, at(bar, 0), midiToFreq(ch.midis[2] + 12), 1.1, 0.05 * level, 0.3);
      }
    }

    /* normalise to a comfortable peak and write the summary */
    let peak = 0;
    for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const norm = peak > 0 ? 0.9 / peak : 1;
    for (let i = 0; i < total; i++) { L[i] *= norm; R[i] *= norm; }

    return {
      channels: [L, R], sr: sr, seconds: total / sr, bpm: bpm, bars: bars,
      key: key, mode: mode, modeName: (MODES[mode] || MODES.major).name, style: style.id, styleName: style.name,
      beatsPerBar: beatsPerBar, progression: chords.map(c => c.name),
      chords: chords, parts: parts, swing: swing, level: level, peak: peak * norm
    };
  }

  const api = {
    render, MODES, STYLES, PROGRESSIONS, KEYS: NAMES,
    midiToFreq: midiToFreq, pcOf: pcOf, nameOf: nameOf,
    chordOf: chordOf, progression: progression,
    durations: function (opts) {
      const o = opts || {};
      const bpm = Math.max(40, Math.min(240, o.bpm || 90));
      const bars = Math.max(1, Math.min(64, o.bars || 8));
      const beats = o.meter === 3 ? 3 : 4;
      return { seconds: bars * beats * 60 / bpm, bars: bars, bpm: bpm };
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TT = root.TT || {};
  root.TT.backingLib = api;
})(typeof window !== 'undefined' ? window : globalThis);
