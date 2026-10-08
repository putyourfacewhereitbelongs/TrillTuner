/* Trill Tuner — the stem lab's background separator.
 *
 * A classic Web Worker that loads the same from-scratch DSP engine the page uses
 * (lib/fft.js + lib/dsp.js) and separates a whole song off the main thread, so
 * the interface keeps painting and the progress bar actually moves. Nothing
 * leaves the device: the samples are copied in, the stems are transferred back.
 *
 * The page falls back to separating in the page itself wherever a worker cannot
 * be created (the Android APK loads from file://, where workers are blocked).
 */
'use strict';

importScripts('lib/fft.js', 'lib/dsp.js');

self.onmessage = async function (e) {
  const msg = e.data || {};
  if (msg.type !== 'separate') return;
  try {
    const dsp = self.TT && self.TT.dsp;
    if (!dsp || !dsp.separateChunked) throw new Error('the DSP engine did not load in the worker');
    const channels = (msg.channels || []).map(c => new Float32Array(c));
    if (!channels.length) throw new Error('no audio was sent');
    const res = await dsp.separateChunked(channels, msg.sr, msg.mode, {
      remove: !!msg.remove,
      amount: msg.amount == null ? 0.92 : msg.amount,
      keepBass: msg.keepBass == null ? 0.85 : msg.keepBass,
      sliceSeconds: msg.sliceSeconds || 15,
      onProgress: f => self.postMessage({ type: 'progress', value: f })
    });
    const out = res.channels.map(c => c.buffer);
    self.postMessage({
      type: 'done',
      channels: out,
      sr: res.sr,
      mode: res.mode,
      remove: res.remove,
      amount: res.amount,
      slices: res.slices,
      peak: res.peak,
      gain: res.gain,
      length: res.channels[0].length
    }, out);
  } catch (err) {
    self.postMessage({ type: 'error', message: (err && err.message) || String(err) });
  }
};
