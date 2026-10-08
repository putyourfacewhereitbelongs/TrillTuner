/* Trill Tuner — Recorder: MediaRecorder on a bus that carries your mic plus the
 * metronome click. Optional 1-bar count-in, take management, playback, download. */
(function () {
  'use strict';

  const R = { takes: [] };
  let els = {};
  let rec = null, chunks = [], startedAt = 0, timerInt = 0, meterRaf = 0;
  let takeSeq = 1;
  let pendingCountIn = false, countInTimer = 0, countInWatch = 0, countInResolve = null, countInRemovers = [];
  let autoStartedMetro = false;
  let playingTake = null, playingUrl = '';

  function pickType() {
    if (!window.MediaRecorder) return '';
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function status(txt, cls) {
    els.recStatus.textContent = txt;
    els.recStatus.className = 'rec-status' + (cls ? ' ' + cls : '');
  }

  /* ---------- count-in: resolve(true) after one full bar, resolve(false) if cancelled ---------- */
  function withCountIn() {
    return new Promise(resolve => {
      pendingCountIn = true;
      countInResolve = resolve;
      const ctx = TT.audio.ctx;
      let armed = false;
      let rem = 0;

      const rem1 = TT.metronome.onBeat((t, idx) => {
        if (!pendingCountIn) return;
        if (idx === 0 && !armed) {
          armed = true;
          const bpb = TT.metronome.state.bpb;
          rem = bpb;
          status(`Count-in: ${rem}`, 'countin');
          const startInMs = Math.max(0, (t + bpb * (60 / TT.metronome.state.bpm) - ctx.currentTime) * 1000);
          countInTimer = setTimeout(() => done(true), startInMs);
          const rem2 = TT.metronome.onBeat(() => {
            if (!pendingCountIn) { rem2(); return; }
            rem--;
            if (rem > 0) status(`Count-in: ${rem}`, 'countin');
            if (rem <= 1) rem2();
          });
          countInRemovers.push(rem2);
        }
      });
      countInRemovers.push(rem1);

      // watchdog: metronome stopped or tab closed while counting in
      countInWatch = setInterval(() => {
        if (pendingCountIn && !TT.metronome.isPlaying()) done(false);
      }, 400);

      function done(ok) {
        pendingCountIn = false;
        clearTimeout(countInTimer);
        clearInterval(countInWatch);
        countInRemovers.forEach(r => { try { r(); } catch (e) {} });
        countInRemovers = [];
        resolve(ok);
      }
    });
  }

  function cancelCountIn() {
    if (typeof countInResolve === 'function') countInResolve(false);
    countInResolve = null;
    status('Count-in cancelled');
  }

  /* ---------- record ---------- */
  async function beginRecord() {
    TT.audio.ensure();
    try {
      await TT.audio.startMic(); // auto-enable mic for the take (user gesture present)
    } catch (e) {
      status('Recording metronome only (mic unavailable)', 'warn');
    }
    const stream = TT.audio.recorderDestLazy().stream;
    const type = pickType();
    const opts = type ? { mimeType: type } : undefined;
    try {
      rec = new MediaRecorder(stream, opts);
    } catch (e) {
      status('Recording is not supported in this browser', 'err');
      return;
    }
    chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = finish;
    rec.start(250);
    startedAt = Date.now();
    els.btnRecord.classList.add('recording');
    status('Recording…', 'live');
    timerInt = setInterval(() => { els.recTimer.textContent = fmt((Date.now() - startedAt) / 1000); }, 200);
    meterRaf = requestAnimationFrame(meter);
  }

  function meter() {
    if (!rec || rec.state !== 'recording') return;
    meterRaf = requestAnimationFrame(meter);
    TT.audio.sample();
    const pct = Math.max(0, Math.min(100, ((TT.audio.rmsDb + 70) / 60) * 100));
    els.recLevel.style.width = pct.toFixed(0) + '%';
  }

  function finish() {
    clearInterval(timerInt); timerInt = 0;
    cancelAnimationFrame(meterRaf); meterRaf = 0;
    els.btnRecord.classList.remove('recording');
    const dur = (Date.now() - startedAt) / 1000;
    if (!chunks.length) { status('Take was empty — discarded'); return; }
    const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
    const take = {
      id: 't' + Date.now(),
      name: 'Take ' + (takeSeq++),
      url: URL.createObjectURL(blob),
      blob: blob,
      dur: dur,
      at: new Date()
    };
    R.takes.unshift(take);
    renderTakes();
    status(`Saved ${fmt(dur)} — nice!`, 'ok');
    TT.app.assist(`Take ${takeSeq - 1} recorded (${fmt(dur)}).`);
    if (TT.practice && dur >= 5) TT.practice.addSeconds(dur);
  }

  R.toggle = async function () {
    if (rec && rec.state === 'recording') { R.stop(); return; }
    if (pendingCountIn) { cancelCountIn(); return; }
    TT.audio.ensure();
    if (els.optMetro.checked && !TT.metronome.isPlaying()) {
      TT.metronome.start();
      autoStartedMetro = true;
      TT.app.assist('Metronome started automatically so your take stays in time.');
    }
    if (els.optCountIn.checked) {
      if (!TT.metronome.isPlaying()) {
        TT.metronome.start();
        autoStartedMetro = true;
      }
      status('Waiting for the next bar…', 'countin');
      const ok = await withCountIn();
      countInResolve = null;
      if (!ok) return;
    }
    beginRecord();
  };

  R.stop = function () {
    if (pendingCountIn) { cancelCountIn(); return; }
    if (rec && rec.state === 'recording') rec.stop();
    if (autoStartedMetro) {
      TT.metronome.stop();
      autoStartedMetro = false;
      TT.app.assist('Metronome stopped — it was only on for your take.');
    }
    els.recTimer.textContent = '00:00';
    els.recLevel.style.width = '0%';
    if (!pendingCountIn) status('Ready');
  };

  /* ---------- takes UI ---------- */
  function renderTakes() {
    els.takesCount.textContent = String(R.takes.length);
    const list = els.takesList;
    if (!R.takes.length) {
      list.innerHTML = '<li class="empty">No takes yet. Hit record and play!</li>';
      return;
    }
    list.innerHTML = '';
    R.takes.forEach(t => {
      const li = document.createElement('li');
      li.className = 'take';
      li.dataset.id = t.id;
      const hhmm = t.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      li.innerHTML =
        `<button class="take-play" title="Play">▶</button>` +
        `<div class="take-info"><div class="take-name">${t.name}</div>` +
        `<div class="take-meta">${fmt(t.dur)} · ${hhmm}</div></div>` +
        `<button class="take-dl" title="Download">⤓</button>` +
        `<button class="take-del" title="Delete">✕</button>`;
      li.querySelector('.take-play').addEventListener('click', () => playTake(t, li));
      li.querySelector('.take-dl').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = t.url;
        a.download = 'trill-tuner-' + t.name.toLowerCase().replace(/\s+/g, '-') +
          (String(t.blob.type).includes('mp4') ? '.m4a' : '.webm');
        document.body.appendChild(a); a.click(); a.remove();
      });
      li.querySelector('.take-del').addEventListener('click', () => {
        if (playingUrl === t.url) stopPlayback();
        URL.revokeObjectURL(t.url);
        R.takes = R.takes.filter(x => x !== t);
        renderTakes();
      });
      list.appendChild(li);
    });
  }

  function stopPlayback() {
    if (playingTake) { playingTake.pause(); playingTake = null; }
    playingUrl = '';
    els.takesList.querySelectorAll('.take.playing').forEach(el => {
      el.classList.remove('playing');
      const b = el.querySelector('.take-play'); if (b) b.textContent = '▶';
    });
  }
  function playTake(t, li) {
    if (playingUrl === t.url) { stopPlayback(); return; }
    stopPlayback();
    playingTake = new Audio(t.url);
    playingUrl = t.url;
    li.classList.add('playing');
    li.querySelector('.take-play').textContent = '⏸';
    playingTake.addEventListener('ended', () => stopPlayback());
    playingTake.play().catch(() => stopPlayback());
  }

  R.init = function () {
    els = {
      btnRecord: document.getElementById('btn-record'),
      recTimer: document.getElementById('rec-timer'),
      recStatus: document.getElementById('rec-status'),
      recLevel: document.getElementById('rec-level'),
      optMetro: document.getElementById('opt-metronome'),
      optCountIn: document.getElementById('opt-countin'),
      takesList: document.getElementById('takes-list'),
      takesCount: document.getElementById('takes-count')
    };
    els.btnRecord.addEventListener('click', () => R.toggle());
  };

  window.TT = window.TT || {};
  window.TT.recorder = R;
})();
