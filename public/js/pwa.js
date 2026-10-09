/* Trill Tuner — PWA install prompt + service-worker status.
 *
 * The service worker itself is registered in index.html (as early as
 * possible); this module listens for the browser's install prompt, shows
 * the "Install app" button when installation is possible, and reports
 * whether the app is already running installed (standalone). */
(function () {
  'use strict';

  const P = { deferred: null };

  P.installed = function () {
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  };

  P.prompt = async function () {
    if (!P.deferred) return false;
    const d = P.deferred;
    P.deferred = null;
    try { d.prompt(); } catch (e) { return false; }
    const choice = await d.userChoice.catch(() => ({ outcome: 'dismissed' }));
    return choice && choice.outcome === 'accepted';
  };

  P.init = function () {
    const btn = document.getElementById('btn-install');
    if (btn) {
      const update = () => { btn.hidden = P.installed() || !P.deferred; };
      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        P.deferred = e;
        update();
        if (window.TT && TT.app) TT.app.toast('Trill Tuner can be installed as an app — it then works fully offline.');
      });
      window.addEventListener('appinstalled', update);
      btn.addEventListener('click', () => P.prompt());
      update();
    }
  };

  window.TT = window.TT || {};
  window.TT.pwa = P;
})();
