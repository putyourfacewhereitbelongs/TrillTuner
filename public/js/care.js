/* Trill Tuner — Care tools: string age & breakage tracker, step-by-step
 * intonation helper (open vs 12th fret), room environment watch. */
(function () {
  'use strict';
  const N = window.TT.notes;
  const C = {};
  let els = {};

  /* ===================== string health ===================== */
  function strData() { return TT.store.get('strings', {}); }

  function playMinutesSince(ts) {
    const days = TT.store.get('practice', {});
    let mins = 0;
    Object.keys(days).forEach(k => {
      const d = new Date(k + 'T12:00:00');
      if (!isNaN(d.getTime()) && d.getTime() >= ts - 864e5) mins += days[k] || 0;
    });
    return mins;
  }

  /* 0..1 wear: age (90-day curve) blended with play-time (60-hour curve). */
  C.wearLevel = function (changedAt, playMin) {
    const days = Math.max(0, (Date.now() - changedAt) / 864e5);
    const hours = Math.max(0, (playMin || 0) / 60);
    return Math.min(1, 0.55 * Math.min(1, days / 90) + 0.45 * Math.min(1, hours / 60));
  };

  function renderStrings() {
    const d = strData();
    if (!els.strStatus) return;
    if (!d.changedAt) {
      els.strStatus.textContent = 'Log a change to start';
      els.strStatus.className = 'str-status-big';
      els.strAge.textContent = '—';
      els.strWearBar.style.width = '0%';
      els.strWearBar.className = '';
      els.strMeta.textContent = 'Fresh strings ring brighter and hold tune longer — track yours below.';
      return;
    }
    const mins = playMinutesSince(d.changedAt);
    const wear = C.wearLevel(d.changedAt, mins);
    const days = Math.max(0, Math.round((Date.now() - d.changedAt) / 864e5));
    const hours = (mins / 60).toFixed(1);
    els.strAge.textContent = `${days} day${days === 1 ? '' : 's'} · ${hours} h played`;
    els.strWearBar.style.width = Math.round(wear * 100) + '%';
    let label, cls, meta;
    if (wear < 0.35) { label = 'Fresh 🎉'; cls = 'ok'; meta = 'Bright and stable — enjoy it.'; }
    else if (wear < 0.6) { label = 'Settling in 👍'; cls = 'ok'; meta = 'Past the stretchy phase, sounding consistent.'; }
    else if (wear < 0.8) { label = 'Wearing 😐'; cls = 'warn'; meta = 'Tone is darkening. Keep a spare set handy.'; }
    else { label = 'Replace soon ⚠️'; cls = 'bad'; meta = 'High breakage risk and dull tone — change them before your next session.'; }
    els.strStatus.textContent = label;
    els.strStatus.className = 'str-status-big ' + cls;
    els.strWearBar.className = cls;
    els.strMeta.textContent = (d.brand ? d.brand + ' — ' : '') + meta;

    // one nudge per day when strings are done
    if (wear >= 0.8) {
      const today = new Date().toDateString();
      if (d.notifiedOn !== today) {
        d.notifiedOn = today;
        TT.store.set('strings', d);
        TT.app.assist('Your strings are past their prime — swap them before they start fighting you (and snapping).', { toast: true });
      }
    }
  }

  /* ===================== intonation helper ===================== */
  let intRows = [];       // per string: {openC, c12, done}
  let intListening = false;

  function targets() {
    // adjusted targets (capo/sweetener aware) — but intonation compares open
    // vs octave on the SAME string, so offsets cancel out anyway.
    return TT.tuner.state.presetId ? TT.tunings.byId(TT.tuner.state.presetId).strings : [];
  }

  function renderInt() {
    const list = els.intList;
    if (!list) return;
    const strs = targets();
    if (!intRows.length || intRows.length !== strs.length) {
      intRows = strs.map(() => ({ openC: null, c12: null }));
    }
    list.innerHTML = '';
    strs.forEach((s, i) => {
      const p = N.prettyName(s.name);
      const row = intRows[i];
      const cell = (val) => val == null
        ? '<span class="int-empty">–</span>'
        : `<span class="int-c ${Math.abs(val) <= 5 ? 'ok' : ''}">${val > 0 ? '+' : ''}${val.toFixed(0)}¢</span>`;
      let verdict = '';
      if (row.openC != null && row.c12 != null) {
        const diff = row.c12 - row.openC;
        if (Math.abs(diff) <= 5) verdict = '<span class="int-v ok">good ✓</span>';
        else if (diff > 0) verdict = `<span class="int-v bad">sharp ${diff.toFixed(0)}¢ — saddle back</span>`;
        else verdict = `<span class="int-v bad">flat ${(-diff).toFixed(0)}¢ — saddle forward</span>`;
      }
      const div = document.createElement('div');
      div.className = 'int-row';
      div.innerHTML = `<span class="int-note">${p.label}</span>` +
        `<span class="int-slot">open ${cell(row.openC)}</span>` +
        `<span class="int-slot">12th ${cell(row.c12)}</span>` +
        `<span class="int-verdict">${verdict}</span>`;
      list.appendChild(div);
    });
    const done = intRows.filter(r => r.openC != null && r.c12 != null).length;
    const bad = intRows.filter(r => {
      if (r.openC == null || r.c12 == null) return false;
      const d = r.c12 - r.openC;
      return Math.abs(d) > 5;
    }).length;
    els.intSummary.textContent = done
      ? `${done}/${intRows.length} strings measured${bad ? ` — ${bad} need saddle work (do one saddle at a time, then re-check)` : ' — intonation looks solid ✓'}`
      : '';
  }

  /* Auto-listen: capture chunks straight from the mic, detect pitch, and
   * auto-fill open / 12th-fret slots for whichever string is stable. */
  async function listenLoop() {
    const stable = [];
    while (intListening && TT.audio.micState === 'on') {
      try {
        const buf = await TT.audio.captureBuffer(0.35);
        const work = buf.subarray(buf.length - 4096);
        const det = TT.yin.yin(work, TT.audio.ctx.sampleRate, 0.12);
        if (det && det.freq > 40) {
          stable.push(det.freq);
          if (stable.length > 6) stable.shift();
          if (stable.length >= 4) {
            const spread = 1200 * Math.log2(Math.max(...stable) / Math.min(...stable));
            if (spread < 4) {
              const f = stable[stable.length - 1];
              if (fillSlot(f)) { renderInt(); }
            }
          }
        } else {
          stable.length = 0;
        }
      } catch (e) {
        break; // mic went away
      }
    }
  }

  function fillSlot(f) {
    const strs = targets();
    const a4 = TT.tuner.state.a4;
    let best = null;
    strs.forEach((s, i) => {
      const openF = N.midiToFreq(s.midi, a4);
      const opts = [
        { slot: 'openC', f: openF },
        { slot: 'c12', f: openF * 2 }
      ];
      opts.forEach(o => {
        const c = 1200 * Math.log2(f / o.f);
        if (Math.abs(c) <= 60 && (!best || Math.abs(c) < Math.abs(best.c))) {
          best = { i: i, slot: o.slot, c: c };
        }
      });
    });
    if (!best) return false;
    const row = intRows[best.i];
    if (!row) return false;
    if (row[best.slot] != null) return false;   // already filled
    // sanity: 12th must be higher than open on the same string
    if (best.slot === 'c12' && row.openC != null) {
      const cOpen = row.openC;
      void cOpen;
    }
    row[best.slot] = best.c;
    const p = N.prettyName(strs[best.i].name);
    TT.app.assist(`Intonation: captured ${best.slot === 'openC' ? 'open' : '12th-fret'} ${p.label} at ${best.c > 0 ? '+' : ''}${best.c.toFixed(0)}¢.`);
    return true;
  }

  function toggleListen() {
    if (intListening) {
      intListening = false;
      els.btnInt.textContent = '▶ Auto-listen';
      els.btnInt.classList.remove('stop');
      return;
    }
    if (TT.audio.micState !== 'on') {
      TT.app.assist('The intonation helper needs the mic — start it from the tuner view first.', { toast: true });
      return;
    }
    intListening = true;
    els.btnInt.textContent = '⏸ Listening…';
    els.btnInt.classList.add('stop');
    TT.app.assist('Intonation auto-listen on. Play each string open, then at the 12th fret — I\'ll fill the table as I hear them.');
    listenLoop().then(() => {
      intListening = false;
      els.btnInt.textContent = '▶ Auto-listen';
      els.btnInt.classList.remove('stop');
    });
  }

  /* ===================== environment watch ===================== */
  function envData() { return TT.store.get('env', {}); }

  function renderEnv() {
    if (!els.envBadge) return;
    const d = envData();
    const t = d.temp == null ? null : +d.temp;
    const h = d.hum == null ? null : +d.hum;
    if (t == null && h == null) {
      els.envBadge.textContent = '— tell me your room';
      els.envBadge.className = 'env-badge';
      els.envAdvice.textContent = 'Wood breathes: keep a solid-top acoustic near 45–55% humidity. Big swings in temp or humidity pull your guitar out of tune — and can crack the top.';
      return;
    }
    const dry = h != null && h < 40;
    const wet = h != null && h > 60;
    const cold = t != null && t < 55;
    const hot = t != null && t > 85;
    let cls = 'ok', label = 'Safe zone ✓', advice = 'Conditions look guitar-friendly. Retune after moving between rooms and you\'re golden.';
    if (dry || cold) {
      cls = 'warn';
      label = dry ? 'Too dry ⚠️' : 'Cold room ⚠️';
      advice = dry
        ? 'Low humidity shrinks the wood: strings sit sharp, frets can sprout, and the top can crack. Use a case humidifier and aim for 45–55%.'
        : 'Cold makes strings read sharp and stiffens the top. Let the guitar acclimate in its case when moving between temperatures.';
    } else if (wet || hot) {
      cls = 'warn';
      label = wet ? 'Too humid ⚠️' : 'Hot room ⚠️';
      advice = wet
        ? 'High humidity swells the top: pitch drifts flat and the tone gets tubby. A room dehumidifier or silica packs in the case help.'
        : 'Heat loosens glue and shifts pitch. Keep the guitar out of direct sun and hot cars — always.';
    }
    els.envBadge.textContent = label;
    els.envBadge.className = 'env-badge ' + cls;
    els.envAdvice.textContent = advice +
      (t != null ? ` (${t}°F` : ' (') + (h != null ? `, ${h}% RH)` : ')');
  }

  /* ===================== init / render ===================== */
  C.render = function () { renderStrings(); renderInt(); renderEnv(); };

  C.init = function () {
    els = {
      strStatus: document.getElementById('str-status'),
      strAge: document.getElementById('str-age'),
      strWearBar: document.getElementById('str-wear-bar'),
      strMeta: document.getElementById('str-meta'),
      strBrand: document.getElementById('str-brand'),
      strChangedBtn: document.getElementById('str-changed-btn'),
      intList: document.getElementById('int-list'),
      btnInt: document.getElementById('btn-int'),
      btnIntReset: document.getElementById('btn-int-reset'),
      intSummary: document.getElementById('int-summary'),
      envBadge: document.getElementById('env-badge'),
      envTemp: document.getElementById('env-temp'),
      envHum: document.getElementById('env-hum'),
      envAdvice: document.getElementById('env-advice')
    };

    const d = strData();
    if (d.brand) els.strBrand.value = d.brand;
    els.strBrand.addEventListener('change', () => {
      const dd = strData();
      dd.brand = els.strBrand.value.trim();
      TT.store.set('strings', dd);
      renderStrings();
    });
    els.strChangedBtn.addEventListener('click', () => {
      const dd = strData();
      dd.changedAt = Date.now();
      dd.brand = els.strBrand.value.trim();
      delete dd.notifiedOn;
      TT.store.set('strings', dd);
      renderStrings();
      TT.app.assist('String change logged — the wear meter starts fresh. 🎸', { toast: true });
    });

    els.btnInt.addEventListener('click', toggleListen);
    els.btnIntReset.addEventListener('click', () => {
      intRows = [];
      renderInt();
      TT.app.assist('Intonation table cleared.');
    });

    const env = envData();
    if (env.temp != null) els.envTemp.value = env.temp;
    if (env.hum != null) els.envHum.value = env.hum;
    els.envTemp.addEventListener('input', () => {
      const dd = envData();
      dd.temp = els.envTemp.value === '' ? null : +els.envTemp.value;
      TT.store.set('env', dd);
      renderEnv();
    });
    els.envHum.addEventListener('input', () => {
      const dd = envData();
      dd.hum = els.envHum.value === '' ? null : +els.envHum.value;
      TT.store.set('env', dd);
      renderEnv();
    });

    renderStrings();
    renderInt();
    renderEnv();
  };

  window.TT = window.TT || {};
  window.TT.care = C;
})();
