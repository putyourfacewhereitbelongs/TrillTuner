/* Trill Tuner — Stem lab: take a song apart.
 *
 * Load any audio file and remove — or isolate — the vocals, the drums, the
 * bass, the electric guitar, the acoustic guitar, the keys, the strings or the
 * synth. The classic karaoke centre-cancel is here too, and the acoustic-only
 * mode leaves the electric guitar, the bass and the drums exactly where they
 * were.
 *
 * The engine (lib/dsp.js) works offline on your own machine: it builds two
 * spectrograms — one of *sustained* content (a per-bin median over time) and
 * one of *transient* content (how far this frame is above that median) — plus
 * a centre/side split, and every instrument profile is a weighted combination
 * of those three. Nothing is uploaded, nothing is guessed by a server.
 */
(function () {
  'use strict';

  const S = {};
  const state = {
    file: null,
    buffer: null,
    channels: null,
    sr: 44100,
    mode: 'vocals',
    remove: true,
    amount: 0.92,
    result: null,
    node: null,
    gain: null,
    playing: false,
    busy: false,          /* a separation or a recording is running */
    recordSeconds: 20,    /* how long the room recording runs (the tests shorten it) */
    cancel: false,        /* the user asked to stop */
    sourceName: '',
    sourceDesc: ''
  };
  let els = {};
  let worker = null;      /* background separation worker, when the page can have one */

  const PROFILE_LABEL = {
    vocals: 'Vocals', drums: 'Drums (all)', kick: 'Kick drum', snare: 'Snare', hats: 'Hi-hats / cymbals',
    bass: 'Bass guitar', 'electric-guitar': 'Electric guitar', 'acoustic-guitar': 'Acoustic guitar',
    keys: 'Piano / keys', strings: 'Strings', synth: 'Synth', guitar: 'Guitar (acoustic + electric)'
  };
  const PRESETS = [
    { id: 'instrumental', label: '🎤 Instrumental maker', mode: 'vocals', remove: true, amount: 0.95, desc: 'Vocals out, everything else in. The karaoke / play-along file.' },
    { id: 'acapella', label: '🎙️ Isolate the vocals', mode: 'vocals', remove: false, amount: 0.9, desc: 'Only the vocal line — good for learning phrasing and lyrics.' },
    { id: 'drumless', label: '🥁 Remove the drums', mode: 'drums', remove: true, amount: 0.9, desc: 'Play along with the drummer gone; the groove becomes yours to keep.' },
    { id: 'drumsonly', label: '🥁 Drums only', mode: 'drums', remove: false, amount: 0.9, desc: 'The kit on its own — check your timing against the real thing.' },
    { id: 'bassless', label: '🎸 Remove the bass', mode: 'bass', remove: true, amount: 0.9, desc: 'A hole in the low end that a bass player (or your thumb) can fill.' },
    { id: 'bassonly', label: '🎸 Bass only', mode: 'bass', remove: false, amount: 0.9, desc: 'Just the low end — learn the bass line, then play it on the guitar.' },
    { id: 'electric-off', label: '⚡ Remove the electric guitar', mode: 'electric-guitar', remove: true, amount: 0.9, desc: 'Rhythm guitar out, vocals/drums/bass/acoustic stay.' },
    { id: 'electric-only', label: '⚡ Electric guitar only', mode: 'electric-guitar', remove: false, amount: 0.9, desc: 'The amp in the room — study the tone and the parts.' },
    { id: 'acoustic-off', label: '🪕 Remove ONLY the acoustic guitar', mode: 'acoustic-guitar', remove: true, amount: 0.88, desc: 'The acoustic goes and nothing else does: vocals, drums, bass AND the electric guitar all keep playing.' },
    { id: 'acoustic-only', label: '🪕 Isolate the acoustic guitar', mode: 'acoustic-guitar', remove: false, amount: 0.88, desc: 'The strummed, picked acoustic layer on its own.' },
    { id: 'keys-off', label: '🎹 Remove the keys', mode: 'keys', remove: true, amount: 0.9, desc: 'Piano and electric piano out of the way.' },
    { id: 'strings-off', label: '🎻 Remove the strings', mode: 'strings', remove: true, amount: 0.9, desc: 'Take the orchestra out of the pop song.' },
    { id: 'synth-off', label: '🎛️ Remove the synth', mode: 'synth', remove: true, amount: 0.9, desc: 'Strip the pads and leave the guitars.' },
    { id: 'guitar-off', label: '🎸 Remove all guitars', mode: 'guitar', remove: true, amount: 0.9, desc: 'Acoustic and electric both, so you can play the whole part yourself.' },
    { id: 'karaoke-keep-bass', label: '🎤 Classic karaoke (bass kept)', mode: 'classic-keep-bass', remove: true, amount: 0.95, desc: 'The 1990s centre-cancel trick, with the bass protected so the song still has a bottom end.' }
  ];

  /* ---------------------------------------------------------------- */
  function decodeFile(file) {
    const ctx = TT.audio.ensure();
    return file.arrayBuffer().then(buf => new Promise((resolve, reject) => {
      const done = b => resolve(b);
      const fail = e => reject(e || new Error('Could not decode that file'));
      const p = ctx.decodeAudioData(buf, done, fail);
      if (p && typeof p.then === 'function') p.then(done, fail);
    }));
  }

  function setStatus(msg, cls) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.className = 'st-status' + (cls ? ' ' + cls : '');
  }
  function setProgress(frac) {
    if (els.bar) els.bar.style.width = Math.round(frac * 100) + '%';
    if (els.pct) els.pct.textContent = Math.round(frac * 100) + '%';
  }

  /* the little card that says what is loaded, and where it came from */
  function setSource(name, desc) {
    state.sourceName = name || '';
    state.sourceDesc = desc || '';
    if (!els.source) return;
    els.source.hidden = false;
    els.source.innerHTML = `<b>${name}</b><span>${desc}</span>`;
  }

  /* every new take throws the old result away — playing or exporting a previous
   * song's separation while a new one is loaded is how people get confused */
  function clearResult() {
    resetPlayer();
    state.result = null;
    if (els.result) els.result.hidden = true;
    if (els.effect) els.effect.innerHTML = '';
  }

  S.loadFile = async function (file) {
    if (!file) return;
    clearResult();
    state.file = file;
    state.channels = null;
    if (els.btnRun) els.btnRun.disabled = true;
    setStatus('Decoding ' + file.name + '…');
    try {
      const buf = await decodeFile(file);
      state.buffer = buf;
      state.sr = buf.sampleRate;
      state.channels = [];
      for (let c = 0; c < buf.numberOfChannels; c++) state.channels.push(buf.getChannelData(c));
      setSource(file.name, `${buf.numberOfChannels === 1 ? 'mono' : 'stereo'} · ${(buf.sampleRate / 1000).toFixed(1)} kHz · ${mmss(buf.duration)}`);
      setStatus('Loaded. Pick a recipe or build your own below.');
      setProgress(0);
      if (els.btnRun) els.btnRun.disabled = false;
    } catch (e) {
      setStatus('Could not decode that file. Try WAV, MP3 or M4A. (' + (e && e.message ? e.message : 'unknown error') + ')', 'err');
    }
  };

  /* An AudioBuffer — or a bare Float32Array of samples, which is what the mic
   * capture returns — becomes the new source. Used by the room recording, by the
   * Backing studio hand-off and by any other part of the app that already has
   * samples in memory. */
  S.loadBuffer = function (buffer, name, sampleRate) {
    if (!buffer) return false;
    let buf = buffer;
    if (typeof buf.getChannelData !== 'function') {
      /* a plain mono take as returned by TT.audio.captureBuffer */
      if (typeof buf.length !== 'number' || !buf.length) return false;
      const samples = buf;
      const sr = sampleRate || (TT.audio.ctx && TT.audio.ctx.sampleRate) || state.sr;
      buf = {
        numberOfChannels: 1, sampleRate: sr, length: samples.length,
        duration: samples.length / sr, getChannelData: () => samples
      };
    }
    S.init();
    clearResult();
    state.file = null;
    state.buffer = buf;
    state.sr = buf.sampleRate || sampleRate || state.sr;
    state.channels = [];
    for (let c = 0; c < (buf.numberOfChannels || 1); c++) state.channels.push(buf.getChannelData(c));
    setSource(name || 'Audio take', `${buf.numberOfChannels === 1 ? 'mono' : 'stereo'} · ${(state.sr / 1000).toFixed(1)} kHz · ${mmss(buf.duration || state.channels[0].length / state.sr)}`);
    setProgress(0);
    if (els.btnRun) els.btnRun.disabled = false;
    return true;
  };

  /* Hand-off from another view: the Backing studio sends { channels, sr, … } and
   * a title describing the render. Nothing is uploaded and nothing is written to
   * disk — the samples go straight into this tab, ready to be taken apart. */
  S.adopt = function (res, meta) {
    if (!res) return false;
    let channels = res.channels;
    if (!channels && res.getChannelData) {
      channels = [];
      for (let c = 0; c < (res.numberOfChannels || 1); c++) channels.push(res.getChannelData(c));
    }
    if (!channels || !channels.length || !channels[0] || !channels[0].length) return false;
    const sr = res.sr || res.sampleRate || state.sr;
    const seconds = res.seconds || channels[0].length / sr;
    const name = (meta && meta.title) || res.title || 'Handed-over audio';
    const detail = (meta && meta.detail) || describe(res) || 'from another part of the app';
    S.init();
    clearResult();
    state.file = null;
    state.buffer = { numberOfChannels: channels.length, sampleRate: sr, length: channels[0].length, duration: seconds };
    state.sr = sr;
    state.channels = channels;
    setSource(name, `${channels.length === 1 ? 'mono' : 'stereo'} · ${(sr / 1000).toFixed(1)} kHz · ${mmss(seconds)} · ${detail}`);
    setProgress(0);
    if (els.btnRun) els.btnRun.disabled = false;
    setStatus(name + ' loaded — pick a recipe and separate it.', 'ok');
    return true;
  };

  function describe(obj) {
    const bits = [];
    if (obj.key) bits.push('key ' + obj.key + (obj.modeName ? ' ' + obj.modeName : ''));
    if (obj.styleName) bits.push(obj.styleName);
    if (obj.bpm) bits.push(obj.bpm + ' BPM');
    if (obj.bars) bits.push(obj.bars + ' bars');
    return bits.join(' · ');
  }

  function micErrorText(e) {
    const name = (e && e.name) || '';
    const msg = (e && e.message) || 'no audio';
    if (name === 'NotAllowedError' || /permission|denied/i.test(msg)) {
      return 'Microphone permission was denied. Allow the mic for this page (the padlock in the address bar), then press the button again.';
    }
    if (name === 'NotFoundError') return 'No microphone found — plug one in, or drop a song file instead.';
    if (/Microphone is off/.test(msg)) return 'The microphone could not be started. If you are inside a preview frame, open the app in its own tab (or use the Android app) and try again.';
    return 'Microphone capture failed: ' + msg + '.';
  }

  /* 20 seconds from the room or the desk: start the mic, count down, hand the
   * take to the same pipeline the file path uses. The tab may not assume the
   * tuner already opened the mic — pressing this button is the user's gesture. */
  async function fromMic() {
    if (state.busy) return;
    state.busy = true;
    if (els.btnMic) els.btnMic.disabled = true;
    const alreadyOn = TT.audio.micState === 'on' && !!TT.audio.micSource;
    try {
      if (!alreadyOn) {
        setStatus('Asking for the microphone — allow the browser prompt…');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('This browser blocks microphone capture here (a page opened from a file:// path or a plain-HTTP address is not allowed to use the mic). Open the app over http://localhost or install the Android app.');
        }
        await TT.audio.startMic();
      }
      setProgress(0);
      const secs = Math.max(1, Math.round(state.recordSeconds || 20));
      setStatus('Recording ' + secs + ' seconds — play the song out loud, close to the microphone…');
      const buf = await TT.audio.captureBuffer(secs, f => setProgress(f));
      const sr = (TT.audio.ctx && TT.audio.ctx.sampleRate) || state.sr;
      if (!S.loadBuffer(buf, 'Microphone take', sr)) throw new Error('the take came back empty');
      setStatus('Recorded ' + secs + ' seconds. Pick a recipe — or record again.', 'ok');
      setProgress(1);
    } catch (e) {
      setProgress(0);
      setStatus(micErrorText(e), 'err');
    } finally {
      state.busy = false;
      if (els.btnMic) els.btnMic.disabled = false;
      /* release the microphone if this button opened it */
      if (!alreadyOn && TT.audio.micState === 'on') {
        try { TT.audio.stopMic(); } catch (e) {}
      }
    }
  }

  function mmss(sec) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  /* ---------------- separation, on a worker when the page can have one ---------------- */
  function workerAvailable() {
    try {
      if (typeof Worker !== 'function') return false;
      if (typeof location !== 'undefined' && location.protocol === 'file:') return false;   /* the APK shell: no worker from file:// */
      return true;
    } catch (e) { return false; }
  }

  let workerReject = null;      /* the in-flight worker request's reject, so Stop can end it */

  function cancel() {
    state.cancel = true;
    const reject = workerReject;
    workerReject = null;
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
    if (reject) {
      const err = new Error('separation stopped');
      err.aborted = true;
      reject(err);                       /* a terminated worker never answers */
    }
    setStatus('Stopping…');
  }

  /* Run the DSP in a background thread so the page keeps painting (and the tab
   * keeps responding) while a whole song is separated. The samples are copied in
   * and the finished stems are transferred back, so nothing is uploaded. */
  function runInWorker(mode, remove, amount) {
    return new Promise((resolve, reject) => {
      let url;
      try { url = new URL('js/stem-worker.js', document.baseURI).href; }
      catch (e) { url = 'js/stem-worker.js'; }
      let w;
      try { w = new Worker(url); } catch (e) { reject(e); return; }
      worker = w;
      workerReject = reject;
      let settled = false;
      const finish = () => {
        settled = true;
        if (worker === w) worker = null;
        if (workerReject === reject) workerReject = null;
        try { w.terminate(); } catch (e) {}
      };
      w.onmessage = ev => {
        const msg = ev.data || {};
        if (msg.type === 'progress') { setProgress(msg.value || 0); return; }
        if (settled) return;
        finish();
        if (msg.type === 'done') {
          resolve({
            channels: msg.channels.map(b => new Float32Array(b)),
            sr: msg.sr, mode: msg.mode, remove: msg.remove, amount: msg.amount,
            slices: msg.slices, peak: msg.peak, gain: msg.gain, worker: true
          });
        } else {
          reject(new Error(msg.message || 'the background separator failed'));
        }
      };
      w.onerror = ev => {
        if (settled) return;
        finish();
        reject(new Error((ev && ev.message) || 'the background separator could not start'));
      };
      const copies = state.channels.map(c => new Float32Array(c));
      w.postMessage({ type: 'separate', channels: copies, sr: state.sr, mode: mode, remove: remove, amount: amount, keepBass: 0.85 });
    });
  }

  async function separateNow(mode, remove, amount) {
    /* the worker first: the fallback below is the same engine, in-page */
    if (workerAvailable()) {
      try {
        return await runInWorker(mode, remove, amount);
      } catch (e) {
        if (state.cancel) { const err = new Error('stopped'); err.aborted = true; throw err; }
        setStatus('The background separator did not start (' + (e && e.message ? e.message : 'unknown error') + ') — separating in the page instead.');
        await new Promise(r => setTimeout(r, 30));
      }
    }
    return TT.dsp.separateChunked(state.channels, state.sr, mode, {
      remove: remove, amount: amount, keepBass: 0.85,
      shouldAbort: () => state.cancel,
      onProgress: f => setProgress(f)
    });
  }

  S.run = async function () {
    if (!state.channels || !state.channels.length) { setStatus('Load a song first.', 'err'); return; }
    if (state.busy) return;
    state.busy = true;
    state.cancel = false;
    if (els.btnRun) els.btnRun.disabled = true;
    if (els.btnCancel) els.btnCancel.hidden = false;
    const mode = state.mode, remove = state.remove, amount = state.amount;
    const isClassic = mode === 'classic-karaoke' || mode === 'classic-keep-bass';
    setStatus(`Separating — ${PROFILE_LABEL[mode] || mode}, ${remove ? 'removed' : 'isolated'}… (long songs are processed in slices, so the page stays alive)`);
    setProgress(0);
    await new Promise(r => setTimeout(r, 30));
    try {
      const res = await separateNow(mode, remove, amount);
      state.result = res;
      const mins = state.buffer ? state.buffer.duration / 60 : 0;
      const levelled = res && res.gain && res.gain < 0.999
        ? ` It was a hot take (peak ${res.peak.toFixed(2)}), so it has been levelled by ${(20 * Math.log10(res.gain)).toFixed(1)} dB — nothing clips.`
        : '';
      setStatus(`Done — ${mmss(res.channels[0].length / res.sr)} of audio, ${res.slices > 1 ? res.slices + ' slices, ' : ''}${Math.round(mins * 60)}s source. Press play, or save it as a WAV.${levelled}`, 'ok');
      if (els.result) els.result.hidden = false;
      if (els.effect) {
        els.effect.innerHTML = isClassic
          ? `<b>Classic karaoke.</b> Everything that is identical in both channels is cancelled — which is exactly where a lead vocal lives. ${mode === 'classic-keep-bass' ? 'The low end is left alone so the song keeps its bottom.' : 'The result is mono, like a 1990s karaoke machine.'}`
          : `<b>${PROFILE_LABEL[mode] || mode}: ${remove ? 'removed' : 'isolated'}.</b> The engine built a sustained-content spectrogram (a per-bin median over time), a transient map (how far each frame sits above that median) and a centre/side split, then weighed them per frequency band for this instrument. ${mode === 'acoustic-guitar' ? 'The acoustic profile leans hard on the sustained, wide, mid-band content, so the electric guitar and the drums stay where they are.' : ''}`;
      }
      if (els.amountShow) els.amountShow.textContent = Math.round(amount * 100) + '%';
      resetPlayer();
      if (TT.store) {
        const log = TT.store.get('stemHistory', []);
        log.unshift({ mode: mode, remove: remove, amount: amount, name: state.sourceName || (state.file ? state.file.name : 'microphone'), at: Date.now() });
        TT.store.set('stemHistory', log.slice(0, 20));
        renderHistory();
      }
      if (TT.app && TT.app.assist) TT.app.assist('Stem lab: ' + (PROFILE_LABEL[mode] || mode) + (remove ? ' removed' : ' isolated') + ' — ' + (isClassic ? 'centre-cancel' : 'spectral + transient masking') + '.');
    } catch (e) {
      if (e && e.aborted) {
        setStatus('Stopped. Nothing was changed — press ⚙️ Separate it to run it again.', '');
        setProgress(0);
      } else {
        setStatus('Separation failed: ' + (e && e.message ? e.message : 'unknown error'), 'err');
      }
    } finally {
      state.busy = false;
      worker = null;
      if (els.btnRun) els.btnRun.disabled = false;
      if (els.btnCancel) els.btnCancel.hidden = true;
    }
  };

  S.cancel = cancel;
  S.running = () => state.busy;

  /* ---------------- playback + export ---------------- */
  function toAudioBuffer(res) {
    const ctx = TT.audio.ensure();
    const frames = res.channels[0].length;
    const buf = ctx.createBuffer(res.channels.length, frames, res.sr);
    res.channels.forEach((c, i) => buf.copyToChannel ? buf.copyToChannel(c, i) : buf.getChannelData(i).set(c));
    return buf;
  }
  function stopNode() {
    if (state.node) { try { state.node.stop(); } catch (e) {} state.node.disconnect(); state.node = null; }
    state.playing = false;
    if (els.btnPlay) els.btnPlay.textContent = '▶ Play';
  }
  function resetPlayer() { stopNode(); }

  function play() {
    if (!state.result) return;
    const ctx = TT.audio.ensure();
    stopNode();
    const node = ctx.createBufferSource();
    node.buffer = toAudioBuffer(state.result);
    node.loop = !!(els.loop && els.loop.checked);
    const gain = ctx.createGain();
    gain.gain.value = els.vol ? +els.vol.value : 0.9;
    node.connect(gain); gain.connect(ctx.destination);
    node.onended = () => { if (!node.loop) { state.playing = false; if (els.btnPlay) els.btnPlay.textContent = '▶ Play'; } };
    node.start();
    state.node = node; state.gain = gain; state.playing = true;
    if (els.btnPlay) els.btnPlay.textContent = '■ Stop';
  }

  function downloadWav() {
    if (!state.result) return;
    const raw = TT.dsp.encodeWav(state.result.channels, state.result.sr);
    const blob = new Blob([raw], { type: 'audio/wav' });
    const a = document.createElement('a');
    const base = ((state.file && state.file.name) || 'trill-tuner').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.href = URL.createObjectURL(blob);
    a.download = base + '-' + (state.remove ? 'no-' : 'only-') + state.mode + '.wav';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function analyseStem() {
    if (!state.result) return;
    const buf = toAudioBuffer(state.result);
    const res = TT.tablab.analyseBuffer(buf, { maxSeconds: 240 });
    TT.tablab.adopt(res, {
      title: (state.file ? state.file.name.replace(/\.[a-z0-9]+$/i, '') : 'Stem') + ' — ' + (state.remove ? 'no ' : '') + (PROFILE_LABEL[state.mode] || state.mode),
      artist: 'Stem lab'
    });
    TT.app.showView('maker');
  }

  function renderHistory() {
    if (!els.history) return;
    els.history.innerHTML = '';
    const log = (TT.store && TT.store.get('stemHistory', [])) || [];
    if (!log.length) { els.history.innerHTML = '<span class="dim">Nothing separated yet.</span>'; return; }
    log.forEach(h => {
      const b = document.createElement('button');
      b.className = 'chip-s';
      b.type = 'button';
      b.textContent = (h.remove ? 'no ' : 'only ') + (PROFILE_LABEL[h.mode] || h.mode) + ' · ' + Math.round((h.amount || 0) * 100) + '%';
      b.title = (h.name || '') + ' — click to load this recipe';
      b.addEventListener('click', () => {
        state.mode = h.mode; state.remove = !!h.remove; state.amount = h.amount || 0.9;
        if (els.mode) els.mode.value = h.mode;
        if (els.amount) els.amount.value = String(Math.round(state.amount * 100));
        if (els.amountShow) els.amountShow.textContent = Math.round(state.amount * 100) + '%';
        syncActionSeg();
        setStatus('Recipe loaded: ' + (h.remove ? 'remove ' : 'isolate ') + (PROFILE_LABEL[h.mode] || h.mode) + ' at ' + Math.round(state.amount * 100) + '%.');
      });
      els.history.appendChild(b);
    });
  }

  function syncActionSeg() {
    if (!els.actionSeg) return;
    els.actionSeg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', (b.dataset.action === 'remove') === state.remove));
  }

  S.init = function () {
    if (S._ready) return;
    S._ready = true;
    els = {
      file: document.getElementById('st-file'),
      drop: document.getElementById('st-drop'),
      btnMic: document.getElementById('st-btn-mic'),
      status: document.getElementById('st-status'),
      source: document.getElementById('st-source'),
      presets: document.getElementById('st-presets'),
      mode: document.getElementById('st-mode'),
      actionSeg: document.getElementById('st-action'),
      amount: document.getElementById('st-amount'),
      amountShow: document.getElementById('st-amount-show'),
      btnRun: document.getElementById('st-btn-run'),
      btnCancel: document.getElementById('st-btn-cancel'),
      runNote: document.getElementById('st-run-note'),
      bar: document.getElementById('st-bar'),
      pct: document.getElementById('st-pct'),
      result: document.getElementById('st-result'),
      effect: document.getElementById('st-effect'),
      btnPlay: document.getElementById('st-btn-play'),
      btnWav: document.getElementById('st-btn-wav'),
      btnTab: document.getElementById('st-btn-tab'),
      vol: document.getElementById('st-vol'),
      loop: document.getElementById('st-loop'),
      history: document.getElementById('st-history'),
      notes: document.getElementById('st-notes')
    };
    if (els.file) els.file.addEventListener('change', e => { if (e.target.files && e.target.files[0]) S.loadFile(e.target.files[0]); });
    if (els.drop) {
      ['dragenter', 'dragover'].forEach(ev => els.drop.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); els.drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => els.drop.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); els.drop.classList.remove('over'); }));
      els.drop.addEventListener('drop', e => {
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) S.loadFile(f);
      });
      els.drop.addEventListener('click', () => { if (els.file) els.file.click(); });
    }
    if (els.btnMic) els.btnMic.addEventListener('click', fromMic);
    if (els.mode) {
      Object.keys(TT.dsp.PROFILES).forEach(k => {
        const o = document.createElement('option');
        o.value = k; o.textContent = PROFILE_LABEL[k] || k;
        els.mode.appendChild(o);
      });
      ['classic-karaoke', 'classic-keep-bass'].forEach(k => {
        const o = document.createElement('option');
        o.value = k; o.textContent = k === 'classic-karaoke' ? 'Classic karaoke (centre cancel)' : 'Classic karaoke, bass kept';
        els.mode.appendChild(o);
      });
      els.mode.value = state.mode;
      els.mode.addEventListener('change', () => { state.mode = els.mode.value; });
    }
    if (els.actionSeg) {
      els.actionSeg.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
        state.remove = b.dataset.action === 'remove';
        syncActionSeg();
      }));
      syncActionSeg();
    }
    if (els.amount) {
      els.amount.value = String(Math.round(state.amount * 100));
      els.amountShow.textContent = Math.round(state.amount * 100) + '%';
      els.amount.addEventListener('input', () => {
        state.amount = Math.max(0, Math.min(1, (+els.amount.value) / 100));
        els.amountShow.textContent = Math.round(state.amount * 100) + '%';
      });
    }
    if (els.btnRun) els.btnRun.addEventListener('click', S.run);
    if (els.btnCancel) els.btnCancel.addEventListener('click', cancel);
    if (els.runNote) els.runNote.textContent = workerAvailable()
      ? 'Runs in a background thread — the tab stays responsive while a whole song is separated.'
      : 'Processed in slices so the page stays alive; a long song takes about half its length.';
    if (els.btnPlay) els.btnPlay.addEventListener('click', () => { state.playing ? stopNode() : play(); });
    if (els.btnWav) els.btnWav.addEventListener('click', downloadWav);
    if (els.btnTab) els.btnTab.addEventListener('click', analyseStem);
    if (els.vol) els.vol.addEventListener('input', () => { if (state.gain) state.gain.gain.value = +els.vol.value; });
    if (els.presets) {
      PRESETS.forEach(p => {
        const b = document.createElement('button');
        b.className = 'st-preset' + (p.mode === 'acoustic-guitar' && p.remove ? ' highlight' : '');
        b.type = 'button';
        b.innerHTML = `<b>${p.label}</b><span>${p.desc}</span>`;
        b.addEventListener('click', () => {
          state.mode = p.mode; state.remove = p.remove; state.amount = p.amount;
          if (els.mode) els.mode.value = p.mode;
          if (els.amount) els.amount.value = String(Math.round(p.amount * 100));
          if (els.amountShow) els.amountShow.textContent = Math.round(p.amount * 100) + '%';
          syncActionSeg();
          if (state.channels) S.run();
          else setStatus(p.label + ' — load a song (or grab 20 seconds from the microphone) and it will separate straight away.');
        });
        els.presets.appendChild(b);
      });
    }
    if (els.notes) {
      els.notes.innerHTML = `
        <li><b>It is real DSP, not a server.</b> The separation runs here, in your browser, on the samples themselves — your song is never uploaded.</li>
        <li><b>How it decides.</b> Sustained content is estimated as a per-bin median over time; transients are how far a frame sits above that; the centre/side split separates what both channels share from what is spread wide. Each instrument profile is a band-limited weighting of those three.</li>
        <li><b>Acoustic vs electric.</b> The acoustic-guitar profile targets the wide, sustained 150–5600 Hz band with a strong transient tolerance, so a strummed acoustic part goes and a distorted, narrow, centre-panned electric part — and the drums — stay.</li>
        <li><b>The honest limit.</b> When two instruments occupy exactly the same band, the same stereo position and the same envelope, no offline method can pull them apart perfectly. That is why every recipe has an <i>amount</i> control: turn it down until the artefact is inaudible rather than fighting for 100%.</li>
        <li><b>Microphone input.</b> You can play a song out loud and capture 20 seconds to work on — the button asks for the microphone itself and shows the take as it records, so it works whether or not the tuner is already listening. Useful for a riff or a chorus you want to loop and play over.</li>
        <li><b>Other views can send audio here.</b> The backing studio's “Send it to the Stem lab” button drops its render straight into this tab — no download, no re-upload.</li>`;
    }
    renderHistory();
  };

  S.state = state;
  window.TT = window.TT || {};
  window.TT.stems = S;
})();
