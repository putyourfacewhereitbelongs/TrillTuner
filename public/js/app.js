/* Trill Guitar — app shell: navigation, theme, toasts, assistant feed,
 * keyboard shortcuts, boot. */
(function () {
  'use strict';

  const app = {};
  const feed = [];

  function toast(msg, opts) {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    if (opts && opts.actionLabel) {
      const b = document.createElement('button');
      b.textContent = opts.actionLabel;
      b.addEventListener('click', () => { opts.action && opts.action(); t.remove(); });
      t.appendChild(b);
    }
    box.appendChild(t);
    setTimeout(() => { t.classList.add('fade'); }, 3600);
    setTimeout(() => { t.remove(); }, 4200);
  }

  function assist(msg, opts) {
    const now = new Date();
    feed.unshift({ t: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), msg: msg });
    if (feed.length > 25) feed.pop();
    const list = document.getElementById('assistant-log');
    if (list) {
      list.innerHTML = '';
      feed.slice(0, 8).forEach(f => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="a-time">${f.t}</span> ${f.msg}`;
        list.appendChild(li);
      });
    }
    if (opts && opts.toast) toast(msg);
  }

  app.showView = function (id) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === id));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + id));
    if (id === 'tune') MG.tuner.resume(); else MG.tuner.pause();
    if (id === 'learn') MG.learn.renderPractice();
    if (id === 'care' && MG.care) MG.care.render();
  };

  function bindNav() {
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.addEventListener('click', () => app.showView(b.dataset.view)));
  }

  function bindMode() {
    const seg = document.getElementById('seg-mode');
    const sync = mode => seg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    sync(MG.tuner.state.mode);
    seg.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      if (mode === MG.tuner.state.mode) return;
      MG.tuner.setMode(mode);
      sync(mode);
    }));
  }

  function bindMicPill() {
    const pill = document.getElementById('mic-pill');
    pill.addEventListener('click', async () => {
      if (MG.audio.micState === 'on') {
        MG.audio.stopMic();
        toast('Mic stopped. Reference tones still work for tuning by ear.');
      } else if (MG.audio.micState === 'error') {
        toast(MG.audio.micError + ' — try "Open in a new tab" from the tuner panel.');
      } else {
        app.showView('tune');
        document.getElementById('btn-mic-start').click();
      }
    });
  }

  function bindKeys() {
    window.addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target && e.target.isContentEditable)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        MG.metronome.toggle();
      } else if (/^Digit[1-7]$/.test(e.code)) {
        const n = +e.code.slice(5);
        const strings = MG.tunings.byId(MG.tuner.state.presetId).strings;
        if (n <= strings.length) MG.tuner.manualSelect(strings.length - n);
      } else if (e.key === 'g' || e.key === 'G') {
        MG.tuner.toggleGig();
      }
    });
  }

  app.init = function () {
    MG.tuner.init();
    MG.metronome.init();
    MG.jam.init();
    MG.recorder.init();
    MG.lyrics.init();
    MG.learn.init();
    MG.care.init();
    bindNav();
    bindMode();
    bindMicPill();
    bindKeys();

    const firstRun = !MG.store.get('visited', false);
    MG.store.set('visited', true);
    if (firstRun) {
      assist('Welcome to Trill Guitar 🎸 Standard tuning is loaded. Hit “Start listening” and play your low E.');
      toast('Welcome to Trill Guitar! 🎸 Standard tuning is ready.');
    } else {
      assist('Welcome back 🎸 Your settings were restored.');
    }
  };

  app.assist = assist;
  app.toast = toast;

  window.MG = window.MG || {};
  window.MG.app = app;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.init);
  } else {
    app.init();
  }
})();
