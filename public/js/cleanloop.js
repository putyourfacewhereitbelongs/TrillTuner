/* Trill Tuner — Clean loop: play along with the mic, strip the room and the
 * background, and loop only the instrument.
 *
 * Record → the take is denoised (lib/denoise.js: spectral subtraction against
 * the take's own quiet floor) → optionally the vocal is taken out: by the
 * HT-Demucs model when it is loaded, else by the classic engine the stem lab uses → the result is aligned to whole bars with the
 * looper's alignTake → looped. The original take is kept alongside so you can
 * flip between Original and Clean and hear exactly what the noise removal did.
 */
(function () {
  'use strict';

  const C = {};
  const MAX_SEC = 60;                 /* a minute of mic is ~10 MB of memory; more is refused honestly */
  const S = {
    rec: false, busy: false, capping: false,
    chunks: [], got: 0, sp: null,
    takes: { raw: null, clean: null },
    listen: 'clean', playing: false, node: null, gain: null,
    summary: ''
  };

  function el(id) { return document.getElementById(id); }
  function status(t) { const n = el('cl-status'); if (n) n.textContent = t; }
  function yieldFrame() { return new Promise(r => setTimeout(r, 0)); }
  function engine() {
    const T = window.TT || {};
    if (!T.denoise || !T.dsp || !T.playtools) throw new Error('the Clean loop engine did not load');
    return T;
  }

  /* ---- recording --------------------------------------------------- */

  async function startRec() {
    if (S.busy) { status('Still cleaning the last take — one moment.'); return; }
    try {
      engine();
      TT.audio.ensure();
      if (TT.audio.micState !== 'on') await TT.audio.startMic();
    } catch (e) {
      status((e && e.message) || 'Microphone is needed to record.');
      return;
    }
    stopPlayback();
    const ctx = TT.audio.ctx, sr = ctx.sampleRate;
    S.rec = true; S.chunks = []; S.got = 0; S.capping = false;
    const sp = ctx.createScriptProcessor(4096, 1, 1);
    if (!TT.audio._silent) {
      TT.audio._silent = ctx.createGain();
      TT.audio._silent.gain.value = 0;
      TT.audio._silent.connect(ctx.destination);
    }
    const tap = TT.audio.tapNode();
    tap.connect(sp); sp.connect(TT.audio._silent);
    sp.onaudioprocess = function (e) {
      if (!S.rec) return;
      const d = e.inputBuffer.getChannelData(0);
      S.chunks.push(new Float32Array(d));
      S.got += d.length;
      status('Recording… ' + (S.got / sr).toFixed(1) + 's — play the phrase, then press Stop. Max ' + MAX_SEC + ' s.');
      if (!S.capping && S.got > sr * MAX_SEC) {
        S.capping = true;
        setTimeout(function () { if (S.rec) stopRec(); }, 0);
      }
    };
    S.sp = sp;
    const b = el('cl-rec'); if (b) { b.textContent = '■ Stop'; b.classList.add('rec-on'); }
    status('Recording… play the phrase, then press Stop. The room and the hiss will be taken out.');
  }

  function detachRec() {
    S.rec = false;
    if (S.sp) {
      try { S.sp.onaudioprocess = null; } catch (e) {}
      try { const tap = TT.audio && TT.audio.tapNode && TT.audio.tapNode(); if (tap) tap.disconnect(S.sp); } catch (e) {}
      try { S.sp.disconnect(); } catch (e) {}
      S.sp = null;
    }
    const b = el('cl-rec'); if (b) { b.textContent = '● Record'; b.classList.remove('rec-on'); }
  }

  function stopRec() {
    if (!S.rec) return;
    const sr = TT.audio.ctx ? TT.audio.ctx.sampleRate : 44100;
    const chunks = S.chunks;
    S.chunks = []; S.got = 0;
    detachRec();
    if (!chunks.length) { status('Nothing came through the mic — check the input and try again.'); return; }
    let total = 0;
    for (const c of chunks) total += c.length;
    const raw = new Float32Array(total);
    let o = 0;
    for (const c of chunks) { raw.set(c, o); o += c.length; }
    if (raw.length < sr * 0.5) { status('That was too short to clean — play for a bar or two.'); return; }
    process(raw, sr).catch(function (e) {
      S.busy = false;
      status('Could not clean that take: ' + ((e && e.message) || e));
    });
  }

  /* ---- the clean-up pass ------------------------------------------- */

  async function process(raw, sr) {
    const T = engine();
    S.busy = true;
    const strength = +(el('cl-strength') ? el('cl-strength').value : 3);
    const wantVocals = !!(el('cl-vocals') && el('cl-vocals').checked);
    const wantAlign = !(el('cl-align') && el('cl-align').checked === false);
    try {
      status('Taking the noise out…');
      await yieldFrame();
      const nr = T.denoise.denoise(raw, sr, { strength: strength });
      let x = nr.samples;
      const info = nr.info;

      let vocalEngine = '';
      if (wantVocals) {
        const H = window.TT && TT.htdemucs;
        if (H && H.isReady()) {
          status('Taking the vocal out with the model… this can take a while.');
          await yieldFrame();
          try {
            const r = await H.separateStem([x], sr, 'vocals', true, 0.92, {
              onProgress: f => status('Taking the vocal out with the model… ' + Math.round(f * 100) + '%')
            });
            x = r.channels[0];
            vocalEngine = 'model';
          } catch (e) {
            status('The model failed (' + (e && e.message ? e.message : 'unknown') + ') — taking the vocal out with the classic engine.');
            await yieldFrame();
          }
        }
        if (!vocalEngine) {
          status('Taking the vocal out… this can take a few seconds.');
          await yieldFrame();
          const r = await T.dsp.separateChunked([x], sr, 'vocals', {
            remove: true, amount: 0.92, sliceSeconds: 15,
            onProgress: f => status('Taking the vocal out… ' + Math.round(f * 100) + '%')
          });
          x = r.channels[0];
          vocalEngine = 'classic';
        }
      }

      /* the tempo the metronome is holding, if it is running; otherwise the
       * alignment works the tempo out of the take itself */
      const M = window.TT && TT.metronome;
      const metroOn = !!(M && M.isPlaying && M.isPlaying());
      const bpm = metroOn ? M.state.bpm : 0;
      const bpb = (M && M.state && M.state.bpb) || 4;
      /* Whole bars only when there is a metronome to lock to. Without one, a
       * tempo guessed from a four-second phrase would cut it to an arbitrary
       * bar, so the take is trimmed and its seam folded but its length kept. */
      const lockBars = wantAlign && metroOn;
      const alignOpts = { bpm: bpm, bpb: bpb, xfade: 0.03, quantize: lockBars };
      const clean = wantAlign ? T.playtools.alignTake(x, sr, alignOpts) : null;
      const orig = wantAlign ? T.playtools.alignTake(raw, sr, alignOpts) : null;

      S.takes.clean = { samples: clean ? clean.samples : x, sr: sr, info: clean ? clean.info : null };
      S.takes.raw = { samples: orig ? orig.samples : raw, sr: sr, info: orig ? orig.info : null };

      const bits = [];
      const secs = S.takes.clean.samples.length / sr;
      const barInfo = clean && clean.info && clean.info.quantized ? clean.info : null;
      bits.push(barInfo
        ? barInfo.bars + ' bar' + (barInfo.bars === 1 ? '' : 's') + ' at ' + Math.round(barInfo.bpm) + ' BPM'
        : secs.toFixed(2) + ' s' + (lockBars ? '' : ' (not bar-locked: no metronome running)'));
      if (info.applied) {
        bits.push('noise down about ' + info.reductionDb.toFixed(1) + ' dB in the gaps' +
          (info.gentle ? ' (no clean gaps in this take, so it went gently)' : ''));
      }
      if (wantVocals) {
        bits.push('vocal taken out (' + (vocalEngine === 'model' ? 'HT-Demucs model' : 'classic engine' +
          (window.TT && TT.htdemucs && !TT.htdemucs.isReady() ? ', model not loaded' : '')) + ')');
      }
      S.summary = bits.join(' · ');
      status('Clean loop ready · ' + S.summary + '.');
      setListen(S.listen);
      playLoop();
      renderButtons();
    } finally {
      S.busy = false;
    }
  }

  /* ---- playback ---------------------------------------------------- */

  function stopPlayback() {
    if (S.node) {
      try {
        const now = TT.audio.ctx.currentTime;
        if (S.gain) { S.gain.gain.cancelScheduledValues(now); S.gain.gain.setValueAtTime(S.gain.gain.value, now); S.gain.gain.linearRampToValueAtTime(0.0001, now + 0.008); }
        S.node.stop(now + 0.012);
      } catch (e) { try { S.node.stop(); } catch (e2) {} }
      try { S.node.disconnect(); } catch (e) {}
      S.node = null;
    }
    S.playing = false;
    renderButtons();
  }

  function playLoop() {
    const take = S.takes[S.listen];
    if (!take || !take.samples || !take.samples.length) return;
    const ctx = TT.audio.ensure();
    stopPlayback();
    const buf = ctx.createBuffer(1, take.samples.length, take.sr);
    buf.getChannelData(0).set(take.samples);
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    const g = ctx.createGain();
    const vol = el('cl-vol') ? +el('cl-vol').value : 0.9;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.008);
    node.connect(g); g.connect(ctx.destination);
    node.start(0);
    S.node = node; S.gain = g; S.playing = true;
    renderButtons();
  }

  function setListen(which) {
    S.listen = which === 'raw' ? 'raw' : 'clean';
    const b = el('cl-ab');
    if (b) b.textContent = S.listen === 'clean' ? 'Hearing: clean · tap for original' : 'Hearing: original · tap for clean';
  }

  function renderButtons() {
    const p = el('cl-play'); if (p) p.textContent = S.playing ? '■ Stop loop' : '▶ Play loop';
    const hasClean = !!S.takes.clean;
    ['cl-play', 'cl-ab', 'cl-clear'].forEach(id => { const n = el(id); if (n) n.disabled = !hasClean && id !== 'cl-clear'; });
  }

  /* ---- wiring ------------------------------------------------------ */

  C.init = function () {
    if (C._ready) return;
    if (!el('cl-rec')) return;
    C._ready = true;
    el('cl-rec').addEventListener('click', () => S.rec ? stopRec() : startRec());
    el('cl-play').addEventListener('click', () => S.playing ? stopPlayback() : playLoop());
    el('cl-ab').addEventListener('click', () => {
      setListen(S.listen === 'clean' ? 'raw' : 'clean');
      if (S.playing) playLoop();
    });
    el('cl-clear').addEventListener('click', () => {
      if (S.rec) { detachRec(); S.chunks = []; }
      stopPlayback();
      S.takes = { raw: null, clean: null };
      status('Cleared. Press Record and play.');
      renderButtons();
    });
    if (el('cl-vol')) el('cl-vol').addEventListener('input', () => { if (S.gain) S.gain.gain.value = +el('cl-vol').value; });
    if (el('cl-strength')) el('cl-strength').addEventListener('input', () => {
      const n = el('cl-strength-val'); if (n) n.textContent = (+el('cl-strength').value).toFixed(1);
    });
    renderButtons();
  };

  /* leaving the tab stops everything: nothing keeps recording or looping */
  C.stop = function () {
    if (S.rec) { detachRec(); S.chunks = []; S.got = 0; }
    stopPlayback();
  };

  C.state = S;
  window.TT = window.TT || {};
  window.TT.cleanloop = C;
})();
