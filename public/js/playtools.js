/* Trill Tuner — play-focused tools: looper, drone, CAGED, harmonics,
 * intonation and the bend lab.
 *
 * These are the things that make sitting down with a guitar more useful than
 * another theory page: a loop to play over, a drone to stay in tune against,
 * the five CAGED maps of the neck, natural-harmonic nodes, a 12th-fret
 * intonation check, and a live bend lab that tells you when you actually
 * hit the note.
 */
(function () {
  'use strict';

  const P = {};
  const S = {
    loop: {
      rec: false, playing: false, takes: [null, null, null, null, null], slot: 0,
      sr: 44100, node: null, gain: null, rate: 1, recChunks: [], recGot: 0,
      recSp: null, arm: null
    },
    drone: { on: false, osc: [], gain: null, root: 7, fifth: true, oct: true },
    caged: { root: 4, quality: 'maj' },
    harm: { string: 0, listening: false, raf: 0 },
    into: { string: 0, openHz: null, twelfthHz: null },
    bend: { listening: false, refHz: null, target: 200, raf: 0 }
  };
  const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const OPEN = [40, 45, 50, 55, 59, 64]; /* E2 A2 D3 G3 B3 E4 */
  const STR_NAMES = ['Low E', 'A', 'D', 'G', 'B', 'High E'];

  /* Natural-harmonic nodes. `ratio` is the sounding pitch vs the open string. */
  const HARMONICS = [
    { fret: 12, ratio: 2, name: 'octave' },
    { fret: 7, ratio: 3, name: 'octave + 5th' },
    { fret: 19, ratio: 3, name: 'octave + 5th (upper node)' },
    { fret: 5, ratio: 4, name: 'two octaves' },
    { fret: 24, ratio: 4, name: 'two octaves (upper node)' },
    { fret: 4, ratio: 5, name: 'two octaves + major 3rd' },
    { fret: 9, ratio: 5, name: 'two octaves + major 3rd' },
    { fret: 16, ratio: 5, name: 'two octaves + major 3rd (upper)' },
    { fret: 3.2, ratio: 6, name: 'two octaves + 5th' }
  ];

  function el(id) { return document.getElementById(id); }
  function a4() { return (window.TT && TT.tuner && TT.tuner.state && TT.tuner.state.a4) || 440; }
  function midiToHz(m) { return a4() * Math.pow(2, (m - 69) / 12); }
  function hzToMidi(hz) { return 69 + 12 * Math.log2(hz / a4()); }
  function cents(a, b) { return 1200 * Math.log2(a / b); }
  function prettyHz(hz) {
    if (!hz) return '–';
    const m = hzToMidi(hz);
    const pc = ((Math.round(m) % 12) + 12) % 12;
    const oct = Math.floor(Math.round(m) / 12) - 1;
    return NOTES[pc] + oct + ' · ' + hz.toFixed(1) + ' Hz';
  }
  function openMidis() {
    try {
      const p = TT.tunings.byId(TT.tuner.state.presetId);
      if (p && p.strings && p.strings.length) return p.strings.map(s => s.midi);
    } catch (e) {}
    return OPEN.slice();
  }
  function strLabels() {
    try {
      const p = TT.tunings.byId(TT.tuner.state.presetId);
      if (p && p.strings && p.strings.length) {
        return p.strings.map((s, i) => {
          const n = String(s.name || '').replace(/[0-9]/g, '');
          if (i === 0) return 'Low ' + n + ' (' + s.name + ')';
          if (i === p.strings.length - 1) return 'High ' + n + ' (' + s.name + ')';
          return n + ' (' + s.name + ')';
        });
      }
    } catch (e) {}
    return STR_NAMES.slice();
  }

  /* =================================================================== */
  /* CAGED shapes                                                         */
  /* =================================================================== */
  /* Movable shapes. `f` is the fret of the shape’s index finger / barre.
   * String order low E → high e. -1 = muted. Negative frets (G/C forms)
   * mean “behind the nut” — we bump the whole shape up an octave. */
  const CAGED_MAJ = [
    { id: 'E', name: 'E shape (barre)', fOf: pc => (pc - 4 + 12) % 12, frets: f => [f, f + 2, f + 2, f + 1, f, f], tip: 'The full barre. Root on the 6th and 1st strings.' },
    { id: 'A', name: 'A shape (barre)', fOf: pc => (pc - 9 + 12) % 12, frets: f => [-1, f, f + 2, f + 2, f + 2, f], tip: 'Root on the 5th. The workhorse “A-form” barre.' },
    { id: 'G', name: 'G shape', fOf: pc => (pc - 4 + 12) % 12, frets: f => [f, f - 1, f - 3, f - 3, f - 3, f], tip: 'Three fingers behind the barre. Root on 6th + 1st.' },
    { id: 'C', name: 'C shape', fOf: pc => (pc - 9 + 12) % 12, frets: f => [-1, f, f - 1, f - 3, f - 2, f - 3], tip: 'Root on the 5th (and 2nd). The “C-form” stretch.' },
    { id: 'D', name: 'D shape', fOf: pc => (pc - 2 + 12) % 12, frets: f => [-1, -1, f, f + 2, f + 3, f + 2], tip: 'Root on the 4th. Tiny, bright, great for triads up high.' }
  ];
  const CAGED_MIN = [
    { id: 'Em', name: 'Em shape (barre)', fOf: pc => (pc - 4 + 12) % 12, frets: f => [f, f + 2, f + 2, f, f, f], tip: 'Barre with the minor 3rd on the G string. Root on 6th.' },
    { id: 'Am', name: 'Am shape (barre)', fOf: pc => (pc - 9 + 12) % 12, frets: f => [-1, f, f + 2, f + 2, f + 1, f], tip: 'The Am barre. Root on the 5th.' },
    { id: 'Dm', name: 'Dm shape', fOf: pc => (pc - 2 + 12) % 12, frets: f => [-1, -1, f, f + 2, f + 3, f + 1], tip: 'Root on the 4th. The small Dm moved up the neck.' }
  ];

  function shapeFrets(quality, id, pc) {
    const pack = quality === 'min' ? CAGED_MIN : CAGED_MAJ;
    const sh = pack.find(s => s.id === id);
    if (!sh) return null;
    let f = sh.fOf(pc);
    let drawn = sh.frets(f);
    const played = drawn.filter(x => x !== -1);
    if (played.length && Math.min.apply(null, played) < 0) {
      f += 12;
      drawn = sh.frets(f);
    }
    return drawn;
  }

  function chordBox(frets) {
    const valid = frets.filter(x => x >= 0);
    const lo = valid.length ? Math.min.apply(null, valid) : 0;
    const span = 4;
    const W = 92, H = 118, padL = 16, padT = 18, bw = 60, bh = 84;
    let s = '<svg class="caged-box" viewBox="0 0 ' + W + ' ' + H + '">';
    for (let i = 0; i <= span; i++) {
      const y = padT + bh * i / span;
      s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (padL + bw) + '" y2="' + y + '" stroke="currentColor" stroke-width="' + (i === 0 && lo === 0 ? 3 : 1) + '" opacity=".55"/>';
    }
    for (let st = 0; st < 6; st++) {
      const x = padL + bw * st / 5;
      s += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (padT + bh) + '" stroke="currentColor" stroke-width="1.2" opacity=".55"/>';
    }
    if (lo > 0) s += '<text x="4" y="' + (padT + 10) + '" font-size="10" fill="currentColor">' + lo + '</text>';
    frets.forEach((f, st) => {
      const x = padL + bw * st / 5;
      if (f < 0) {
        s += '<text x="' + x + '" y="' + (padT - 5) + '" text-anchor="middle" font-size="10" fill="currentColor">×</text>';
      } else if (f === 0 && lo === 0) {
        s += '<circle cx="' + x + '" cy="' + (padT - 6) + '" r="3.2" fill="none" stroke="currentColor"/>';
      } else {
        const rel = f - lo;
        if (rel < 0 || rel > span) return;
        const y = padT + bh * (rel - 0.5) / span;
        s += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="currentColor"/>';
        s += '<text x="' + x + '" y="' + (y + 3) + '" text-anchor="middle" font-size="' + (f > 9 ? 7 : 8) + '" fill="#0b0d12">' + f + '</text>';
      }
    });
    s += '</svg>';
    return s;
  }

  function renderCaged() {
    const host = el('pt-caged-out');
    if (!host) return;
    const pc = S.caged.root;
    const pack = S.caged.quality === 'min' ? CAGED_MIN : CAGED_MAJ;
    host.innerHTML = pack.map(sh => {
      const drawn = shapeFrets(S.caged.quality, sh.id, pc);
      const name = NOTES[pc] + (S.caged.quality === 'min' ? 'm' : '') + ' · ' + sh.name;
      return '<button type="button" class="caged-card" data-frets="' + drawn.join(',') + '" title="' + sh.tip + '">' +
        '<b>' + name + '</b>' + chordBox(drawn) + '<span class="dim smallish">' + sh.tip + '</span></button>';
    }).join('');
    host.querySelectorAll('.caged-card').forEach(b => b.addEventListener('click', () => {
      const frets = b.dataset.frets.split(',').map(Number);
      const midis = frets.map((f, i) => f < 0 ? null : OPEN[i] + f).filter(x => x != null);
      if (TT.audio && TT.audio.strum) TT.audio.strum(midis.map(m => midiToHz(m)), 28, 0.55);
    }));
  }

  /* =================================================================== */
  /* looper                                                               */
  /* =================================================================== */

  /* Five takes, A–E. Recording writes to the active slot, so you can bank a
   * few passes and jump between them the instant one stops sitting right —
   * which is the whole reason a looper has more than one slot. */
  const TAKE_NAMES = ['A', 'B', 'C', 'D', 'E'];
  const TAKE_COUNT = TAKE_NAMES.length;
  const XFADE_SEC = 0.03;      /* seam crossfade: long enough to hide a click,
                                * short enough that the phrase still starts on
                                * the beat (30 ms is 6 % of a beat at 120 BPM) */
  const MIN_TAKE_SEC = 0.15;   /* below this there is nothing worth looping */
  const MAX_REC_SEC = 30;

  function curTake() { return S.loop.takes[S.loop.slot] || null; }
  function loopSR() { return (TT.audio && TT.audio.ctx && TT.audio.ctx.sampleRate) || S.loop.sr || 44100; }
  function metroState() { return (window.TT && TT.metronome && TT.metronome.state) || null; }
  function alignWanted() { return !(el('pt-loop-snap') && el('pt-loop-snap').checked === false); }

  /* ---- signal helpers ------------------------------------------------ */
  /* Everything below is a pure function over a Float32Array: no AudioContext,
   * no microphone, no DOM. That is what makes the alignment testable — see
   * test/playtools-test.js, which feeds these synthetic takes and reads back
   * exactly what changed. */

  /* Peak level per window. 10 ms is short enough to catch a picked attack and
   * long enough not to be fooled by individual zero crossings. */
  function peakEnvelope(samples, sr, winSec) {
    const win = Math.max(16, Math.round(sr * (winSec || 0.01)));
    const n = Math.max(0, Math.floor(samples.length / win));
    const env = new Float32Array(n);
    for (let w = 0; w < n; w++) {
      let peak = 0;
      const off = w * win;
      for (let i = 0; i < win; i++) {
        const v = samples[off + i];
        const a = v < 0 ? -v : v;
        if (a > peak) peak = a;
      }
      env[w] = peak;
    }
    return { env: env, win: win };
  }

  /* Where the phrase actually is, so a loop never opens or closes on dead
   * air. The threshold is derived from the take's own noise floor instead of
   * a fixed number, so a treated room and a loud amp both work. */
  function trimSilence(samples, sr, opts) {
    opts = opts || {};
    const none = { start: 0, end: samples ? samples.length : 0, floor: 0, threshold: 0 };
    if (!samples || !samples.length || !sr) return none;
    const pe = peakEnvelope(samples, sr, 0.01);
    const env = pe.env, win = pe.win;
    if (!env.length) return none;
    const sorted = Array.prototype.slice.call(env).sort(function (a, b) { return a - b; });
    const floor = sorted[Math.floor(sorted.length * 0.2)] || 0;
    const peak = sorted[sorted.length - 1] || 0;
    const threshold = Math.max(floor * 3.5, peak * 0.02, opts.threshold || 0.004);
    let a = 0, b = env.length - 1;
    while (a < env.length && env[a] < threshold) a++;
    while (b > a && env[b] < threshold) b--;
    if (a >= b) return none;
    const pre = Math.round((opts.preRoll == null ? 0.015 : opts.preRoll) * sr);
    return {
      start: Math.max(0, a * win - pre),
      end: Math.min(samples.length, (b + 1) * win),
      floor: floor,
      threshold: threshold
    };
  }

  /* Tempo read straight off the take by autocorrelating the onset envelope.
   * This is the fallback when the metronome is off: the loop still lands on a
   * grid, it is just the grid you played rather than the one you set. */
  function detectTempo(samples, sr, opts) {
    opts = opts || {};
    const lo = opts.min || 60, hi = opts.max || 180;
    if (!samples || !sr) return 0;
    const hop = Math.max(64, Math.round(sr * 0.01));
    const frames = Math.floor(samples.length / hop);
    if (frames < 16) return 0;
    const env = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
      let s = 0;
      const off = f * hop;
      for (let i = 0; i < hop; i++) { const v = samples[off + i]; s += v * v; }
      env[f] = Math.sqrt(s / hop);
    }
    const onset = new Float32Array(frames);
    let energy = 0;
    for (let f = 1; f < frames; f++) {
      const d = env[f] - env[f - 1];
      if (d > 0) { onset[f] = d; energy += d; }
    }
    if (energy <= 0) return 0;
    const fps = sr / hop;
    let best = -1, bestBpm = 0;
    for (let bpm = lo; bpm <= hi; bpm++) {
      const lag = fps * 60 / bpm;
      const l0 = Math.floor(lag), l1 = l0 + 1;
      if (l1 >= frames) continue;
      const w = lag - l0;
      let s = 0;
      for (let f = 0; f + l1 < frames; f++) {
        s += onset[f] * (onset[f + l0] * (1 - w) + onset[f + l1] * w);
      }
      /* Halves and doubles of the real tempo score almost as well, so lean
       * gently towards the middle of the range to break the tie sanely. */
      s *= 1 - 0.25 * Math.abs(Math.log(bpm / 110) / Math.LN2);
      if (s > best) { best = s; bestBpm = bpm; }
    }
    return bestBpm;
  }

  /* Fold the tail into the head so the loop point is continuous — no click,
   * no pause, no doubled attack on the first note.
   *
   * out[i] = x[off + i] for the whole loop, except that over the first `n`
   * samples the material that would have followed the loop end
   * (x[off + target + i]) is mixed over it on an equal-power curve. At i = 0
   * the blend is entirely the following material and at i = n it is entirely
   * the head, so the seam lands between x[off + target - 1] and
   * x[off + target] — two samples that were neighbours in the source. That is
   * what makes it seamless rather than merely quiet. */
  function foldSeam(x, off, target, n) {
    const out = new Float32Array(target);
    const end = Math.min(target, x.length - off);
    for (let i = 0; i < end; i++) out[i] = x[off + i];
    if (n < 2) return out;
    for (let i = 0; i < n; i++) {
      const j = off + target + i;
      if (j >= x.length) break;
      const f = i / n;
      out[i] = x[off + i] * Math.sin(f * Math.PI / 2) + x[j] * Math.cos(f * Math.PI / 2);
    }
    return out;
  }

  /* Standalone version: crossfade a loop's seam in place, giving up `n`
   * samples of length. Kept separate because it is the one-liner the tests
   * can assert on without setting up a whole take. */
  function crossfadeSeam(samples, sr, xfSec) {
    if (!samples || !samples.length) return samples;
    const n = Math.min(Math.floor((xfSec || XFADE_SEC) * sr), Math.floor(samples.length / 2) - 1);
    if (n < 2) return samples;
    return foldSeam(samples, 0, samples.length - n, n);
  }

  /* The whole auto-align pass: DC out, air trimmed, length landed on whole
   * bars at the grid tempo, seam folded, level normalised.
   *
   * opts.bpm   grid tempo, 0 to work it out from the take
   * opts.bpb   beats per bar (default 4)
   * opts.bars  force an exact bar count (grid-locked recording)
   * opts.offset index where the musical downbeat sits inside `samples`
   *             (grid-locked takes carry a pre-roll that must not be played)
   * opts.quantize  false to leave the length alone (still trims and folds)
   */
  function alignTake(samples, sr, opts) {
    opts = opts || {};
    const info = {
      trimmed: false, quantized: false, folded: false, bars: 0, bpm: 0,
      xfade: 0, gain: 1, dc: 0, seconds: 0, trimStart: 0, trimEnd: 0
    };
    if (!samples || !samples.length || !sr) return { samples: samples, info: info };
    let x = samples instanceof Float32Array ? samples : new Float32Array(samples);
    const srcLen = x.length;

    /* 1. DC offset. A non-zero mean means the waveform jumps at the loop
     *    point no matter how well it is trimmed, and that jump is a click. */
    let mean = 0;
    for (let i = 0; i < x.length; i++) mean += x[i];
    mean /= x.length;
    if (Math.abs(mean) > 1e-4) {
      const dc = new Float32Array(x.length);
      for (let i = 0; i < x.length; i++) dc[i] = x[i] - mean;
      x = dc;
      info.dc = mean;
    }

    /* 2. the grid tempo: the metronome when we have one, else the take's own */
    const bpm = opts.bpm > 0 ? opts.bpm : detectTempo(x, sr);
    info.bpm = bpm;
    const bpb = opts.bpb || 4;
    const bar = bpm > 0 ? (60 / bpm) * bpb : 0;

    /* 3. where the phrase is. A grid-locked take already knows where its
     *    downbeat fell; a free take has to have the dead air found. Note
     *    that only the start moves the offset — the material past the end of
     *    the phrase is kept, because that is the decay and room the seam fold
     *    blends over the loop start. What is not kept is reported, so the
     *    status line cannot claim a trim that did not happen. */
    let off = 0, avail = x.length;
    if (opts.offset > 0) {
      off = Math.min(opts.offset, Math.max(0, x.length - 1));
      avail = x.length - off;
    } else if (opts.trim !== false) {
      const t = trimSilence(x, sr);
      if (t.end > t.start && (t.start > 0 || t.end < x.length)) {
        off = t.start;
        avail = t.end - t.start;
      }
    }

    /* 4. land on whole bars, folding the seam on the way through */
    const minLen = Math.round(MIN_TAKE_SEC * sr);
    let out = null;
    if (bar > 0 && opts.quantize !== false) {
      const xfSec = Math.min(opts.xfade == null ? XFADE_SEC : opts.xfade, bar * 0.2);
      const nWant = Math.max(16, Math.round(xfSec * sr));
      const barLen = Math.round(bar * sr);
      /* Nearest bar count to what was played, then step down until it fits
       * inside the audio we actually captured. Inventing samples to reach a
       * rounder number would be a lie about the timing, and a bar count the
       * caller pinned down (grid-locked recording) is never quietly changed. */
      const from = opts.bars > 0 ? Math.round(opts.bars) : Math.max(1, Math.round(avail / barLen));
      for (let bars = from; bars >= 1; bars--) {
        const target = bars * barLen;
        if (off + target > x.length) { if (opts.bars > 0) break; continue; }
        if (target < minLen) break;
        const nUse = Math.min(nWant, x.length - off - target);
        if (nUse >= 2) {
          out = foldSeam(x, off, target, nUse);
          info.folded = true;
          info.xfade = nUse / sr;
        } else {
          out = new Float32Array(x.subarray(off, off + target));
        }
        info.quantized = true;
        info.bars = bars;
        break;
      }
    }
    if (!out) {
      /* No usable grid, or too short to quantise. Still fold the seam — a
       * loop point with no crossfade clicks even when it is bar-accurate. */
      const n = Math.max(16, Math.round((opts.xfade == null ? XFADE_SEC : opts.xfade) * sr));
      if (avail - n >= minLen && off + avail <= x.length) {
        out = foldSeam(x, off, avail - n, n);
        info.folded = true;
        info.xfade = n / sr;
      } else {
        out = new Float32Array(x.subarray(off, Math.min(x.length, off + Math.max(avail, minLen))));
      }
    }
    info.trimStart = off / sr;
    info.trimEnd = Math.max(0, (srcLen - off - out.length) / sr);
    info.trimmed = info.trimStart > 0 || info.trimEnd > 0;
    x = out;

    /* 5. level. Bring a whisper take up and keep a hot one off the ceiling. */
    let peak = 0;
    for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > peak) peak = v; }
    if (peak > 0) {
      const target = opts.peak || 0.95;
      if (peak > target || peak < target * 0.35) {
        const g = target / peak;
        for (let i = 0; i < x.length; i++) {
          x[i] = Math.max(-1, Math.min(1, x[i] * g));
        }
        info.gain = g;
      }
    }

    info.seconds = x.length / sr;
    return { samples: x, info: info };
  }

  /* Back-compat wrapper: the old behaviour, "cut this to whole bars", kept
   * because it is a useful one-liner and is asserted on in the unit tests. */
  function snapLoop(samples, sr, bpm, bpb) {
    if (!samples || !sr || !bpm) return samples;
    bpb = bpb || 4;
    const bar = (60 / bpm) * bpb;
    const dur = samples.length / sr;
    if (dur < bar * 0.35) return samples;
    const bars = Math.max(1, Math.round(dur / bar));
    const n = Math.min(samples.length, Math.max(1, Math.round(bars * bar * sr)));
    return samples.subarray ? samples.subarray(0, n) : samples.slice(0, n);
  }

  /* ---- capture helpers ---------------------------------------------- */

  function loopConcat(chunks) {
    let total = 0;
    for (let i = 0; i < chunks.length; i++) total += chunks[i].data.length;
    const out = new Float32Array(total);
    let o = 0;
    for (let i = 0; i < chunks.length; i++) { out.set(chunks[i].data, o); o += chunks[i].data.length; }
    return out;
  }

  /* Cut [from, to] out of a set of timestamped chunks. Every chunk knows when
   * its first sample hit the clock, so this is sample-accurate against the
   * same ctx.currentTime the metronome schedules its clicks from — which is
   * the only way "start on the downbeat" can mean anything. */
  function loopSlice(chunks, sr, from, to) {
    if (!(to > from)) return null;
    const out = new Float32Array(Math.round((to - from) * sr));
    let filled = 0;
    for (let c = 0; c < chunks.length; c++) {
      const ch = chunks[c];
      const a = Math.max(ch.t0, from), b = Math.min(ch.t1, to);
      if (b <= a) continue;
      const i0 = Math.max(0, Math.round((a - ch.t0) * sr));
      const i1 = Math.min(ch.data.length, Math.round((b - ch.t0) * sr));
      let dst = Math.round((a - from) * sr);
      for (let i = i0; i < i1 && dst < out.length; i++, dst++) { out[dst] = ch.data[i]; filled++; }
    }
    return filled > 0 ? out : null;
  }

  /* ---- status / drawing --------------------------------------------- */

  function loopStatus(t) { const n = el('pt-loop-status'); if (n) n.textContent = t; }

  function loopDraw() {
    const c = el('pt-loop-wave');
    if (!c) return;
    const t = curTake();
    const d = t && t.samples;
    const w = Math.max(2, c.clientWidth || 320);
    const h = Math.max(2, c.clientHeight || 64);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext && c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, w, h);
    if (!d || !d.length) return;
    const colour = (typeof getComputedStyle === 'function' && getComputedStyle(c).color) || '#38bdf8';

    /* bar lines first, so you can see the alignment instead of trusting it */
    if (t.bpm > 0) {
      const bpb = t.bpb || 4;
      const barLen = (60 / t.bpm) * bpb * t.sr;
      if (barLen > 8) {
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = barLen; x < d.length; x += barLen) {
          const px = Math.round(x / d.length * w) + 0.5;
          ctx.moveTo(px, 0); ctx.lineTo(px, h);
        }
        ctx.stroke();
      }
    }

    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(d.length / w));
    for (let x = 0; x < w; x++) {
      let peak = 0;
      const i0 = x * step;
      for (let i = 0; i < step && i0 + i < d.length; i++) peak = Math.max(peak, Math.abs(d[i0 + i]));
      const y = peak * h * 0.46;
      ctx.moveTo(x, h / 2 - y);
      ctx.lineTo(x, h / 2 + y);
    }
    ctx.stroke();

    /* the crossfade region, so the seam is visible and you can see it is
     * being handled rather than left to luck */
    if (t.xfade > 0) {
      const px = Math.round(t.xfade * t.sr / d.length * w);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(0, 0, Math.max(2, px), h);
    }
  }

  /* ---- takes -------------------------------------------------------- */

  function renderTakes() {
    const wrap = el('pt-loop-takes');
    if (!wrap) return;
    /* the buttons ship in index.html so they are there before the first paint;
     * fall back to building them only if the markup ever loses them */
    let btns = wrap.querySelectorAll('.take-btn');
    if (!btns.length) {
      wrap.innerHTML = TAKE_NAMES.map(function (n, i) {
        return '<button type="button" class="take-btn" id="pt-loop-take-' + i + '" data-take="' + i +
          '" aria-pressed="false">' + n + '</button>';
      }).join('');
      btns = wrap.querySelectorAll('.take-btn');
    }
    Array.prototype.forEach.call(btns, function (b) {
      const i = +b.dataset.take;
      if (!b.dataset.bound) {
        b.dataset.bound = '1';
        b.addEventListener('click', function () { loopSelect(i); });
      }
      const t = S.loop.takes[i];
      b.classList.toggle('on', i === S.loop.slot);
      b.classList.toggle('filled', !!t);
      b.setAttribute('aria-pressed', i === S.loop.slot ? 'true' : 'false');
      b.title = t
        ? 'Take ' + TAKE_NAMES[i] + ' — ' + t.samples.length / t.sr
          .toFixed(1) + 's' + (t.bars ? ', ' + t.bars + ' bar' + (t.bars === 1 ? '' : 's') : '') +
          (t.bpm ? ' at ' + Math.round(t.bpm) + ' BPM' : '') + '. Click to switch to it.'
        : 'Take ' + TAKE_NAMES[i] + ' — empty. Click, then press Rec to fill it.';
    });
    const n = el('pt-loop-take-label');
    if (n) n.textContent = 'Take ' + TAKE_NAMES[S.loop.slot];
  }

  function loopSelect(i) {
    if (!(i >= 0) || i >= TAKE_COUNT) return;
    if (S.loop.rec) { loopStatus('Finish the take first — press Stop rec.'); return; }
    S.loop.slot = i;
    const t = curTake();
    if (!t) {
      loopStopNode();
      loopDraw();
      renderTakes();
      loopStatus('Take ' + TAKE_NAMES[i] + ' is empty — press Rec and it will be filled.');
      return;
    }
    loopDraw();
    renderTakes();
    loopPlay();
    loopStatus('Take ' + TAKE_NAMES[i] + ' — ' + describeTake(t) + '.');
  }

  function describeTake(t) {
    const parts = [(t.samples.length / t.sr).toFixed(2) + 's'];
    if (t.bars) parts.push(t.bars + ' bar' + (t.bars === 1 ? '' : 's'));
    if (t.bpm) parts.push(Math.round(t.bpm) + ' BPM');
    if (t.grid) parts.push('on the beat grid');
    return parts.join(' · ');
  }

  /* ---- transport ---------------------------------------------------- */

  function loopStopNode() {
    const L = S.loop;
    if (L.node) {
      /* 8 ms ramp out — stopping a looping buffer mid-sample is a click */
      try {
        const now = TT.audio.ctx.currentTime;
        if (L.gain) { L.gain.gain.cancelScheduledValues(now); L.gain.gain.setValueAtTime(L.gain.gain.value, now); L.gain.gain.linearRampToValueAtTime(0.0001, now + 0.008); }
        L.node.stop(now + 0.012);
      } catch (e) { try { L.node.stop(); } catch (e2) {} }
      try { L.node.disconnect(); } catch (e) {}
      L.node = null;
    }
    L.playing = false;
    const b = el('pt-loop-play'); if (b) b.textContent = '▶ Play loop';
  }

  function loopPlay() {
    const L = S.loop;
    const t = curTake();
    if (!t || !t.samples || !t.samples.length) return;
    const ctx = TT.audio.ensure();
    loopStopNode();
    const buf = ctx.createBuffer(1, t.samples.length, t.sr);
    buf.getChannelData(0).set(t.samples);
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    /* the seam is already folded, so the whole buffer is the loop: loopStart
     * at 0 and loopEnd at the end leave nothing to click on */
    node.playbackRate.value = L.rate;
    const g = ctx.createGain();
    const vol = el('pt-loop-vol') ? +el('pt-loop-vol').value : 0.9;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.008);
    node.connect(g); g.connect(ctx.destination);
    node.start(0);
    L.node = node; L.gain = g; L.playing = true;
    const b = el('pt-loop-play'); if (b) b.textContent = '■ Stop loop';
  }

  /* ---- recording ---------------------------------------------------- */

  function loopDetachRec() {
    const L = S.loop;
    L.rec = false;
    if (L.arm && L.arm.off) { try { L.arm.off(); } catch (e) {} L.arm.off = null; }
    if (L.recSp) {
      try { L.recSp.onaudioprocess = null; } catch (e) {}
      try { const tap = TT.audio && TT.audio.tapNode && TT.audio.tapNode(); if (tap) tap.disconnect(L.recSp); } catch (e) {}
      try { L.recSp.disconnect(); } catch (e) {}
      L.recSp = null;
    }
    const rb = el('pt-loop-rec'); if (rb) { rb.textContent = '● Rec'; rb.classList.remove('rec-on'); }
  }

  function loopAbortRec() {
    loopDetachRec();
    S.loop.arm = null;
    S.loop.recChunks = []; S.loop.recGot = 0;
  }

  function loopRecStop() {
    const L = S.loop;
    const st = L.arm;
    const chunks = L.recChunks;
    loopDetachRec();
    L.arm = null;
    L.recChunks = []; L.recGot = 0;
    const sr = loopSR();
    if (!chunks.length) { loopStatus('Nothing came through the mic — check the input and try again.'); return; }

    const align = alignWanted();
    const m = metroState();
    let bpb = (m && m.bpb) || 4;
    let bpm = (m && m.bpm) || 0;
    let raw = null, offset = 0, bars = 0;

    if (align && st && st.capturing && st.startAt > 0 && st.stopAt > st.startAt) {
      /* Grid-locked. The metronome said exactly when the downbeat was, so
       * take that much audio and no more, plus a sliver either side for the
       * seam fold. Nothing about this needs the player to hit a button at
       * the right moment, which is the usual way loops go wrong.
       *
       * The tempo and signature come from the arm, not from the metronome as
       * it stands now: nudging the BPM during a take is a normal thing to do,
       * and the take has to be measured against the grid it was played on. */
      const ns = Math.max(16, Math.round(XFADE_SEC * sr));
      const lenSamples = Math.round(st.bar * st.bars * sr);
      raw = loopSlice(chunks, sr, st.startAt - ns / sr, st.startAt + (lenSamples + ns) / sr);
      offset = ns;
      bars = st.bars;
      bpm = st.bpm || bpm;
      bpb = st.bpb || bpb;
    } else {
      raw = loopConcat(chunks);
    }

    if (!raw || raw.length < MIN_TAKE_SEC * sr) {
      loopStatus('That take was too short — hold Rec for a bar or two.');
      return;
    }

    const slot = curTake();
    const overdubbing = !!(slot && el('pt-loop-overdub') && el('pt-loop-overdub').checked);
    const done = alignTake(raw, sr, {
      bpm: align ? bpm : 0,
      bpb: bpb,
      bars: align ? bars : 0,
      offset: offset,
      xfade: XFADE_SEC
    });
    let take = done.samples;
    const info = done.info;

    /* whichever way we go, the pass we are about to replace becomes the
     * undo state — an overdub you cannot take back is not an overdub */
    if (slot) slot.prev = slot.samples;
    if (overdubbing && slot && slot.sr === sr) {
      const n = Math.min(take.length, slot.samples.length);
      const mix = new Float32Array(slot.samples);
      for (let i = 0; i < n; i++) mix[i] = Math.max(-1, Math.min(1, mix[i] + take[i] * 0.8));
      take = mix;
      info.overdubbed = true;
    }

    const t = {
      samples: take,
      sr: sr,
      bpm: info.bpm,
      bpb: bpb,
      bars: info.quantized ? Math.round(info.bars) : 0,
      xfade: info.xfade,
      grid: !!(st && st.capturing),
      prev: slot ? slot.prev : null,
      when: Date.now()
    };
    S.loop.takes[S.loop.slot] = t;
    S.loop.sr = sr;
    renderTakes();
    loopDraw();
    loopPlay();

    const bits = ['Take ' + TAKE_NAMES[S.loop.slot], describeTake(t)];
    if (t.grid) bits.push('recorded on the beat grid');
    else if (info.quantized) bits.push('snapped to ' + Math.round(info.bpm) + ' BPM read off the take');
    else bits.push('left at the length you played');
    if (info.trimmed) bits.push('air trimmed from both ends');
    if (info.overdubbed) bits.push('overdubbed');
    loopStatus(bits.join(' · ') + '.');
  }

  async function loopRecStart() {
    const L = S.loop;
    try {
      TT.audio.ensure();
      if (TT.audio.micState !== 'on') await TT.audio.startMic();
    } catch (e) {
      loopStatus((e && e.message) || 'Microphone is needed to record a loop.');
      return;
    }
    const overdub = !!(curTake() && el('pt-loop-overdub') && el('pt-loop-overdub').checked);
    if (!overdub) loopStopNode();
    const ctx = TT.audio.ctx;
    const sr = ctx.sampleRate;

    L.rec = true; L.recChunks = []; L.recGot = 0; L.arm = null; L.sr = sr;

    /* Work out whether we have a clock to lock to. If the metronome is not
     * running, start it — "auto align with the tempo" is not much use
     * without one, and asking the player to go and press Start first is
     * exactly the friction that makes loops land in the wrong place. */
    const M = window.TT && TT.metronome;
    let bar = 0, bpb = 4, countIn = 0;
    if (alignWanted() && M && M.state) {
      if (!M.isPlaying()) { try { if (M.init) M.init(); M.start(); } catch (e) {} }
      if (M.isPlaying()) {
        bpb = M.state.bpb || 4;
        bar = (60 / M.state.bpm) * bpb;
        countIn = el('pt-loop-countin') && el('pt-loop-countin').checked === false ? 0 : bpb;
      }
    }

    const sp = ctx.createScriptProcessor(4096, 1, 1);
    if (!TT.audio._silent) {
      TT.audio._silent = ctx.createGain();
      TT.audio._silent.gain.value = 0;
      TT.audio._silent.connect(ctx.destination);
    }
    const tap = TT.audio.tapNode();
    tap.connect(sp); sp.connect(TT.audio._silent);
    sp.onaudioprocess = function (e) {
      if (!L.rec) return;
      const d = e.inputBuffer.getChannelData(0);
      /* playbackTime is the instant this buffer's last sample reaches the
       * output. It is the same clock the metronome schedules on, so a beat
       * the scheduler promised at T really does line up with the audio at T. */
      const t1 = (typeof e.playbackTime === 'number' && e.playbackTime > 0)
        ? e.playbackTime : ctx.currentTime;
      L.recChunks.push({ data: new Float32Array(d), t0: t1 - d.length / sr, t1: t1 });
      L.recGot += d.length;
      const st = L.arm;
      if (st && st.capturing) {
        const got = Math.max(0, Math.min(t1, st.stopAt) - st.startAt);
        loopStatus('Recording take ' + TAKE_NAMES[L.slot] + ' · ' + got.toFixed(2) + 's of ' +
          (st.bar * st.bars).toFixed(2) + 's — it stops itself on the beat.');
      } else {
        loopStatus('Recording… ' + (L.recGot / sr).toFixed(1) + 's');
      }
      if (L.recGot > sr * MAX_REC_SEC) loopRecStop();
    };
    L.recSp = sp;
    const rb = el('pt-loop-rec'); if (rb) { rb.textContent = '■ Stop rec'; rb.classList.add('rec-on'); }

    if (bar > 0) {
      const bars = el('pt-loop-bars') ? Math.max(1, +el('pt-loop-bars').value || 2) : 2;
      L.arm = {
        /* bpm/bpb are captured here, not read back later: the tempo can be
         * changed while a take is running, and a take recorded on one grid
         * must not be measured against another */
        sr: sr, bar: bar, bpm: M.state.bpm, bpb: bpb, bars: bars, beatsLeft: countIn,
        startAt: 0, stopAt: 0, capturing: false, finishing: false, off: null
      };
      L.arm.off = M.onBeat(function (time) {
        const a = S.loop.arm;
        if (!a || !S.loop.rec) return;
        if (!a.capturing) {
          if (a.beatsLeft > 0) {
            loopStatus('Count-in · ' + a.beatsLeft + ' beat' + (a.beatsLeft === 1 ? '' : 's') + '…');
            a.beatsLeft--;
            return;
          }
          /* the count fills one bar, so this beat is the downbeat of the
           * next bar — the loop starts where the player was told it would */
          a.capturing = true;
          a.startAt = time;
          a.stopAt = time + a.bar * a.bars;
          loopStatus('Recording take ' + TAKE_NAMES[S.loop.slot] + ' · ' + a.bars +
            ' bar' + (a.bars === 1 ? '' : 's') + ' at ' + Math.round(M.state.bpm) +
            ' BPM — it stops itself on the beat.');
          return;
        }
        if (!a.finishing && time >= a.stopAt - 1e-6) {
          a.finishing = true;
          /* the ScriptProcessor still has a couple of buffers in flight; let
           * them land before slicing or the last beat loses its tail */
          setTimeout(function () { if (S.loop.rec) loopRecStop(); }, 260);
        }
      });
      loopStatus('Armed — take ' + TAKE_NAMES[L.slot] + ' starts on the ' +
        (countIn ? 'downbeat after a ' + countIn + '-beat count-in' : 'next beat') +
        ', runs ' + bars + ' bar' + (bars === 1 ? '' : 's') + ', and stops itself.');
    } else {
      loopStatus(overdub
        ? 'Overdubbing take ' + TAKE_NAMES[L.slot] + ' — play the next layer, then press Stop rec.'
        : 'Recording take ' + TAKE_NAMES[L.slot] + ' — play the phrase, then press Stop rec. The air gets trimmed and the loop lands on whole bars.');
    }
  }

  /* ---- slot actions ------------------------------------------------- */

  function loopClear() {
    if (S.loop.rec) loopAbortRec();
    loopStopNode();
    const t = curTake();
    if (!t) {
      S.loop.takes = S.loop.takes.map(function () { return null; });
      S.loop.rate = 1;
      const hs = el('pt-loop-half'); if (hs) hs.textContent = '½ speed';
      loopDraw();
      renderTakes();
      loopStatus('All five takes cleared.');
      return;
    }
    /* first press clears this take; with nothing left to clear, clear all */
    S.loop.takes[S.loop.slot] = null;
    loopDraw();
    renderTakes();
    loopStatus('Take ' + TAKE_NAMES[S.loop.slot] + ' cleared. Press Clear again to empty all five.');
  }

  function loopUndo() {
    const t = curTake();
    if (!t || !t.prev) { loopStatus('Nothing to undo on take ' + TAKE_NAMES[S.loop.slot] + '.'); return; }
    const cur = t.samples;
    t.samples = t.prev;
    t.prev = cur;
    loopDraw();
    renderTakes();
    if (S.loop.playing) loopPlay();
    loopStatus('Undid the last pass on take ' + TAKE_NAMES[S.loop.slot] + '.');
  }

  function loopHalf() {
    S.loop.rate = S.loop.rate === 1 ? 0.5 : 1;
    const hs = el('pt-loop-half');
    if (hs) hs.textContent = S.loop.rate === 1 ? '½ speed' : 'Full speed';
    if (S.loop.playing) loopPlay();
    loopStatus(S.loop.rate === 1 ? 'Full speed.' : 'Half speed — pitch drops an octave, like tape.');
  }


  /* =================================================================== */
  /* drone                                                                */
  /* =================================================================== */
  function droneFreqs(rootPc, fifth, oct) {
    const rootMidi = 40 + ((rootPc - 4 + 12) % 12);
    const freqs = [midiToHz(rootMidi)];
    if (fifth) freqs.push(midiToHz(rootMidi + 7));
    if (oct) freqs.push(midiToHz(rootMidi + 12));
    return freqs;
  }

  function droneStop() {
    S.drone.osc.forEach(o => { try { o.stop(); } catch (e) {} try { o.disconnect(); } catch (e) {} });
    S.drone.osc = [];
    if (S.drone.gain) { try { S.drone.gain.disconnect(); } catch (e) {} S.drone.gain = null; }
    S.drone.on = false;
    const b = el('pt-drone-btn'); if (b) b.textContent = '▶ Start drone';
  }

  function droneStart() {
    droneStop();
    const ctx = TT.audio.ensure();
    const g = ctx.createGain();
    g.gain.value = el('pt-drone-vol') ? +el('pt-drone-vol').value : 0.18;
    g.connect(ctx.destination);
    const freqs = droneFreqs(S.drone.root, S.drone.fifth, S.drone.oct);
    const type = (el('pt-drone-wave') && el('pt-drone-wave').value) || 'triangle';
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.value = i === 0 ? 1 : 0.55;
      o.connect(gg); gg.connect(g);
      o.start();
      S.drone.osc.push(o);
    });
    S.drone.gain = g;
    S.drone.on = true;
    const b = el('pt-drone-btn'); if (b) b.textContent = '■ Stop drone';
  }

  /* =================================================================== */
  /* pitch sample                                                         */
  /* =================================================================== */
  function samplePitch() {
    if (!TT.audio || !TT.audio.analyser || !TT.yin) return null;
    const n = TT.audio.analyser.fftSize || 4096;
    const buf = new Float32Array(n);
    TT.audio.analyser.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
    if (peak < 0.01) return null;
    return TT.yin.yin(buf, TT.audio.ctx.sampleRate, 0.15);
  }

  async function ensureMic() {
    TT.audio.ensure();
    if (TT.audio.micState !== 'on') await TT.audio.startMic();
  }

  /* =================================================================== */
  /* harmonics                                                            */
  /* =================================================================== */
  function renderHarmonics() {
    const host = el('pt-harm-out');
    if (!host) return;
    const opens = openMidis();
    const si = Math.max(0, Math.min(opens.length - 1, S.harm.string));
    const openHz = midiToHz(opens[si]);
    host.innerHTML = HARMONICS.map(h => {
      const hz = openHz * h.ratio;
      return '<button type="button" class="harm-card" data-hz="' + hz.toFixed(2) + '">' +
        '<b>Fret ' + h.fret + '</b>' +
        '<span>' + h.name + '</span>' +
        '<span class="dim">' + prettyHz(hz) + '</span>' +
        '<small>×' + h.ratio + '</small></button>';
    }).join('');
    host.querySelectorAll('.harm-card').forEach(b => b.addEventListener('click', () => {
      const hz = +b.dataset.hz;
      if (TT.audio && TT.audio.pluck) TT.audio.pluck(hz, 0, 0.7);
    }));
  }

  function harmTick() {
    S.harm.raf = 0;
    if (!S.harm.listening) return;
    const det = samplePitch();
    const v = el('pt-harm-verdict');
    if (det && det.freq) {
      const openHz = midiToHz(openMidis()[S.harm.string]);
      let best = HARMONICS[0], bestErr = 999;
      HARMONICS.forEach(h => {
        const err = Math.abs(cents(det.freq, openHz * h.ratio));
        if (err < bestErr) { bestErr = err; best = h; }
      });
      if (v) {
        if (bestErr < 18) v.textContent = 'Fret ' + best.fret + ' harmonic ✓  (' + best.name + ', ' + bestErr.toFixed(0) + ' ¢)';
        else v.textContent = prettyHz(det.freq) + ' — not a node of this string yet.';
        v.className = 'pt-verdict' + (bestErr < 18 ? ' g' : '');
      }
    }
    S.harm.raf = requestAnimationFrame(harmTick);
  }

  async function harmToggle() {
    if (S.harm.listening) {
      S.harm.listening = false;
      if (S.harm.raf) cancelAnimationFrame(S.harm.raf);
      const b = el('pt-harm-listen'); if (b) b.textContent = '▶ Listen';
      return;
    }
    try { await ensureMic(); } catch (e) {
      const v = el('pt-harm-verdict'); if (v) v.textContent = (e && e.message) || 'Microphone needed.';
      return;
    }
    S.harm.listening = true;
    const b = el('pt-harm-listen'); if (b) b.textContent = '■ Stop';
    harmTick();
  }

  /* =================================================================== */
  /* intonation                                                           */
  /* =================================================================== */
  function intoStatus(t) { const n = el('pt-into-status'); if (n) n.textContent = t; }

  function intoCapture(which) {
    ensureMic().then(() => {
      const det = samplePitch();
      if (!det) { intoStatus('Play the note clearly — no pitch yet.'); return; }
      if (which === 'open') S.into.openHz = det.freq;
      else S.into.twelfthHz = det.freq;
      renderInto();
    }).catch(e => intoStatus((e && e.message) || 'Microphone needed.'));
  }

  function renderInto() {
    const open = S.into.openHz, tw = S.into.twelfthHz;
    const a = el('pt-into-open'), b = el('pt-into-12');
    if (a) a.textContent = prettyHz(open);
    if (b) b.textContent = prettyHz(tw);
    if (open && tw) {
      const want = open * 2;
      const c = cents(tw, want);
      const abs = Math.abs(c);
      let advice;
      if (abs < 3) advice = 'In tune at the 12th — leave the saddle.';
      else if (c > 0) advice = '12th is sharp by ' + c.toFixed(1) + ' ¢ — move the saddle back (away from the neck).';
      else advice = '12th is flat by ' + abs.toFixed(1) + ' ¢ — move the saddle forward (toward the neck).';
      intoStatus(advice);
      const needle = el('pt-into-needle');
      if (needle) needle.style.transform = 'translateX(' + (Math.max(-40, Math.min(40, c)) * 2) + 'px)';
    }
  }

  /* =================================================================== */
  /* bend lab                                                             */
  /* =================================================================== */
  function bendTick() {
    S.bend.raf = 0;
    if (!S.bend.listening) return;
    const det = samplePitch();
    const read = el('pt-bend-read');
    const bar = el('pt-bend-fill');
    const verdict = el('pt-bend-verdict');
    if (det && det.freq) {
      if (!S.bend.refHz) S.bend.refHz = det.freq;
      const c = cents(det.freq, S.bend.refHz);
      const t = S.bend.target;
      const err = c - t;
      if (read) read.textContent = (c >= 0 ? '+' : '') + c.toFixed(0) + ' ¢  (want +' + t + ' ¢)';
      if (bar) bar.style.width = Math.max(0, Math.min(100, (c / (t * 1.4 || 1)) * 100)) + '%';
      if (Math.abs(err) <= 12 && c > t * 0.5) {
        if (verdict) { verdict.textContent = 'In tune ✓'; verdict.className = 'pt-verdict g'; }
        if (bar) bar.style.background = 'var(--green)';
      } else if (c > t + 12) {
        if (verdict) { verdict.textContent = 'Too far — release a little'; verdict.className = 'pt-verdict r'; }
        if (bar) bar.style.background = 'var(--red)';
      } else {
        if (verdict) { verdict.textContent = c < 8 ? 'Play the unbent note, then bend' : 'Keep bending…'; verdict.className = 'pt-verdict'; }
        if (bar) bar.style.background = 'var(--accent)';
      }
    } else {
      if (read) read.textContent = 'Listening…';
    }
    S.bend.raf = requestAnimationFrame(bendTick);
  }

  async function bendToggle() {
    if (S.bend.listening) {
      S.bend.listening = false;
      if (S.bend.raf) cancelAnimationFrame(S.bend.raf);
      const b = el('pt-bend-btn'); if (b) b.textContent = '▶ Listen';
      return;
    }
    try { await ensureMic(); } catch (e) {
      const v = el('pt-bend-verdict'); if (v) v.textContent = (e && e.message) || 'Microphone needed.';
      return;
    }
    S.bend.listening = true;
    S.bend.refHz = null;
    const b = el('pt-bend-btn'); if (b) b.textContent = '■ Stop';
    bendTick();
  }

  function fillStringSelect(id, selected) {
    const sel = el(id);
    if (!sel) return;
    const labels = strLabels();
    sel.innerHTML = labels.map((n, i) => '<option value="' + i + '"' + (i === selected ? ' selected' : '') + '>' + n + '</option>').join('');
  }

  /* =================================================================== */
  /* init                                                                 */
  /* =================================================================== */
  P.init = function () {
    if (P._ready) return;
    if (!el('pt-loop-rec')) return;
    P._ready = true;

    NOTES.forEach((n, i) => {
      const o = document.createElement('option');
      o.value = String(i); o.textContent = n;
      if (el('pt-drone-root')) el('pt-drone-root').appendChild(o.cloneNode(true));
      if (el('pt-caged-root')) el('pt-caged-root').appendChild(o);
    });
    if (el('pt-drone-root')) el('pt-drone-root').value = '7';
    if (el('pt-caged-root')) el('pt-caged-root').value = '4';

    fillStringSelect('pt-into-string', 0);
    fillStringSelect('pt-harm-string', 0);

    el('pt-loop-rec').addEventListener('click', () => S.loop.rec ? loopRecStop() : loopRecStart());
    el('pt-loop-play').addEventListener('click', () => S.loop.playing ? loopStopNode() : loopPlay());
    el('pt-loop-clear').addEventListener('click', loopClear);
    el('pt-loop-undo').addEventListener('click', loopUndo);
    el('pt-loop-half').addEventListener('click', loopHalf);
    if (el('pt-loop-vol')) el('pt-loop-vol').addEventListener('input', () => { if (S.loop.gain) S.loop.gain.gain.value = +el('pt-loop-vol').value; });
    if (el('pt-loop-takes')) el('pt-loop-takes').addEventListener('keydown', e => {
      /* left/right move between takes without taking the hands off the neck */
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      loopSelect((S.loop.slot + d + TAKE_COUNT) % TAKE_COUNT);
    });
    renderTakes();
    document.addEventListener('keydown', e => {
      /* A–E jump to that take, but only while the looper is the pane on
       * screen: digits are already spoken for by the tuner's string keys. */
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target && e.target.isContentEditable)) return;
      const i = TAKE_NAMES.indexOf(String(e.key).toUpperCase());
      if (i < 0) return;
      const pane = el('tools-looper'), view = el('view-tools');
      if (!pane || !pane.classList.contains('active') || !view || !view.classList.contains('active')) return;
      e.preventDefault();
      loopSelect(i);
    });

    el('pt-drone-btn').addEventListener('click', () => S.drone.on ? droneStop() : droneStart());
    el('pt-drone-root').addEventListener('change', () => { S.drone.root = +el('pt-drone-root').value; if (S.drone.on) droneStart(); });
    el('pt-drone-fifth').addEventListener('change', () => { S.drone.fifth = el('pt-drone-fifth').checked; if (S.drone.on) droneStart(); });
    el('pt-drone-oct').addEventListener('change', () => { S.drone.oct = el('pt-drone-oct').checked; if (S.drone.on) droneStart(); });
    el('pt-drone-wave').addEventListener('change', () => { if (S.drone.on) droneStart(); });
    if (el('pt-drone-vol')) el('pt-drone-vol').addEventListener('input', () => { if (S.drone.gain) S.drone.gain.gain.value = +el('pt-drone-vol').value; });

    el('pt-caged-root').addEventListener('change', () => { S.caged.root = +el('pt-caged-root').value; renderCaged(); });
    el('pt-caged-qual').addEventListener('change', () => { S.caged.quality = el('pt-caged-qual').value; renderCaged(); });
    renderCaged();

    el('pt-harm-string').addEventListener('change', () => { S.harm.string = +el('pt-harm-string').value; renderHarmonics(); });
    el('pt-harm-listen').addEventListener('click', harmToggle);
    renderHarmonics();

    el('pt-into-open-btn').addEventListener('click', () => intoCapture('open'));
    el('pt-into-12-btn').addEventListener('click', () => intoCapture('12'));
    el('pt-into-string').addEventListener('change', () => {
      S.into.string = +el('pt-into-string').value;
      S.into.openHz = S.into.twelfthHz = null;
      renderInto();
      intoStatus('Play the open ' + strLabels()[S.into.string] + ', then the 12th-fret octave.');
    });

    el('pt-bend-btn').addEventListener('click', bendToggle);
    el('pt-bend-reset').addEventListener('click', () => { S.bend.refHz = null; });
    el('pt-bend-target').addEventListener('change', () => { S.bend.target = +el('pt-bend-target').value; });
  };

  P.stop = function () {
    if (S.loop.rec) loopAbortRec();
    loopStopNode();
    droneStop();
    S.bend.listening = false;
    if (S.bend.raf) cancelAnimationFrame(S.bend.raf);
    S.harm.listening = false;
    if (S.harm.raf) cancelAnimationFrame(S.harm.raf);
  };

  P.renderCaged = renderCaged;
  P.renderHarmonics = renderHarmonics;
  P.shapeFrets = shapeFrets;
  P.chordBox = chordBox;
  P.snapLoop = snapLoop;
  P.alignTake = alignTake;
  P.trimSilence = trimSilence;
  P.detectTempo = detectTempo;
  P.crossfadeSeam = crossfadeSeam;
  P.foldSeam = foldSeam;
  P.peakEnvelope = peakEnvelope;
  P.TAKE_NAMES = TAKE_NAMES;
  P.selectTake = loopSelect;
  P.loopRecStart = loopRecStart;
  P.loopRecStop = loopRecStop;
  P.loopSlice = loopSlice;
  P.droneFreqs = droneFreqs;
  P.midiToHz = midiToHz;
  P.HARMONICS = HARMONICS;
  P.CAGED_MAJ = CAGED_MAJ;
  P.CAGED_MIN = CAGED_MIN;
  P.state = S;
  window.TT = window.TT || {};
  window.TT.playtools = P;
})();
