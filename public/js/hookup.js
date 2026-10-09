/* Trill Tuner — Hookup: plug a real guitar into the virtual amp, hear only
 * the processed sound (no synthesized preview riff). */
(function () {
  'use strict';
  const H = {};
  function el(id) { return document.getElementById(id); }

  async function startLive() {
    const status = el('hk-status');
    try {
      TT.audio.ensure();
      if (TT.audio.micState !== 'on') await TT.audio.startMic();
      if (TT.settings && TT.settings.refreshInputs) TT.settings.refreshInputs();
      if (TT.rig) {
        TT.rig.state.monitor = true;
        TT.rig.state.liveGuitar = true;
        TT.rig.state.mutePreview = TT.settings ? TT.settings.mutePreview() : true;
        const mon = el('rig-monitor'); if (mon) mon.checked = true;
        const live = el('rig-live'); if (live) live.checked = true;
        TT.rig.rebuild && TT.rig.rebuild();
        TT.rig.updateMicRoute && TT.rig.updateMicRoute();
      }
      if (status) {
        status.textContent = 'Live guitar is through the amp. Preview riffs are off — you should only hear your guitar, processed. Use headphones.';
        status.className = 'hint g';
      }
      if (TT.app && TT.app.toast) TT.app.toast('Live guitar on — amped sound only. Headphones recommended.');
      if (TT.app && TT.app.showView) TT.app.showView('rig');
    } catch (e) {
      if (status) {
        status.textContent = (e && e.message) || 'Could not open the input. Allow the microphone / interface and try again.';
        status.className = 'hint r';
      }
    }
  }

  function stopLive() {
    if (TT.rig) {
      TT.rig.state.liveGuitar = false;
      TT.rig.state.monitor = false;
      const mon = el('rig-monitor'); if (mon) mon.checked = false;
      const live = el('rig-live'); if (live) live.checked = false;
      TT.rig.updateMicRoute && TT.rig.updateMicRoute();
    }
    const status = el('hk-status');
    if (status) { status.textContent = 'Live guitar is off. Test riffs will play the synthesized preview again.'; status.className = 'hint'; }
  }

  H.init = function () {
    const go = el('hk-start');
    const stop = el('hk-stop');
    if (go) go.addEventListener('click', startLive);
    if (stop) stop.addEventListener('click', stopLive);
  };
  H.startLive = startLive;
  H.stopLive = stopLive;
  window.TT = window.TT || {};
  window.TT.hookup = H;
})();
