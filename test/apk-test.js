/* APK structural test: validates public/downloads/TrillTuner.apk without a
 * device — zip layout, asset fidelity (byte-identical to public/), alignment
 * rules Android enforces, signature blocks, and a real `apksigner verify`
 * run through the JDK bundled in tools/.cache/venv. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APK = path.join(ROOT, 'public', 'downloads', 'TrillTuner.apk');
let failures = 0;
let skips = 0;

function ok(cond, label, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra != null ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

function skip(label, extra) {
  console.log(`SKIP ${label}${extra != null ? ' — ' + extra : ''}`);
  skips++;
}

/* ---- minimal zip reader (we need raw local-header offsets for alignment) ---- */
function readZip(file) {
  const buf = fs.readFileSync(file);
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('no EOCD');
  const count = buf.readUInt16LE(eocd + 10);
  const cdOff = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cdOff;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central record at ' + p);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    // local header -> data offset
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataOff = localOff + 30 + lNameLen + lExtraLen;
    entries.push({ name, method, crc, compSize, size, localOff, dataOff });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { buf, entries };
}

function inflateRaw(entry, buf) {
  const zlib = require('zlib');
  const raw = buf.subarray(entry.dataOff, entry.dataOff + entry.compSize);
  if (entry.method === 0) return raw;
  return zlib.inflateRawSync(raw);
}

(async () => {
  console.log('== APK structural test ==');
  ok(fs.existsSync(APK), 'APK exists at public/downloads/TrillTuner.apk');
  if (!fs.existsSync(APK)) { console.log('❌ APK missing — run `python3 tools/build-apk.py`'); process.exit(1); }
  const stat = fs.statSync(APK);
  ok(stat.size > 200 * 1024, 'APK is a real bundle (>200 KB)', (stat.size / 1024).toFixed(0) + ' KB');

  const { buf, entries } = readZip(APK);
  const names = entries.map(e => e.name);

  /* ---- required entries ---- */
  for (const req of ['AndroidManifest.xml', 'classes.dex', 'resources.arsc',
    'assets/index.html', 'assets/style.css', 'assets/js/app.js',
    'assets/manifest.webmanifest', 'assets/sw.js',
    'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
    'res/mipmap-mdpi-v4/ic_launcher.png', 'res/mipmap-xxxhdpi-v4/ic_launcher.png']) {
    ok(names.includes(req), 'zip contains ' + req);
  }
  ok(!names.some(n => n.startsWith('assets/downloads/')), 'APK does not bundle itself (no assets/downloads/)');

  /* ---- classes.dex is a real dex ---- */
  const dex = entries.find(e => e.name === 'classes.dex');
  const dexBytes = inflateRaw(dex, buf);
  ok(dexBytes.subarray(0, 4).toString('latin1') === 'dex\n', 'classes.dex has the dex magic');
  const dexText = dexBytes.toString('latin1');
  for (const cls of ['com/trilltuner/app/MainActivity', 'com/trilltuner/app/TClient',
    'com/trilltuner/app/TChrome', 'com/trilltuner/app/TBridge']) {
    ok(dexText.includes(cls), 'classes.dex contains ' + cls);
  }

  /* ---- alignment rules (targetSdk 30+: resources.arsc stored + 4-aligned) ---- */
  const arsc = entries.find(e => e.name === 'resources.arsc');
  ok(arsc.method === 0, 'resources.arsc is STORED (uncompressed)');
  ok(arsc.dataOff % 4 === 0, 'resources.arsc data is 4-byte aligned', 'offset ' + arsc.dataOff);
  const axml = entries.find(e => e.name === 'AndroidManifest.xml');
  ok(axml.method === 0 && axml.dataOff % 4 === 0, 'AndroidManifest.xml STORED + aligned');

  /* ---- v1 JAR signature files ---- */
  ok(names.some(n => /^META-INF\/.*\.SF$/.test(n)), 'v1 signature .SF file present');
  ok(names.some(n => /^META-INF\/.*\.RSA$/.test(n)), 'v1 signature .RSA (cert) present');
  ok(names.includes('META-INF/MANIFEST.MF'), 'v1 MANIFEST.MF present');

  /* ---- v2/v3 APK Signing Block (magic "APK Sig Block 42" before the CD) ---- */
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const cdOff = buf.readUInt32LE(eocd + 16);
  const magic = buf.toString('latin1', cdOff - 16, cdOff);
  ok(magic === 'APK Sig Block 42', 'APK Signing Block (v2/v3) present before the central directory');

  /* ---- asset fidelity: every bundled asset is byte-identical to public/ ---- */
  let mismatches = [];
  let checked = 0;
  for (const e of entries) {
    if (!e.name.startsWith('assets/')) continue;
    const rel = e.name.slice('assets/'.length);
    const src = path.join(ROOT, 'public', rel);
    if (!fs.existsSync(src)) { mismatches.push(rel + ' (missing in public/)'); continue; }
    const disk = fs.readFileSync(src);
    const inApk = inflateRaw(e, buf);
    checked++;
    if (Buffer.compare(disk, inApk) !== 0) mismatches.push(rel);
  }
  ok(mismatches.length === 0, `all ${checked} bundled assets are byte-identical to public/`,
    mismatches.slice(0, 3).join(', '));

  /* every public file (except downloads/) must be bundled */
  const bundled = new Set(names.filter(n => n.startsWith('assets/')).map(n => n.slice(7)));
  const missing = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) { if (f.name !== 'downloads') walk(p); continue; }
      const rel = path.relative(path.join(ROOT, 'public'), p).split(path.sep).join('/');
      if (!bundled.has(rel)) missing.push(rel);
    }
  })(path.join(ROOT, 'public'));
  ok(missing.length === 0, 'every public/ file is bundled as an asset', missing.slice(0, 3).join(', '));

  /* ---- real apksigner verify through the bundled JRE ---- */
  const java = path.join(ROOT, 'tools', '.cache', 'venv', 'lib',
    fs.readdirSync(path.join(ROOT, 'tools', '.cache', 'venv', 'lib'))[0],
    'site-packages', 'jdk4py', 'java-runtime', 'bin', 'java');
  const apksigner = path.join(ROOT, 'tools', '.cache', 'adt', 'tools', 'apksigner.jar');
  if (fs.existsSync(java) && fs.existsSync(apksigner)) {
    let out = '';
    try {
      out = execFileSync(java, ['-jar', apksigner, 'verify', '--verbose',
        '--min-sdk-version', '23', APK], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
    ok(/Verifies/.test(out), 'apksigner verify: Verifies');
    ok(/v1 scheme \(JAR signing\): true/.test(out), 'apksigner verify: v1 true');
    ok(/v2 scheme \(APK Signature Scheme v2\): true/.test(out), 'apksigner verify: v2 true');
    ok(/v3 scheme \(APK Signature Scheme v3\): true/.test(out), 'apksigner verify: v3 true');
    ok(/Number of signers: 1/.test(out), 'apksigner verify: exactly 1 signer');
  } else {
    skip('apksigner verify (tools/.cache missing — the APK was signed and verified at build time; run `python3 tools/build-apk.py` to re-verify)');
  }

  /* ---- the web app itself must reference the APK consistently ---- */
  const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
  ok(!sw.includes('__VERSION__') && !sw.includes('__ASSETS__'),
    'sw.js has no unfilled placeholders (build-pwa.js was run)');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'manifest.webmanifest'), 'utf8'));
  ok(manifest.name === 'Trill Tuner' && manifest.short_name === 'Trill Tuner', 'web manifest names the app "Trill Tuner"');
  ok(manifest.icons.length >= 3, 'web manifest lists icons', manifest.icons.length + ' icons');

  const sha = crypto.createHash('sha256').update(fs.readFileSync(APK)).digest('hex');
  console.log(`\nAPK sha256: ${sha}`);
  console.log(failures === 0
    ? `✅ APK structural test passed${skips ? ` (${skips} skipped)` : ''}`
    : `❌ ${failures} APK check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
