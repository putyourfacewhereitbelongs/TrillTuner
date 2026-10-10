#!/usr/bin/env node
/* Copies the ONNX Runtime Web files the stem lab needs out of node_modules into
 * public/vendor/ort/, so the app serves them from its own origin (no CDN, works
 * offline once cached, and the APK ships them). Runs as the npm postinstall.
 * Missing package → a warning, not a failure, so a bare `npm install` still works. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
const DEST = path.join(ROOT, 'public', 'vendor', 'ort');
const FILES = ['ort.min.js', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'];

function main() {
  if (!fs.existsSync(SRC)) {
    console.warn('vendor-ort: onnxruntime-web is not installed, skipping (the classic stem engine still works)');
    return 0;
  }
  fs.mkdirSync(DEST, { recursive: true });
  let copied = 0;
  for (const f of FILES) {
    const from = path.join(SRC, f);
    if (!fs.existsSync(from)) { console.warn('vendor-ort: missing ' + f); continue; }
    fs.copyFileSync(from, path.join(DEST, f));
    copied++;
  }
  console.log('vendor-ort: copied ' + copied + ' file(s) to public/vendor/ort/');
  return 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { main };
