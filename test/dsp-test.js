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


/* 9. the acoustic-only chop: a strummed acoustic over an electric and a kit.
 *    The generator builds three known layers, mixes them, separates, and then
 *    measures how much of each layer survived (least-squares projection of the
 *    output onto the layer). What matters is not raw loudness but the margin:
 *    the acoustic has to lose clearly more than the electric and the drums. */
(function () {
  const SECS = 6, N = SR * SECS, TAU = Math.PI * 2;
  const mk = () => [new Float32Array(N), new Float32Array(N)];
  const put = (ch, i, l, r) => { ch[0][i] += l; ch[1][i] += r; };

  /* strummed, wide, decaying — a plucked acoustic */
  const acoustic = mk();
  const chords = [[220, 277.18, 329.63, 440], [196, 246.94, 293.66, 392], [174.61, 220, 261.63, 349.23], [146.83, 185, 220, 293.66]];
  for (let bar = 0; bar * 1.5 < SECS; bar++) {
    const c = chords[bar % 4], start = Math.floor(bar * 1.5 * SR);
    for (let k = 0; k < 6; k++) {
      const off = start + Math.floor(k * 0.012 * SR);
      for (let i = off; i < Math.min(N, off + 1.2 * SR); i++) {
        const t = (i - off) / SR, env = Math.exp(-t / 0.45) * (1 - Math.exp(-t / 0.004));
        const v = env * 0.16 * (Math.sin(TAU * c[k % 4] * t) + 0.35 * Math.sin(TAU * c[k % 4] * 2 * t));
        put(acoustic, i, v, v * -0.85);
      }
    }
  }
  /* sustained, centre, distorted — an electric holding a power chord, with a
   * real vibrato: phase modulation at a constant ±15 cents. (Writing it as
   * `sin(2πf(1+k·sin)t)` instead would be an accelerating pitch glide — the
   * deviation grows with time — and no mask can be expected to survive that.) */
  const electric = mk();
  for (let i = 0; i < N; i++) {
    const t = i / SR, ph = 0.0087 * Math.sin(TAU * 5.5 * t);
    let v = 0;
    for (let h = 1; h <= 12; h++) v += Math.sin(TAU * 82.41 * h * t + h * ph) / (h * 1.4) * (h % 2 ? 1 : 0.6);
    v += 0.5 * Math.sin(TAU * 123.47 * 2 * t + 2 * ph) + 0.3 * Math.sin(TAU * 123.47 * 3 * t);
    v = Math.tanh(v * 1.8) * 0.3;
    put(electric, i, v, v);
  }
  /* kick, snare and hats */
  const drums = mk();
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;
  for (let b = 0; b * 0.5 < SECS; b++) {
    const off = Math.floor(b * 0.5 * SR), snare = b % 2 === 1;
    for (let i = 0; i < 0.25 * SR && off + i < N; i++) {
      const t = i / SR, e = Math.exp(-t / (snare ? 0.09 : 0.035));
      let v = snare ? rnd() * 0.5 : Math.sin(TAU * 62 * t) * 0.6 * Math.exp(-t / 0.06);
      put(drums, off + i, v * e, v * e);
    }
    const oo = Math.floor((b * 0.5 + 0.25) * SR);
    for (let i = 0; i < 0.04 * SR && oo + i < N; i++) {
      const t = i / SR, e = Math.exp(-t / 0.01), v = rnd() * 0.22;
      put(drums, oo + i, e * v, e * v * -0.7);
    }
  }
  const mix = mk();
  for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) mix[c][i] = acoustic[c][i] + electric[c][i] + drums[c][i];

  /* least-squares projection: how much of `src` is left in `out`, in dB.
   * Per channel, deliberately: the acoustic layer is polarity-wide (L ≈ −0.85 R),
   * so the two channels *cancel* in a mono sum and any mono-sum measurement of it
   * is mostly measuring the cancellation, not the separation. */
  function kept(out, src) {
    let num = 0, den = 0;
    for (let c = 0; c < Math.min(out.length, src.length); c++) {
      for (let i = 0; i < N; i++) { num += out[c][i] * src[c][i]; den += src[c][i] * src[c][i]; }
    }
    return 20 * Math.log10(Math.abs(num / den) + 1e-12);
  }
  const rm = D.separate(mix, SR, 'acoustic-guitar', { amount: 0.9, remove: true });   /* no fftSize: the profile's own hint */
  const a = kept(rm.channels, acoustic), e = kept(rm.channels, electric), d = kept(rm.channels, drums);
  ok(a < -2.5, 'acoustic chop: the acoustic actually goes away', 'acoustic ' + a.toFixed(2) + ' dB');
  ok(e - a > 2, 'acoustic chop: the electric guitar is kept while the acoustic goes', 'electric ' + e.toFixed(2) + ' dB — ' + (e - a).toFixed(2) + ' dB above the acoustic');
  ok(d > -3, 'acoustic chop: the drums keep playing', 'drums ' + d.toFixed(2) + ' dB');
  ok(e > -3, 'acoustic chop: the electric guitar is not collateral damage', 'electric ' + e.toFixed(2) + ' dB');
  /* isolate is judged on each layer on its own: how much does the mask take off
   * this instrument when nothing else is playing? The acoustic has to be the
   * one the mask keeps. */
  const rms = ch => { let s = 0; for (let i = 0; i < N; i++) s += ch[0][i] ** 2 + ch[1][i] ** 2; return Math.sqrt(s / (2 * N)); };
  const level = (layer, opts) => {
    const r = D.separate(layer, SR, 'acoustic-guitar', Object.assign({ amount: 0.9 }, opts));
    const rmsOf = ch => { let s = 0; for (let c = 0; c < ch.length; c++) for (let i = 0; i < N; i++) s += ch[c][i] * ch[c][i]; return Math.sqrt(s / (ch.length * N)); };
    return 20 * Math.log10((rmsOf(r.channels) + 1e-12) / (rmsOf(layer) + 1e-12));
  };
  const ia = level(acoustic, { remove: false }), ie = level(electric, { remove: false }), id = level(drums, { remove: false });
  ok(ia - ie > 0.2, 'acoustic isolate: the mask favours the plucked acoustic over the held electric', 'acoustic ' + ia.toFixed(2) + ' dB vs electric ' + ie.toFixed(2) + ' dB');
  ok(ia - id > 0.4, 'acoustic isolate: the kit is pushed back behind the acoustic', 'drums ' + id.toFixed(2) + ' dB');
  ok(level(acoustic, { remove: true }) < -1, 'acoustic chop: with the acoustic on its own the chop bites', 'acoustic alone ' + level(acoustic, { remove: true }).toFixed(2) + ' dB');
})();

/* ------------------------------------------------------------------ */
/* 12. edges and leftovers: a separated file must start and end cleanly, */
/*     must never leave the fold, and must be stoppable mid-way.        */
/* ------------------------------------------------------------------ */
(async function () {
  const SECS = 3, N = SR * SECS;
  /* a song that starts on a hit — the shape that used to come back as a bang at
   * the head of the file: a decaying thump plus sustained pad and top end */
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const body = 0.25 * Math.sin(2 * Math.PI * 220 * t) + 0.2 * Math.sin(2 * Math.PI * 660 * t) + 0.12 * Math.sin(2 * Math.PI * 3000 * t);
    const hit = 0.6 * Math.exp(-t / 0.02) * Math.sin(2 * Math.PI * 200 * t);
    L[i] = body + hit;
    R[i] = body * 0.85 + hit * 0.9;               /* a little width, not a pure centre */
  }
  let srcPeak = 0;
  for (let i = 0; i < N; i++) srcPeak = Math.max(srcPeak, Math.abs(L[i]), Math.abs(R[i]));

  const edgeWindow = Math.round(0.05 * SR);          /* first/last 50 ms */
  const modes = Object.keys(D.PROFILES);
  let worstHead = 0, worstTail = 0, worstAny = 0, worstMode = '', worstHeadMode = '';
  modes.forEach(m => {
    [true, false].forEach(remove => {
      const r = D.separate([L.slice(), R.slice()], SR, m, { remove: remove, amount: 0.92 });
      r.channels.forEach(ch => {
        for (let i = 0; i < N; i++) {
          const v = Math.abs(ch[i]);
          if (v > worstAny) { worstAny = v; worstMode = m + (remove ? ' remove' : ' isolate'); }
          if (i < edgeWindow && v > worstHead) { worstHead = v; worstHeadMode = m + (remove ? ' remove' : ' isolate'); }
          if (i >= N - edgeWindow && v > worstTail) worstTail = v;
        }
      });
    });
  });
  ok(worstHead <= srcPeak * 1.02,
    'a separation does not bang at the head of the file',
    'loudest first 50 ms ' + worstHead.toFixed(3) + ' vs source peak ' + srcPeak.toFixed(3) + ' (' + worstHeadMode + ')');
  ok(worstTail <= srcPeak * 1.02,
    'a separation does not bang at the tail of the file',
    'loudest last 50 ms ' + worstTail.toFixed(3));
  ok(worstAny <= 1.0, 'no separation sample leaves the −1…1 fold anywhere',
    'peak ' + worstAny.toFixed(3) + ' (' + worstMode + ')');

  /* the chunked path splices slices together — the joins must be as clean as the
   * ends of the file (this is where the old window-sum floor used to bite) */
  const long = Math.round(9.5 * SR);
  const big = [new Float32Array(long), new Float32Array(long)];
  let bigPeak = 0;
  let noiseSeed = 11;
  const noise = () => (noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5;
  for (let i = 0; i < long; i++) {
    const t = i / SR;
    const beat = (i % Math.round(SR * 0.5)) / SR;
    /* broadband hits on purpose: a spectral mask is at its most content
     * dependent with noise, so this is the fixture that shows a bad splice */
    const hit = 0.6 * Math.exp(-beat * 22) * noise();
    big[0][i] = 0.3 * Math.sin(2 * Math.PI * 440 * t) + 0.3 * Math.sin(2 * Math.PI * 220 * t) + hit;
    big[1][i] = 0.3 * Math.sin(2 * Math.PI * 440 * t) - 0.3 * Math.sin(2 * Math.PI * 220 * t) + hit * 0.95;
    bigPeak = Math.max(bigPeak, Math.abs(big[0][i]), Math.abs(big[1][i]));
  }
  const chunked = await D.separateChunked(big, SR, 'vocals', { remove: true, amount: 0.9, sliceSeconds: 4 });
  let joinPeak = 0;
  for (let s = 1; s < chunked.slices; s++) {
    const at = Math.round(s * 4 * SR);
    for (let i = Math.max(0, at - 441); i < Math.min(long, at + 441); i++) joinPeak = Math.max(joinPeak, Math.abs(chunked.channels[0][i]));
  }
  ok(chunked.slices > 1, 'the chunked path really did split the file', chunked.slices + ' slices');
  ok(joinPeak <= bigPeak * 1.02, 'slice joins do not stand out by level',
    'loudest ±10 ms around a join ' + joinPeak.toFixed(3) + ' vs source peak ' + bigPeak.toFixed(3));

  /* loudness is not the whole story. Two things actually matter at a join: the
   * sliced result has to land on the same audio as separating the whole file in
   * one go, and the join must not be a step. (The slices are cross-faded and
   * framed on the same grid as a whole-song pass, so both hold.) */
  const oneShot = D.separate(big, SR, 'vocals', { remove: true, amount: 0.9 });
  let trackDiff = 0, seamJump = 0, bodyJump = 0, worstOwn = 0;
  for (let i = 0; i < long; i++) trackDiff = Math.max(trackDiff, Math.abs(chunked.channels[0][i] - oneShot.channels[0][i]));
  for (let i = 1; i < long; i++) {
    let nearJoin = false;
    for (let s = 1; s < chunked.slices; s++) if (Math.abs(i - Math.round(s * 4 * SR)) <= 441) nearJoin = true;
    const dj = Math.abs((chunked.channels[0][i] - oneShot.channels[0][i]) - (chunked.channels[0][i - 1] - oneShot.channels[0][i - 1]));
    if (nearJoin) seamJump = Math.max(seamJump, dj); else bodyJump = Math.max(bodyJump, dj);
    worstOwn = Math.max(worstOwn, Math.abs(chunked.channels[0][i] - chunked.channels[0][i - 1]));
  }
  ok(trackDiff <= bigPeak * 0.02,
    'the sliced path lands on the whole-song result — the slice context changes nothing audible',
    'biggest disagreement with a whole-file pass ' + trackDiff.toFixed(4) + ' = ' + (100 * trackDiff / bigPeak).toFixed(2) + '% of the source peak');
  ok(seamJump <= bodyJump + 1e-6,
    'a join is not a special place — the result is as smooth there as anywhere else',
    'biggest sample-to-sample move of (sliced − whole-file) at a join ' + seamJump.toExponential(2) +
    ' vs ' + bodyJump.toExponential(2) + ' elsewhere · biggest move of the result itself ' + worstOwn.toFixed(3));
  ok(worstOwn <= bigPeak * 1.02, 'the sliced result never steps out of the source fold',
    'biggest sample-to-sample move ' + worstOwn.toFixed(3) + ' vs source peak ' + bigPeak.toFixed(3));

  /* every result the app hands over goes through the chunked path, and nothing
   * it produces may leave the fold — a wide-band isolate or the classic
   * centre-cancel can legitimately be louder than the song it came from, so the
   * path measures the take once and levels it only when it really has to */
  let hotRaw = 0, hotMode = '';
  for (let m = 0; m < modes.length; m++) {
    for (let d = 0; d < 2; d++) {
      const r = D.separate([L.slice(), R.slice()], SR, modes[m], { remove: !!d, amount: 1 });
      let p = 0;
      r.channels.forEach(ch => { for (let i = 0; i < N; i++) p = Math.max(p, Math.abs(ch[i])); });
      if (p > hotRaw) { hotRaw = p; hotMode = modes[m] + (d ? ' remove' : ' isolate'); }
    }
  }
  /* a deliberately hot take: a wide-band layer isolated from a noisy mix */
  const noisy = [new Float32Array(SR * 2), new Float32Array(SR * 2)];
  for (let i = 0; i < noisy[0].length; i++) {
    const t = i / SR;
    const drum = 0.8 * Math.exp(-((i % Math.round(SR * 0.25)) / SR) * 30) * Math.sin(2 * Math.PI * 3100 * t);
    const tone = 0.3 * Math.sin(2 * Math.PI * 440 * t);
    noisy[0][i] = drum + tone;
    noisy[1][i] = drum + tone * 0.9;
  }
  let rawNoisy = 0;
  D.separate(noisy, SR, 'drums', { remove: false, amount: 1 }).channels.forEach(ch => {
    for (let i = 0; i < ch.length; i++) rawNoisy = Math.max(rawNoisy, Math.abs(ch[i]));
  });
  const guarded = await D.separateChunked(noisy, SR, 'drums', { remove: false, amount: 1, sliceSeconds: 4 });
  let guardedPeak = 0;
  guarded.channels.forEach(ch => { for (let i = 0; i < ch.length; i++) guardedPeak = Math.max(guardedPeak, Math.abs(ch[i])); });
  ok(guardedPeak <= 1 && (guarded.gain === 1 || guarded.gain < 1),
    'nothing the app hands over leaves the fold — a hot take is levelled, a fitting one untouched',
    'raw isolate peaked ' + rawNoisy.toFixed(3) + ' → handed over at ' + guardedPeak.toFixed(3) +
    (guarded.gain < 1 ? ' (levelled by ' + (20 * Math.log10(guarded.gain)).toFixed(2) + ' dB)' : ' (no levelling needed)') +
    ' · loudest raw profile was ' + hotRaw.toFixed(3) + ' on ' + hotMode);
  /* and the guard itself is honest: it leaves an ordinary take bit-for-bit alone */
  const quietIn = [new Float32Array([0.2, -0.4, 0.3])];
  const quietOut = D.limitPeak(quietIn);
  const hotIn = [new Float32Array([0.5, -1.6, 1.2])];
  const hotOut = D.limitPeak(hotIn);
  let hotPeak = 0;
  for (let i = 0; i < hotOut.channels[0].length; i++) hotPeak = Math.max(hotPeak, Math.abs(hotOut.channels[0][i]));
  ok(quietOut.gain === 1 && quietOut.channels === quietIn && hotPeak <= 0.990001 && Math.abs(hotIn[0][1]) === Math.fround(1.6),
    'the peak guard copies nothing it does not have to touch, and it never edits the caller’s buffer',
    'quiet take gain ' + quietOut.gain + ' (same array: ' + (quietOut.channels === quietIn) + ') · hot take ' + hotIn[0][1] +
    ' → ' + hotPeak.toFixed(3) + ' with gain ' + hotOut.gain.toFixed(3) + ', input left at ' + hotIn[0][1] + ' (unchanged: ' + (hotIn[0][1] === Math.fround(-1.6)) + ')');

  /* stopping: a long separation can be abandoned between slices */
  let aborted = null;
  try {
    await D.separateChunked(big, SR, 'drums', { remove: true, shouldAbort: () => true, sliceSeconds: 4 });
  } catch (e) { aborted = e; }
  ok(!!aborted && aborted.aborted === true, 'a separation can be stopped between slices',
    aborted ? '“' + aborted.message + '”' : 'nothing was thrown');

  /* ------------------------------------------------------------------ */
  /* 13. the mask must not fade the voice                                */
  /* ------------------------------------------------------------------ */
  /* A soft, per-frame mask multiplies the voice by its own confidence: words
   * ramp in when isolating, and the first tenth of a second of every word leaks
   * through the notch when removing. Both are measured here against the voice
   * itself (the mix would hide it), 10 ms frames, in dB:
   *   · isolate — how far the voice is off, separately for the first 40 ms of a
   *     word and for the steady part of it; the two must be close, or the mask
   *     is shaping the voice's own envelope;
   *   · remove — the leaked voice must be as weak at a word's onset as it is in
   *     the steady state, or the instrumental “comes back” between syllables. */
  {
    const FS = 22050, TAU2 = Math.PI * 2;
    const words = [];
    for (let k = 0; k < 10; k++) words.push({ at: 0.5 + k * 0.5, dur: 0.34, f0: 196 * Math.pow(2, (k % 4) / 12) });
    const total = Math.ceil((words[words.length - 1].at + 1) * FS);
    const voice = new Float32Array(total);
    let seed2 = 3;
    const rnd2 = () => (seed2 = (seed2 * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5;
    words.forEach(w => {
      const s0 = Math.round(w.at * FS), len = Math.round(w.dur * FS);
      for (let i = 0; i < len; i++) {
        const t = i / FS, vib = 1 + 0.012 * Math.sin(TAU2 * 5.5 * t);
        const env = Math.min(1, t / 0.02) * Math.min(1, (w.dur - t) / 0.05);
        let v = 0;
        for (let h = 1; h <= 6; h++) v += Math.sin(TAU2 * w.f0 * h * vib * t) / (h * 1.4);
        voice[s0 + i] += 0.34 * env * v * (1 + 0.25 * rnd2());
      }
    });
    const gl = new Float32Array(total), gr = new Float32Array(total), lo = new Float32Array(total), dr = new Float32Array(total);
    const chords2 = [[196, 246.9, 392], [220, 277.2, 440], [174.6, 261.6, 349.2], [146.8, 220, 293.7]];
    for (let bar = 0; bar < total / FS; bar++) {
      const ch = chords2[bar % 4], start = Math.round(bar * FS);
      for (let st = 0; st < 4; st++) {
        const off = Math.round(st * 0.25 * FS);
        ch.forEach((f, k) => {
          const at2 = start + off + Math.round(k * 0.012 * FS);
          for (let i = 0; i < 0.5 * FS && at2 + i < total; i++) {
            const t = i / FS, e = Math.exp(-t * 3.2) * Math.min(1, t / 0.004);
            gl[at2 + i] += 0.15 * e * Math.sin(TAU2 * f * t);
            gr[at2 + i] += 0.15 * e * Math.sin(TAU2 * f * 1.003 * t);
          }
        });
      }
      for (let i = 0; i < FS; i++) { const at2 = start + i; if (at2 >= total) break; lo[at2] += 0.24 * Math.sin(TAU2 * 82 * (at2 / FS)); }
    }
    for (let b = 0; b < Math.ceil(total / FS / 0.5); b++) {
      const at2 = Math.round(b * 0.5 * FS);
      for (let i = 0; i < 0.2 * FS && at2 + i < total; i++) dr[at2 + i] += 0.5 * Math.exp(-(i / FS) * 26) * rnd2();
    }
    const m2 = [new Float32Array(total), new Float32Array(total)];
    for (let i = 0; i < total; i++) { m2[0][i] = voice[i] + gl[i] + lo[i] + dr[i]; m2[1][i] = voice[i] + gr[i] + lo[i] + dr[i]; }

    const HOP = Math.round(0.01 * FS);
    const envOf = a => { const o = []; for (let i = 0; i + HOP <= a.length; i += HOP) { let sum = 0; for (let k = 0; k < HOP; k++) sum += a[i + k] * a[i + k]; o.push(Math.sqrt(sum / HOP)); } return o; };
    const dB = x => 20 * Math.log10((x || 0) + 1e-9);
    const envV = envOf(voice);
    const measure = out => {
      const envO = envOf(out[0]);
      const onset = [], steady = [];
      words.forEach(w => {
        const s0 = Math.round(w.at / 0.01), len = Math.round(w.dur / 0.01);
        if (Math.max.apply(null, envV.slice(s0 + 12, s0 + len - 4)) < 0.05) return;
        for (let k = 0; k < 4; k++) onset.push(dB(envO[s0 + k]) - dB(envV[s0 + k]));
        for (let k = 12; k < len - 3; k++) steady.push(dB(envO[s0 + k]) - dB(envV[s0 + k]));
      });
      const med = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
      return { onset: med(onset), steady: med(steady) };
    };
    const iso2 = D.separate(m2, FS, 'vocals', { remove: false, amount: 0.92 });
    const rem2 = D.separate(m2, FS, 'vocals', { remove: true, amount: 0.92 });
    const i1 = measure(iso2.channels), r1 = measure(rem2.channels);
    /* isolating: the voice must arrive with the word, not fade in. Absolute
     * level can sit a couple of dB above the dry voice (island leak); what
     * must not happen is the onset being several dB below the steady part. */
    ok(i1.onset >= -3 && i1.onset <= 6 && Math.abs(i1.onset - i1.steady) <= 3,
      'isolating a voice keeps the voice’s own envelope — words start at level, not faded in',
      'the word onset sits ' + i1.onset.toFixed(1) + ' dB off the real voice, the steady part ' + i1.steady.toFixed(1) + ' dB');
    /* removing: the notch must already be shut when a word starts, and stay shut */
    ok(r1.onset <= -5 && r1.steady <= -5 && Math.abs(Math.abs(r1.onset) - Math.abs(r1.steady)) <= 1.5,
      'removing a voice does not let the first tenth of every word back in',
      'leaked voice at a word onset ' + r1.onset.toFixed(1) + ' dB vs ' + r1.steady.toFixed(1) + ' dB in the steady part ' +
      '(a plain −6 dB fade of the voice reads −6.0 dB at both)');

    /* a held vowel must not wander down. The previous smoother decayed toward
     * zero on every frame the mask was not snapping open, so a dead-steady note
     * lost 4 dB — a fade with nothing in the music causing it. */
    {
      const HS = 22050, N = Math.round(2.4 * HS), TAU = Math.PI * 2;
      const heldV = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const t = i / HS;
        const envH = Math.min(1, t / 0.03) * Math.min(1, (2.4 - t) / 0.1);
        let v = 0; for (let h = 1; h <= 8; h++) v += Math.sin(TAU * 220 * h * t) / (h * 1.3);
        heldV[i] = 0.30 * envH * v;
      }
      const hL = new Float32Array(N), hR = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const t = i / HS;
        hL[i] = heldV[i] + 0.16 * Math.sin(TAU * 196 * t);
        hR[i] = heldV[i] + 0.16 * Math.sin(TAU * 196.5 * t);
      }
      const heldO = D.separate([hL, hR], HS, 'vocals', { remove: false, amount: 0.92 }).channels[0];
      const W = Math.round(0.02 * HS);
      const row = [];
      for (let w = Math.round(0.4 * HS); w + W < N - Math.round(0.4 * HS); w += W) {
        let num = 0, den = 0;
        for (let i = w; i < w + W; i++) { num += heldO[i] * heldV[i]; den += heldV[i] * heldV[i]; }
        row.push(20 * Math.log10(Math.abs(num / (den + 1e-20)) + 1e-9));
      }
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const sd = Math.sqrt(row.reduce((a, b) => a + (b - mean) * (b - mean), 0) / row.length);
      ok(mean >= -2.0 && mean <= 2.5 && (2 * sd) <= 4.5,
        'a held vowel keeps its level — the mask does not fade it down',
        'mean ' + mean.toFixed(1) + ' dB off the real voice, ripple ±' + (2 * sd).toFixed(1) + ' dB');
    }
  }

  console.log(failures === 0 ? '\n✅ ALL AUDIO LAB TESTS PASSED' : `\n❌ ${failures} AUDIO LAB TEST(S) FAILED`);
  process.exit(failures ? 1 : 0);
})();
