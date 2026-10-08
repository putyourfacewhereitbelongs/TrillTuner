/* Trill Tuner — splash screen.
 *
 * A short, animated boot screen: the logo draws itself, the modules report in,
 * a progress bar fills, and the app unlocks. Click / tap / press any key to
 * skip. Appearance is remembered (`tt.splashOff`) and reduced-motion users get
 * the calm version.
 */
(function () {
  'use strict';

  const S = { done: false, skipHold: 0 };

  const STEPS = [
    ['Web Audio engine', () => typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined'],
    ['Restoring your progress', () => !!TT.store],
    ['Tuning library', () => !!(TT.tunings && TT.tunings.PRESETS.length)],
    ['Pedal & amp reference', () => !!(TT.pedals && TT.amps && TT.wiring)],
    ['Practice tools', () => !!(TT.practiceTools && TT.tools)],
    ['Ready', () => true]
  ];

  function logLine(el, text, cls) {
    const p = document.createElement('div');
    p.className = 'splash-line ' + (cls || '');
    p.textContent = text;
    el.appendChild(p);
    el.scrollTop = el.scrollHeight;
    return p;
  }

  S.show = function () {
    const overlay = document.getElementById('splash');
    if (!overlay) return;
    const el = {
      log: document.getElementById('splash-log'),
      bar: document.getElementById('splash-bar'),
      pct: document.getElementById('splash-pct'),
      enter: document.getElementById('splash-enter'),
      version: document.getElementById('splash-version'),
      tunings: document.getElementById('splash-tunings'),
      pedals: document.getElementById('splash-pedals'),
      amps: document.getElementById('splash-amps'),
      forever: document.getElementById('splash-forever')
    };
    if (el.version) el.version.textContent = 'v' + (TT.share ? TT.share.VERSION : '2.0.0');
    if (el.tunings) el.tunings.textContent = TT.tunings ? TT.tunings.PRESETS.length : 0;
    if (el.pedals) el.pedals.textContent = TT.pedals ? TT.pedals.LIST.length : 0;
    if (el.amps) el.amps.textContent = TT.amps ? TT.amps.AMPS.length : 0;
    if (TT.store && TT.store.get('splashOff', false)) { overlay.hidden = true; S.done = true; return; }

    overlay.hidden = false;
    document.body.classList.add('splash-on');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let i = 0;
    const total = STEPS.length;
    function step() {
      if (S.done) return;
      if (i >= total) {
        el.bar.style.width = '100%';
        el.pct.textContent = '100%';
        el.enter.disabled = false;
        el.enter.classList.add('ready');
        el.enter.focus({ preventScroll: true });
        logLine(el.log, '✔ Systems ready — welcome back.', 'ok');
        /* auto-enter after a beat so nobody is stuck at a splash screen */
        setTimeout(() => { if (!S.done) S.dismiss(); }, reduced ? 700 : 1500);
        return;
      }
      const [name, test] = STEPS[i];
      const line = logLine(el.log, '· ' + name + '…');
      const ok = (function () { try { return test(); } catch (e) { return false; } })();
      line.textContent = (ok ? '✔ ' : '⚠ ') + name + (ok ? '' : ' (unavailable — continuing)');
      line.className = 'splash-line ' + (ok ? 'ok' : 'warn');
      i++;
      const pct = Math.round((i / total) * 100);
      el.bar.style.width = pct + '%';
      el.pct.textContent = pct + '%';
      setTimeout(step, reduced ? 60 : 190 + Math.random() * 120);
    }
    step();                                   /* first line straight away: no blank stare */
    setTimeout(step, reduced ? 80 : 260);

    function dismiss() {
      if (S.done) return;
      S.done = true;
      if (el.forever && el.forever.checked && TT.store) TT.store.set('splashOff', true);
      overlay.classList.add('splash-out');
      document.body.classList.remove('splash-on');
      setTimeout(() => { overlay.hidden = true; }, 520);
      if (TT.app && TT.app.assist) {
        TT.app.assist('Welcome to Trill Tuner 🎸 Standard tuning is loaded — press “Start listening” and play your low E.');
      }
    }
    S.dismiss = dismiss;

    el.enter.addEventListener('click', dismiss);
    overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });
    window.addEventListener('keydown', function onKey(e) {
      if (S.done) { window.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); }
    });
    window.addEventListener('touchstart', dismiss, { passive: true, once: true });
  };

  /* Settings view can turn it back on / off. */
  S.toggleForever = function (on) {
    if (TT.store) TT.store.set('splashOff', !on);
  };

  window.TT = window.TT || {};
  window.TT.splash = S;
})();
