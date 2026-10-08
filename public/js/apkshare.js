/* Trill Tuner — share the Android app.
 *
 * The app hosts its own APK at /download/trill-tuner.apk. This card shows a
 * QR code for that link plus the raw URL, so another phone on the same
 * network can install Trill Tuner straight from this device. The URL is
 * resolved from, in order: the Android bridge (inside the APK), the current
 * origin (web / PWA), the server's LAN address, or a WebRTC local-IP lookup. */
(function () {
  'use strict';

  const S = { url: '', ready: false };
  let els = {};

  async function resolveUrl() {
    if (window.Android && typeof window.Android.getHostBase === 'function') {
      const b = window.Android.getHostBase();
      if (b) return String(b).replace(/\/$/, '') + '/download/trill-tuner.apk';
    }
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return location.origin + '/download/trill-tuner.apk';
    }
    /* file:// (the APK, without the bridge): the relative path is the honest
     * answer — the QR is meant for the web version hosting the download */
    return '/download/trill-tuner.apk';
  }

  async function fetchMeta() {
    /* a fetch on file:// cannot work (and logs a console error) — skip it */
    if (location.protocol === 'file:') return null;
    try {
      const r = await fetch('/download/trill-tuner.apk', { method: 'HEAD' });
      if (!r.ok) return null;
      const size = Number(r.headers.get('content-length') || 0);
      return { size: size, version: r.headers.get('x-apk-version') || '' };
    } catch (e) { return null; }
  }

  S.render = async function () {
    if (!els.qr || S.ready) return;
    S.ready = true;
    S.url = await resolveUrl();
    if (els.link) els.link.value = S.url;
    TT.qr.draw(els.qr, S.url, { cell: 4, margin: 3 });
    const meta = await fetchMeta();
    if (els.meta) {
      els.meta.textContent = meta && meta.size
        ? 'TrillTuner.apk · ' + (meta.size / 1048576).toFixed(1) + ' MB · served by this app'
        : (location.protocol === 'file:'
          ? 'TrillTuner.apk · the Android app — the QR opens the copy hosted by the web version'
          : 'APK not built yet on this host — run `node tools/build-apk.py`');
    }
  };

  S.init = function () {
    els = {
      qr: document.getElementById('apk-qr'),
      link: document.getElementById('apk-link'),
      meta: document.getElementById('apk-meta'),
      open: document.getElementById('btn-apk-open'),
      copy: document.getElementById('btn-apk-copy'),
      share: document.getElementById('btn-apk-share')
    };
    if (els.open) els.open.addEventListener('click', () => {
      if (!S.url) return;
      /* inside the APK: hand the download to the browser (the WebView must
       * not navigate away from the app) */
      if (window.Android && typeof window.Android.openUrl === 'function') window.Android.openUrl(S.url);
      else location.href = S.url;
    });
    if (els.copy) els.copy.addEventListener('click', () => {
      (navigator.clipboard && S.url ? navigator.clipboard.writeText(S.url) : Promise.reject())
        .then(() => TT.app.toast('APK link copied ✓'))
        .catch(() => TT.app.toast('Copy blocked — select the link and copy it manually.'));
    });
    if (els.share) els.share.addEventListener('click', () => {
      if (!S.url) return;
      /* inside the APK: the native share sheet */
      if (window.Android && typeof window.Android.shareText === 'function') {
        window.Android.shareText('Install Trill Tuner (the Android app): ' + S.url);
        return;
      }
      if (navigator.share) {
        navigator.share({ title: 'Trill Tuner — Android app', text: 'Install Trill Tuner (APK):', url: S.url }).catch(() => {});
      } else {
        (navigator.clipboard ? navigator.clipboard.writeText(S.url) : Promise.reject())
          .then(() => TT.app.toast('APK link copied ✓'))
          .catch(() => TT.app.toast('Copy blocked — select the link and copy it manually.'));
      }
    });
  };

  window.TT = window.TT || {};
  window.TT.apkshare = S;
})();
