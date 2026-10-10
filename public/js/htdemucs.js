/* Trill Tuner — the HT-Demucs model manager.
 *
 * Runs htdemucs_embedded.onnx (MIT, © timcsy, from the demucs-web project, hosted at
 * timcsy/demucs-web-onnx on Hugging Face) with ONNX Runtime Web, which is vendored
 * under vendor/ort/ so nothing is fetched from a CDN at run time.
 *
 * The model is ~172 MB and is never bundled in the app or the APK. The user
 * downloads it once (it is kept in Cache Storage under tt-htdemucs-v1) or picks
 * a copy from disk. Everything that needs a stem goes through separateStem():
 * when the model cannot provide the requested instrument it says so and the
 * caller falls back to the classic DSP separator.
 *
 * Mode coverage. The 4-stem model gives drums, bass, other and vocals. So:
 *   vocals, drums (the whole kit), bass          → the model
 *   kick, snare, hats, electric/acoustic guitar,
 *   keys, strings, synth, guitar, classic-*       → the DSP engine (model can't split them)
 */
(function () {
  'use strict';
  const MODEL_URL = 'https://huggingface.co/timcsy/demucs-web-onnx/resolve/main/htdemucs_embedded.onnx';
  const MODEL_BYTES = 172 * 1024 * 1024;     /* approximate, for the progress message */
  const MIN_MODEL_BYTES = 40 * 1024 * 1024;  /* anything smaller is not the model */
  const CACHE_NAME = 'tt-htdemucs-v1';
  const CACHE_KEY = '/__htdemucs__/htdemucs_embedded.onnx';
  const ORT_SRC = 'vendor/ort/ort.min.js';
  const STEM_FOR_MODE = { vocals: 'vocals', drums: 'drums', bass: 'bass' };
  const MODEL_MODES_NOTE = 'The 4-stem model separates vocals, drums (the whole kit) and bass. It cannot split kick, snare or hi-hats from the drums, nor guitars, keys, strings or synth from "other", so those use the classic engine.';

  const core = () => (window.TT && window.TT.htdemucsCore);
  const state = { status: 'off', message: '', done: 0, total: 0, session: null, ort: null, loading: null };
  const listeners = [];

  function set(status, message, extra) {
    state.status = status;
    state.message = message || '';
    if (extra) Object.assign(state, extra);
    listeners.forEach(fn => { try { fn(M.status()); } catch (e) {} });
  }

  const M = {};
  M.status = () => ({ status: state.status, message: state.message, done: state.done, total: state.total, ready: !!state.session });
  M.onChange = fn => { listeners.push(fn); };
  M.isReady = () => !!state.session && !!core();
  M.supports = mode => !!STEM_FOR_MODE[mode];
  M.note = () => MODEL_MODES_NOTE;
  M.modelUrl = MODEL_URL;
  M.modelBytes = MODEL_BYTES;

  /* ---------- ONNX Runtime --------------------------------------------- */

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('could not load ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureOrt() {
    if (state.ort) return state.ort;
    if (!window.ort) await loadScript(ORT_SRC);
    const ort = window.ort;
    if (!ort || !ort.InferenceSession) throw new Error('ONNX Runtime did not start');
    const base = new URL('vendor/ort/', document.baseURI).href;
    ort.env.wasm.wasmPaths = base;
    ort.env.wasm.numThreads = 1;      /* threads need cross-origin isolation; one thread always works */
    state.ort = ort;
    return ort;
  }

  /* ---------- the model file -------------------------------------------- */

  async function readWithProgress(response, label) {
    const total = Number(response.headers.get('content-length')) || MODEL_BYTES;
    const reader = response.body && response.body.getReader ? response.body.getReader() : null;
    if (!reader) return new Uint8Array(await response.arrayBuffer());
    const parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      set('downloading', label + ' ' + Math.round(got / 1048576) + ' of ' + Math.round(total / 1048576) + ' MB…', { done: got, total: total });
    }
    const out = new Uint8Array(got);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
  }

  async function cachedBytes() {
    if (!window.caches) return null;
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(CACHE_KEY);
    if (!hit) return null;
    return new Uint8Array(await hit.arrayBuffer());
  }

  async function storeBytes(bytes) {
    if (!window.caches) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(CACHE_KEY, new Response(new Blob([bytes]), { headers: { 'content-type': 'application/octet-stream' } }));
  }

  /* Build the inference session from bytes, then make it the active one. */
  async function createSession(bytes) {
    if (!bytes || bytes.length < MIN_MODEL_BYTES) {
      throw new Error('that file is too small to be the htdemucs model (it should be about 172 MB)');
    }
    const ort = await ensureOrt();
    set('loading', 'Starting the model…');
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
    state.session = session;
    set('ready', 'Model ready — vocals, drums and bass are separated by the model.');
    return session;
  }

  /* source: 'cache' (if already downloaded), 'download', or { file: File } */
  M.load = async function (source) {
    if (state.loading) return state.loading;
    state.loading = (async () => {
      try {
        if (!core()) throw new Error('the separation core did not load');
        if (source && source.file) {
          set('loading', 'Reading ' + source.file.name + '…');
          const bytes = new Uint8Array(await source.file.arrayBuffer());
          await storeBytes(bytes).catch(() => {});
          return await createSession(bytes);
        }
        if (source === 'download' || !(await cachedBytes())) {
          set('downloading', 'Downloading the model (about 172 MB, once)…', { done: 0, total: MODEL_BYTES });
          const res = await fetch(MODEL_URL);
          if (!res.ok) throw new Error('the download failed (HTTP ' + res.status + ')');
          const bytes = await readWithProgress(res, 'Downloading the model…');
          await storeBytes(bytes).catch(() => {});
          return await createSession(bytes);
        }
        set('loading', 'Loading the model from this device…');
        return await createSession(await cachedBytes());
      } catch (e) {
        state.session = null;
        set('error', 'Could not load the model: ' + (e && e.message ? e.message : e) + '. The classic engine still works.');
        throw e;
      } finally {
        state.loading = null;
      }
    })();
    return state.loading;
  };

  M.hasCached = async function () {
    try { return !!(await cachedBytes()); } catch (e) { return false; }
  };

  M.forget = async function () {
    state.session = null;
    if (window.caches) await caches.delete(CACHE_NAME).catch(() => {});
    set('off', 'The model has been removed from this device. Stem lab uses the classic engine until you download it again.');
  };

  /* ---------- running the graph ----------------------------------------- */

  function namedOutputs(session, results) {
    /* identify the two outputs by shape, as the upstream runtime does */
    let time = null, freq = null;
    for (const name of session.outputNames) {
      const t = results[name];
      if (!t) continue;
      if (t.dims.length === 4 && t.dims[2] === 2) time = t;
      else if (t.dims.length === 5 && t.dims[2] === 4) freq = t;
    }
    if (!time || !freq) throw new Error('the model returned outputs of an unexpected shape');
    return { time, freq };
  }

  function makeRunner(session) {
    const ort = state.ort;
    const inputs = session.inputNames;
    return async (waveform, magSpec) => {
      const wave = new ort.Tensor('float32', waveform, [1, 2, core().TRAINING_SAMPLES]);
      const mag = new ort.Tensor('float32', magSpec, [1, 4, core().SPEC_BINS, core().SPEC_FRAMES]);
      const feeds = {};
      feeds[inputs[0]] = wave;
      feeds[inputs[1]] = mag;
      const results = await session.run(feeds);
      const out = namedOutputs(session, results);
      return { time: out.time.data, timeDims: out.time.dims, freq: out.freq.data, freqDims: out.freq.dims };
    };
  }

  /* Split a song into four stems. channels: Float32Array per channel at sr.
   * Returns { drums, bass, other, vocals }, each { channels:[L,R] } at sr. */
  M.separate = async function (channels, sr, opts) {
    opts = opts || {};
    if (!state.session) throw new Error('the model is not loaded');
    const C = core();
    const rate = C.SAMPLE_RATE;
    let L = channels[0];
    let R = channels.length > 1 ? channels[1] : channels[0];   /* mono: duplicate, the model is stereo */
    if (sr !== rate) { L = C.resample(L, sr, rate); R = C.resample(R, sr, rate); }
    const stems = await C.separateStereo(L, R, makeRunner(state.session), {
      onProgress: opts.onProgress, shouldAbort: opts.shouldAbort
    });
    const back = (a) => sr === rate ? a : fitLength(C.resample(a, rate, sr), channels[0].length);
    const out = {};
    for (const name of C.TRACKS) {
      const s = stems[name];
      out[name] = { channels: [back(s.left), back(s.right)] };
    }
    return out;
  };

  function avgChannels(chs) {
    const a = chs[0], b = chs[1] || chs[0];
    const m = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) m[i] = 0.5 * (a[i] + b[i]);
    return m;
  }

  function fitLength(a, n) {
    if (a.length === n) return a;
    const b = new Float32Array(n);
    b.set(a.subarray(0, Math.min(n, a.length)));
    return b;
  }

  /* Turn stems into the Stem lab's result shape. Same rules as the DSP engine:
   * remove → mix − amount·stem; isolate → the stem (amount only applies to removal). */
  M.separateStem = async function (channels, sr, mode, remove, amount, opts) {
    const name = STEM_FOR_MODE[mode];
    if (!name) throw new Error('the model cannot separate ' + mode);
    const stems = await M.separate(channels, sr, opts);
    const modelStem = stems[name].channels;
    /* a mono mix gets one averaged stem channel; a stereo mix gets the model's L and R */
    const stem = channels.length === 1
      ? [avgChannels(modelStem)]
      : modelStem;
    const outCh = channels.map((mix, c) => {
      const s = stem[Math.min(c, stem.length - 1)];
      const n = mix.length;
      const o = new Float32Array(n);
      if (remove) {
        for (let i = 0; i < n; i++) o[i] = mix[i] - amount * s[i];
      } else {
        for (let i = 0; i < n; i++) o[i] = s[i];
      }
      return o;
    });
    const limited = window.TT.dsp.limitPeak(outCh);
    return {
      channels: limited.channels, sr: sr, mode: mode, remove: remove, amount: amount,
      slices: 1, peak: limited.peak, gain: limited.gain, engine: 'model'
    };
  };

  /* Compatibility helper for callers that want the bare mix when the model is off. */
  M.describe = function (mode, remove) {
    const what = remove ? 'removed' : 'isolated';
    return 'Model (HT-Demucs): ' + (STEM_FOR_MODE[mode] || mode) + ' ' + what + '.';
  };

  window.TT = window.TT || {};
  window.TT.htdemucs = M;
})();
