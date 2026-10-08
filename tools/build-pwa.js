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

const assets = walk(PUBLIC, '').map(p => p === '/index.html' ? '/' : p).sort();
/* the shell itself must always be there, even if the scan changes shape */
for (const must of ['/', '/index.html', '/style.css', '/manifest.webmanifest']) {
  if (!assets.includes(must)) assets.push(must);
}
const uniq = Array.from(new Set(assets));

const hash = crypto.createHash('sha1')
  .update(uniq.join('\n') + uniq.map(p => fs.statSync(path.join(PUBLIC, p === '/' ? 'index.html' : p)).size).join(','))
  .digest('hex').slice(0, 8);
const version = 'tt-' + hash;

let sw = fs.readFileSync(SW, 'utf8');
sw = sw.replace(/const VERSION = \/\* __VERSION__ \*\/ '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(/const ASSETS = \/\* __ASSETS__ \*\/ \[[^\]]*\];/, `const ASSETS = ${JSON.stringify(uniq)};`);
if (sw.includes('__VERSION__') || sw.includes('__ASSETS__')) {
  console.error('sw.js placeholders not found — refusing to write');
  process.exit(1);
}
fs.writeFileSync(SW, sw);
console.log(`sw.js: ${uniq.length} assets precached, cache version ${version}`);
uniq.forEach(a => console.log('  ' + a));
