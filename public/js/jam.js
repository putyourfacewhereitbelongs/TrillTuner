/* Trill Tuner — Jam track: backing-chord loops played by the Karplus-Strong
 * synth, locked to the metronome scheduler. Tune up, flip on the jam, and
 * play along without leaving the app. */
(function () {
  'use strict';
  const N = window.TT.notes;

  const J = { state: { on: false, key: 9, prog: 'p154', vol: 0.7 } };
  let els = {};
  let removeHook = null;
  let uiTimer = 0;
  let bar = 0;
  let uiQueue = [];
  let chordSeq = [];

  /* ---------- chord math ---------- */
  const QUALITIES = {
    maj: { iv: [0, 4, 7, 12], suffix: '' },
    min: { iv: [0, 3, 7, 12], suffix: 'm' },
    dom7: { iv: [0, 4, 7, 10, 12], suffix: '7' },
    min7: { iv: [0, 3, 7, 10, 12], suffix: 'm7' },
    maj7: { iv: [0, 4, 7, 11, 12], suffix: 'maj7' }
  };

  /* Voicing root: lowest pitch of this pitch-class at/above E2 (midi 40). */
  function voicingRoot(pc) { return 40 + ((pc - 4 + 12) % 12); }

  function chord(pc, q) {
    const qq = QUALITIES[q] || QUALITIES.maj;
    const root = voicingRoot(pc);
    return {
      name: N.SHARP[pc % 12] + qq.suffix,
      midis: qq.iv.map(i => root + i)
    };
  }

  /* Diatonic root offsets from the key root. */
  const DEG = { I: 0, ii: 2, iii: 4, IV: 5, V: 7, vi: 9, vii: 11 };

  const PROGRESSIONS = {
    blues12: [
      ['I', 'dom7'], ['I', 'dom7'], ['I', 'dom7'], ['I', 'dom7'],
      ['IV', 'dom7'], ['IV', 'dom7'], ['I', 'dom7'], ['I', 'dom7'],
      ['V', 'dom7'], ['IV', 'dom7'], ['I', 'dom7'], ['V', 'dom7']
    ],
    p154: [['I', 'maj'], ['V', 'maj'], ['vi', 'min'], ['IV', 'maj']],
    classic: [['I', 'maj'], ['IV', 'maj'], ['V', 'maj'], ['IV', 'maj']],
    jazz: [['ii', 'min7'], ['V', 'dom7'], ['I', 'maj7'], ['I', 'maj7']]
  };

  function buildSeq() {
    const prog = PROGRESSIONS[J.state.prog] || PROGRESSIONS.p154;
    chordSeq = prog.map(([deg, q]) => {
      const c = chord((J.state.key + DEG[deg]) % 12, q);
      c.deg = deg;
      return c;
    });
  }
  J.chordSeq = function () { buildSeq(); return chordSeq; }; // testable

  /* ---------- playback ---------- */
  function pluckAt(freq, when, gain) {
    TT.audio.pluck(freq, when, gain, TT.audio.metroBus); // recorded + heard
  }

  function strumAt(chordObj, when, kind) {
    const v = J.state.vol;
    const freqs = chordObj.midis.map(m => N.midiToFreq(m));
    if (kind === 'bass') {
      pluckAt(freqs[0], when, 0.6 * v);
      pluckAt(freqs[freqs.length - 1] * 0.5, when, 0.35 * v); // deep fifth-ish anchor
    } else if (kind === 'light') {
      freqs.slice(1).forEach((f, i) => pluckAt(f, when + i * 0.012, 0.28 * v));
    } else { // full
      freqs.forEach((f, i) => pluckAt(f, when + i * 0.018, 0.42 * v));
    }
  }

  function onBeat(time, beatIdx) {
    const bpb = TT.metronome.state.bpb;
    if (beatIdx === 0) {
      const c = chordSeq[bar % chordSeq.length];
      bar++;
      strumAt(c, time, 'full');
      uiQueue.push({ time: time, name: c.name, next: chordSeq[bar % chordSeq.length].name });
    } else if (beatIdx % 2 === 1) {
      strumAt(chordSeq[bar % chordSeq.length], time, 'light');
    } else {
      strumAt(chordSeq[bar % chordSeq.length], time, 'bass');
    }
    void bpb;
  }

  function drainUI() {
    const ctx = TT.audio.ctx;
    while (uiQueue.length && uiQueue[0].time <= ctx.currentTime + 0.03) {
      const ev = uiQueue.shift();
      els.jamNow.textContent = ev.name;
      els.jamNext.textContent = '→ ' + ev.next;
    }
    if (!TT.metronome.isPlaying()) {
      els.jamNow.textContent = '—';
      els.jamNext.textContent = '';
    }
  }

  /* ---------- enable / disable ---------- */
  function setOn(on) {
    J.state.on = on;
    els.chkJam.checked = on;
    if (on) {
      buildSeq();
      bar = 0; uiQueue = [];
      removeHook = TT.metronome.onBeat(onBeat);
      clearInterval(uiTimer);
      uiTimer = setInterval(drainUI, 80);
      TT.app.assist(`Jam on: ${chordSeq.map(c => c.deg).join('–')} in ${N.SHARP[J.state.key]} — start the metronome and play along.`);
      if (!TT.metronome.isPlaying()) TT.app.assist('Start the metronome (Space) and the backing kicks in.');
    } else {
      if (removeHook) { removeHook(); removeHook = null; }
      clearInterval(uiTimer); uiTimer = 0;
      els.jamNow.textContent = '—';
      els.jamNext.textContent = '';
      TT.app.assist('Jam track off.');
    }
    save();
  }

  function save() {
    TT.store.set('settings', Object.assign(TT.store.get('settings', {}), {
      jamOn: J.state.on, jamKey: J.state.key, jamProg: J.state.prog, jamVol: J.state.vol
    }));
  }

  /* ---------- init ---------- */
  J.init = function () {
    els = {
      chkJam: document.getElementById('chk-jam'),
      selKey: document.getElementById('select-jam-key'),
      selProg: document.getElementById('select-jam-prog'),
      vol: document.getElementById('jam-vol'),
      jamNow: document.getElementById('jam-now'),
      jamNext: document.getElementById('jam-next')
    };
    const s = TT.store.get('settings', {});
    if (s.jamKey != null) J.state.key = +s.jamKey;
    if (s.jamProg && PROGRESSIONS[s.jamProg]) J.state.prog = s.jamProg;
    if (s.jamVol != null) J.state.vol = Math.max(0, Math.min(1, +s.jamVol));

    els.selKey.value = String(J.state.key);
    els.selProg.value = J.state.prog;
    els.vol.value = J.state.vol;

    els.chkJam.addEventListener('change', () => setOn(els.chkJam.checked));
    els.selKey.addEventListener('change', () => {
      J.state.key = +els.selKey.value;
      buildSeq();
      TT.app.assist(`Jam key: ${N.SHARP[J.state.key]}. Next bar picks it up.`);
      save();
    });
    els.selProg.addEventListener('change', () => {
      J.state.prog = els.selProg.value;
      buildSeq();
      const names = chordSeq.map(c => c.deg).join('–');
      TT.app.assist(`Jam progression: ${names}. Next bar picks it up.`);
      save();
    });
    els.vol.addEventListener('input', () => { J.state.vol = +els.vol.value; save(); });

    if (s.jamOn) setOn(true, true); // restore last session's jam preference (silent)
  };

  window.TT = window.TT || {};
  window.TT.jam = J;
})();
