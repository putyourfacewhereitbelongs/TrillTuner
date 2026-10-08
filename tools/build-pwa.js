#!/usr/bin/env node
/* Regenerates public/sw.js with the full precache list for everything the
 * app serves, and stamps a content-hash cache version so updates roll out.
 * Re-run after adding or renaming files under public/.  Usage:
 *   node tools/build-pwa.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SW = path.join(PUBLIC, 'sw.js');

function walk(dir, base) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = base + '/' + name;
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p, rel));
    else out.push(rel);
  }
  return out;
}

/* downloads/ holds the APK itself: far too big to force into the first install,
 * and already covered by the service worker's runtime cache when someone taps
 * the download link. */
const assets = walk(PUBLIC, '')
  .filter(p => !p.startsWith('/downloads/'))
  .map(p => p === '/index.html' ? '/' : p).sort();
/* the shell itself must always be there, even if the scan changes shape */
for (const must of ['/', '/index.html', '/style.css', '/manifest.webmanifest']) {
  if (!assets.includes(must)) assets.push(must);
}
const uniq = Array.from(new Set(assets));

const hash = crypto.createHash('sha1')
  .update(uniq.join('\n') + uniq.map(p => fs.statSync(path.join(PUBLIC, p === '/' ? 'index.html' : p)).size).join(','))
  .digest('hex').slice(0, 8);
const version = 'tt-' + hash;

/* The generated sw.js no longer carries the placeholder comments after the
 * first run, so both patterns have to match the generated form as well —
 * otherwise a later run (adding a file like js/stem-worker.js) silently wrote
 * the old asset list back and the new file was missing offline. */
const VERSION_RE = /const VERSION = (?:\/\* __VERSION__ \*\/ )?'[^']*';/;
const ASSETS_RE = /const ASSETS = (?:\/\* __ASSETS__ \*\/ )?\[[^\]]*\];/;

let sw = fs.readFileSync(SW, 'utf8');
if (!VERSION_RE.test(sw) || !ASSETS_RE.test(sw)) {
  console.error('sw.js template not recognised (no VERSION/ASSETS line) — refusing to write');
  process.exit(1);
}
sw = sw.replace(VERSION_RE, `const VERSION = '${version}';`);
sw = sw.replace(ASSETS_RE, `const ASSETS = ${JSON.stringify(uniq)};`);
if (sw.includes('__VERSION__') || sw.includes('__ASSETS__')) {
  console.error('sw.js placeholders not filled — refusing to write');
  process.exit(1);
}
fs.writeFileSync(SW, sw);
console.log(`sw.js: ${uniq.length} assets precached, cache version ${version}`);
uniq.forEach(a => console.log('  ' + a));
