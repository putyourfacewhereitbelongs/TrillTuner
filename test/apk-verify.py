#!/usr/bin/env python3
"""Deep structural validation of public/downloads/TrillTuner.apk with androguard.

Checks the things a structural zip test cannot see: the decoded binary
AndroidManifest (package, label, version, permissions, launcher activity),
the dex classes the WebView shell needs, the signature schemes and the
signing certificate. Run:  python3 test/apk-verify.py  (uses tools/.cache/venv,
which tools/build-apk.py creates).
"""
import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APK_PATH = os.path.join(ROOT, 'public', 'downloads', 'TrillTuner.apk')

VENV_PY = glob.glob(os.path.join(ROOT, 'tools', '.cache', 'venv', 'bin', 'python'))
PY = VENV_PY[0] if VENV_PY else sys.executable
if PY != sys.executable:
    os.execv(PY, [PY, os.path.abspath(__file__)])

import logging  # noqa: E402
logging.disable(logging.CRITICAL)

from androguard.core.apk import APK  # noqa: E402

failures = []


def check(name, ok, detail=''):
    print('  %s %s%s' % ('✅' if ok else '❌', name, (' — ' + detail) if detail else ''))
    if not ok:
        failures.append(name)


print('[*] androguard deep validation of public/downloads/TrillTuner.apk')
a = APK(APK_PATH)

check('package is com.trilltuner.app', a.get_package() == 'com.trilltuner.app', a.get_package())
check('versionName is 2.1.0', a.get_androidversion_name() == '2.1.0', str(a.get_androidversion_name()))
check('versionCode is 2', str(a.get_androidversion_code()) == '2', str(a.get_androidversion_code()))
check('app label is "Trill Tuner"', a.get_app_name() == 'Trill Tuner', str(a.get_app_name()))

perms = set(a.get_permissions())
want_perms = {'android.permission.INTERNET', 'android.permission.RECORD_AUDIO',
              'android.permission.MODIFY_AUDIO_SETTINGS',
              'android.permission.ACCESS_NETWORK_STATE', 'android.permission.VIBRATE'}
check('all 5 permissions declared', want_perms <= perms, ', '.join(sorted(perms)))

main = a.get_main_activity()
check('launcher activity is com.trilltuner.app.MainActivity',
      main == 'com.trilltuner.app.MainActivity', str(main))

activities = a.get_activities()
check('MainActivity exported + launchable',
      any(act == 'com.trilltuner.app.MainActivity' for act in activities), str(activities))

min_sdk = a.get_min_sdk_version()
tgt_sdk = a.get_target_sdk_version()
check('minSdk 24 / targetSdk 34', str(min_sdk) == '24' and str(tgt_sdk) == '34',
      'min=%s target=%s' % (min_sdk, tgt_sdk))

xml = a.get_android_manifest_xml()
app_el = xml.find('application')
cleartext = app_el is not None and app_el.get('{http://schemas.android.com/apk/res/android}usesCleartextTraffic') == 'true'
check('usesCleartextTraffic enabled', cleartext,
      str(app_el.get('{http://schemas.android.com/apk/res/android}usesCleartextTraffic') if app_el is not None else 'no application element'))

# ---- dex classes ----
dex_classes = set()
for d in a.get_all_dex():
    from androguard.core.dex import DEX
    dx = DEX(d)
    for c in dx.get_classes():
        dex_classes.add(c.get_name())
want_classes = {'Lcom/trilltuner/app/MainActivity;', 'Lcom/trilltuner/app/TClient;',
                'Lcom/trilltuner/app/TChrome;', 'Lcom/trilltuner/app/TBridge;'}
check('all 4 shell classes in classes.dex', want_classes <= dex_classes,
      ', '.join(sorted(dex_classes)))

# the bridge must expose the @JavascriptInterface methods the web app calls
dx = None
for d in a.get_all_dex():
    from androguard.core.dex import DEX
    dx = DEX(d)
    break
methods = set()
for c in dx.get_classes():
    if c.get_name() == 'Lcom/trilltuner/app/TBridge;':
        for m in c.get_methods():
            methods.add(m.get_name())
want_methods = {'getHostBase', 'getVersionName', 'keepScreenOn', 'shareText', 'openUrl'}
check('TBridge exposes all 5 JS methods', want_methods <= methods, ', '.join(sorted(methods)))

# ---- signatures ----
v1 = a.is_signed_v1()
v2 = a.is_signed_v2()
v3 = a.is_signed_v3()
check('signed v1 (JAR)', bool(v1), str(v1))
check('signed v2 (APK Signature Scheme v2)', bool(v2), str(v2))
check('signed v3 (APK Signature Scheme v3)', bool(v3), str(v3))

certs = a.get_certificates()
check('signing certificate present', len(certs) >= 1, '%d cert(s)' % len(certs))
if certs:
    cn = certs[0].issuer.human_friendly
    check('certificate CN is "Trill Tuner"', 'Common Name: Trill Tuner' in cn, cn)

# ---- assets ----
import zipfile
with zipfile.ZipFile(APK_PATH) as z:
    names = z.namelist()
    check('assets/index.html present', 'assets/index.html' in names)
    check('assets/js/app.js present', 'assets/js/app.js' in names)
    check('assets do NOT contain the APK itself',
          not any(n.startswith('assets/downloads/') for n in names))
    with open(os.path.join(ROOT, 'public', 'index.html'), 'rb') as f:
        check('assets/index.html is byte-identical to public/index.html',
              z.read('assets/index.html') == f.read())

print()
if failures:
    print('❌ APK VALIDATION FAILED: %s' % ', '.join(failures))
    sys.exit(1)
print('✅ APK deep validation passed (androguard)')
