/* Trill Tuner — shared Web Audio engine: context, mic, metronome clicks,
 * Karplus-Strong plucked-string synthesis (from scratch), recorder bus. */
(function () {
  'use strict';
  const A = {
    ctx: null, master: null, metroBus: null, recorderDest: null,
    analyser: null, micStream: null, micSource: null,
    micState: 'off', micError: '', // off | requesting | on | error
    level: 0, rmsDb: -100,
    onMic: null,
    _buf: null, _pluckCache: new Map()
  };

  A.ensure = function () {
    if (!A.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('Web Audio not supported in this browser');
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.9;
      A.master.connect(A.ctx.destination);
      A.metroBus = A.ctx.createGain();
      A.metroBus.gain.value = 1;
      A.metroBus.connect(A.ctx.destination);
      const resume = () => { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
      ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, resume, { passive: true }));
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  };

  function emit() { if (A.onMic) A.onMic(A.micState, A.micError); }

  A.startMic = async function () {
    A.ensure();
    if (A.micStream) return A.micStream;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      A.micState = 'error'; A.micError = 'Microphone API unavailable'; emit();
      throw new Error('getUserMedia unavailable');
    }
    A.micState = 'requesting'; A.micError = ''; emit();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false
      });
      A.micStream = stream;
      A.micSource = A.ctx.createMediaStreamSource(stream);
      A.analyser = A.ctx.createAnalyser();
      A.analyser.fftSize = 4096;
      A.analyser.smoothingTimeConstant = 0;
      A._buf = new Float32Array(A.analyser.fftSize);
      A._freq = new Float32Array(A.analyser.frequencyBinCount);
      A.micSource.connect(A.analyser);
      A.micSource.connect(A.recorderDestLazy()); // mic is always available to the recorder
      if (A.smartFilter) A.applySmartFilter(); // re-arm the band-limiter if it was on
      A.micState = 'on'; emit();
      return stream;
    } catch (e) {
      A.micState = 'error';
      A.micError = (e && e.name) === 'NotAllowedError' ? 'Microphone permission was denied'
        : (e && e.name) === 'NotFoundError' ? 'No microphone found'
        : 'Microphone error: ' + ((e && e.name) || e.message || e);
      emit();
      throw e;
    }
  };

  /* ---------- smart filter: band-limit the analysis feed to the guitar's
   * range (65–1600 Hz) so room chatter and hiss stay out of the detector.
   * The recorder keeps the raw mic signal. ---------- */
  A.smartFilter = false;
  A.applySmartFilter = function () {
    if (!A.micSource || !A.analyser) return;
    A.removeSmartFilter();
    if (!A.smartFilter) return;
    A._hp = A.ctx.createBiquadFilter();
    A._hp.type = 'highpass'; A._hp.frequency.value = 65; A._hp.Q.value = 0.7;
    A._lp = A.ctx.createBiquadFilter();
    A._lp.type = 'lowpass'; A._lp.frequency.value = 1600; A._lp.Q.value = 0.7;
    try { A.micSource.disconnect(A.analyser); } catch (e) {}
    A.micSource.connect(A._hp);
    A._hp.connect(A._lp);
    A._lp.connect(A.analyser);
  };
  A.removeSmartFilter = function () {
    if (!A._hp) return;
    try {
      A.micSource.disconnect(A._hp);
      A._hp.disconnect(); A._lp.disconnect();
    } catch (e) {}
    A._hp = null; A._lp = null;
    if (A.micSource && A.analyser) {
      try { A.micSource.connect(A.analyser); } catch (e) {}
    }
  };
  A.setSmartFilter = function (on) {
    A.smartFilter = !!on;
    if (A.micState === 'on') A.smartFilter ? A.applySmartFilter() : A.removeSmartFilter();
  };
  /* the node the analysis taps come from (post-filter when enabled) */
  A.tapNode = function () { return A._lp || A.micSource; };

  /* ---------- capture `seconds` of mic audio for offline analysis
   * (polyphonic strum check, intonation helper) ---------- */
  A.captureBuffer = function (seconds) {
    return new Promise((resolve, reject) => {
      A.ensure();
      if (!A.micSource || !A.analyser) { reject(new Error('Microphone is off')); return; }
      const sr = A.ctx.sampleRate;
      const need = Math.floor(sr * seconds);
      const all = new Float32Array(need);
      let got = 0;
      const sp = A.ctx.createScriptProcessor(4096, 1, 1);
      if (!A._silent) {
        A._silent = A.ctx.createGain(); A._silent.gain.value = 0;
        A._silent.connect(A.ctx.destination);
      }
      const tap = A.tapNode();
      tap.connect(sp);
      sp.connect(A._silent);
      const cleanup = () => {
        try { tap.disconnect(sp); sp.disconnect(); } catch (e) {}
        sp.onaudioprocess = null;
      };
      sp.onaudioprocess = e => {
        const d = e.inputBuffer.getChannelData(0);
        const n = Math.min(d.length, need - got);
        all.set(d.subarray(0, n), got);
        got += n;
        if (got >= need) { cleanup(); resolve(all); }
      };
    });
  };

  /* frequency-domain magnitudes (dB) for the overtone analyzer */
  A.freqData = function () {
    if (!A.analyser) return null;
    A.analyser.getFloatFrequencyData(A._freq);
    return A._freq;
  };

  A.stopMic = function () {
    if (A.micStream) { A.micStream.getTracks().forEach(t => t.stop()); }
    A.removeSmartFilter();
    A.micStream = null; A.micSource = null; A.analyser = null;
    A.level = 0; A.rmsDb = -100;
    A.micState = 'off'; emit();
  };

  // Read the latest time-domain samples; updates level/rmsDb. Returns null if mic off.
  A.sample = function () {
    if (!A.analyser) return null;
    A.analyser.getFloatTimeDomainData(A._buf);
    let sum = 0;
    for (let i = 0; i < A._buf.length; i++) sum += A._buf[i] * A._buf[i];
    const rms = Math.sqrt(sum / A._buf.length);
    A.level = rms;
    A.rmsDb = 20 * Math.log10(rms || 1e-8);
    return A._buf;
  };

  A.recorderDestLazy = function () {
    if (!A.recorderDest) {
      A.ensure();
      A.recorderDest = A.ctx.createMediaStreamDestination();
      A.metroBus.connect(A.recorderDest); // metronome click is recordable too
    }
    return A.recorderDest;
  };

  A.clearPlucks = function () { A._pluckCache.clear(); };

  /* Karplus-Strong plucked string, rendered offline into an AudioBuffer. */
  A.pluckBuffer = function (freq, dur) {
    A.ensure();
    const ctx = A.ctx;
    const key = Math.round(freq * 10) + '@' + ctx.sampleRate;
    let buf = A._pluckCache.get(key);
    if (buf) return buf;
    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / freq));
    const len = Math.floor(sr * (dur || 2.0));
    buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const nxt = ring[(idx + 1) % N];
      ring[idx] = (cur + nxt) * 0.499; // two-point average = gentle low-pass damping
      out[i] = cur * 0.9;
      idx = (idx + 1) % N;
    }
    const fade = Math.min(len, Math.floor(sr * 0.06));
    for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
    if (A._pluckCache.size > 90) A._pluckCache.clear();
    A._pluckCache.set(key, buf);
    return buf;
  };

  A.pluck = function (freq, when, gain, dest) {
    A.ensure();
    const ctx = A.ctx;
    const src = ctx.createBufferSource();
    src.buffer = A.pluckBuffer(freq);
    const g = ctx.createGain();
    g.gain.value = gain == null ? 0.8 : gain;
    src.connect(g); g.connect(dest || A.master);
    src.start(when && when > ctx.currentTime ? when : ctx.currentTime + 0.01);
    return src;
  };

  A.strum = function (freqs, spreadMs, gain, dest) {
    A.ensure();
    const t0 = A.ctx.currentTime + 0.02;
    freqs.forEach((f, i) => {
      const t = t0 + i * (spreadMs == null ? 18 : spreadMs) / 1000;
      const src = A.ctx.createBufferSource();
      src.buffer = A.pluckBuffer(f);
      const g = A.ctx.createGain();
      const v = (gain == null ? 0.7 : gain) * (0.85 + Math.random() * 0.25);
      g.gain.value = v;
      src.connect(g); g.connect(dest || A.master);
      src.start(t);
    });
  };

  /* Metronome click: sine ping + short triangle transient. */
  A.click = function (time, accent, vol) {
    A.ensure();
    const ctx = A.ctx;
    vol = vol == null ? 1 : vol;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = accent ? 1568 : 1046.5;
    const peak = (accent ? 1.0 : 0.55) * vol;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    o.connect(g); g.connect(A.metroBus);
    o.start(time); o.stop(time + 0.09);

    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'triangle';
    o2.frequency.value = accent ? 2600 : 2000;
    g2.gain.setValueAtTime(0.10 * vol, time);
    g2.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
    o2.connect(g2); g2.connect(A.metroBus);
    o2.start(time); o2.stop(time + 0.03);
  };

  /* UI chimes */
  A.chime = function (kind) {
    A.ensure();
    const t0 = A.ctx.currentTime + 0.01;
    const seq = kind === 'ok' ? [[659.25, 0], [987.77, 0.10]] : [[659.25, 0]];
    seq.forEach(pair => {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = 'sine'; o.frequency.value = pair[0];
      g.gain.setValueAtTime(0.0001, t0 + pair[1]);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + pair[1] + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + pair[1] + 0.35);
      o.connect(g); g.connect(A.master);
      o.start(t0 + pair[1]); o.stop(t0 + pair[1] + 0.4);
    });
  };

  window.TT = window.TT || {};
  window.TT.audio = A;
})();
