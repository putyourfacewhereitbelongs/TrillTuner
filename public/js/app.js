/* Trill Tuner — app shell: navigation, theme, toasts, assistant feed,
 * keyboard shortcuts, module boot, splash and progress bookkeeping. */
(function () {
  'use strict';

  const app = { VERSION: '2.0.0' };
  const feed = [];

  function toast(msg, opts) {
    const box = document.getElementById('toasts');
    if (!box) return;
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
    if (id === 'tune') TT.tuner.resume(); else TT.tuner.pause();
    if (id === 'learn') TT.learn.renderPractice();
    if (id === 'care' && TT.care) TT.care.render();
    if (id === 'rig' && TT.rig) TT.rig.rebuild();
    if (id === 'progress' && TT.share) TT.share.render();
    if (id === 'tools' && TT.tools) TT.tools.setTab(document.querySelector('#tools-tabs .tab.active').dataset.tab);
  };

  function bindNav() {
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.addEventListener('click', () => app.showView(b.dataset.view)));
  }

  function bindMode() {
    const seg = document.getElementById('seg-mode');
    if (!seg) return;
    const sync = mode => seg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    sync(TT.tuner.state.mode);
    seg.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      if (mode === TT.tuner.state.mode) return;
      TT.tuner.setMode(mode);
      sync(mode);
    }));
  }

  function bindMicPill() {
    const pill = document.getElementById('mic-pill');
    if (!pill) return;
    pill.addEventListener('click', async () => {
      if (TT.audio.micState === 'on') {
        TT.audio.stopMic();
        toast('Mic stopped. Reference tones still work for tuning by ear.');
      } else if (TT.audio.micState === 'error') {
        toast(TT.audio.micError + ' — try "Open in a new tab" from the tuner panel.');
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
        TT.metronome.toggle();
      } else if (/^Digit[1-7]$/.test(e.code)) {
        const n = +e.code.slice(5);
        const strings = TT.tunings.byId(TT.tuner.state.presetId).strings;
        if (n <= strings.length) TT.tuner.manualSelect(strings.length - n);
      } else if (e.key === 'g' || e.key === 'G') {
        TT.tuner.toggleGig();
      } else if (e.key === 'v' || e.key === 'V') {
        TT.metronome.toggle && null; /* reserved */
      }
    });
  }

  /* first time each user-visible view is opened, run its render hook */
  app.init = function () {
    const wire = (name, fn) => {
      try { fn(); } catch (e) { console.error('Trill Tuner: ' + name + ' failed to start', e); }
    };
    wire('tuner', () => TT.tuner.init());
    wire('metronome', () => TT.metronome.init());
    wire('jam', () => TT.jam.init());
    wire('recorder', () => TT.recorder.init());
    wire('lyrics', () => TT.lyrics.init());
    wire('learn', () => TT.learn.init());
    wire('care', () => TT.care.init());
    wire('tools', () => TT.tools.init());
    wire('practice', () => TT.practiceTools.init());
    wire('rig', () => TT.rig.init());
    wire('share', () => TT.share.init());
    bindNav();
    bindMode();
    bindMicPill();
    bindKeys();

    /* storage health: an automatic snapshot means a corrupted write never
     * costs more than an hour of progress. */
    try { TT.store.autoSnapshot(); } catch (e) {}

    const firstRun = !TT.store.get('visited', false);
    TT.store.set('visited', true);
    if (firstRun) {
      assist('Welcome to Trill Tuner 🎸 Standard tuning is loaded. Hit “Start listening” and play your low E. There are 94 tunings, a full amp & pedal studio in the Rig tab, plus the new Songs, Tab maker, Stems and Listener tools.');
      toast('Welcome to Trill Tuner! 🎸');
    } else {
      assist('Welcome back 🎸 Your settings, rig and practice history were restored.');
    }
    TT.share.checkBadges(true);

    /* splash last, so it can report the real module status */
    wire('splash', () => TT.splash.show());
  };

  app.assist = assist;
  app.toast = toast;

  window.TT = window.TT || {};
  window.TT.app = app;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.init);
  } else {
    app.init();
  }
})();
