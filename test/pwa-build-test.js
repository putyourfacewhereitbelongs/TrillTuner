/* Service-worker build tests: cache keys include full asset contents, not
 * merely file lengths, and generated VERSION/ASSETS lines do not make a build
 * change itself forever. */
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { assetList, contentHash, build } = require('../tools/build-pwa.js');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trill-tuner-pwa-'));
function put(rel, text) {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}
function ok(cond, label, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

try {
  put('index.html', '<main>Offline</main>\n');
  put('style.css', 'body { color: black; }\n');
  put('manifest.webmanifest', '{"name":"Trill Tuner"}\n');
  const app = put('js/app.js', 'x = 1;\n');
  const sw = put('sw.js', [
    "const VERSION = /* __VERSION__ */ 'dev';",
    'const ASSETS = /* __ASSETS__ */ [];',
    '// worker logic v1'
  ].join('\n') + '\n');
  put('downloads/ignored.apk', 'not precached');

  const assets = assetList(dir);
  ok(assets.includes('/') && assets.includes('/index.html') && assets.includes('/sw.js'),
    'precache includes the app shell and worker');
  ok(!assets.some(p => p.startsWith('/downloads/')),
    'large APK downloads are excluded from the install precache');

  const first = build(dir, { quiet: true }).version;
  const second = build(dir, { quiet: true }).version;
  ok(first === second, 'rebuilding an unchanged app keeps the same cache version', first);

  fs.writeFileSync(app, 'y = 1;\n'); // same length, different bytes
  const changedAsset = build(dir, { quiet: true }).version;
  ok(changedAsset !== second, 'same-size asset edits invalidate the cache', `${second} → ${changedAsset}`);

  const beforeWorkerEdit = contentHash(assetList(dir), dir);
  fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('worker logic v1', 'worker logic v2'));
  const afterWorkerEdit = contentHash(assetList(dir), dir);
  ok(beforeWorkerEdit !== afterWorkerEdit, 'service-worker logic edits affect the cache version');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

if (process.exitCode) process.exit(1);
else console.log('\n✅ PWA build tests passed');
