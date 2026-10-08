/* Trill Guitar — Tuner controller: detection loop, string auto-detect, in-tune locking,
 * auto-advance, octave correction, preset hints, waveform + strobe displays,
 * polyphonic strum check, sweetened tunings, capo mode, gig mode, overtone panel. */
(function () {
  'use strict';
  const N = window.MG.notes;

  const T = {
    state: {
      presetId: 'standard', mode: 'acoustic', a4: 440,
      autoDetect: true, autoAdvance: true, tolerance: 5,
      display: 'wave',               // 'wave' | 'strobe'
      sweetener: 'equal',            // sweetened-tuning id
      customOffsets: [0, 0, 0, 0, 0, 0],
      capo: 0,                       // 0 = no capo
      smartFilter: false,            // band-limit analysis feed 65–1600 Hz
      settle: true,                  // skip the sharp "pluck spike" after attacks
      active: -1, manualUntil: 0, tuned: [],
      freq: 0, cents: null, inTune: false, signal: false
    }
  };

  let els = {};
  let guitarApi = null;
  let raf = 0, running = false, lastAnalysis = 0, lastFrameTs = 0, frameCount = 0;
  let current = null, bassMode = false, view = []; // view = capo/sweetener-adjusted strings
  let gate = 0.006, calibUntil = 0, calibSamples = null;
  let history = [];
  let goodSince = 0, goodIdx = -1;
  let unmatched = [], suggested = {};
  let smoothPeak = 0.02;
  let lastOctLog = 0;
  let strobePhase = 0, gigPhase = 0, gigLastText = 0;
  let slowRms = 0, transientAt = -1e9;
  let strumShown = false, strumHideTimer = 0;
  let lastToneDraw = 0;

  /* ---------- helpers ---------- */
  function base() { return current.strings; }
  function strings() { return view; }           // adjusted targets (capo + sweetener)
  function numOf(i) { return view.length - i; }
  function labelOf(i) { return N.prettyName(view[i].name).label; }

  function saveSettings() {
    MG.store.set('settings', Object.assign(MG.store.get('settings', {}), {
      presetId: T.state.presetId, mode: T.state.mode, a4: T.state.a4,
      autoDetect: T.state.autoDetect, autoAdvance: T.state.autoAdvance, tolerance: T.state.tolerance,
      display: T.state.display, sweetener: T.state.sweetener, customOffsets: T.state.customOffsets.slice(),
      capo: T.state.capo, smartFilter: T.state.smartFilter, settle: T.state.settle
    }));
  }
  function assist(msg, opts) { if (MG.app) MG.app.assist(msg, opts); }

  function nameForMidi(m, preferFlat) {
    const pc = ((m % 12) + 12) % 12;
    const oct = Math.floor(m / 12) - 1;
    return (preferFlat ? N.FLAT[pc] : N.SHARP[pc]) + oct;
  }

  /* Rebuild the target list: preset + capo shift + sweetener offsets + A4. */
  function rebuildTargets() {
    const capo = T.state.capo;
    view = base().map((s, i) => {
      const preferFlat = /b|♭/.test(s.name);
      const midi = s.midi + capo;
      const off = MG.sweeteners.offsetFor(T.state.sweetener, T.state.customOffsets, i);
      const freq = N.midiToFreq(midi, T.state.a4) * Math.pow(2, off / 1200);
      return {
        name: capo ? nameForMidi(midi, preferFlat) : s.name,
        midi: midi, baseMidi: s.midi, off: off, freq: freq
      };
    });
    bassMode = Math.min.apply(null, view.map(s => s.freq)) < 52;
  }
  function computeFreqs() { rebuildTargets(); } // legacy name (A4 handler)

  function resetProgress() {
    T.state.tuned = view.map(() => false);
    T.state.active = -1;
    history = []; unmatched = []; goodSince = 0; lastAnnounced = -1;
  }

  /* Smart retune route: order strings by biggest change so neck tension
   * shifts evenly when moving between tunings. */
  function transitionHint(prev, next) {
    if (!prev || prev.id === next.id) return null;
    const a = prev.strings, b = next.strings;
    if (a.length !== b.length) return null;
    const moves = [];
    for (let i = 0; i < a.length; i++) {
      const d = b[i].midi - a[i].midi;
      if (d !== 0) moves.push({ from: N.prettyName(a[i].name).label, to: N.prettyName(b[i].name).label, d: d });
    }
    if (!moves.length) return null;
    moves.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    const order = moves.map(m => `${m.from}→${m.to} (${m.d > 0 ? '+' : ''}${m.d})`).join(', ');
    return `Retune route — biggest moves first to keep neck tension even: ${order}. Approach each pitch from below so the pegs settle.`;
  }

  /* ---------- octave correction (autonomous) ---------- */
  function nearestRaw(f, arr) {
    let best = null;
    arr.forEach((s, i) => {
      const c = N.centsOff(f, s.freq);
      if (!best || Math.abs(c) < Math.abs(best.cents)) best = { idx: i, cents: c };
    });
    return best;
  }
  function correctOctave(f) {
    const best = nearestRaw(f, view);
    if (best && Math.abs(best.cents) <= 60) return f;
    // Pitch detectors octave-double (hear overtones), they rarely halve — so we
    // only ever correct DOWNWARD to avoid false "in tune" matches on other notes.
    const mults = [0.5, 1 / 3, 0.25];
    for (let k = 0; k < mults.length; k++) {
      const cand = nearestRaw(f * mults[k], view);
      if (cand && Math.abs(cand.cents) <= 45) {
        const now = Date.now();
        if (now - lastOctLog > 4000) {
          assist('Octave corrected — I heard a strong overtone and locked onto the true fundamental.');
          lastOctLog = now;
        }
        return f * mults[k];
      }
    }
    return f;
  }
  function medianFreq(latest) {
    if (history.length < 3) return latest;
    const sorted = history.slice().sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    if (Math.abs(1200 * Math.log2(latest / med)) > 50) return latest;
    return med;
  }

  /* ---------- preset suggestion (autonomous) ---------- */
  function trackSuggestion(freq) {
    if (T.state.capo) return; // pitches are shifted; suggestions would be wrong
    const note = N.freqToNote(freq, T.state.a4);
    const now = Date.now();
    unmatched.push({ midi: note.midi, t: now });
    unmatched = unmatched.filter(u => now - u.t < 15000).slice(-8);
    const counts = {};
    unmatched.forEach(u => { counts[u.midi] = (counts[u.midi] || 0) + 1; });
    const keys = Object.keys(counts).map(Number);
    const strong = keys.filter(m => counts[m] >= 2);
    const solo = keys.filter(m => counts[m] >= 4);
    if (!strong.length && !solo.length) return;
    const interesting = strong.length ? strong : solo;
    const cur = new Set(view.map(s => s.baseMidi));
    if (interesting.some(m => cur.has(m))) return; // pitch also fits current tuning — nothing to suggest
    for (const p of MG.tunings.PRESETS) {
      if (p.id === T.state.presetId || suggested[p.id]) continue;
      const pset = new Set(p.strings.map(s => s.midi));
      const hits = interesting.filter(m => pset.has(m)).length;
      if (hits >= 2 || (hits >= 1 && strong.length >= 2)) {
        suggested[p.id] = true;
        showSuggest(p);
        return;
      }
    }
  }
  function showSuggest(p) {
    const box = els.suggestBox;
    box.hidden = false;
    box.innerHTML = '';
    const chip = document.createElement('button');
    chip.className = 'suggest-chip';
    chip.innerHTML = `<span>🎵 Sounds like <b>${p.name}</b> — switch?</span>`;
    chip.addEventListener('click', () => {
      box.hidden = true;
      T.setPreset(p.id);
      assist(`Switched to ${p.name} for you.`);
    });
    const dismiss = document.createElement('button');
    dismiss.className = 'suggest-x';
    dismiss.textContent = '×';
    dismiss.title = 'Dismiss';
    dismiss.addEventListener('click', () => { box.hidden = true; });
    box.appendChild(chip); box.appendChild(dismiss);
    assist(`Those pitches fit ${p.name}. Tap the chip to switch.`, { toast: true });
  }

  /* ---------- UI building ---------- */
  function buildPresetSelect() {
    const sel = els.selectTuning;
    sel.innerHTML = '';
    MG.tunings.categories().forEach(cat => {
      const og = document.createElement('optgroup');
      og.label = cat;
      MG.tunings.PRESETS.filter(p => p.cat === cat).forEach(p => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = MG.tunings.label(p);
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  function buildChips() {
    const wrap = els.stringChips;
    wrap.innerHTML = '';
    view.forEach((s, i) => {
      const p = N.prettyName(s.name);
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.dataset.i = i;
      chip.innerHTML =
        `<button class="chip-main" data-i="${i}" title="Select string ${numOf(i)} manually">` +
        `<span class="chip-num">${numOf(i)}</span><span class="chip-note">${p.letter}</span></button>` +
        `<button class="chip-play" data-i="${i}" title="Play reference tone ${p.label}">▶</button>`;
      if (s.off) chip.title = `Sweetener offset ${s.off > 0 ? '+' : ''}${s.off}¢`;
      wrap.appendChild(chip);
    });
    wrap.querySelectorAll('.chip-main').forEach(b => b.addEventListener('click', () => T.manualSelect(+b.dataset.i)));
    wrap.querySelectorAll('.chip-play').forEach(b => b.addEventListener('click', () => T.playReference(+b.dataset.i)));
    updateChips();
  }

  function buildGuitar() {
    guitarApi = MG.guitar.build(els.guitarBox, {
      kind: T.state.mode,
      capo: T.state.capo,
      strings: view.map(s => s.name)
    });
  }

  function updateChips() {
    els.stringChips.querySelectorAll('.chip').forEach(chip => {
      const i = +chip.dataset.i;
      chip.classList.toggle('active', i === T.state.active);
      chip.classList.toggle('tuned', !!T.state.tuned[i]);
      const note = chip.querySelector('.chip-note');
      note.textContent = N.prettyName(view[i].name).letter +
        (T.state.tuned[i] ? ' ✓' : '');
    });
  }

  /* ---------- polyphonic strum check ---------- */
  function renderStrum(res) {
    const rows = els.strumRows;
    rows.innerHTML = '';
    let inTuneCount = 0, problems = [];
    res.forEach((r, i) => {
      const p = N.prettyName(view[i].name);
      const row = document.createElement('div');
      let cls = 'miss', txt = 'not heard';
      if (r.found && Math.abs(r.cents) <= T.state.tolerance) {
        cls = 'ok'; txt = 'in tune ✓';
        inTuneCount++;
        T.state.tuned[i] = true;
      } else if (r.found && r.cents < 0) {
        cls = 'flat'; txt = `▼ ${r.cents.toFixed(0)}¢ flat`;
        problems.push({ i: i, c: r.cents });
      } else if (r.found) {
        cls = 'sharp'; txt = `▲ +${r.cents.toFixed(0)}¢ sharp`;
        problems.push({ i: i, c: r.cents });
      } else if (r.masked) {
        txt = 'masked by low string';
      }
      row.className = 'strum-row ' + cls;
      row.innerHTML = `<span class="strum-note">${p.label}</span>` +
        `<span class="strum-num">str ${numOf(i)}</span>` +
        `<span class="strum-verdict">${txt}</span>`;
      rows.appendChild(row);
    });
    els.strumTitle.textContent = problems.length
      ? `${inTuneCount}/${view.length} in tune — fix the red ones`
      : (inTuneCount ? `All ${inTuneCount} strings heard are in tune ✓` : 'No strings heard — strum again');
    // highlight the guitar neck per-string
    strumShown = true;
    if (guitarApi) guitarApi.update({
      active: -1, tuned: T.state.tuned, cents: null, signal: false,
      poly: res.map(r => ({ found: r.found, cents: r.cents, inTune: r.found && Math.abs(r.cents) <= T.state.tolerance }))
    });
    updateChips();
    if (problems.length) {
      problems.sort((a, b) => Math.abs(b.c) - Math.abs(a.c));
      const worst = problems[0];
      assist(`Strum check: ${inTuneCount} in tune. Worst offender is ${labelOf(worst.i)} at ${worst.c.toFixed(0)}¢ — fix that one first, then strum again.`, { toast: true });
    } else if (inTuneCount) {
      assist('Strum check: everything I heard is in tune 🤘', { toast: true });
    } else {
      assist('Strum check heard nothing — make sure the mic is on and strum firmly.');
    }
    clearTimeout(strumHideTimer);
    strumHideTimer = setTimeout(hideStrum, 12000);
  }
  function hideStrum() {
    clearTimeout(strumHideTimer);
    els.strumPanel.hidden = true;
    strumShown = false;
    if (guitarApi) guitarApi.update({ active: T.state.active, tuned: T.state.tuned, cents: T.state.cents, signal: T.state.signal });
  }

  T.strumCheck = async function () {
    if (MG.audio.micState !== 'on') {
      assist('Strum check needs the mic — hit “Start listening” first.', { toast: true });
      return;
    }
    const btn = els.btnStrum;
    btn.disabled = true;
    els.strumPanel.hidden = false;
    strumShown = true;
    els.strumTitle.textContent = 'Listening — strum all strings now! 🎸';
    els.strumRows.innerHTML = view.map(s => {
      const p = N.prettyName(s.name);
      return `<div class="strum-row wait"><span class="strum-note">${p.label}</span><span class="strum-num">···</span><span class="strum-verdict">listening</span></div>`;
    }).join('');
    try {
      const buf = await MG.audio.captureBuffer(1.4);
      const res = MG.poly.analyzeStrum(buf, MG.audio.ctx.sampleRate, view.map(s => ({ freq: s.freq })));
      renderStrum(res);
    } catch (e) {
      hideStrum();
      assist('Strum check failed: ' + (e && e.message ? e.message : 'microphone unavailable'), { toast: true });
    }
    btn.disabled = false;
  };

  /* ---------- tuning guide ---------- */
  T.showGuide = function () {
    const p = MG.tunings.byId(T.state.presetId);
    const g = MG.tunings.guideFor(p.id);
    els.guideTitle.textContent = p.name;
    els.guideNotes.textContent = view.map(s => N.prettyName(s.name).label).join('   ·   ');
    els.guideDesc.textContent = g.desc || '';
    els.guideSongs.innerHTML = (g.songs || []).map(s => `<li>🎵 ${s}</li>`).join('');
    els.guideOverlay.hidden = false;
  };

  /* ---------- gig mode ---------- */
  T.toggleGig = function (force) {
    const on = force != null ? !!force : !document.body.classList.contains('gig-on');
    document.body.classList.toggle('gig-on', on);
    els.gigOverlay.hidden = !on;
    if (on) assist('Gig mode on — giant high-contrast display. Esc or ✕ to exit.');
  };

  function drawGig(dt) {
    const cv = els.gigDisc;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(10, Math.floor(cv.clientWidth * dpr));
    const ch = Math.max(10, Math.floor(cv.clientHeight * dpr));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d');
    drawStrobeDisc(g, cw, ch, dt, 'gig');

    const now = performance.now();
    if (now - gigLastText > 110) {
      gigLastText = now;
      const cents = T.state.cents;
      els.gigNote.textContent = T.state.active >= 0 ? N.prettyName(view[T.state.active].name).letter : (T.state.signal ? '·' : '–');
      els.gigNote.style.color = T.state.inTune ? '#2bff88' : (T.state.signal ? '#ff5252' : '#3a4152');
      els.gigCents.textContent = cents != null ? (cents > 0 ? '+' : '') + cents.toFixed(0) + '¢' : '';
      els.gigStatus.textContent = cents == null ? 'listening…'
        : T.state.inTune ? 'IN TUNE' : (cents < 0 ? 'FLAT — tighten ▲' : 'SHARP — loosen ▼');
      els.gigStatus.style.color = T.state.inTune ? '#2bff88' : (cents != null ? '#ff5252' : '#3a4152');
    }
  }

  /* ---------- main loop ---------- */
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = lastFrameTs ? Math.min(0.1, (now - lastFrameTs) / 1000) : 0.016;
    lastFrameTs = now;
    frameCount++;
    const buf = MG.audio.sample();
    drawDisplay(buf, dt);
    if (document.body.classList.contains('gig-on')) drawGig(dt);
    if (!buf) return;

    const rms = MG.audio.level;
    updateSignalMeter(rms);

    // noise-floor calibration window
    if (calibSamples) {
      if (now < calibUntil) {
        calibSamples.push(rms);
        els.tuneStatus.textContent = 'Calibrating noise floor…';
        return;
      }
      const avg = calibSamples.reduce((a, b) => a + b, 0) / Math.max(1, calibSamples.length);
      gate = Math.min(0.05, Math.max(0.004, avg * 3));
      calibSamples = null;
      assist(`Noise floor calibrated (${(20 * Math.log10(gate)).toFixed(0)} dB) — listening for your guitar…`);
    }

    if (now - lastAnalysis < 33) return; // ~30 Hz analysis
    lastAnalysis = now;

    // attack/decay "settle" filter: a freshly plucked string rings sharp for a
    // moment — hold off analysis so the needle doesn't bounce on the spike
    slowRms = Math.max(slowRms * 0.93, 0.0002);
    if (rms > slowRms * 2.2 && rms > 0.008) transientAt = now;
    slowRms = Math.max(slowRms, rms);
    const settling = T.state.settle && now - transientAt < 260;
    if (settling && rms >= gate) {
      els.tuneStatus.textContent = 'Attack — letting the pitch settle…';
      els.tuneStatus.className = 'tune-status';
      return;
    }

    // ---- pitch detection ----
    let det = null;
    if (rms >= gate) {
      let work, sr;
      if (bassMode) { work = MG.yin.downsample2(buf); sr = MG.audio.ctx.sampleRate / 2; }
      else { work = buf.subarray(buf.length - 2048); sr = MG.audio.ctx.sampleRate; }
      det = MG.yin.yin(work, sr, T.state.mode === 'acoustic' ? 0.15 : 0.10);
    }

    let freq = 0;
    if (det) {
      freq = correctOctave(det.freq);
      history.push(freq);
      if (history.length > 7) history.shift();
      freq = medianFreq(freq);
    } else {
      history.length = 0;
    }
    T.state.freq = freq;
    T.state.signal = !!freq;

    // ---- string selection ----
    let nearest = null;
    if (freq) {
      nearest = nearestRaw(freq, view);
      if (Math.abs(nearest.cents) > 140) nearest = null;
    }

    const manual = T.state.manualUntil > now;
    let targetIdx = -1, cents = null;

    if (!T.state.autoDetect) {
      targetIdx = T.state.active >= 0 ? T.state.active : 0;
      cents = freq ? N.centsOff(freq, view[targetIdx].freq) : null;
    } else if (manual) {
      targetIdx = T.state.active;
      cents = freq ? N.centsOff(freq, view[targetIdx].freq) : null;
    } else if (nearest) {
      targetIdx = nearest.idx;
      cents = nearest.cents;
      T.state.active = nearest.idx;
    } else {
      T.state.active = -1;
      cents = null;
      if (freq) trackSuggestion(freq);
    }

    // announce newly detected string (autonomous narration)
    if (nearest && nearest.idx !== lastAnnounced) {
      lastAnnounced = nearest.idx;
      const c = Math.round(nearest.cents);
      const dir = c === 0 ? 'right on' : c < 0 ? 'a touch flat' : 'a touch sharp';
      assist(`Heard string ${numOf(nearest.idx)} (${labelOf(nearest.idx)}) — ${dir}${c !== 0 ? ' (' + (c > 0 ? '+' : '') + c + '¢)' : ''}.`);
    }
    if (!nearest && lastAnnounced !== -1 && !freq) lastAnnounced = -1;

    T.state.cents = cents;

    // ---- in-tune locking ----
    const inTune = cents != null && Math.abs(cents) <= T.state.tolerance && rms >= gate;
    T.state.inTune = inTune;
    if (inTune && targetIdx >= 0) {
      if (!goodSince || goodIdx !== targetIdx) { goodSince = now; goodIdx = targetIdx; }
      if (now - goodSince >= 700 && !T.state.tuned[targetIdx]) lockString(targetIdx);
    } else {
      goodSince = 0; goodIdx = -1;
    }

    updateReadout(freq, cents, inTune, targetIdx, rms);

    // overtone panel ~12 Hz
    if (now - lastToneDraw > 80) {
      lastToneDraw = now;
      drawTone(freq);
    }
  }
  let lastAnnounced = -1;

  function lockString(i) {
    T.state.tuned[i] = true;
    goodSince = 0;
    MG.audio.chime('ok');
    assist(`String ${numOf(i)} (${labelOf(i)}) locked in tune ✓`);
    if (T.state.autoAdvance && T.state.autoDetect) {
      const next = nextUntuned(i);
      if (next == null) {
        assist('All strings in tune — ready to rock! 🤘', { toast: true });
        celebrate();
      } else {
        setTimeout(() => {
          if (T.state.manualUntil > Date.now()) return; // user took manual control meanwhile
          if (!T.state.tuned[next]) {
            T.state.active = next;
            assist(`Auto-advanced to string ${numOf(next)} (${labelOf(next)}) — pluck it when ready.`);
          }
        }, 650);
      }
    }
    updateChips();
  }
  function nextUntuned(from) {
    const n = view.length;
    for (let k = 1; k <= n; k++) { const j = (from + k) % n; if (!T.state.tuned[j]) return j; }
    for (let j = 0; j < n; j++) { if (!T.state.tuned[j]) return j; }
    return null;
  }
  function celebrate() {
    els.waveCard.classList.remove('celebrate');
    void els.waveCard.offsetWidth; // restart animation
    els.waveCard.classList.add('celebrate');
  }

  /* ---------- readout ---------- */
  function closestHint(freq) {
    const best = nearestRaw(freq, view);
    if (!best || Math.abs(best.cents) > 700) return '';
    return `closest: ${labelOf(best.idx)} (${best.cents > 0 ? '+' : ''}${Math.round(best.cents)}¢)`;
  }
  function updateReadout(freq, cents, inTune, targetIdx, rms) {
    const note = freq ? N.freqToNote(freq, T.state.a4) : null;
    els.noteDetected.textContent = note ? note.letter : '–';
    els.noteDetectedSub.textContent = note ? `${note.label} · ${freq.toFixed(1)} Hz` : 'listening…';

    if (targetIdx >= 0) {
      const p = N.prettyName(view[targetIdx].name);
      els.noteTarget.textContent = p.letter;
      els.noteTargetSub.textContent = `String ${numOf(targetIdx)} · ${p.label}` +
        (view[targetIdx].off ? ` · ${view[targetIdx].off > 0 ? '+' : ''}${view[targetIdx].off}¢ sweet` : '');
      els.activeStringTitle.textContent = `String ${numOf(targetIdx)} — ${p.label}`;
    } else {
      els.noteTarget.textContent = '–';
      els.noteTargetSub.textContent = T.state.autoDetect ? 'auto-detect' : 'manual';
      els.activeStringTitle.textContent = T.state.autoDetect ? 'Auto-detect' : 'Manual mode';
    }

    if (cents != null) {
      els.centsVal.textContent = (cents > 0 ? '+' : '') + cents.toFixed(0) + '¢';
      els.centsVal.className = 'cents ' + (inTune ? 'ok' : (cents < 0 ? 'flat' : 'sharp'));
      els.tuneStatus.textContent = inTune ? 'In tune ✓' : (cents < 0 ? 'Tune up ▲ tighten the peg' : 'Tune down ▼ loosen the peg');
      els.tuneStatus.className = 'tune-status ' + (inTune ? 'ok' : cents < 0 ? 'flat' : 'sharp');
    } else {
      els.centsVal.textContent = '–¢';
      els.centsVal.className = 'cents';
      const hint = freq ? ('No string match — ' + closestHint(freq)) : (rms > 0.0004 ? 'Listening… play a string and let it ring' : 'Quiet — play louder or move closer to the mic');
      els.tuneStatus.textContent = hint;
      els.tuneStatus.className = 'tune-status';
    }

    els.waveCard.classList.toggle('in-tune', inTune);
    els.waveCard.classList.toggle('out-tune', cents != null && !inTune);
    els.waveCard.classList.toggle('no-signal', cents == null);

    updateChips();
    if (guitarApi && !strumShown) guitarApi.update({ active: T.state.active, tuned: T.state.tuned, cents: cents, signal: !!freq });
  }

  function updateSignalMeter(rms) {
    const pct = Math.max(0, Math.min(100, ((20 * Math.log10(rms || 1e-8)) + 70) / 60 * 100));
    const bar = els.signalMeter.querySelector('i');
    if (bar) bar.style.width = pct.toFixed(0) + '%';
    els.signalMeter.classList.toggle('quiet', rms < gate);
  }

  /* ---------- displays: waveform / strobe ---------- */
  function drawDisplay(buf, dt) {
    if (T.state.display === 'strobe') drawStrobe(buf, dt);
    else drawWave(buf);
  }

  function drawWave(buf) {
    const cv = els.waveCanvas;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(10, Math.floor(cv.clientWidth * dpr));
    const ch = Math.max(10, Math.floor(cv.clientHeight * dpr));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height, mid = H / 2;
    g.clearRect(0, 0, W, H);

    // faint center axis
    g.strokeStyle = 'rgba(255,255,255,.08)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, mid); g.lineTo(W, mid); g.stroke();

    if (!buf) return;

    // auto-scaled amplitude (autonomous gain)
    let peak = 0;
    for (let i = 0; i < buf.length; i += 8) peak = Math.max(peak, Math.abs(buf[i]));
    smoothPeak = Math.max(peak, smoothPeak * 0.9, 0.02);
    const scale = Math.min((H * 0.42) / smoothPeak, H * 30);

    // color: red until in tune, green when in tune
    let color, glow = 0;
    if (T.state.signal) {
      if (T.state.inTune) { color = '#22c55e'; glow = 18 * dpr; }
      else {
        // stay red while out of tune; slightly brighter as it approaches
        const near = T.state.cents != null ? Math.max(0, 1 - Math.abs(T.state.cents) / 50) : 0;
        const l = 42 + near * 12;
        color = `hsl(2 82% ${l.toFixed(0)}%)`;
      }
    } else {
      color = '#5b6472';
    }

    const slice = buf.subarray(Math.max(0, buf.length - 1400));
    const step = Math.max(1, Math.floor(slice.length / W));
    g.beginPath();
    for (let x = 0; x < W; x++) {
      const idx = Math.min(slice.length - 1, Math.floor(x / W * slice.length));
      let v = 0;
      for (let k = 0; k < step; k += 4) v += slice[Math.min(slice.length - 1, idx + k)] || 0;
      v = v / Math.max(1, step / 4);
      const y = mid - Math.max(-1, Math.min(1, v)) * scale;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokeStyle = color;
    g.lineWidth = 2.4 * dpr;
    g.lineJoin = 'round';
    if (glow) { g.shadowBlur = glow; g.shadowColor = color; }
    g.stroke();
    g.shadowBlur = 0;
  }

  /* Strobe: a rotating disc whose spin speed/direction mirrors the cent
   * error. Pattern standing still = dead in tune (professional strobe
   * tuners work exactly this way). */
  function drawStrobe(buf, dt) {
    const cv = els.waveCanvas;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(10, Math.floor(cv.clientWidth * dpr));
    const ch = Math.max(10, Math.floor(cv.clientHeight * dpr));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    drawStrobeDisc(g, cv.width, cv.height, dt, 'main');
  }

  function drawStrobeDisc(g, W, H, dt, which) {
    const cents = T.state.cents;
    let speed = 0.04; // idle drift, rev/s
    if (T.state.signal && cents != null) speed = T.state.inTune ? 0 : Math.max(-7, Math.min(7, cents / 8));
    if (which === 'main') strobePhase += speed * dt * 2 * Math.PI;
    else gigPhase += speed * dt * 2 * Math.PI;
    const phase = which === 'main' ? strobePhase : gigPhase;

    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.40;
    const color = T.state.inTune ? '#22c55e' : (T.state.signal && cents != null ? '#ff5b5b' : '#5b6472');
    const dpr = window.devicePixelRatio || 1;

    // outer reference ring + fixed tick at 12 o'clock
    g.strokeStyle = 'rgba(255,255,255,.14)';
    g.lineWidth = 1 * dpr;
    g.beginPath(); g.arc(cx, cy, R + 10 * dpr, 0, 2 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath();
    g.moveTo(cx, cy - R - 4 * dpr);
    g.lineTo(cx - 5 * dpr, cy - R - 14 * dpr);
    g.lineTo(cx + 5 * dpr, cy - R - 14 * dpr);
    g.closePath(); g.fill();

    // rotating sectored disc
    g.save();
    g.translate(cx, cy);
    g.rotate(phase);
    const sectors = 12;
    for (let k = 0; k < sectors; k++) {
      const a0 = k * 2 * Math.PI / sectors;
      const a1 = a0 + (2 * Math.PI / sectors) * 0.52;
      g.beginPath(); g.moveTo(0, 0);
      g.arc(0, 0, R, a0, a1);
      g.closePath();
      g.fillStyle = k % 2 ? color : 'rgba(255,255,255,.05)';
      if (k % 2 && T.state.inTune) { g.shadowBlur = 14 * dpr; g.shadowColor = color; }
      g.fill();
      g.shadowBlur = 0;
    }
    // hub
    g.beginPath(); g.arc(0, 0, R * 0.16, 0, 2 * Math.PI);
    g.fillStyle = '#0a0d14'; g.fill();
    g.lineWidth = 2 * dpr; g.strokeStyle = color; g.stroke();
    g.restore();

    // direction hint when out of tune
    if (T.state.signal && cents != null && !T.state.inTune) {
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.font = `${11 * dpr}px sans-serif`;
      g.textAlign = 'center';
      g.fillText(cents < 0 ? '◀ rotates left — flat' : 'rotates right — sharp ▶', cx, cy + R + 26 * dpr);
    }
  }

  /* ---------- overtone / harmonic panel ---------- */
  function drawTone(freq) {
    const cv = els.toneCanvas;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(10, Math.floor(cv.clientWidth * dpr));
    const ch = Math.max(10, Math.floor(cv.clientHeight * dpr));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const db = MG.audio.freqData();
    const bars = 8;
    if (!db || !freq) {
      els.toneBright.textContent = '';
      return;
    }
    const sr = MG.audio.ctx.sampleRate;
    const bins = MG.audio.analyser.frequencyBinCount;
    const lin = [];
    for (let h = 1; h <= bars; h++) {
      const bin = Math.min(bins - 1, Math.round(freq * h / (sr / 2) * bins));
      lin[h] = Math.pow(10, db[bin] / 20);
    }
    const maxLin = Math.max(1e-9, ...lin.slice(1));
    const bw = W / bars;
    for (let h = 1; h <= bars; h++) {
      const v = lin[h] / maxLin;
      const bh = Math.max(2 * dpr, Math.pow(v, 0.5) * (H - 18 * dpr));
      g.fillStyle = h === 1 ? 'var(--accent)' : '#4a5468';
      g.fillStyle = h === 1 ? (T.state.mode === 'electric' ? '#38bdf8' : '#f0a43a') : '#4a5468';
      g.fillRect((h - 1) * bw + 3 * dpr, H - bh - 2 * dpr, bw - 6 * dpr, bh);
      g.fillStyle = 'rgba(255,255,255,.4)';
      g.font = `${9 * dpr}px sans-serif`;
      g.textAlign = 'center';
      g.fillText('H' + h, (h - 1) * bw + bw / 2, H - 1 * dpr);
    }
    const total = lin.slice(1).reduce((a, b) => a + b, 0) || 1;
    const upper = lin.slice(2).reduce((a, b) => a + b, 0);
    const bright = Math.round(upper / total * 100);
    const word = bright < 25 ? 'dark / warm' : bright < 55 ? 'balanced' : 'bright / zingy';
    els.toneBright.textContent = `brightness ${bright}% — ${word}`;
  }

  /* ---------- mic flow ---------- */
  function startLoop() {
    if (!running) { running = true; lastFrameTs = 0; raf = requestAnimationFrame(frame); }
  }
  function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  async function startMicFlow() {
    els.micError.hidden = true;
    els.btnMicStart.disabled = true;
    els.btnMicStart.textContent = 'Requesting microphone…';
    try {
      await MG.audio.startMic();
    } catch (e) {
      els.btnMicStart.disabled = false;
      els.btnMicStart.textContent = '🎤 Start listening';
      els.micError.hidden = false;
      els.micError.textContent = MG.audio.micError + '. If you\'re in a restricted preview frame, try "Open in a new tab". You can still tune by ear with the ▶ reference tones.';
      return;
    }
    MG.store.set('micGranted', true);
    els.micOverlay.hidden = true;
    history = []; unmatched = [];
    calibUntil = performance.now() + 1200;
    calibSamples = [];
    slowRms = 0; transientAt = -1e9;
    startLoop();
    assist('Mic live. Strum the low E string and I\'ll take it from there.');
  }

  function handleMicState(state) {
    const pill = document.getElementById('mic-pill');
    const dot = pill.querySelector('.dot');
    pill.classList.toggle('on', state === 'on');
    pill.classList.toggle('err', state === 'error');
    document.getElementById('mic-pill-text').textContent =
      state === 'on' ? 'Live' : state === 'requesting' ? 'Requesting…' : state === 'error' ? 'Mic blocked' : 'Mic off';
    if (state !== 'on') {
      stopLoop();
      els.micOverlay.hidden = false;
      els.btnMicStart.disabled = false;
      els.btnMicStart.textContent = '🎤 Start listening';
      dot && (dot.className = 'dot');
    }
    if (state === 'error') {
      els.micError.hidden = false;
      els.micError.textContent = MG.audio.micError + '. Tip: use "Open in a new tab", or tune by ear with the ▶ reference tones.';
    }
  }

  /* ---------- public API ---------- */
  T.init = function () {
    els = {
      guitarBox: document.getElementById('guitar-box'),
      activeStringTitle: document.getElementById('active-string-title'),
      signalMeter: document.getElementById('signal-meter'),
      noteDetected: document.getElementById('note-detected'),
      noteDetectedSub: document.getElementById('note-detected-sub'),
      noteTarget: document.getElementById('note-target'),
      noteTargetSub: document.getElementById('note-target-sub'),
      waveCanvas: document.getElementById('wave-canvas'),
      waveCard: document.querySelector('#view-tune .wave-card'),
      micOverlay: document.getElementById('mic-overlay'),
      btnMicStart: document.getElementById('btn-mic-start'),
      btnNewTab: document.getElementById('btn-newtab'),
      micError: document.getElementById('mic-error'),
      centsVal: document.getElementById('cents-val'),
      tuneStatus: document.getElementById('tune-status'),
      stringChips: document.getElementById('string-chips'),
      selectTuning: document.getElementById('select-tuning'),
      rangeA4: document.getElementById('range-a4'),
      a4Val: document.getElementById('a4-val'),
      chkAutodetect: document.getElementById('chk-autodetect'),
      chkAutoadvance: document.getElementById('chk-autoadvance'),
      selectTol: document.getElementById('select-tol'),
      btnResetTuned: document.getElementById('btn-reset-tuned'),
      btnHearAll: document.getElementById('btn-hear-all'),
      suggestBox: document.getElementById('suggest-box'),
      // advanced features
      segDisplay: document.getElementById('seg-display'),
      selectSweet: document.getElementById('select-sweet'),
      offRow: document.getElementById('off-row'),
      selectCapo: document.getElementById('select-capo'),
      capoHint: document.getElementById('capo-hint'),
      chkFilter: document.getElementById('chk-filter'),
      chkSettle: document.getElementById('chk-settle'),
      btnStrum: document.getElementById('btn-strum'),
      strumPanel: document.getElementById('strum-panel'),
      strumTitle: document.getElementById('strum-title'),
      strumRows: document.getElementById('strum-rows'),
      strumClose: document.getElementById('strum-close'),
      toneCanvas: document.getElementById('tone-canvas'),
      toneBright: document.getElementById('tone-bright'),
      btnGuide: document.getElementById('btn-guide'),
      guideOverlay: document.getElementById('guide-overlay'),
      guideTitle: document.getElementById('guide-title'),
      guideNotes: document.getElementById('guide-notes'),
      guideDesc: document.getElementById('guide-desc'),
      guideSongs: document.getElementById('guide-songs'),
      guideClose: document.getElementById('guide-close'),
      guideHear: document.getElementById('btn-guide-hear'),
      gigOverlay: document.getElementById('gig-overlay'),
      gigNote: document.getElementById('gig-note'),
      gigCents: document.getElementById('gig-cents'),
      gigStatus: document.getElementById('gig-status'),
      gigDisc: document.getElementById('gig-disc'),
      gigExit: document.getElementById('gig-exit')
    };

    const s = MG.store.get('settings', {});
    if (s.presetId && MG.tunings.byId(s.presetId).id === s.presetId) T.state.presetId = s.presetId;
    T.state.mode = s.mode === 'electric' ? 'electric' : 'acoustic';
    T.state.a4 = (s.a4 >= 415 && s.a4 <= 466) ? +s.a4 : 440;
    T.state.autoDetect = s.autoDetect !== false;
    T.state.autoAdvance = s.autoAdvance !== false;
    T.state.tolerance = [3, 5, 10].includes(+s.tolerance) ? +s.tolerance : 5;
    T.state.display = s.display === 'strobe' ? 'strobe' : 'wave';
    T.state.capo = (s.capo >= 0 && s.capo <= 7) ? +s.capo : 0;
    T.state.smartFilter = !!s.smartFilter;
    T.state.settle = s.settle !== false;
    if (MG.sweeteners.byId(s.sweetener).id === (s.sweetener || 'equal')) T.state.sweetener = s.sweetener || 'equal';
    if (Array.isArray(s.customOffsets) && s.customOffsets.length === 6) T.state.customOffsets = s.customOffsets.map(Number);

    buildPresetSelect();
    T.setPreset(T.state.presetId, { silent: true });

    els.selectTuning.value = T.state.presetId;
    els.selectTuning.addEventListener('change', () => T.setPreset(els.selectTuning.value));
    els.rangeA4.value = T.state.a4;
    els.a4Val.textContent = T.state.a4;
    els.rangeA4.addEventListener('input', () => {
      T.state.a4 = +els.rangeA4.value;
      els.a4Val.textContent = T.state.a4;
      computeFreqs();
      MG.audio.clearPlucks();
      saveSettings();
    });
    els.chkAutodetect.checked = T.state.autoDetect;
    els.chkAutodetect.addEventListener('change', () => {
      T.state.autoDetect = els.chkAutodetect.checked;
      if (!T.state.autoDetect && T.state.active < 0) T.state.active = 0;
      assist(T.state.autoDetect ? 'Auto string detect back on — just play.' : 'Manual mode: tap a string chip or the guitar to choose.');
      saveSettings();
    });
    els.chkAutoadvance.checked = T.state.autoAdvance;
    els.chkAutoadvance.addEventListener('change', () => {
      T.state.autoAdvance = els.chkAutoadvance.checked;
      saveSettings();
    });
    els.selectTol.value = String(T.state.tolerance);
    els.selectTol.addEventListener('change', () => {
      T.state.tolerance = +els.selectTol.value;
      saveSettings();
      assist(`In-tune window set to ±${T.state.tolerance}¢.`);
    });
    els.btnResetTuned.addEventListener('click', () => {
      resetProgress();
      updateChips();
      if (!strumShown && guitarApi) guitarApi.update({ active: T.state.active, tuned: T.state.tuned, cents: T.state.cents, signal: T.state.signal });
      assist('Tuning progress reset.');
    });
    els.btnHearAll.addEventListener('click', T.hearAll);
    els.btnMicStart.addEventListener('click', startMicFlow);
    els.btnNewTab.addEventListener('click', () => window.open(window.location.href, '_blank'));

    /* ---- display mode: wave | strobe ---- */
    if (els.segDisplay) {
      els.segDisplay.querySelectorAll('.seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.display === T.state.display);
        b.addEventListener('click', () => {
          T.state.display = b.dataset.display;
          els.segDisplay.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x === b));
          saveSettings();
          assist(T.state.display === 'strobe'
            ? 'Strobe display: the disc spins while you\'re off-pitch and locks perfectly still when in tune.'
            : 'Wave display back on.');
        });
      });
    }

    /* ---- sweetened tunings ---- */
    if (els.selectSweet) {
      els.selectSweet.innerHTML = '';
      MG.sweeteners.SWEETENERS.forEach(sw => {
        const o = document.createElement('option');
        o.value = sw.id;
        o.textContent = sw.name;
        o.title = sw.hint;
        els.selectSweet.appendChild(o);
      });
      els.selectSweet.value = T.state.sweetener;
      els.selectSweet.addEventListener('change', () => {
        T.state.sweetener = els.selectSweet.value;
        onTargetsChanged();
        const sw = MG.sweeteners.byId(T.state.sweetener);
        assist(`Sweetener: ${sw.name}. ${sw.hint}`);
        saveSettings();
      });
      buildOffInputs();
    }
    function buildOffInputs() {
      if (!els.offRow) return;
      els.offRow.innerHTML = '';
      view.forEach((str, i) => {
        const wrap = document.createElement('label');
        wrap.className = 'off-cell';
        const p = N.prettyName(str.name);
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.step = '1';
        inp.min = '-50';
        inp.max = '50';
        inp.value = MG.sweeteners.offsetFor(T.state.sweetener, T.state.customOffsets, i);
        inp.dataset.i = i;
        inp.title = `String ${numOf(i)} (${p.label}) offset in cents`;
        wrap.innerHTML = `<span>${p.letter}</span>`;
        wrap.appendChild(inp);
        els.offRow.appendChild(wrap);
      });
      els.offRow.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', () => {
          const i = +inp.dataset.i;
          let v = Math.max(-50, Math.min(50, Math.round(+inp.value || 0)));
          inp.value = v;
          T.state.customOffsets = view.map((s, j) => MG.sweeteners.offsetFor(T.state.sweetener, T.state.customOffsets, j));
          T.state.customOffsets[i] = v;
          if (T.state.sweetener !== 'custom') {
            T.state.sweetener = 'custom';
            els.selectSweet.value = 'custom';
            assist('Custom sweetener: offsets now your own. Edit any string box.');
          }
          onTargetsChanged();
          saveSettings();
        });
      });
    }
    T._buildOffInputs = buildOffInputs;

    /* ---- capo ---- */
    if (els.selectCapo) {
      els.selectCapo.value = String(T.state.capo);
      updateCapoHint();
      els.selectCapo.addEventListener('change', () => {
        T.state.capo = +els.selectCapo.value;
        onTargetsChanged(true);
        updateCapoHint();
        saveSettings();
      });
    }
    function updateCapoHint() {
      if (!els.capoHint) return;
      els.capoHint.textContent = T.state.capo
        ? `Capo at fret ${T.state.capo}: targets are shifted +${T.state.capo} semitone${T.state.capo > 1 ? 's' : ''}. Tune with the capo clamped on — clamp pressure pulls strings a touch sharp at first, so check twice.`
        : '';
      els.capoHint.hidden = !T.state.capo;
    }

    /* ---- smart filter + settle ---- */
    if (els.chkFilter) {
      els.chkFilter.checked = T.state.smartFilter;
      els.chkFilter.addEventListener('change', () => {
        T.state.smartFilter = els.chkFilter.checked;
        MG.audio.setSmartFilter(T.state.smartFilter);
        assist(T.state.smartFilter
          ? 'Smart filter on: analysis is band-limited to 65–1600 Hz — chatter and hiss stay out of the detector.'
          : 'Smart filter off: full-band analysis.');
        saveSettings();
      });
      MG.audio.smartFilter = T.state.smartFilter;
    }
    if (els.chkSettle) {
      els.chkSettle.checked = T.state.settle;
      els.chkSettle.addEventListener('change', () => {
        T.state.settle = els.chkSettle.checked;
        assist(T.state.settle
          ? 'Attack settle on: I skip the first split-second after a pluck (strings ring sharp on the attack).'
          : 'Attack settle off: raw live tracking, spikes included.');
        saveSettings();
      });
    }

    /* ---- strum / guide / gig ---- */
    if (els.btnStrum) els.btnStrum.addEventListener('click', T.strumCheck);
    if (els.strumClose) els.strumClose.addEventListener('click', hideStrum);
    if (els.btnGuide) els.btnGuide.addEventListener('click', T.showGuide);
    if (els.guideClose) els.guideClose.addEventListener('click', () => { els.guideOverlay.hidden = true; });
    if (els.guideOverlay) els.guideOverlay.addEventListener('click', e => { if (e.target === els.guideOverlay) els.guideOverlay.hidden = true; });
    if (els.guideHear) els.guideHear.addEventListener('click', T.hearAll);
    if (els.gigExit) els.gigExit.addEventListener('click', () => T.toggleGig(false));
    const btnGig = document.getElementById('btn-gig');
    if (btnGig) btnGig.addEventListener('click', () => T.toggleGig());
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!els.guideOverlay.hidden) els.guideOverlay.hidden = true;
        else if (document.body.classList.contains('gig-on')) T.toggleGig(false);
      }
    });

    MG.audio.onMic = handleMicState;

    if (MG.store.get('micGranted', false)) {
      // returning user — permissions usually persist; autonomous start (fails silently into overlay)
      startMicFlow();
    }
  };

  /* Recompute targets (capo/sweetener/A4/preset changed) and refresh UI. */
  function onTargetsChanged(reset) {
    rebuildTargets();
    if (reset) resetProgress();
    MG.audio.clearPlucks();
    buildGuitar();
    buildChips();
    if (T._buildOffInputs) T._buildOffInputs();
    if (!strumShown && guitarApi) guitarApi.update({ active: T.state.active, tuned: T.state.tuned, cents: T.state.cents, signal: T.state.signal });
  }

  function buildGuitarForPreset() {
    buildGuitar();
    buildChips();
  }

  T.setPreset = function (id, opts) {
    const prev = current;
    current = MG.tunings.byId(id);
    const changedPreset = prev && prev.id !== current.id;
    T.state.presetId = current.id;
    suggested = {};
    rebuildTargets();
    resetProgress();
    buildGuitarForPreset();
    if (T._buildOffInputs) T._buildOffInputs();
    if (!opts || !opts.silent) {
      assist(`Tuning set to ${current.name} (${view.map(s => s.name).join(' ')}).`);
      if (changedPreset) {
        const hint = transitionHint(prev, current);
        if (hint) assist(hint);
      }
    }
    saveSettings();
  };

  T.setMode = function (mode) {
    T.state.mode = mode;
    document.body.classList.toggle('theme-electric', mode === 'electric');
    document.body.classList.toggle('theme-acoustic', mode !== 'electric');
    const kindLabel = document.getElementById('guitar-kind-label');
    if (kindLabel) kindLabel.textContent = mode === 'electric' ? 'electric' : 'acoustic';
    buildGuitar();
    saveSettings();
    assist(mode === 'electric'
      ? 'Electric mode: faster tracking, tighter detection — great for line-in or loud amps.'
      : 'Acoustic mode: warmer smoothing with overtone-aware octave handling.');
  };

  T.manualSelect = function (i) {
    T.state.active = i;
    T.state.manualUntil = Date.now() + 15000;
    updateChips();
    if (!strumShown && guitarApi) guitarApi.update({ active: i, tuned: T.state.tuned, cents: T.state.cents, signal: T.state.signal });
    const p = N.prettyName(view[i].name);
    els.noteTarget.textContent = p.letter;
    els.noteTargetSub.textContent = `String ${numOf(i)} · ${p.label}`;
    els.activeStringTitle.textContent = `String ${numOf(i)} — ${p.label} (manual)`;
    assist(`Manual: string ${numOf(i)} (${p.label}). Auto-detect resumes in 15 s.`);
  };

  T.playReference = function (i) {
    MG.audio.ensure();
    MG.audio.pluck(view[i].freq, 0, 0.85);
  };
  T.hearAll = function () {
    MG.audio.ensure();
    MG.audio.strum(view.map(s => s.freq), 110, 0.7);
  };

  T.pause = function () { stopLoop(); };
  T.resume = function () { if (MG.audio.micState === 'on') startLoop(); };

  window.MG = window.MG || {};
  window.MG.tuner = T;
})();
