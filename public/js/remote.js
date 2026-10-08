/* Trill Tuner — remote tuner.
 *
 * One device hosts a session (the web version, served by server.js, hosts the
 * app on the LAN) and shows a QR code. A second device — any browser, or the
 * Trill Tuner APK — scans it, loads the same app from the host and the two
 * tuners mirror each other live over Server-Sent Events + POST. Fully
 * inclusive: each side sees the other's detected note, cents, guidance and
 * per-string tuning progress, and sends its own. */
(function () {
  'use strict';

  const R = {
    sessionId: null, role: null, es: null,
    lastPublish: 0, lastPayload: '', peer: null,
    poll: null, peerVibrated: false
  };
  let els = {};

  /* ---- where is the app being served from? (for QR links) ---- */
  function lanIpViaWebRTC() {
    return new Promise(resolve => {
      try {
        const pc = new (window.RTCPeerConnection || window.webkitRTCPeerConnection)({ iceServers: [] });
        let done = false;
        const finish = ip => { if (!done) { done = true; try { pc.close(); } catch (e) {} resolve(ip); } };
        pc.onicecandidate = e => {
          if (!e.candidate) return;
          const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
          if (m && m[1].indexOf('127.') !== 0 && m[1] !== '0.0.0.0') finish(m[1]);
        };
        pc.createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => finish(null));
        setTimeout(() => finish(null), 2500);
      } catch (e) { resolve(null); }
    });
  }

  async function hostBaseUrl() {
    if (window.Android && typeof window.Android.getHostBase === 'function') {
      const b = window.Android.getHostBase();
      if (b) return String(b).replace(/\/$/, '');
    }
    /* when the app is served, the origin IS the address other devices use
     * (also correct behind a proxy); on file:// no fetch can work, so fall
     * back to discovering the LAN IP without a server */
    if (location.protocol === 'http:' || location.protocol === 'https:') return location.origin;
    const ip = await lanIpViaWebRTC();
    return ip ? 'http://' + ip + ':3000' : '';
  }

  /* ---- the tuner state we publish (read off the live tuner DOM) ---- */
  function snapshot() {
    const t = window.TT && TT.tuner;
    if (!t || !t.state) return null;
    const chips = Array.from(document.querySelectorAll('#string-chips .chip'));
    let mask = 0;
    chips.forEach((c, i) => { if (c.classList.contains('tuned')) mask |= (1 << i); });
    return {
      signal: !!t.state.signal,
      det: (document.getElementById('note-detected') || {}).textContent || '–',
      detSub: (document.getElementById('note-detected-sub') || {}).textContent || '',
      tgt: (document.getElementById('note-target') || {}).textContent || '–',
      tgtSub: (document.getElementById('note-target-sub') || {}).textContent || '',
      cents: (document.getElementById('cents-val') || {}).textContent || '–¢',
      status: (document.getElementById('tune-status') || {}).textContent || '',
      inTune: !!(document.querySelector('#view-tune .wave-card') || {}).classList &&
        document.querySelector('#view-tune .wave-card').classList.contains('in-tune'),
      mask: mask
    };
  }

  function publish(force) {
    if (!R.sessionId || !R.role) return;
    const snap = snapshot();
    if (!snap) return;
    const payload = JSON.stringify(snap);
    const now = Date.now();
    if (!force && payload === R.lastPayload && now - R.lastPublish < 400) return;
    R.lastPayload = payload;
    R.lastPublish = now;
    fetch('/api/sessions/' + R.sessionId + '/msg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: R.role, data: { type: 'tuner', snap: snap } })
    }).catch(() => {});
  }

  function post(data) {
    if (!R.sessionId || !R.role) return;
    fetch('/api/sessions/' + R.sessionId + '/msg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: R.role, data: data })
    }).catch(() => {});
  }

  function sayHello() { post({ type: 'hello' }); }

  function markConnected() {
    R.peerPresent = true;
    if (R.role === 'host') {
      setStatus('Connected — the other device is live.');
      if (els.live) els.live.hidden = false;
      if (els.liveTitle) els.liveTitle.textContent = 'Connected device — live';
    } else {
      if (els.joinH) els.joinH.textContent = 'Connected to the host ✓';
      if (els.joinStatus) els.joinStatus.textContent = 'You are connected. Play a string — the host sees your note, and you see theirs below.';
    }
  }

  function startPublishing() {
    stopPublishing();
    R.poll = setInterval(() => publish(false), 120);
    publish(true);
  }
  function stopPublishing() {
    if (R.poll) { clearInterval(R.poll); R.poll = null; }
  }

  function connectSSE(role, id) {
    disconnectSSE();
    R.sessionId = id;
    R.role = role;
    R.es = new EventSource('/api/sessions/' + id + '/events?as=' + role);
    R.es.onmessage = e => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (msg.type === 'msg' && msg.data && msg.data.type === 'tuner') {
        markConnected();
        onPeerState(msg.data.snap, msg.from);
      } else if (msg.type === 'msg' && msg.data && msg.data.type === 'hello') {
        markConnected();
      } else if (msg.type === 'joined') {
        markConnected();
        sayHello();
      } else if (msg.type === 'left') {
        R.peerPresent = false;
        if (role === 'host') { setStatus('The other device left the session.'); renderPeer(null); }
        if (role === 'join') {
          renderPeer(null, 'The host stopped the session.');
          if (els.joinH) els.joinH.textContent = 'Disconnected';
        }
      }
    };
    R.es.onerror = () => { /* EventSource retries on its own */ };
    startPublishing();
    sayHello();
    startStatusPoll();
  }
  function startStatusPoll() {
    stopStatusPoll();
    R.statusPoll = setInterval(async () => {
      if (!R.sessionId || R.role !== 'host') return;
      try {
        const r = await fetch('/api/sessions/' + R.sessionId);
        const j = await r.json();
        if (j && j.ok && j.joiners > 0) markConnected();
      } catch (err) {}
    }, 1500);
  }
  function stopStatusPoll() {
    if (R.statusPoll) { clearInterval(R.statusPoll); R.statusPoll = null; }
  }

  function disconnectSSE() {
    if (R.es) { try { R.es.close(); } catch (e) {} R.es = null; }
    stopPublishing();
    stopStatusPoll();
    R.sessionId = null;
    R.role = null;
    R.lastPayload = '';
    R.peerPresent = false;
  }

  /* ---- rendering ---- */
  function setStatus(txt) {
    if (els.status) els.status.textContent = txt;
  }

  function renderPeer(snap, goneMsg) {
    if (!snap) {
      if (els.live) els.live.hidden = true;
      if (els.peerNote) els.peerNote.textContent = '–';
      if (els.peerCents) els.peerCents.textContent = '–¢';
      if (els.peerLine) els.peerLine.textContent = goneMsg || 'waiting…';
      if (els.peerHint) els.peerHint.textContent = goneMsg || '';
      return;
    }
    R.peer = snap;
    if (R.role === 'host') {
      if (els.live) els.live.hidden = false;
      if (els.liveTitle) els.liveTitle.textContent = 'Connected device — live';
      if (els.note) els.note.textContent = snap.signal ? snap.det : '–';
      if (els.cents) els.cents.textContent = snap.signal ? snap.cents : '–¢';
      if (els.statusLine) els.statusLine.textContent = snap.signal ? snap.status : 'listening…';
      if (els.statusLine) els.statusLine.style.color = snap.inTune ? '#22c55e' : '';
      if (els.hint) els.hint.textContent = snap.signal
        ? (snap.inTune ? 'The other device is in tune ✓' : 'Tune toward the target shown here — mirrored from the other device.')
        : 'Waiting for sound on the other device…';
      renderChips(els.chips, snap.mask);
    } else {
      if (els.join) els.join.hidden = false;
      if (els.peerNote) els.peerNote.textContent = snap.signal ? snap.det : '–';
      if (els.peerCents) els.peerCents.textContent = snap.signal ? snap.cents : '–¢';
      if (els.peerLine) els.peerLine.textContent = snap.signal ? snap.status : 'waiting for the host…';
      if (els.peerLine) els.peerLine.style.color = snap.inTune ? '#22c55e' : '';
      if (els.peerHint) els.peerHint.textContent = snap.signal
        ? (snap.tgtSub ? 'Host target: ' + snap.tgtSub : '')
        : 'Start listening on the host to see its tuner here.';
    }
    /* a small haptic when the peer locks in tune (phones with a vibrator) */
    if (snap.inTune && !R.peerVibrated && navigator.vibrate) { navigator.vibrate(40); R.peerVibrated = true; }
    if (!snap.inTune) R.peerVibrated = false;
  }

  function onPeerState(snap, from) {
    renderPeer(snap);
  }

  function renderChips(wrap, mask) {
    if (!wrap) return;
    const names = (TT.tuner && TT.tunings) ? TT.tunings.byId(TT.tuner.state.presetId).strings : [];
    wrap.innerHTML = '';
    names.forEach((s, i) => {
      const chip = document.createElement('div');
      chip.className = 'chip' + ((mask >> i) & 1 ? ' tuned' : '');
      chip.innerHTML = '<span class="chip-note">' + TT.notes.prettyName(s.name).label + '</span>';
      wrap.appendChild(chip);
    });
  }

  /* ---- host flow ---- */
  async function host() {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') {
      TT.app.toast('Hosting needs the web version — open this app in a browser on the same network as the other device.');
      return;
    }
    try {
      const r = await fetch('/api/sessions', { method: 'POST' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'could not create a session');
      const base = await hostBaseUrl();
      const link = base + '/?join=' + j.id;
      connectSSE('host', j.id);
      if (els.qrWrap) els.qrWrap.hidden = false;
      if (els.hostBtn) els.hostBtn.hidden = true;
      if (els.stopBtn) els.stopBtn.hidden = false;
      if (els.link) els.link.value = link;
      if (els.qr) TT.qr.draw(els.qr, link, { cell: 4, margin: 3 });
      setStatus('Waiting for a device to connect…');
      TT.app.assist('Remote session hosted — scan the QR code with the other device to sync your tuners.');
    } catch (e) {
      TT.app.toast('Could not start a session: ' + e.message);
    }
  }

  function stopHosting() {
    disconnectSSE();
    if (els.qrWrap) els.qrWrap.hidden = true;
    if (els.hostBtn) els.hostBtn.hidden = false;
    if (els.stopBtn) els.stopBtn.hidden = true;
    if (els.live) els.live.hidden = true;
    setStatus('');
    TT.app.assist('Remote session stopped.');
  }

  /* ---- join flow (?join=<id>) ---- */
  function join(id) {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') {
      TT.app.toast('Join the session by opening its link in a browser.');
      return;
    }
    connectSSE('join', id);
    if (els.join) els.join.hidden = false;
    if (els.join) els.join.scrollIntoView({ block: 'nearest' });
    TT.app.showView('tune');
    TT.app.assist('Joined a remote tuning session — your tuner is mirrored to the host and theirs to you.');
  }

  function leave() {
    disconnectSSE();
    if (els.join) els.join.hidden = true;
    renderPeer(null, '');
    const u = new URL(location.href);
    u.searchParams.delete('join');
    history.replaceState(null, '', u.toString());
    TT.app.assist('Left the remote session.');
  }

  R.init = function () {
    els = {
      hostBtn: document.getElementById('btn-remote-host'),
      stopBtn: document.getElementById('btn-remote-stop'),
      qrWrap: document.getElementById('remote-qr-wrap'),
      qr: document.getElementById('remote-qr'),
      link: document.getElementById('remote-link'),
      status: document.getElementById('remote-status'),
      live: document.getElementById('remote-live'),
      liveTitle: document.getElementById('remote-live-title'),
      note: document.getElementById('remote-note'),
      cents: document.getElementById('remote-cents'),
      statusLine: document.getElementById('remote-status-line'),
      chips: document.getElementById('remote-chips'),
      hint: document.getElementById('remote-hint'),
      join: document.getElementById('remote-join'),
      joinH: document.getElementById('remote-join-h'),
      joinStatus: document.getElementById('remote-join-status'),
      peerNote: document.getElementById('remote-peer-note'),
      peerCents: document.getElementById('remote-peer-cents'),
      peerLine: document.getElementById('remote-peer-line'),
      peerHint: document.getElementById('remote-peer-hint')
    };
    if (els.hostBtn) els.hostBtn.addEventListener('click', host);
    if (els.stopBtn) els.stopBtn.addEventListener('click', stopHosting);
    const copyBtn = document.getElementById('btn-remote-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      if (els.link && els.link.value) {
        (navigator.clipboard ? navigator.clipboard.writeText(els.link.value) : Promise.reject())
          .then(() => TT.app.toast('Session link copied ✓'))
          .catch(() => TT.app.toast('Copy blocked — select the link and copy it manually.'));
      }
    });
    const shareBtn = document.getElementById('btn-remote-share');
    if (shareBtn) shareBtn.addEventListener('click', () => {
      const url = els.link && els.link.value;
      if (url && navigator.share) {
        navigator.share({ title: 'Trill Tuner — remote tuning session', text: 'Join my tuning session:', url: url }).catch(() => {});
      } else if (url) {
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
          .then(() => TT.app.toast('Session link copied ✓'))
          .catch(() => TT.app.toast('Copy blocked — select the link and copy it manually.'));
      }
    });
    const leaveBtn = document.getElementById('btn-remote-leave');
    if (leaveBtn) leaveBtn.addEventListener('click', leave);

    /* joining is driven by the URL: /?join=<id> */
    const id = new URL(location.href).searchParams.get('join');
    if (id) setTimeout(() => join(id), 400);
  };

  window.TT = window.TT || {};
  window.TT.remote = R;
})();
