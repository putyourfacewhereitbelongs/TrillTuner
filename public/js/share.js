/* Trill Tuner — Progress, achievements, sharing and backup.
 *
 *   · Progress maths: practice time, streaks, lessons, ear training, rigs
 *   · Achievements that unlock as you play (with toasts)
 *   · A share card rendered on a canvas (download PNG / share sheet / clipboard)
 *   · Share links: your progress encoded in a URL (no server, no account)
 *   · Full backup: export/import a JSON file, rolling snapshots, restore
 *   · Storage health: persistent-storage request, usage, migration status
 */
(function () {
  'use strict';

  const S = {};
  let els = {};
  const VERSION = '2.0.0';

  /* =================================================================== */
  /* progress maths                                                       */
  /* =================================================================== */
  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayKeyOffset(off) { const d = new Date(); d.setDate(d.getDate() - off); return todayKey(d); }

  S.stats = function () {
    const practice = TT.store.get('practice', {});
    const lessons = TT.store.get('lessonsDone', []);
    const settings = TT.store.get('settings', {});
    const strings = TT.store.get('strings', {});
    const rig = TT.store.get('rig', {});
    const earBest = TT.store.get('earBest', {});
    const intervalBest = TT.store.get('intervalBest', 0) || 0;
    const rhythmBest = TT.store.get('rhythmBest', { ms: 999 }).ms;
    const totalMins = Object.keys(practice).reduce((a, k) => a + (practice[k] || 0), 0);
    const days = Object.keys(practice).filter(k => practice[k] > 0).length;
    let streak = 0;
    for (let i = 0; i < 3650; i++) {
      if (practice[dayKeyOffset(i)]) streak++;
      else if (i > 0) break;
    }
    let week = 0;
    for (let i = 0; i < 7; i++) week += practice[dayKeyOffset(i)] || 0;
    const tuningsUsed = TT.store.get('tuningsUsed', []);
    const rigPresets = (rig && rig.userPresets ? rig.userPresets.length : 0);
    return {
      totalMins: totalMins, todayMins: practice[todayKey()] || 0, weekMins: week,
      days: days, streak: streak,
      lessons: lessons.length, lessonIds: lessons,
      tuningsUsed: tuningsUsed.length, tuningsList: tuningsUsed,
      earBest: (earBest && earBest.best) || 0, earMode: (earBest && earBest.mode) || 'open',
      intervalBest: intervalBest, rhythmBestMs: rhythmBest === 999 ? null : rhythmBest,
      modes: settings.mode || 'acoustic', capo: settings.capo || 0,
      stringChangedAt: strings.changedAt || null, stringBrand: strings.brand || '',
      rigPresets: rigPresets, rigPedals: rig && rig.pedals ? rig.pedals.length : 0, rigAmp: rig && rig.ampId ? rig.ampId : '',
      rhythmPlays: TT.store.get('rhythmPlays', 0) || 0,
      setlist: (TT.store.get('setlist', []) || []).length,
      favSongs: (TT.store.get('favSongs', []) || []).length,
      chartsRead: (TT.store.get('tabHistory', []) || []).length,
      stemsRun: (TT.store.get('stemHistory', []) || []).length,
      beds: TT.store.get('bkRenders', 0) || 0,
      plans: TT.store.get('minePlans', 0) || 0,
      listenStreak: (TT.store.get('listenerBest', null) || {}).streak || 0,
      lyricFavs: (TT.store.get('lyricsFavs', []) || []).length,
      memberSince: TT.store.get('firstRun', null)
    };
  };

  /* =================================================================== */
  /* achievements                                                         */
  /* =================================================================== */
  const BADGES = [
    { id: 'first-run', name: 'Welcome aboard', desc: 'Open Trill Tuner for the first time', test: s => true },
    { id: 'tuned-6', name: 'In tune', desc: 'Lock all six strings in one session', test: s => s.tuningsUsed >= 1 },
    { id: 'explorer', name: 'Tuning explorer', desc: 'Try 5 different tunings', test: s => s.tuningsUsed >= 5 },
    { id: 'tuner-vet', name: 'Tuning veteran', desc: 'Try 15 different tunings', test: s => s.tuningsUsed >= 15 },
    { id: 'lesson-1', name: 'Student', desc: 'Complete your first lesson', test: s => s.lessons >= 1 },
    { id: 'lesson-5', name: 'Serious student', desc: 'Complete 5 lessons', test: s => s.lessons >= 5 },
    { id: 'lesson-10', name: 'Half way', desc: 'Complete 10 lessons', test: s => s.lessons >= 10 },
    { id: 'practice-30', name: 'Half an hour', desc: 'Log 30 minutes of practice', test: s => s.totalMins >= 30 },
    { id: 'practice-300', name: 'Five hours', desc: 'Log 5 hours of practice', test: s => s.totalMins >= 300 },
    { id: 'practice-1000', name: 'Woodshed', desc: 'Log 1000 minutes of practice', test: s => s.totalMins >= 1000 },
    { id: 'streak-3', name: 'Three in a row', desc: 'Practice 3 days in a row', test: s => s.streak >= 3 },
    { id: 'streak-7', name: 'Week streak', desc: 'Practice 7 days in a row', test: s => s.streak >= 7 },
    { id: 'streak-30', name: 'Thirty days', desc: 'Practice 30 days in a row', test: s => s.streak >= 30 },
    { id: 'ear-10', name: 'Good ears', desc: 'Get a 10 streak in ear training', test: s => s.earBest >= 10 },
    { id: 'ear-25', name: 'Golden ears', desc: 'Get a 25 streak in ear training', test: s => s.earBest >= 25 },
    { id: 'interval-12', name: 'Interval master', desc: 'Name all 12 intervals', test: s => s.intervalBest >= 12 },
    { id: 'rhythm-40', name: 'Tight groove', desc: 'Average under 40 ms in the rhythm trainer', test: s => s.rhythmBestMs != null && s.rhythmBestMs < 40 },
    { id: 'rhythm-25', name: 'Metronome human', desc: 'Average under 25 ms in the rhythm trainer', test: s => s.rhythmBestMs != null && s.rhythmBestMs < 25 },
    { id: 'rig-1', name: 'Rig builder', desc: 'Save your first rig preset', test: s => s.rigPresets >= 1 },
    { id: 'rig-3', name: 'Gear hoarder', desc: 'Save 3 rig presets', test: s => s.rigPresets >= 3 },
    { id: 'rig-pedals-5', name: 'Board builder', desc: 'Put 5 pedals on the virtual board', test: s => s.rigPedals >= 5 },
    { id: 'new-strings', name: 'Fresh strings', desc: 'Log a string change', test: s => !!s.stringChangedAt },
    { id: 'care-30', name: 'Gentle owner', desc: 'Keep strings under 30 days old', test: s => s.stringChangedAt && (Date.now() - s.stringChangedAt) < 30 * 864e5 },
    { id: 'capo', name: 'Capo user', desc: 'Tune with a capo on', test: s => s.capo >= 1 },
    { id: 'setlist-1', name: 'Set list', desc: 'Set a song aside to play', test: s => s.setlist >= 1 },
    { id: 'repertoire', name: 'Repertoire', desc: 'Save 5 songs to your favourites', test: s => s.favSongs >= 5 },
    { id: 'chart-1', name: 'Chart reader', desc: 'Have the tab maker read a song', test: s => s.chartsRead >= 1 },
    { id: 'stem-1', name: 'Stem surgeon', desc: 'Run your first stem separation', test: s => s.stemsRun >= 1 },
    { id: 'stem-10', name: 'Stem lab habit', desc: 'Run 10 stem separations', test: s => s.stemsRun >= 10 },
    { id: 'listener-10', name: 'Ten clean notes', desc: 'Get a 10-note streak in the live listener', test: s => s.listenStreak >= 10 },
    { id: 'listener-50', name: 'Note perfect', desc: 'Get a 50-note streak in the live listener', test: s => s.listenStreak >= 50 },
    { id: 'bed-1', name: 'Band in a box', desc: 'Build a backing track in the studio', test: s => s.beds >= 1 },
    { id: 'plan-1', name: 'Session planner', desc: 'Build a practice plan from your favourites', test: s => s.plans >= 1 }
  ];

  function badgeState() {
    const s = S.stats();
    const unlocked = TT.store.get('badges', []) || [];
    return BADGES.map(b => ({ id: b.id, name: b.name, desc: b.desc, unlocked: unlocked.indexOf(b.id) !== -1 || b.test(s) }));
  }

  S.checkBadges = function (quiet) {
    const s = S.stats();
    let unlocked = TT.store.get('badges', []) || [];
    const newly = [];
    BADGES.forEach(b => {
      if (unlocked.indexOf(b.id) === -1 && b.test(s)) { unlocked.push(b.id); newly.push(b); }
    });
    if (newly.length) {
      TT.store.set('badges', unlocked);
      if (!quiet) newly.forEach(b => TT.app.toast(`🏅 Achievement unlocked — ${b.name}: ${b.desc}`));
    }
    return newly;
  };

  /* =================================================================== */
  /* share card (canvas)                                                  */
  /* =================================================================== */
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  S.drawCard = function (canvas) {
    const s = S.stats();
    const badges = badgeState().filter(b => b.unlocked);
    const W = 1200, H = 630, dpr = 2;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* background */
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0b0d12'); grad.addColorStop(0.55, '#141a29'); grad.addColorStop(1, '#221a0e');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    /* glow */
    const rg = g.createRadialGradient(1000, 80, 10, 1000, 80, 520);
    rg.addColorStop(0, 'rgba(240,164,58,.28)'); rg.addColorStop(1, 'rgba(240,164,58,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);

    /* logo */
    g.save();
    g.translate(70, 68);
    g.fillStyle = '#f0a43a';
    g.beginPath();
    g.moveTo(28, 0); g.bezierCurveTo(16, 0, 8, 6, 8, 14);
    g.bezierCurveTo(8, 26, 14, 38, 22, 50); g.bezierCurveTo(26, 56, 28, 60, 28, 64);
    g.bezierCurveTo(28, 60, 30, 56, 34, 50); g.bezierCurveTo(42, 38, 48, 26, 48, 14);
    g.bezierCurveTo(48, 6, 40, 0, 28, 0); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(28, 15, 6.5, 0, Math.PI * 2); g.fill();
    g.restore();

    g.fillStyle = '#ffffff';
    g.font = '800 46px -apple-system, "Segoe UI", Roboto, sans-serif';
    g.fillText('Trill Tuner', 148, 104);
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.font = '600 19px -apple-system, "Segoe UI", Roboto, sans-serif';
    g.fillText('MY PROGRESS · ' + new Date().toLocaleDateString(), 148, 132);

    /* stats grid */
    const cards = [
      { label: 'Practice time', value: (s.totalMins >= 60 ? (s.totalMins / 60).toFixed(1) + ' h' : s.totalMins + ' min') },
      { label: 'Day streak', value: s.streak + (s.streak === 1 ? ' day' : ' days') },
      { label: 'Lessons done', value: s.lessons + '/' + 15 },
      { label: 'Tunings tried', value: String(s.tuningsUsed) },
      { label: 'Ear streak', value: String(s.earBest) },
      { label: 'Rhythm accuracy', value: s.rhythmBestMs != null ? s.rhythmBestMs + ' ms' : '—' }
    ];
    cards.forEach((c, i) => {
      const x = 70 + (i % 3) * 240, y = 178 + Math.floor(i / 3) * 108;
      roundRect(g, x, y, 220, 92, 16);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#f0a43a';
      g.font = '800 34px -apple-system, "Segoe UI", Roboto, sans-serif';
      g.fillText(String(c.value), x + 20, y + 50);
      g.fillStyle = 'rgba(255,255,255,.6)';
      g.font = '600 15px -apple-system, "Segoe UI", Roboto, sans-serif';
      g.fillText(c.label.toUpperCase(), x + 20, y + 74);
    });

    /* practice heat strip (last 28 days) */
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.font = '600 14px -apple-system, "Segoe UI", Roboto, sans-serif';
    g.fillText('LAST 28 DAYS', 800, 190);
    const practice = TT.store.get('practice', {});
    for (let i = 0; i < 28; i++) {
      const k = dayKeyOffset(27 - i);
      const mins = practice[k] || 0;
      const x = 800 + i * 13, y = 204;
      const alpha = mins === 0 ? 0.08 : Math.min(0.95, 0.2 + mins / 60);
      g.fillStyle = mins === 0 ? 'rgba(255,255,255,.08)' : `rgba(240,164,58,${alpha.toFixed(2)})`;
      roundRect(g, x, y, 10, 34, 3); g.fill();
    }

    /* badges */
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.font = '600 14px -apple-system, "Segoe UI", Roboto, sans-serif';
    g.fillText('ACHIEVEMENTS ' + badges.length + '/' + BADGES.length, 800, 276);
    g.font = '500 15px -apple-system, "Segoe UI", Roboto, sans-serif';
    const show = badges.slice(-9);
    show.forEach((b, i) => {
      g.fillStyle = '#e9ecf3';
      g.fillText('🏅 ' + b.name, 800, 304 + i * 24);
    });

    /* footer */
    g.fillStyle = 'rgba(255,255,255,.45)';
    g.font = '500 16px -apple-system, "Segoe UI", Roboto, sans-serif';
    g.fillText('Local-first guitar practice · tuner, metronome, lessons, rigs · no account, no data leaves the device', 70, H - 40);
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.font = '700 16px -apple-system, "Segoe UI", Roboto, sans-serif';
    g.fillText('v' + VERSION, W - 130, H - 40);
    return canvas;
  };

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  S.shareText = function () {
    const s = S.stats();
    const badges = badgeState().filter(b => b.unlocked);
    return [
      '🎸 My Trill Tuner progress',
      `• ${s.totalMins} minutes practiced (${s.streak}-day streak)`,
      `• ${s.lessons} lessons complete`,
      `• ${s.tuningsUsed} tunings explored`,
      `• Ear-training streak: ${s.earBest}` + (s.rhythmBestMs != null ? ` · rhythm accuracy ${s.rhythmBestMs} ms` : ''),
      `• ${badges.length} achievements unlocked`,
      '',
      'Trill Tuner — a from-scratch guitar tuner + practice studio.'
    ].join('\n');
  };

  /* ---------- share links (progress encoded in the URL) ---------- */
  function b64urlEncode(bytes) {
    let s = '';
    bytes.forEach(b => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function b64urlDecode(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  async function encodeProgress() {
    const payload = {
      v: VERSION,
      at: Date.now(),
      stats: S.stats(),
      badges: badgeState().filter(b => b.unlocked).map(b => b.id),
      settings: (function () { const s = TT.store.get('settings', {}); return { presetId: s.presetId, mode: s.mode, a4: s.a4, capo: s.capo }; })(),
      rig: (function () { const r = TT.store.get('rig', null); return r ? { ampId: r.ampId, pedals: (r.pedals || []).map(p => p.id) } : null; })()
    };
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    if (typeof CompressionStream === 'function') {
      try {
        const cs = new CompressionStream('gzip');
        const stream = new Blob([bytes]).stream().pipeThrough(cs);
        const buf = await new Response(stream).arrayBuffer();
        return '1' + b64urlEncode(new Uint8Array(buf));
      } catch (e) { /* fall through to plain */ }
    }
    return '0' + b64urlEncode(bytes);
  }
  async function decodeProgress(code) {
    const kind = code.charAt(0);
    const bytes = b64urlDecode(code.slice(1));
    let json;
    if (kind === '1' && typeof DecompressionStream === 'function') {
      const ds = new DecompressionStream('gzip');
      const stream = new Blob([bytes]).stream().pipeThrough(ds);
      json = await new Response(stream).text();
    } else {
      json = new TextDecoder().decode(bytes);
    }
    return JSON.parse(json);
  }

  S.copyShareLink = async function () {
    const code = await encodeProgress();
    const url = location.origin + location.pathname + '#p=' + code;
    try {
      await navigator.clipboard.writeText(url);
      TT.app.toast('Share link copied — paste it anywhere. Progress is inside the link itself.');
    } catch (e) {
      els.linkOut.value = url;
      els.linkOut.select();
      TT.app.toast('Copy failed — the link is in the box, press Ctrl/Cmd+C.');
    }
    return url;
  };

  S.readSharedFromUrl = async function () {
    const m = /[#&]p=([A-Za-z0-9\-_]+)/.exec(location.hash || '');
    if (!m) return null;
    try {
      const data = await decodeProgress(m[1]);
      renderShared(data);
      return data;
    } catch (e) { return null; }
  };

  function renderShared(data) {
    const box = els.sharedBox;
    if (!box) return;
    box.hidden = false;
    const s = data.stats || {};
    box.innerHTML = `<div class="card-h small">📨 Shared progress</div>
      <div class="shared-stats">${[
        ['Practice', (s.totalMins || 0) + ' min'], ['Streak', (s.streak || 0) + ' d'], ['Lessons', (s.lessons || 0) + '/15'],
        ['Tunings', s.tuningsUsed || 0], ['Ear best', s.earBest || 0], ['Badges', (data.badges || []).length]
      ].map(([k, v]) => `<div class="shared-stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      <div class="dim tiny-hint">Shared ${data.at ? new Date(data.at).toLocaleString() : ''} · this is a snapshot, nothing was downloaded.</div>
      ${data.rig ? `<div class="dim tiny-hint">Rig: ${data.rig.ampId}${data.rig.pedals && data.rig.pedals.length ? ' + ' + data.rig.pedals.join(', ') : ''}</div>` : ''}
      <button class="btn tiny" id="shared-import">Import this as my starting point</button>
      <button class="btn tiny btn-ghost" id="shared-close">Dismiss</button>`;
    const imp = document.getElementById('shared-import');
    if (imp) imp.addEventListener('click', () => {
      if (data.rig) {
        const cur = TT.store.get('rig', {}) || {};
        const ampOk = TT.amps && TT.amps.byId && TT.amps.byId(data.rig.ampId);
        if (ampOk) cur.ampId = data.rig.ampId;
        /* rebuild the shared pedalboard with each pedal's factory knob values,
         * skipping anything this build does not know about */
        if (Array.isArray(data.rig.pedals)) {
          cur.pedals = data.rig.pedals.map(id => (TT.pedals && TT.pedals.byId(id)) ? id : null)
            .filter(Boolean)
            .map(id => {
              const def = TT.pedals.byId(id), params = {};
              (def.controls || []).forEach(c => { params[c.name] = c.def; });
              return { id: id, on: true, params: params };
            });
        }
        TT.store.set('rig', cur);
        if (TT.rig && TT.rig.rebuild) TT.rig.rebuild();
      }
      if (data.settings) {
        TT.store.set('settings', Object.assign(TT.store.get('settings', {}), data.settings));
      }
      TT.app.toast('Imported — reload to apply everything. Your own stats were left alone.');
    });
    document.getElementById('shared-close').addEventListener('click', () => { box.hidden = true; history.replaceState(null, '', location.pathname); });
  }

  /* =================================================================== */
  /* backup / restore                                                     */
  /* =================================================================== */
  S.exportBackup = function () {
    const backup = TT.store.exportAll();
    download(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `TrillTuner-backup-${todayKey()}.json`);
    TT.app.toast('Backup downloaded — keep it somewhere safe (it contains your streaks and rig presets).');
  };
  S.importBackup = function (file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const res = TT.store.importAll(parsed, { replace: false });
        TT.app.toast(`Backup restored: ${res.keys} keys merged. Reload to see everything.`);
        renderStorage();
        S.render();
      } catch (e) {
        TT.app.toast('That file could not be read: ' + (e.message || e));
      }
    };
    reader.readAsText(file);
  };

  function renderStorage() {
    if (!els.storageInfo) return;
    const u = TT.store.usage();
    const st = TT.store.storageState();
    els.storageInfo.innerHTML = `
      <div class="store-row"><b>${(u.bytes / 1024).toFixed(1)} KB</b> of local data · ${u.keys} keys · browser quota ${st.quota ? (st.quota / 1048576).toFixed(0) + ' MB' : 'unknown'}</div>
      <div class="store-row">Persistent storage: <b class="${st.persisted ? 'ok' : ''}">${st.persisted ? 'granted — your data survives cleanup' : st.supported ? 'not granted yet' : 'not supported in this browser'}</b></div>
      <div class="store-row">Data from the app’s earlier version: <b>${TT.store.migrated ? 'imported ✓' : 'nothing to import'}</b></div>
      ${st.supported && !st.persisted ? '<button class="btn tiny" id="persist-btn">🔒 Ask the browser to keep my data</button>' : ''}`;
    const b = document.getElementById('persist-btn');
    if (b) b.addEventListener('click', async () => {
      const ok = await TT.store.requestPersistence();
      TT.app.toast(ok ? '✅ Persistent storage granted — the browser will keep your progress safe.' : 'The browser declined (this usually needs the app installed or bookmarked). Backups still work.');
      renderStorage();
    });
    const snaps = TT.store.snapshots();
    els.snapshotList.innerHTML = snaps.length
      ? snaps.map((s, i) => `<div class="snap"><span>${new Date(s.at).toLocaleString()} · ${s.label}</span>
          <button class="btn tiny" data-restore="${i}">Restore</button></div>`).join('')
      : '<div class="dim">No snapshots yet — one is taken automatically as you use the app.</div>';
    els.snapshotList.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', () => {
      try {
        TT.store.restore(+b.dataset.restore);
        TT.app.toast('Snapshot restored. Reloading…');
        setTimeout(() => location.reload(), 900);
      } catch (e) { TT.app.toast(e.message); }
    }));
  }

  /* =================================================================== */
  /* rendering the progress view                                          */
  /* =================================================================== */
  S.render = function () {
    const s = S.stats();
    const badges = badgeState();
    if (els.statGrid) {
      els.statGrid.innerHTML = [
        ['Practice time', s.totalMins >= 60 ? (s.totalMins / 60).toFixed(1) + ' hours' : s.totalMins + ' minutes'],
        ['Today', s.todayMins + ' min'],
        ['This week', s.weekMins + ' min'],
        ['Current streak', s.streak + ' days'],
        ['Days practiced', String(s.days)],
        ['Lessons complete', s.lessons + '/15'],
        ['Tunings explored', String(s.tuningsUsed)],
        ['Ear-training best', String(s.earBest)],
        ['Interval best', String(s.intervalBest)],
        ['Rhythm accuracy', s.rhythmBestMs != null ? s.rhythmBestMs + ' ms average error' : 'not measured yet'],
        ['Achievements', badges.filter(b => b.unlocked).length + '/' + badges.length],
        ['Rig presets saved', String(s.rigPresets)]
      ].map(([k, v]) => `<div class="stat-card"><span>${k}</span><b>${v}</b></div>`).join('');
    }
    if (els.badgeGrid) {
      els.badgeGrid.innerHTML = badges.map(b =>
        `<div class="badge-card ${b.unlocked ? 'on' : ''}"><b>${b.unlocked ? '🏅' : '🔒'} ${b.name}</b><span>${b.desc}</span></div>`).join('');
    }
    if (els.tuningsUsedList) {
      const used = TT.store.get('tuningsUsed', []);
      els.tuningsUsedList.innerHTML = used.length
        ? used.map(id => { const p = TT.tunings.byId(id); return `<span class="chip-btn">${p.name}</span>`; }).join('')
        : '<span class="dim">Play a note in the tuner and we’ll start tracking which tunings you have explored.</span>';
    }
    if (els.cardCanvas) S.drawCard(els.cardCanvas);
    renderStorage();
  };

  /* =================================================================== */
  /* init                                                                 */
  /* =================================================================== */
  S.init = function () {
    els = {
      statGrid: document.getElementById('progress-stats'),
      badgeGrid: document.getElementById('progress-badges'),
      tuningsUsedList: document.getElementById('progress-tunings'),
      cardCanvas: document.getElementById('share-canvas'),
      linkOut: document.getElementById('share-link-out'),
      storageInfo: document.getElementById('storage-info'),
      snapshotList: document.getElementById('snapshot-list'),
      sharedBox: document.getElementById('shared-box')
    };
    if (!els.statGrid) return;

    if (!TT.store.get('firstRun', null)) TT.store.set('firstRun', Date.now());
    S.render();
    S.checkBadges(true);

    document.getElementById('share-download').addEventListener('click', () => {
      els.cardCanvas.toBlob(blob => download(blob, `TrillTuner-progress-${todayKey()}.png`), 'image/png');
    });
    document.getElementById('share-copy-text').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(S.shareText()); TT.app.toast('Progress summary copied.'); }
      catch (e) { TT.app.toast('Copy failed — your browser blocked clipboard access.'); }
    });
    document.getElementById('share-link').addEventListener('click', () => { S.copyShareLink(); });
    document.getElementById('share-native').addEventListener('click', async () => {
      const text = S.shareText();
      try {
        if (navigator.share) {
          const blob = await new Promise(res => els.cardCanvas.toBlob(res, 'image/png'));
          const file = new File([blob], 'trill-tuner-progress.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ text: text, files: [file], title: 'My Trill Tuner progress' });
            return;
          }
          await navigator.share({ text: text, title: 'My Trill Tuner progress' });
          return;
        }
        await navigator.clipboard.writeText(text);
        TT.app.toast('No share sheet here — the summary was copied instead.');
      } catch (e) { TT.app.toast('Share cancelled.'); }
    });
    document.getElementById('backup-export').addEventListener('click', () => S.exportBackup());
    document.getElementById('backup-snapshot').addEventListener('click', () => {
      TT.store.snapshot('manual');
      renderStorage();
      TT.app.toast('Snapshot saved — you now have a restore point.');
    });
    const fileInput = document.getElementById('backup-file');
    document.getElementById('backup-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) S.importBackup(fileInput.files[0]); });
    document.getElementById('backup-wipe').addEventListener('click', () => {
      if (!confirm('Erase ALL local Trill Tuner data (settings, practice history, lessons, rigs)? This cannot be undone unless you have a backup.')) return;
      TT.store.wipe();
      TT.app.toast('All local data erased. Reloading…');
      setTimeout(() => location.reload(), 800);
    });

    S.readSharedFromUrl();
    TT.store.refreshStorage().then(renderStorage);
  };

  S.VERSION = VERSION;
  /* exposed so a shared code can be encoded/decoded outside the UI as well
   * (the test suite round-trips a link through these) */
  S.encodeProgress = encodeProgress;
  S.decodeProgress = decodeProgress;
  S.applyShared = function (data) { renderShared(data); };
  S.BADGES = BADGES;

  window.TT = window.TT || {};
  window.TT.share = S;
})();
