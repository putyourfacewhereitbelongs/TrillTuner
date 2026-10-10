#!/usr/bin/env node
/* Regenerates public/sw.js with the full precache list for everything the
 * app serves, and stamps a content-hash cache version so updates roll out.
 * Re-run after adding or changing files under public/. Usage:
 *   node tools/build-pwa.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const VERSION_RE = /const VERSION = (?:\/\* __VERSION__ \*\/ )?'[^']*';/;
const ASSETS_RE = /const ASSETS = (?:\/\* __ASSETS__ \*\/ )?\[[^\]]*\];/;

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

function assetList(publicDir = PUBLIC) {
  /* downloads/ holds the APK itself: far too big to force into the first
   * install, and covered by the service worker's runtime cache on demand. */
  const assets = walk(publicDir, '')
    .filter(p => !p.startsWith('/downloads/'))
    .map(p => p === '/index.html' ? '/' : p).sort();
  /* the shell itself must always be there, even if the scan changes shape */
  for (const must of ['/', '/index.html', '/style.css', '/manifest.webmanifest']) {
    if (!assets.includes(must)) assets.push(must);
  }
  return Array.from(new Set(assets));
}

function contentHash(assets, publicDir = PUBLIC) {
  const hash = crypto.createHash('sha256');
  for (const asset of assets.slice().sort()) {
    const file = path.join(publicDir, asset === '/' ? 'index.html' : asset.replace(/^\/+/, ''));
    let bytes = fs.readFileSync(file);
    if (asset === '/sw.js') {
      /* The worker is part of its own precache, but its generated VERSION and
       * ASSETS lines depend on this hash. Normalize those two lines so worker
       * logic is included in the hash without creating a recursive version. */
      let source = bytes.toString('utf8');
      source = source.replace(VERSION_RE, "const VERSION = '__VERSION__';");
      source = source.replace(ASSETS_RE, 'const ASSETS = __ASSETS__;');
      bytes = Buffer.from(source, 'utf8');
    }
    hash.update(asset).update('\0').update(bytes).update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

function build(publicDir = PUBLIC, options = {}) {
  const swPath = path.join(publicDir, 'sw.js');
  const assets = assetList(publicDir);
  const version = 'tt-' + contentHash(assets, publicDir);
  let sw = fs.readFileSync(swPath, 'utf8');

  if (!VERSION_RE.test(sw) || !ASSETS_RE.test(sw)) {
    throw new Error('sw.js template not recognised (no VERSION/ASSETS line) — refusing to write');
  }
  sw = sw.replace(VERSION_RE, `const VERSION = '${version}';`);
  sw = sw.replace(ASSETS_RE, `const ASSETS = ${JSON.stringify(assets)};`);
  if (sw.includes('__VERSION__') || sw.includes('__ASSETS__')) {
    throw new Error('sw.js placeholders not filled — refusing to write');
  }
  fs.writeFileSync(swPath, sw);

  if (!options.quiet) {
    console.log(`sw.js: ${assets.length} assets precached, cache version ${version}`);
    assets.forEach(a => console.log('  ' + a));
  }
  return { version, assets };
}

if (require.main === module) {
  try {
    build();
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

module.exports = { assetList, contentHash, build };
