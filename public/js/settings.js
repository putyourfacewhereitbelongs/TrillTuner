/* Trill Tuner — Settings: sun/night appearance, type size, input device,
 * live-guitar routing, tuner extras. */
(function () {
  'use strict';
  const S = {
    appearance: 'sun',   /* sun | night */
    typeSize: 'md',      /* md | lg */
    liveMutePreview: true
  };

  function el(id) { return document.getElementById(id); }

  function load() {
    try {
      const s = window.TT.store && TT.store.get('settings', null);
      if (s && typeof s === 'object') Object.assign(S, s);
    } catch (e) {}
  }
  function save() {
    try { TT.store.set('settings', { appearance: S.appearance, typeSize: S.typeSize, liveMutePreview: S.liveMutePreview }); } catch (e) {}
    try { TT.store.set('appearance', S.appearance); } catch (e) {}
  }

  function applyAppearance() {
    const html = document.documentElement;
    html.classList.remove('theme-sun', 'theme-night');
    html.classList.add(S.appearance === 'night' ? 'theme-night' : 'theme-sun');
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', S.appearance === 'night' ? 'dark' : 'light');
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', S.appearance === 'night' ? '#0b0d12' : '#ffffff');
    document.querySelectorAll('[data-appearance]').forEach(b => b.classList.toggle('active', b.dataset.appearance === S.appearance));
    const sunBtn = el('btn-sun');
    if (sunBtn) sunBtn.textContent = S.appearance === 'sun' ? '☾ Night' : '☀ Sun';
  }

  function applyType() {
    document.documentElement.style.fontSize = S.typeSize === 'lg' ? '18px' : '16px';
    document.querySelectorAll('[data-type]').forEach(b => b.classList.toggle('active', b.dataset.type === S.typeSize));
  }

  async function fillInputs() {
    const sel = el('set-input');
    if (!sel || !TT.audio || !TT.audio.listInputs) return;
    try {
      const list = await TT.audio.listInputs();
      const cur = TT.audio.deviceId || '';
      sel.innerHTML = '<option value="">Default input</option>' +
        list.map(d => '<option value="' + d.deviceId + '"' + (d.deviceId === cur ? ' selected' : '') + '>' +
          (d.label || 'Input') + '</option>').join('');
    } catch (e) {
      sel.innerHTML = '<option value="">Default input (allow the mic to list devices)</option>';
    }
  }

  function bind() {
    document.querySelectorAll('[data-appearance]').forEach(b => b.addEventListener('click', () => {
      S.appearance = b.dataset.appearance;
      applyAppearance(); save();
      if (TT.app && TT.app.toast) TT.app.toast(S.appearance === 'sun' ? 'Sun mode — white screen for outdoor tuning.' : 'Night mode — dark studio.');
    }));
    document.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => {
      S.typeSize = b.dataset.type;
      applyType(); save();
    }));
    const sunBtn = el('btn-sun');
    if (sunBtn) sunBtn.addEventListener('click', () => {
      S.appearance = S.appearance === 'sun' ? 'night' : 'sun';
      applyAppearance(); save();
    });
    const mute = el('set-mute-preview');
    if (mute) {
      mute.checked = S.liveMutePreview !== false;
      mute.addEventListener('change', () => {
        S.liveMutePreview = mute.checked;
        if (TT.rig && TT.rig.state) TT.rig.state.mutePreview = S.liveMutePreview;
        save();
      });
    }
    const inp = el('set-input');
    if (inp) inp.addEventListener('change', async () => {
      try {
        await TT.audio.setDevice(inp.value || null);
        if (TT.app && TT.app.toast) TT.app.toast('Input switched. Play a note to confirm.');
      } catch (e) {
        if (TT.app && TT.app.toast) TT.app.toast((e && e.message) || 'Could not switch input.');
      }
    });
    const a4 = el('set-a4');
    if (a4 && TT.tuner && TT.tuner.state) {
      a4.value = String(TT.tuner.state.a4 || 440);
      a4.addEventListener('change', () => {
        const v = Math.max(415, Math.min(466, +a4.value || 440));
        a4.value = String(v);
        if (TT.tuner.setA4) TT.tuner.setA4(v);
        else { TT.tuner.state.a4 = v; }
      });
    }
    const smart = el('set-smart-filter');
    if (smart && TT.audio) {
      smart.checked = !!TT.audio.smartFilter;
      smart.addEventListener('change', () => TT.audio.setSmartFilter(smart.checked));
    }
  }

  S.apply = function () { applyAppearance(); applyType(); };
  S.init = function () {
    load();
    applyAppearance();
    applyType();
    bind();
    fillInputs();
    if (TT.rig && TT.rig.state) TT.rig.state.mutePreview = S.liveMutePreview !== false;
  };
  S.refreshInputs = fillInputs;
  S.appearanceOf = function () { return S.appearance; };
  S.mutePreview = function () { return S.liveMutePreview !== false; };

  window.TT = window.TT || {};
  window.TT.settings = S;
})();
