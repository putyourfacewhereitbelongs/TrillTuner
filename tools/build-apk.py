#!/usr/bin/env python3
"""Build public/downloads/TrillTuner.apk — the Trill Tuner Android app.

The APK is a WebView shell around the web app, so it always ships exactly
the code the E2E suite tests. No Android SDK and no Gradle are needed —
the pipeline uses only free tools it can fetch itself:

  1. smali (from the stray-coding/ADT GitHub repo) assembles the hand-written
     WebView shell in apk-src/smali into classes.dex
  2. aapt2 (pypi wheel) compiles apk-src/res and links apk-src/AndroidManifest.xml
     plus the whole public/ folder as assets into base.apk
  3. classes.dex is merged in with a small zip writer that keeps
     resources.arsc + AndroidManifest.xml STORED and 4-byte aligned
     (required for targetSdk 30+)
  4. apksigner (same ADT repo) signs with v1 + v2 + v3 using a keystore that
     keytool (bundled JRE from the jdk4py pypi package) creates on first run
  5. apksigner verify + androguard validate the result

First run downloads ~110 MB of tools into tools/.cache/ (git-ignored).
Re-running is incremental. Usage:  python3 tools/build-apk.py
"""
import glob
import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
import zipfile
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')
APK_SRC = os.path.join(ROOT, 'apk-src')
BUILD = os.path.join(ROOT, 'build', 'apk')
CACHE = os.path.join(ROOT, 'tools', '.cache')
VENV = os.path.join(CACHE, 'venv')
ADT = os.path.join(CACHE, 'adt')
KEYSTORE = os.path.join(CACHE, 'trilltuner.jks')
KEYPASS_FILE = os.path.join(CACHE, 'keystore.pass')
OUT_DIR = os.path.join(PUBLIC, 'downloads')
OUT = os.path.join(OUT_DIR, 'TrillTuner.apk')

ADT_SPARSE = ['tools/apksigner.jar', 'tools/aab/android.jar', 'tools/aab/smali.jar']
KEYSTORE_PASS = 'trilltuner-build-key'


def run(cmd, **kw):
    print('  $', ' '.join(cmd) if isinstance(cmd, list) else cmd, flush=True)
    return subprocess.run(cmd, cwd=ROOT, check=True, **kw)


def ensure_venv():
    """Create tools/.cache/venv with aapt2 + jdk4py (JRE) + androguard."""
    py = os.path.join(VENV, 'bin', 'python')
    if os.path.exists(py):
        return py
    os.makedirs(CACHE, exist_ok=True)
    print('[*] creating venv (one-time, ~1 min)')
    run([sys.executable, '-m', 'venv', VENV])
    run([py, '-m', 'pip', 'install', '--quiet', '--disable-pip-version-check',
         'aapt2', 'jdk4py', 'androguard'])
    return py


def ensure_adt_tools():
    """Sparse-clone the ADT repo (apksigner.jar, smali.jar, android.jar)."""
    jar = os.path.join(ADT, 'tools', 'apksigner.jar')
    if os.path.exists(jar) and os.path.exists(os.path.join(ADT, 'tools', 'aab', 'smali.jar')):
        return
    print('[*] fetching Android build tools from GitHub (one-time, ~110 MB)')
    if os.path.exists(ADT):
        shutil.rmtree(ADT)
    os.makedirs(CACHE, exist_ok=True)
    run(['git', 'clone', '--quiet', '--filter=blob:none', '--no-checkout', '--sparse',
         'https://github.com/stray-coding/ADT.git', ADT])
    run(['git', '-C', ADT, 'sparse-checkout', 'set'] + ADT_SPARSE)
    run(['git', '-C', ADT, 'checkout', 'main'])


def java_bin():
    hits = glob.glob(os.path.join(VENV, 'lib', 'python*', 'site-packages',
                                  'jdk4py', 'java-runtime', 'bin', 'java'))
    if not hits:
        raise SystemExit('jdk4py JRE not found in the venv — re-run with a fresh tools/.cache')
    return hits[0]


def aapt2_bin():
    hits = glob.glob(os.path.join(VENV, 'lib', 'python*', 'site-packages',
                                  'aapt2', 'bin', 'Linux', 'aapt2'))
    if not hits:
        raise SystemExit('aapt2 binary not found in the venv')
    os.chmod(hits[0], 0o755)
    return hits[0]


def ensure_keystore(java):
    if os.path.exists(KEYSTORE):
        return
    os.makedirs(CACHE, exist_ok=True)
    print('[*] generating signing keystore (one-time)')
    run([java.replace('bin/java', 'bin/keytool'),
         '-genkeypair', '-keystore', KEYSTORE, '-storetype', 'JKS',
         '-alias', 'trilltuner', '-keyalg', 'RSA', '-keysize', '2048',
         '-validity', '10950', '-storepass', KEYSTORE_PASS, '-keypass', KEYSTORE_PASS,
         '-dname', 'CN=Trill Tuner, OU=TrillTuner, O=TrillTuner, C=US'])


def app_version():
    with open(os.path.join(ROOT, 'package.json')) as f:
        return json.load(f)['version']


def stage_assets():
    """Copy public/ into build/assets, excluding the APK download itself."""
    dst = os.path.join(BUILD, 'assets')
    if os.path.exists(dst):
        shutil.rmtree(dst)

    def ignore(_dir, names):
        return {'downloads'} & set(names)

    shutil.copytree(PUBLIC, dst, ignore=ignore)
    return dst


def build_base_apk(aapt2, android_jar, version):
    os.makedirs(BUILD, exist_ok=True)
    res_zip = os.path.join(BUILD, 'res.zip')
    base = os.path.join(BUILD, 'base.apk')
    print('[*] aapt2 compile res')
    run([aapt2, 'compile', '--dir', os.path.join(APK_SRC, 'res'), '-o', res_zip])
    print('[*] aapt2 link manifest + assets')
    run([aapt2, 'link', '-o', base,
         '-I', android_jar,
         '--manifest', os.path.join(APK_SRC, 'AndroidManifest.xml'),
         '--min-sdk-version', '24', '--target-sdk-version', '34',
         '--version-code', '2', '--version-name', version,
         '-A', os.path.join(BUILD, 'assets'),
         res_zip])
    return base


def build_classes_dex(java):
    smali_jar = os.path.join(ADT, 'tools', 'aab', 'smali.jar')
    dex = os.path.join(BUILD, 'classes.dex')
    print('[*] smali assemble shell')
    run([java, '-jar', smali_jar, 'assemble', os.path.join(APK_SRC, 'smali'), '-o', dex])
    return dex


# ---------------------------------------------------------------- zip writer
def write_aligned_zip(entries, out_path):
    """entries: [(name, data, method, align4)]. Writes a zip where align4
    entries are STORED and their data starts at a 4-byte boundary (the
    zipalign rules Android enforces for resources.arsc on targetSdk 30+)."""
    central = []
    offset = 0
    with open(out_path, 'wb') as f:
        for name, data, method, align in entries:
            name_b = name.encode('utf-8')
            crc = zlib.crc32(data) & 0xffffffff
            if method == zipfile.ZIP_STORED:
                comp = data
            else:
                c = zlib.compressobj(9, zlib.DEFLATED, -15)
                comp = c.compress(data) + c.flush()
            extra = b''
            if align:
                need = (4 - ((offset + 30 + len(name_b)) % 4)) % 4
                if 0 < need < 4:
                    need += 4
                if need:
                    extra = struct.pack('<HH', 0xd935, need - 4) + b'\x00' * (need - 4)
            local = struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0, method, 0, 0,
                                crc, len(comp), len(data), len(name_b), len(extra))
            f.write(local)
            f.write(name_b)
            f.write(extra)
            f.write(comp)
            central.append(struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0,
                                       method, 0, 0, crc, len(comp), len(data),
                                       len(name_b), len(extra), 0, 0, 0, 0, offset)
                           + name_b + extra)
            offset += len(local) + len(name_b) + len(extra) + len(comp)
        cd_offset = offset
        cd_size = 0
        for rec in central:
            f.write(rec)
            cd_size += len(rec)
        f.write(struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(central), len(central),
                            cd_size, cd_offset, 0))


def merge_dex(base_apk, classes_dex, out_apk):
    """base.apk + classes.dex -> out_apk, with resources.arsc and the binary
    AndroidManifest.xml STORED and 4-aligned."""
    with open(classes_dex, 'rb') as f:
        dex_bytes = f.read()
    entries = []
    with zipfile.ZipFile(base_apk) as zin:
        for info in zin.infolist():
            data = zin.read(info.filename)
            method = info.compress_type
            align = info.filename in ('resources.arsc', 'AndroidManifest.xml')
            if align:
                method = zipfile.ZIP_STORED
            entries.append((info.filename, data, method, align))
            if info.filename == 'AndroidManifest.xml':
                entries.append(('classes.dex', dex_bytes, zipfile.ZIP_DEFLATED, False))
    write_aligned_zip(entries, out_apk)


def sign(java, aligned_apk):
    apksigner = os.path.join(ADT, 'tools', 'apksigner.jar')
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp_out = OUT + '.tmp'
    print('[*] apksigner sign (v1 + v2 + v3)')
    run([java, '-jar', apksigner, 'sign',
         '--ks', KEYSTORE, '--ks-pass', 'pass:' + KEYSTORE_PASS,
         '--key-pass', 'pass:' + KEYSTORE_PASS,
         '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true',
         '--v3-signing-enabled', 'true',
         '--out', tmp_out, aligned_apk])
    os.replace(tmp_out, OUT)
    idsig = tmp_out + '.idsig'
    if os.path.exists(idsig):
        os.remove(idsig)   # v4 signature sidecar — not wanted in the download dir
    print('[*] apksigner verify')
    # --min-sdk-version 23 makes apksigner actually check the v1 (JAR) scheme
    # too — with minSdk 24 it skips v1 as "not required" and reports false.
    res = subprocess.run([java, '-jar', apksigner, 'verify', '--verbose',
                          '--min-sdk-version', '23', OUT],
                         cwd=ROOT, capture_output=True, text=True)
    print(res.stdout.strip())
    if res.returncode != 0:
        print(res.stderr)
        raise SystemExit('apksigner verify FAILED')
    if 'Verifies' not in res.stdout:
        raise SystemExit('apksigner verify did not report "Verifies"')


def main():
    os.makedirs(BUILD, exist_ok=True)
    print('[*] refreshing service-worker asset list')
    run(['node', os.path.join(ROOT, 'tools', 'build-pwa.js')])

    py = ensure_venv()
    ensure_adt_tools()
    java = java_bin()
    aapt2 = aapt2_bin()
    ensure_keystore(java)
    version = app_version()

    stage_assets()
    base = build_base_apk(aapt2, os.path.join(ADT, 'tools', 'aab', 'android.jar'), version)
    dex = build_classes_dex(java)
    aligned = os.path.join(BUILD, 'aligned.apk')
    print('[*] merge classes.dex + align')
    merge_dex(base, dex, aligned)
    sign(java, aligned)

    with open(OUT, 'rb') as f:
        blob = f.read()
    with zipfile.ZipFile(OUT) as z:
        names = z.namelist()
    assets = [n for n in names if n.startswith('assets/')]
    print()
    print('✅ APK built: %s' % os.path.relpath(OUT, ROOT))
    print('   size      : %.1f MB' % (len(blob) / 1048576))
    print('   sha256    : %s' % hashlib.sha256(blob).hexdigest()[:16] + '…')
    print('   entries   : %d (%d assets, classes.dex=%s, resources.arsc=%s)'
          % (len(names), len(assets),
             'classes.dex' in names, 'resources.arsc' in names))
    print('   version   : %s (package com.trilltuner.app, "Trill Tuner")' % version)


if __name__ == '__main__':
    main()
