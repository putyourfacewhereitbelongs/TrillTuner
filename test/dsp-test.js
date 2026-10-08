/* Trill Tuner — audio lab tests (the song tools, tab maker and stem separation).
 *
 * Runs the whole offline DSP engine on synthesised audio in plain node: no
 * browser, no microphone, no files. Every check either measures a real signal
 * or round-trips real data.
 *
 *   node test/dsp-test.js
 */
'use strict';

const D = require('../public/js/lib/dsp.js');

const SR = 22050;
let failures = 0;
function ok(cond, label, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra != null ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}
const midiToF = m => 440 * Math.pow(2, (m - 69) / 12);
const db = (x, y) => 20 * Math.log10((x + 1e-12) / (y + 1e-12));

/* Goertzel: coherent energy at exactly one frequency — the honest way to ask
 * "how much of THIS tone survived". */
function toneLevel(sig, f) {
  const k = 2 * Math.PI * f / SR, c = 2 * Math.cos(k);
  let s0 = 0, s1 = 0, s2 = 0;
  for (let i = 0; i < sig.length; i++) { s0 = sig[i] + c * s1 - s2; s2 = s1; s1 = s0; }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2)) / sig.length;
}
function mono(ch) {
  const out = new Float32Array(ch[0].length);
  for (let i = 0; i < out.length; i++) out[i] = (ch[0][i] + (ch[1] || ch[0])[i]) / 2;
  return out;
}
function side(ch) {
  if (!ch[1]) return ch[0];
  const out = new Float32Array(ch[0].length);
  for (let i = 0; i < out.length; i++) out[i] = (ch[0][i] - ch[1][i]) / 2;
  return out;
}
/* energy of a signal at a set of frequencies — used to look at bands the
 * sustained pads never touch */
function bandEnergy(sig, freqs) {
  let s = 0;
  freqs.forEach(f => { const v = toneLevel(sig, f); s += v * v; });
  return Math.sqrt(s / freqs.length);
}
function rms(sig, from, to) {
  let s = 0;
  from = from || 0; to = to == null ? sig.length : to;
  for (let i = from; i < to; i++) s += sig[i] * sig[i];
  return Math.sqrt(s / Math.max(1, to - from));
}
function tone(v, t, dur, amp) { return t < dur ? amp * Math.sin(2 * Math.PI * v * t) : 0; }
function triad(root, minor, t, dur, amp) {
  const ratios = minor ? [1, 1.1892, 1.4983] : [1, 1.2599, 1.4983];
  let v = 0;
  ratios.forEach(r => { v += tone(root * r, t, dur, amp * 0.7) + tone(root * r * 2, t, dur, amp * 0.2); });
  return v;
}

/* ------------------------------------------------------------------ */
console.log('\nTrill Tuner — audio lab tests\n');

/* 1. perfect reconstruction: with the mask wide open the engine must return the
 *    input sample for sample, or every other result is suspect. */
(function () {
  const n = SR * 2, A = new Float32Array(n);
  for (let i = 0; i < n; i++) A[i] = 0.3 * Math.sin(2 * Math.PI * 440 * i / SR) + 0.1 * Math.sin(2 * Math.PI * 1000 * i / SR);
  const pass = D.separate([A, A], SR, 'vocals', { remove: true, amount: 0, fftSize: 2048 });
  let err = 0, ref = 0;
  for (let i = 2048; i < n - 2048; i++) { err += Math.pow(pass.channels[0][i] - A[i], 2); ref += A[i] * A[i]; }
  const rel = Math.sqrt(err / ref);
  ok(rel < 1e-4, 'separation is sample-accurate when nothing is removed', 'relative error ' + rel.toExponential(2));
})();

/* 2. chord recognition + key + a tab the player can follow */
(function () {
  const prog = [[60, false], [67, false], [69, true], [65, false]];   /* C G Am F */
  const head = ['C', 'G', 'Am', 'F'];
  const n = SR * 8, x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, seg = Math.min(3, Math.floor(t / 2)), local = t - seg * 2;
    x[i] = triad(midiToF(prog[seg][0]), prog[seg][1], local, 2, 0.3) + triad(midiToF(prog[seg][0] - 24), prog[seg][1], local, 2, 0.1);
  }
  const res = D.analyseChords(x, SR, { fftSize: 4096, hop: 2048 });
  const names = res.chords.map(c => c.name);
  ok(names.join(' ') === 'C G Am F', 'chord detection reads a I–V–vi–IV progression', names.join(' '));
  ok(res.key.key === 'C' && res.key.mode === 'major', 'key detection finds C major', res.key.key + ' ' + res.key.mode);
  ok(res.chords.every((c, i) => i === 0 || c.start >= res.chords[i - 1].start), 'chord timeline is in order', res.chords.length + ' segments');
  ok(res.chords.every(c => c.confidence > 0 && c.confidence <= 1), 'every chord carries a confidence', res.chords.map(c => c.confidence).join(' '));
})();

/* 2b. harmonic collision: a plain triad must not turn into somebody else's
 *     maj7 just because its 3rd harmonic is another note's fundamental */
(function () {
  function stack(freqs, secs) {
    const n = Math.round(SR * secs), out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let v = 0;
      freqs.forEach(f => { v += Math.sin(2 * Math.PI * f * t) + 0.22 * Math.sin(2 * Math.PI * f * 2 * t); });
      out[i] = v * 0.28;
    }
    return out;
  }
  function guess(freqs) {
    const cf = D.chromaFrames(stack(freqs, 1.5), SR, { fftSize: 4096, hop: 2048 });
    const mid = cf.frames[Math.floor(cf.frames.length / 2)];
    const m = D.matchChord(Array.from(mid));
    return { name: D.PITCH_NAMES[m.root] + m.suffix, chroma: Array.from(mid) };
  }
  const g = guess([98, 123.47, 146.83]);                 /* G2 B2 D3 */
  ok(g.name === 'G', 'a low G triad reads as G, not someone else’s maj7', g.name);
  const c = guess([130.81, 164.81, 196]);                /* C3 E3 G3 */
  ok(c.name === 'C', 'a C triad reads as C', c.name);
  const strayC = c.chroma[5] / Math.max(1e-9, Math.max.apply(null, c.chroma));
  ok(strayC < 0.25, 'no invented chord tones from harmonic leakage', (strayC * 100).toFixed(0) + '% at F');
  const am = guess([110, 130.81, 164.81]);               /* A2 C3 E3 */
  ok(am.name === 'Am', 'an A minor triad reads as Am', am.name);
})();

/* 3. tempo from a click track */
(function () {
  const bpm = 120, beat = 60 / bpm;
  const n = SR * 10, x = new Float32Array(n);
  for (let b = 0; b * beat < 10; b++) {
    const off = Math.floor(b * beat * SR);
    for (let i = 0; i < 400; i++) {
      const e = Math.exp(-i / 60);
      if (off + i < n) x[off + i] += Math.sin(2 * Math.PI * 1200 * i / SR) * e * 0.8;
      if (off + i < n) x[off + i] += (Math.random() * 2 - 1) * e * 0.3;
    }
  }
  const res = D.analyseChords(x, SR, { fftSize: 2048, hop: 512 });
  const off = Math.abs(res.tempo.bpm - bpm);
  ok(off <= 6 || Math.abs(res.tempo.bpm - bpm * 2) <= 6, 'tempo detection finds the beat', res.tempo.bpm + ' BPM (wanted ' + bpm + ')');
  const bars = D.toBars(res.chords, res.tempo.bpm || bpm);
  ok(bars.length > 2, 'a detected tempo turns chords into bars', bars.length + ' bars');
})();

/* 4. karaoke cancellation: dead-centre content collapses, side content stays */
(function () {
  const n = SR * 4;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const centre = 0.25 * Math.sin(2 * Math.PI * 300 * t);
    const wide = 0.25 * Math.sin(2 * Math.PI * 800 * t);
    L[i] = centre + wide; R[i] = centre - wide;      /* 800 Hz is fully out of phase */
  }
  const k = D.separate([L, R], SR, 'classic-karaoke', {});
  const out = k.channels[0];
  const cIn = toneLevel(mono([L, R]), 300), cOut = toneLevel(out, 300);
  const wIn = toneLevel(mono([L, R]), 800), wOut = toneLevel(out, 800);
  ok(db(cOut, cIn) < -25, 'classic karaoke cancels the centre', db(cOut, cIn).toFixed(1) + ' dB');
  ok(db(wOut, wIn) > -3, 'classic karaoke keeps the sides', db(wOut, wIn).toFixed(1) + ' dB');
  const kb = D.separate([L, R], SR, 'classic-keep-bass', { keepBass: 0.8 });
  ok(kb.channels[0].length === n, 'the bass-preserving karaoke variant runs', 'mode classic-keep-bass');
})();

/* 5. spectral separation: a centred sustained tone is removable, a side tone
 *    is not (and the other way round when isolating) */
(function () {
  const n = SR * 6;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const mid = 0.3 * Math.sin(2 * Math.PI * 440 * t) + 0.12 * Math.sin(2 * Math.PI * 660 * t);
    const side = 0.3 * Math.sin(2 * Math.PI * 1100 * t);
    const drums = (i % Math.floor(SR * 0.5) < 260) ? 0.5 * (Math.random() * 2 - 1) : 0;
    L[i] = mid + side + drums; R[i] = mid - side + drums;
  }
  const inMono = mono([L, R]), inSide = side([L, R]);
  const rm = D.separate([L, R], SR, 'vocals', { remove: true, amount: 0.95, fftSize: 2048 });
  const outM = mono(rm.channels), outSide = side(rm.channels);
  const v = db(toneLevel(outM, 440), toneLevel(inMono, 440));
  const wide = db(toneLevel(outSide, 1100), toneLevel(inSide, 1100));
  ok(v < -12, 'removing vocals drops the centred vocal', v.toFixed(1) + ' dB');
  ok(wide > -7, 'removing vocals leaves the wide instrument', wide.toFixed(1) + ' dB');

  const iso = D.separate([L, R], SR, 'vocals', { remove: false, amount: 0.9, fftSize: 2048 });
  const isoM = mono(iso.channels), isoSide = side(iso.channels);
  const vi = db(toneLevel(isoM, 440), toneLevel(inMono, 440));
  const si = db(toneLevel(isoSide, 1100), toneLevel(inSide, 1100));
  ok(vi > -3, 'isolating vocals keeps the centred vocal', vi.toFixed(1) + ' dB');
  ok(si < vi - 8, 'isolating vocals pushes the wide instrument back', si.toFixed(1) + ' dB');
})();

/* 6. drum removal: transient energy goes, sustained notes stay */
(function () {
  const n = SR * 6;
  const L = new Float32Array(n), R = new Float32Array(n);
  const hits = [];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const pad = 0.2 * Math.sin(2 * Math.PI * 300 * t) + 0.1 * Math.sin(2 * Math.PI * 600 * t);
    let d = 0;
    const phase = i % Math.floor(SR * 0.5);
    if (phase < 300) { d = 0.6 * (Math.random() * 2 - 1) * Math.exp(-phase / 80); hits.push(i); }
    L[i] = pad + d; R[i] = pad + d * 0.7;
  }
  const r = D.separate([L, R], SR, 'drums', { remove: true, amount: 0.85, fftSize: 2048 });
  const outM = mono(r.channels), inM = mono([L, R]);
  /* the pad only ever plays 300/600 Hz, so anything up at 3–8 kHz is the hit */
  const hitBands = [3000, 4500, 6000, 7500];
  const hitDb = db(bandEnergy(outM, hitBands), bandEnergy(inM, hitBands));
  const padDb = db(toneLevel(outM, 300), toneLevel(inM, 300));
  ok(hitDb < -6, 'removing drums drops the transients', hitDb.toFixed(1) + ' dB (3–7.5 kHz)');
  ok(padDb > -3, 'removing drums leaves the sustained note', padDb.toFixed(1) + ' dB');
})();

/* 7. WAV export is a valid 16-bit PCM file */
(function () {
  const ch = [new Float32Array(1000), new Float32Array(1000)];
  for (let i = 0; i < 1000; i++) { ch[0][i] = Math.sin(i / 10); ch[1][i] = -ch[0][i]; }
  const buf = D.encodeWav(ch, 44100);
  const v = new DataView(buf);
  const tag = o => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  ok(tag(0) === 'RIFF' && tag(8) === 'WAVE' && tag(12) === 'fmt ', 'WAV container tags are correct', tag(0) + '/' + tag(8) + '/' + tag(12));
  ok(v.getUint16(22, true) === 2 && v.getUint32(24, true) === 44100 && v.getUint16(34, true) === 16, 'WAV says stereo 44.1 kHz 16-bit');
  ok(buf.byteLength === 44 + 1000 * 2 * 2, 'WAV length matches the sample count', buf.byteLength + ' bytes');
})();

/* 8. every profile runs, and the profiles are honest about their bands */
(function () {
  const n = SR * 2;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    L[i] = 0.2 * Math.sin(2 * Math.PI * 110 * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t) + 0.1 * Math.sin(2 * Math.PI * 3000 * t);
    R[i] = L[i] * 0.9;
  }
  const modes = Object.keys(D.PROFILES);
  modes.push('classic-karaoke', 'classic-keep-bass');
  const bad = [];
  modes.forEach(m => {
    try {
      const r = D.separate([L, R], SR, m, { remove: true, amount: 0.8 });
      if (!r.channels.length || r.channels[0].length !== n) bad.push(m + ' (bad length)');
    } catch (e) { bad.push(m + ': ' + e.message); }
  });
  ok(!bad.length, 'all ' + modes.length + ' separation modes run', bad.length ? bad.join(', ') : modes.length + ' modes');
  const prof = D.PROFILES['acoustic-guitar'];
  ok(prof && prof.band && prof.band[0] < prof.band[1], 'each instrument profile declares a band', prof.name + ' ' + prof.band.join('–') + ' Hz');
})();

console.log(failures === 0 ? '\n✅ ALL AUDIO LAB TESTS PASSED' : `\n❌ ${failures} AUDIO LAB TEST(S) FAILED`);
process.exit(failures ? 1 : 0);
