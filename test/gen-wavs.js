/* Generate 16-bit PCM WAVs of synthetic guitar strings for Chrome's
 * --use-file-for-fake-audio-capture, so we can E2E-test the real mic pipeline. */
'use strict';
const fs = require('fs');
const path = require('path');

const SR = 44100;

function writeWav(file, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32000), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
  console.log('wrote', file, (n / SR).toFixed(1) + 's');
}

// Plucked-string-ish: strong fundamental + decaying harmonics, constant sustain
// (we keep amplitude steady so the tuner has a continuous signal to read).
function tone(freq, secs, detuneCents) {
  if (detuneCents) freq = freq * Math.pow(2, detuneCents / 1200);
  const n = Math.floor(SR * secs);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let h = 1; h <= 8; h++) v += (1 / (h * h)) * Math.sin(2 * Math.PI * freq * h * i / SR);
    out[i] = v * 0.32 + (Math.random() * 2 - 1) * 0.003;
  }
  return out;
}

const dir = __dirname;
writeWav(path.join(dir, 'e2_in_tune.wav'), tone(82.407, 6, 0));            // Standard low E, spot on
writeWav(path.join(dir, 'a2_flat20.wav'), tone(110.0, 6, -20));            // A string 20 cents flat
writeWav(path.join(dir, 'd2_dropd.wav'), tone(73.416, 6, 0));              // Drop D low string
writeWav(path.join(dir, 'e5_overtone.wav'), tone(659.255, 6, 0));          // E5 — what YIN reports when it locks onto the 2nd harmonic of the high E string
