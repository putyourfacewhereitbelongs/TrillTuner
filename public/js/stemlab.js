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
    playing: false
  };
  let els = {};

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

  S.loadFile = async function (file) {
    if (!file) return;
    state.file = file;
    setStatus('Decoding ' + file.name + '…');
    try {
      const buf = await decodeFile(file);
      state.buffer = buf;
      state.sr = buf.sampleRate;
      state.channels = [];
      for (let c = 0; c < buf.numberOfChannels; c++) state.channels.push(buf.getChannelData(c));
      if (els.source) {
        els.source.hidden = false;
        els.source.innerHTML = `<b>${file.name}</b><span>${buf.numberOfChannels === 1 ? 'mono' : 'stereo'} · ${(buf.sampleRate / 1000).toFixed(1)} kHz · ${mmss(buf.duration)}</span>`;
      }
      setStatus('Loaded. Pick a recipe or build your own below.');
      setProgress(0);
      if (els.btnRun) els.btnRun.disabled = false;
    } catch (e) {
      setStatus('Could not decode that file. Try WAV, MP3 or M4A. (' + (e && e.message ? e.message : 'unknown error') + ')', 'err');
    }
  };

  async function fromMic() {
    setStatus('Recording 20 seconds from the microphone — play the song out loud.');
    try {
      const buf = await TT.audio.captureBuffer(20);
      state.buffer = buf; state.sr = buf.sampleRate;
      state.channels = [];
      for (let c = 0; c < buf.numberOfChannels; c++) state.channels.push(buf.getChannelData(c));
      if (els.source) { els.source.hidden = false; els.source.innerHTML = `<b>Microphone take</b><span>${(buf.sampleRate / 1000).toFixed(1)} kHz · ${mmss(buf.duration)}</span>`; }
      setStatus('Recorded. Pick a recipe and separate it.');
      if (els.btnRun) els.btnRun.disabled = false;
    } catch (e) {
      setStatus('Microphone capture failed: ' + (e && e.message ? e.message : 'no audio') + '.', 'err');
    }
  }

  function mmss(sec) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  S.run = async function () {
    if (!state.channels || !state.channels.length) { setStatus('Load a song first.', 'err'); return; }
    if (els.btnRun) els.btnRun.disabled = true;
    const mode = state.mode, remove = state.remove, amount = state.amount;
    const isClassic = mode === 'classic-karaoke' || mode === 'classic-keep-bass';
    setStatus(`Separating — ${PROFILE_LABEL[mode] || mode}, ${remove ? 'removed' : 'isolated'}… (long songs are processed in slices, so the page stays alive)`);
    setProgress(0);
    await new Promise(r => setTimeout(r, 30));
    try {
      const res = await TT.dsp.separateChunked(state.channels, state.sr, mode, {
        remove: remove, amount: amount, keepBass: 0.85,
        onProgress: f => setProgress(f)
      });
      state.result = res;
      const mins = state.buffer ? state.buffer.duration / 60 : 0;
      setStatus(`Done — ${mmss(res.channels[0].length / res.sr)} of audio, ${res.slices ? res.slices + ' slices, ' : ''}${Math.round(mins * 60)}s source. Press play, or save it as a WAV.`, 'ok');
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
        log.unshift({ mode: mode, remove: remove, amount: amount, name: state.file ? state.file.name : 'microphone', at: Date.now() });
        TT.store.set('stemHistory', log.slice(0, 20));
        renderHistory();
      }
      if (TT.app && TT.app.assist) TT.app.assist('Stem lab: ' + (PROFILE_LABEL[mode] || mode) + (remove ? ' removed' : ' isolated') + ' — ' + (isClassic ? 'centre-cancel' : 'spectral + transient masking') + '.');
    } catch (e) {
      setStatus('Separation failed: ' + (e && e.message ? e.message : 'unknown error'), 'err');
    } finally {
      if (els.btnRun) els.btnRun.disabled = false;
    }
  };

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
        <li><b>Microphone input.</b> You can play a song out loud and capture 20 seconds to work on — useful for a riff or a chorus you want to loop and play over.</li>`;
    }
    renderHistory();
  };

  S.state = state;
  window.TT = window.TT || {};
  window.TT.stems = S;
})();
