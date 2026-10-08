/* PWA / offline / demo-tour / QR-share / remote-sync / APK-shell / mobile E2E.
 *
 * Verifies, in headless Chrome against the real server:
 *   1. the web app manifest + PWA meta tags + icons
 *   2. the service worker registers and the app is 100% OFFLINE after first load
 *      (reload with the network cut — the tuner still runs end to end)
 *   3. the guided demo: auto-start, every step one by one, Next/Skip/Back,
 *      saved progress + resume after reload
 *   4. the APK share card: QR code + link to /download/trill-tuner.apk, which
 *      the app hosts itself (bytes identical to the built APK, range requests)
 *   5. the remote tuner: two pages sync live over LAN sessions (SSE)
 *   6. the APK shell simulation: the app loaded over file:// — exactly how the
 *      Android WebView loads it (no server, no service worker, no bridge)
 *   7. a mobile viewport: no overflow, stacked cards, tap-friendly controls,
 *      the tuner works at phone size
 *   8. speed: boot time and mic-to-detection latency are measured, not assumed
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const puppeteer = require('puppeteer');

const BASE = 'http://localhost:3000';
const DIR = __dirname;
let failures = 0;

function ok(cond, label, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra != null ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

async function launch(wav) {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${path.join(DIR, wav || 'e2_in_tune.wav')}`,
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });
  page._errors = [];
  page.on('pageerror', e => page._errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') page._errors.push('console: ' + m.text()); });
  return { browser, page };
}

async function waitFor(page, fn, timeout, label) {
  try {
    await page.waitForFunction(fn, { timeout: timeout || 8000, polling: 150 });
    return true;
  } catch (e) {
    console.log('TIMEOUT waiting for: ' + label);
    return false;
  }
}

async function dismissSplashAndDemo(page) {
  try {
    await page.evaluate(() => {
      if (window.TT && window.TT.splash && window.TT.splash.dismiss) window.TT.splash.dismiss();
      const s = document.getElementById('splash');
      if (s) { s.classList.add('splash-out'); s.hidden = true; }
      document.body.classList.remove('splash-on');
      if (window.TT && window.TT.demo && window.TT.demo.hide) window.TT.demo.hide();
    });
  } catch (e) { /* page may not be ready */ }
}

const canvasPainted = sel => page => page.evaluate(s => {
  const c = document.querySelector(s);
  if (!c || !c.width) return false;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let dark = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i] < 128 && d[i + 3] > 0) dark++; }
  return dark > 50;
}, sel);

/* the 26 demo steps: view + (tab) the tour must land on, in order */
const TOUR = [
  ['tune'], ['tune'], ['tune'], ['tune'], ['tune'], ['tune'],
  ['metronome'], ['metronome'],
  ['record'], ['lyrics'], ['songs'], ['styles'], ['maker'], ['stems'],
  ['backing'], ['listening'],
  ['learn', 'beginner'], ['learn', 'drills'],
  ['tools', 'scales'], ['tools', 'circle'], ['tools', 'builder'],
  ['rig'], ['mine'], ['progress'], ['care'], ['tune']
];

(async () => {
  /* ==================== 1. manifest + PWA meta + icons ==================== */
  console.log('\n== 1. PWA manifest & meta ==');
  {
    const { browser, page } = await launch();
    const res = await page.goto(BASE + '/manifest.webmanifest');
    ok(res.status() === 200, 'GET /manifest.webmanifest → 200');
    ok((res.headers()['content-type'] || '').includes('application/manifest+json'),
      'manifest served as application/manifest+json', res.headers()['content-type']);
    const man = await res.json();
    ok(man.name === 'Trill Tuner' && man.short_name === 'Trill Tuner', 'manifest: name/short_name "Trill Tuner"');
    ok(man.display === 'standalone', 'manifest: display standalone');
    ok(man.theme_color === '#f59e0b' && man.background_color === '#0b0d12', 'manifest: theme/background colours');
    ok(man.start_url === '/', 'manifest: start_url /');
    ok(Array.isArray(man.icons) && man.icons.length >= 3, 'manifest: icons listed', man.icons.length + ' icons');
    for (const icon of man.icons) {
      const r = await page.goto(BASE + icon.src);
      ok(r.status() === 200 && (r.headers()['content-type'] || '').includes('image/png'),
        'icon served: ' + icon.src, r.headers()['content-type']);
    }
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    const meta = await page.evaluate(() => ({
      manifest: (document.querySelector('link[rel="manifest"]') || {}).getAttribute ? document.querySelector('link[rel="manifest"]').getAttribute('href') : null,
      theme: (document.querySelector('meta[name="theme-color"]') || {}).content,
      appleCapable: (document.querySelector('meta[name="apple-mobile-web-app-capable"]') || {}).content,
      appleTitle: (document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content,
      appleIcon: (document.querySelector('link[rel="apple-touch-icon"]') || {}).getAttribute ? document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href') : null,
      viewport: (document.querySelector('meta[name="viewport"]') || {}).content,
      swScript: !!document.querySelector('script') && /serviceWorker/.test(document.head.innerHTML)
    }));
    ok(meta.manifest === '/manifest.webmanifest', 'index.html links the manifest');
    ok(meta.theme === '#f59e0b', 'meta theme-color #f59e0b');
    ok(meta.appleCapable === 'yes', 'apple-mobile-web-app-capable yes');
    ok(meta.appleTitle === 'Trill Tuner', 'apple-mobile-web-app-title "Trill Tuner"');
    ok(meta.appleIcon === '/icons/apple-touch-icon.png', 'apple-touch-icon linked');
    ok(/maximum-scale=1/.test(meta.viewport) && /viewport-fit=cover/.test(meta.viewport),
      'mobile viewport: maximum-scale=1 + viewport-fit=cover', meta.viewport);
    const swRes = await page.goto(BASE + '/sw.js');
    ok((swRes.headers()['content-type'] || '').includes('text/javascript'), 'sw.js served as JavaScript');
    ok(page._errors.length === 0, 'no JS errors on load', page._errors.slice(0, 3).join(' | '));
    await browser.close();
  }

  /* ==================== 2. service worker + 100% offline ==================== */
  console.log('\n== 2. service worker & offline ==');
  {
    const { browser, page } = await launch();
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await dismissSplashAndDemo(page);
    const swOk = await waitFor(page, () => navigator.serviceWorker && navigator.serviceWorker.getRegistration
      ? navigator.serviceWorker.getRegistration().then(r => !!(r && (r.active || r.installing))) : false,
    10000, 'service worker registered');
    ok(swOk, 'service worker registered');
    const cached = await waitFor(page, async () => {
      if (!window.caches) return false;
      const keys = await caches.keys();
      if (!keys.length) return false;
      const c = await caches.open(keys[0]);
      const reqs = await c.keys();
      return reqs.length >= 50;
    }, 15000, 'precache primed (>=50 assets)');
    ok(cached, 'precache primed after first load');

    /* cut the network and reload — the app must boot fully offline */
    await page.setOfflineMode(true);
    page._errors = [];
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissSplashAndDemo(page);
    const offline = await page.evaluate(() => ({
      hasApp: !!(window.TT && TT.app && TT.app.showView),
      nav: document.querySelectorAll('.nav-btn').length,
      tuneView: !!document.getElementById('view-tune'),
      bg: getComputedStyle(document.body).backgroundColor,
      stylesheetApplied: getComputedStyle(document.querySelector('.card')).borderRadius !== '',
      swController: !!navigator.serviceWorker.controller
    }));
    ok(offline.hasApp, 'offline reload: app boots (TT.app present)');
    ok(offline.nav === 16, 'offline reload: all 16 nav buttons rendered', String(offline.nav));
    ok(offline.tuneView, 'offline reload: tune view present');
    ok(offline.bg === 'rgb(11, 13, 18)', 'offline reload: stylesheet applied from cache', offline.bg);
    ok(offline.stylesheetApplied, 'offline reload: card styles applied');
    ok(offline.swController, 'offline reload: page controlled by the service worker');

    /* the tuner itself must work with zero network */
    await page.click('#btn-mic-start');
    const tuned = await waitFor(page, () => {
      const n = document.getElementById('note-detected').textContent;
      return n === 'E' && document.querySelector('#view-tune .wave-card').classList.contains('in-tune');
    }, 12000, 'offline tuner detects in-tune E from the fake mic');
    ok(tuned, 'offline: tuner detects the in-tune low E (full DSP offline)');
    ok(page._errors.length === 0, 'offline: zero JS errors', page._errors.slice(0, 3).join(' | '));
    await page.setOfflineMode(false);
    await browser.close();
  }

  /* ==================== 3. guided demo ==================== */
  console.log('\n== 3. guided demo ==');
  {
    const { browser, page } = await launch();
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { if (window.TT && window.TT.splash && window.TT.splash.dismiss) window.TT.splash.dismiss(); });
    const auto = await waitFor(page, () => !document.getElementById('demo-overlay').hidden
      && document.getElementById('demo-step').textContent.length > 0, 12000, 'demo auto-starts on first visit');
    ok(auto, 'demo auto-starts on the first visit (skippable)');
    let st = await page.evaluate(() => ({
      step: document.getElementById('demo-step').textContent,
      title: document.getElementById('demo-title').textContent,
      hasNext: !!document.getElementById('demo-next'),
      hasSkip: !!document.getElementById('demo-skip'),
      hasBack: !!document.getElementById('demo-back'),
      backDisabled: document.getElementById('demo-back').disabled,
      dots: document.querySelectorAll('#demo-dots i').length
    }));
    ok(st.step === '1 / 26', 'demo starts at step 1 / 26', st.step);
    ok(st.title.length > 0, 'demo step has a title', st.title);
    ok(st.hasNext && st.hasSkip && st.hasBack, 'demo has Next + Skip + Back buttons');
    ok(st.backDisabled, 'Back is disabled on the first step');
    ok(st.dots === 26, 'demo shows 26 progress dots', String(st.dots));

    /* walk every step, one by one, checking view + tab + saved progress */
    let walkOk = true;
    for (let i = 0; i < TOUR.length; i++) {
      const [view, tab] = TOUR[i];
      const before = await page.evaluate(() => document.getElementById('demo-step').textContent);
      if (i > 0) { await page.click('#demo-next'); await new Promise(r => setTimeout(r, 350)); }
      const after = await page.evaluate(() => ({
        step: document.getElementById('demo-step').textContent,
        view: document.querySelector('.view.active').id,
        saved: Number(JSON.parse(localStorage.getItem('tt.demoStep') || '0')),
        tab: document.querySelector('.view.active .tabs .tab.active') ? document.querySelector('.view.active .tabs .tab.active').getAttribute('data-tab') : null
      }));
      const wantStep = (i + 1) + ' / 26';
      if (after.step !== wantStep) { console.log('  step mismatch: ' + before + ' → ' + after.step); walkOk = false; }
      if (after.view !== 'view-' + view) { console.log('  view mismatch at step ' + (i + 1) + ': ' + after.view + ' != view-' + view); walkOk = false; }
      if (after.saved !== i) { console.log('  progress not saved at step ' + (i + 1) + ': ' + after.saved); walkOk = false; }
      if (tab && after.tab !== tab) { console.log('  tab mismatch at step ' + (i + 1) + ': ' + after.tab + ' != ' + tab); walkOk = false; }
    }
    ok(walkOk, 'demo walks all 26 steps — every section covered one by one, progress saved each step');

    /* Back goes one step back */
    await page.click('#demo-back');
    await new Promise(r => setTimeout(r, 300));
    st = await page.evaluate(() => document.getElementById('demo-step').textContent);
    ok(st === '25 / 26', 'Back returns to the previous step', st);

    /* finish */
    await page.click('#demo-next');
    await page.click('#demo-next');   /* 26 → Finish */
    await new Promise(r => setTimeout(r, 400));
    st = await page.evaluate(() => ({
      visible: !document.getElementById('demo-overlay').hidden,
      done: localStorage.getItem('tt.demoDone') === 'true'
    }));
    ok(!st.visible && st.done, 'Finish completes the tour and marks it done');

    /* restart from the settings button, then Skip */
    await page.evaluate(() => { window.TT.app.showView('tune'); });
    await page.click('#btn-tour');
    await new Promise(r => setTimeout(r, 400));
    st = await page.evaluate(() => document.getElementById('demo-step').textContent);
    ok(st === '1 / 26', '"Take the tour" restarts the tour from step 1', st);
    await page.click('#demo-skip');
    await new Promise(r => setTimeout(r, 300));
    st = await page.evaluate(() => ({
      visible: !document.getElementById('demo-overlay').hidden,
      done: localStorage.getItem('tt.demoDone') === 'true'
    }));
    ok(!st.visible && st.done, 'Skip closes the tour and marks it done');

    /* resume after a reload mid-tour */
    await page.click('#btn-tour');
    await new Promise(r => setTimeout(r, 300));
    await page.click('#demo-next');
    await page.click('#demo-next');
    await page.click('#demo-next');
    await new Promise(r => setTimeout(r, 300));
    const savedStep = await page.evaluate(() => Number(JSON.parse(localStorage.getItem('tt.demoStep') || '0')));
    /* simulate "closed the tab mid-tour": tour not marked done */
    await page.evaluate(() => { localStorage.removeItem('tt.demoDone'); });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.evaluate(() => { if (window.TT && window.TT.splash && window.TT.splash.dismiss) window.TT.splash.dismiss(); });
    const resume = await waitFor(page, () => {
      const t = Array.from(document.querySelectorAll('.toast')).find(t => /saved at step/.test(t.textContent));
      return !!t;
    }, 8000, 'resume toast after reload');
    ok(resume, 'after a reload mid-tour a "resume" toast offers to continue');
    ok(savedStep === 3, 'progress was saved at step 4 (index 3)', String(savedStep));
    await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.toast')).find(t => /saved at step/.test(t.textContent));
      if (t) t.querySelector('button').click();
    });
    await new Promise(r => setTimeout(r, 500));
    st = await page.evaluate(() => ({
      visible: !document.getElementById('demo-overlay').hidden,
      step: document.getElementById('demo-step').textContent
    }));
    ok(st.visible && st.step === '4 / 26', 'resume continues exactly at the saved step', st.step);
    ok(page._errors.length === 0, 'demo: zero JS errors', page._errors.slice(0, 3).join(' | '));
    await browser.close();
  }

  /* ==================== 4. APK share card + self-hosted download ==================== */
  console.log('\n== 4. APK share card & download ==');
  {
    const { browser, page } = await launch();
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await dismissSplashAndDemo(page);
    await page.click('[data-view="progress"]');
    await new Promise(r => setTimeout(r, 1200));
    const card = await page.evaluate(() => ({
      card: !!document.querySelector('.apk-card'),
      link: document.getElementById('apk-link').value,
      meta: document.getElementById('apk-meta').textContent,
      qr: (() => { const c = document.getElementById('apk-qr'); return c.width + 'x' + c.height; })()
    }));
    ok(card.card, 'progress view shows the "Get the Android app" card');
    ok(card.link === BASE + '/download/trill-tuner.apk', 'share link points at the self-hosted APK', card.link);
    ok(/MB/.test(card.meta), 'card shows the APK size', card.meta);
    ok(await canvasPainted('#apk-qr')(page), 'QR code painted on the card canvas', card.qr);

    const head = await page.evaluate(async () => {
      const r = await fetch('/download/trill-tuner.apk', { method: 'HEAD' });
      return { status: r.status, type: r.headers.get('content-type'), disp: r.headers.get('content-disposition'),
        len: Number(r.headers.get('content-length')), ver: r.headers.get('x-apk-version'), range: r.headers.get('accept-ranges') };
    });
    ok(head.status === 200, 'HEAD /download/trill-tuner.apk → 200');
    ok(head.type === 'application/vnd.android.package-archive', 'APK MIME type', head.type);
    ok(/attachment; filename="TrillTuner.apk"/.test(head.disp || ''), 'Content-Disposition attachment', head.disp);
    ok(head.ver === '2.1.0', 'X-APK-Version header matches the app', head.ver);
    ok(head.range === 'bytes', 'Accept-Ranges: bytes');
    const disk = fs.readFileSync(path.join(DIR, '..', 'public', 'downloads', 'TrillTuner.apk'));
    ok(head.len === disk.length, 'Content-Length matches the built APK', head.len + ' vs ' + disk.length);

    const served = await page.evaluate(async () => {
      const r = await fetch('/download/trill-tuner.apk');
      const b = await r.arrayBuffer();
      const bytes = new Uint8Array(b);
      let h = 0;
      for (let i = 0; i < bytes.length; i++) h = (h * 31 + bytes[i]) >>> 0;
      return { status: r.status, len: bytes.length, hash: h.toString(16), head: Array.from(bytes.subarray(0, 4)) };
    });
    let diskHash = 0;
    for (const b of disk) diskHash = (diskHash * 31 + b) >>> 0;
    ok(served.status === 200 && served.len === disk.length && served.hash === diskHash.toString(16),
      'GET serves the exact built APK bytes', served.len + ' bytes');
    ok(served.head.join(',') === '80,75,3,4', 'served file is a ZIP (PK\\x03\\x04)');

    const range = await page.evaluate(async () => {
      const r = await fetch('/download/trill-tuner.apk', { headers: { Range: 'bytes=0-99' } });
      const b = await r.arrayBuffer();
      return { status: r.status, len: b.byteLength, cr: r.headers.get('content-range') };
    });
    ok(range.status === 206 && range.len === 100 && /bytes 0-99\//.test(range.cr || ''),
      'Range request → 206 partial content', JSON.stringify(range));

    /* the SW must runtime-cache the download so it works offline too */
    await page.evaluate(async () => { await fetch('/download/trill-tuner.apk'); });
    await new Promise(r => setTimeout(r, 800));
    const swCached = await page.evaluate(async () => {
      const keys = await caches.keys();
      for (const k of keys) {
        const c = await caches.open(k);
        const m = await c.match('/download/trill-tuner.apk');
        if (m) return true;
      }
      return false;
    });
    ok(swCached, 'service worker runtime-caches the APK download');
    ok(page._errors.length === 0, 'share card: zero JS errors', page._errors.slice(0, 3).join(' | '));
    await browser.close();
  }

  /* ==================== 5. remote tuner — two devices, live sync ==================== */
  console.log('\n== 5. remote tuner sync ==');
  {
    const { browser, page: host } = await launch('e2_in_tune.wav');
    await host.goto(BASE, { waitUntil: 'networkidle0' });
    await dismissSplashAndDemo(host);
    await host.click('#btn-mic-start');
    const hostTuned = await waitFor(host, () => {
      return document.getElementById('note-detected').textContent === 'E'
        && document.querySelector('#view-tune .wave-card').classList.contains('in-tune');
    }, 12000, 'host tuner in tune');
    ok(hostTuned, 'host device is in tune (low E)');

    await host.click('#btn-remote-host');
    const hosted = await waitFor(host, () => !document.getElementById('remote-qr-wrap').hidden
      && document.getElementById('remote-link').value.length > 0, 8000, 'session hosted');
    ok(hosted, 'hosting a session shows the QR + link');
    const link = await host.evaluate(() => document.getElementById('remote-link').value);
    ok(/\/\?join=[a-f0-9]{10}$/.test(link), 'join link carries the session id', link);
    ok(await canvasPainted('#remote-qr')(host), 'session QR code painted');
    const joinId = link.split('join=')[1];

    /* second device joins by scanning/opening the link */
    const joiner = await browser.newPage();
    joiner._errors = [];
    joiner.on('pageerror', e => joiner._errors.push('pageerror: ' + e.message));
    joiner.on('console', m => { if (m.type() === 'error') joiner._errors.push('console: ' + m.text()); });
    await joiner.setViewport({ width: 1400, height: 950 });
    /* domcontentloaded: the page keeps a live SSE connection open, so the
     * network never goes idle on this one */
    await joiner.goto(link, { waitUntil: 'domcontentloaded' });
    await dismissSplashAndDemo(joiner);
    const joined = await waitFor(joiner, () => !document.getElementById('remote-join').hidden, 8000, 'joiner panel');
    ok(joined, 'second device joins the session automatically (?join=)');
    /* the mic auto-starts when the profile already granted it (same origin as
     * the host page here) — otherwise start it by hand */
    const joinerMicAuto = await joiner.evaluate(() => document.getElementById('mic-overlay').hidden);
    if (!joinerMicAuto) await joiner.click('#btn-mic-start');
    const joinerTuned = await waitFor(joiner, () => {
      return document.getElementById('note-detected').textContent === 'E'
        && document.querySelector('#view-tune .wave-card').classList.contains('in-tune');
    }, 12000, 'joiner tuner in tune');
    ok(joinerTuned, 'joiner device is in tune too' + (joinerMicAuto ? ' (mic auto-started)' : ''));

    /* host sees the joiner's live state (SSE both ways) */
    const hostSees = await waitFor(host, () => {
      const live = document.getElementById('remote-live');
      return !live.hidden && document.getElementById('remote-note').textContent === 'E'
        && document.getElementById('remote-cents').textContent !== '–¢'
        && document.getElementById('remote-status-line').textContent.length > 0;
    }, 12000, 'host sees the joiner live state');
    ok(hostSees, 'host mirrors the joiner: note + cents + status live');
    const hostStatus = await host.evaluate(() => document.getElementById('remote-status').textContent);
    ok(/connected/i.test(hostStatus), 'host UI reports the connected device', hostStatus);

    /* joiner sees the host's live state */
    const joinerSees = await waitFor(joiner, () => {
      return document.getElementById('remote-peer-note').textContent === 'E'
        && document.getElementById('remote-peer-cents').textContent !== '–¢'
        && /IN TUNE|in tune/i.test(document.getElementById('remote-peer-line').textContent);
    }, 12000, 'joiner sees the host live state');
    ok(joinerSees, 'joiner mirrors the host: note + cents + in-tune status live');

    const peerCents = await joiner.evaluate(() => document.getElementById('remote-peer-cents').textContent);
    ok(/¢/.test(peerCents), 'cents value mirrored to the joiner', peerCents);

    /* stop hosting — the joiner is told */
    await host.click('#btn-remote-stop');
    await new Promise(r => setTimeout(r, 600));
    const left = await waitFor(joiner, () => {
      return /host stopped|left/i.test(document.getElementById('remote-peer-line').textContent + ' '
        + document.getElementById('remote-peer-hint').textContent);
    }, 8000, 'joiner notified when the host stops');
    ok(left, 'joiner is notified when the host stops hosting');
    ok(host._errors.length === 0 && joiner._errors.length === 0, 'remote sync: zero JS errors on both devices',
      (host._errors.concat(joiner._errors)).slice(0, 3).join(' | '));
    await browser.close();
  }

  /* ==================== 6. APK shell simulation — file:// like the WebView ==================== */
  console.log('\n== 6. APK shell (file:// — how the Android WebView loads the app) ==');
  {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        `--use-file-for-fake-audio-capture=${path.join(DIR, 'e2_in_tune.wav')}`,
        '--autoplay-policy=no-user-gesture-required',
        '--mute-audio'
      ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 950 });
    page._errors = [];
    page.on('pageerror', e => page._errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') page._errors.push('console: ' + m.text()); });
    await page.goto('file://' + path.join(DIR, '..', 'public', 'index.html'), { waitUntil: 'domcontentloaded' });
    const boot = await waitFor(page, () => window.TT && TT.app && TT.app.showView
      && document.querySelectorAll('.nav-btn').length === 16, 10000, 'app boots on file://');
    ok(boot, 'file:// (APK shell): the app boots, all 16 nav buttons render');
    await dismissSplashAndDemo(page);
    ok(await page.evaluate(() => !('serviceWorker' in navigator) || !navigator.serviceWorker.controller),
      'file://: no service worker controls the page (registration correctly skipped)');

    /* the tuner must work exactly as it will inside the APK */
    await page.click('#btn-mic-start');
    const tuned = await waitFor(page, () => {
      return document.getElementById('note-detected').textContent === 'E'
        && document.querySelector('#view-tune .wave-card').classList.contains('in-tune');
    }, 12000, 'file:// tuner in tune');
    ok(tuned, 'file:// (APK shell): the tuner detects the in-tune low E — mic works in the WebView context');

    /* hosting a session needs the served web version — degrade gracefully */
    await page.click('#btn-remote-host');
    const hostToast = await waitFor(page, () => {
      return /web version/.test(document.getElementById('toasts').textContent);
    }, 4000, 'hosting toast on file://');
    ok(hostToast, 'file://: hosting a session explains it needs the web version (no crash)');

    /* the share card still renders a usable link with no server at all */
    await page.click('[data-view="progress"]');
    await new Promise(r => setTimeout(r, 1500));
    const link = await page.evaluate(() => ({
      link: document.getElementById('apk-link').value,
      meta: document.getElementById('apk-meta').textContent,
      qr: document.getElementById('apk-qr').width > 0
    }));
    ok(link.link.length > 0 && link.qr, 'file://: the APK share card renders a QR + link with no server', link.link);

    /* no Android bridge outside the APK — every bridge call must be guarded */
    const guarded = await page.evaluate(() => {
      const out = { bridge: typeof window.Android };
      try { window.TT.app.showView('tune'); window.TT.tuner.toggleGig(true); window.TT.tuner.toggleGig(false); out.gig = true; } catch (e) { out.gig = e.message; }
      return out;
    });
    ok(guarded.bridge === 'undefined' && guarded.gig === true,
      'file://: no Android bridge present (as outside the APK) and gig mode is guarded');
    ok(page._errors.length === 0, 'file://: zero JS errors in the APK shell context', page._errors.slice(0, 3).join(' | '));
    await browser.close();
  }

  /* ==================== 7. mobile viewport ==================== */
  console.log('\n== 7. mobile viewport (390×844) ==');
  {
    const { browser, page } = await launch('e2_in_tune.wav');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await dismissSplashAndDemo(page);
    const overflow = [];
    const allViews = ['tune', 'metronome', 'record', 'lyrics', 'songs', 'styles', 'maker',
      'stems', 'backing', 'listening', 'learn', 'tools', 'rig', 'mine', 'progress', 'care'];
    const checkOverflow = async tag => {
      const w = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth, iw: window.innerWidth
      }));
      if (w.sw > w.iw + 1) overflow.push(tag + ' (' + w.sw + '>' + w.iw + ')');
    };
    for (const v of allViews) {
      await page.click(`[data-view="${v}"]`);
      await new Promise(r => setTimeout(r, 450));
      await checkOverflow(v);
    }
    /* the tabbed views must also fit on every tab, not just the default one */
    for (const v of ['learn', 'tools', 'songs']) {
      await page.click(`[data-view="${v}"]`);
      await new Promise(r => setTimeout(r, 300));
      const tabs = await page.evaluate(sel => {
        const view = document.querySelector(sel);
        return view ? Array.from(view.querySelectorAll('.tabs .tab')).map(t => t.getAttribute('data-tab')) : [];
      }, '#view-' + v);
      for (const t of tabs) {
        await page.evaluate(tab => {
          const view = document.querySelector('.view.active');
          const b = view.querySelector(`.tabs .tab[data-tab="${tab}"]`);
          if (b) b.click();
        }, t);
        await new Promise(r => setTimeout(r, 350));
        await checkOverflow(v + '/' + t);
      }
    }
    ok(overflow.length === 0, 'mobile: no horizontal overflow on all 16 views + every tab', overflow.join(', ') || 'all fit');
    /* back to the progress view for the card/QR layout checks */
    await page.click('[data-view="progress"]');
    await new Promise(r => setTimeout(r, 700));
    const layout = await page.evaluate(() => {
      const card = document.querySelector('.remote-card');
      const grid = document.querySelector('.remote-grid');
      /* the apk QR lives in the progress view (the loop ends there); the
       * remote QR sits inside the hidden host panel until a session starts */
      const qr = document.getElementById('apk-qr');
      const btn = document.querySelector('#view-tune .btn');
      return {
        remoteCard: !!card,
        gridCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
        qrWidth: qr ? qr.getBoundingClientRect().width : 0,
        touchAction: btn ? getComputedStyle(btn).touchAction : '',
        tapHighlight: getComputedStyle(document.body).webkitTapHighlightColor
      };
    });
    ok(layout.remoteCard, 'mobile: the remote tuner card is present');
    ok(layout.gridCols === 1, 'mobile: the remote card stacks to one column', layout.gridCols + ' column(s)');
    ok(layout.qrWidth > 0 && layout.qrWidth <= 200, 'mobile: QR canvases shrink to fit', layout.qrWidth + 'px');
    ok(layout.touchAction === 'manipulation', 'mobile: buttons are tap-friendly (touch-action: manipulation)', layout.touchAction);
    /* the demo card must fit a phone screen */
    await page.evaluate(() => { window.TT.app.showView('tune'); });
    await page.click('#btn-tour');
    await new Promise(r => setTimeout(r, 500));
    const demoFit = await page.evaluate(() => {
      const r = document.getElementById('demo-card').getBoundingClientRect();
      return { fits: r.width <= window.innerWidth && r.right <= window.innerWidth + 1, w: Math.round(r.width) };
    });
    ok(demoFit.fits, 'mobile: the demo card fits the phone screen', demoFit.w + 'px wide');
    await page.click('#demo-skip');
    /* the tuner works at phone size */
    await page.click('#btn-mic-start');
    const tuned = await waitFor(page, () => {
      return document.getElementById('note-detected').textContent === 'E'
        && document.querySelector('#view-tune .wave-card').classList.contains('in-tune');
    }, 12000, 'mobile tuner in tune');
    ok(tuned, 'mobile: the tuner works at phone size (in-tune low E)');
    ok(page._errors.length === 0, 'mobile: zero JS errors', page._errors.slice(0, 3).join(' | '));
    await browser.close();
  }

  /* ==================== 8. speed — measured, not assumed ==================== */
  console.log('\n== 8. speed: boot + detection latency ==');
  {
    const { browser, page } = await launch('e2_in_tune.wav');
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const booted = await waitFor(page, () => window.TT && TT.app && TT.app.showView
      && document.querySelectorAll('.nav-btn').length === 16, 15000, 'app boot');
    const bootMs = Date.now() - t0;
    ok(booted && bootMs < 8000, 'app boots fast', bootMs + ' ms (16 views wired)');
    await dismissSplashAndDemo(page);
    const t1 = Date.now();
    await page.click('#btn-mic-start');
    const detected = await waitFor(page, () => {
      return document.getElementById('note-detected').textContent.length === 1
        && document.getElementById('note-detected').textContent !== '–';
    }, 12000, 'first detection');
    const detectMs = Date.now() - t1;
    ok(detected && detectMs < 6000, 'mic → first note detection is quick', detectMs + ' ms');
    const inTune = await waitFor(page, () => {
      return document.querySelector('#view-tune .wave-card').classList.contains('in-tune');
    }, 12000, 'in tune');
    const lockMs = Date.now() - t1;
    ok(inTune && lockMs < 9000, 'mic → in-tune lock is quick', lockMs + ' ms');
    /* remote sync publishes without flooding: count POSTs over 2 s while in tune */
    await page.click('#btn-remote-host');
    await new Promise(r => setTimeout(r, 500));
    const posts = await page.evaluate(async () => {
      let n = 0;
      const orig = window.fetch;
      window.fetch = function (...a) { if (String(a[0]).indexOf('/msg') > 0) n++; return orig.apply(this, a); };
      await new Promise(r => setTimeout(r, 2000));
      window.fetch = orig;
      return n;
    });
    ok(posts <= 30, 'remote sync publishes throttled (≤30 POSTs / 2 s while in tune)', posts + ' POSTs');
    ok(page._errors.length === 0, 'speed: zero JS errors', page._errors.slice(0, 3).join(' | '));
    await browser.close();
  }

  console.log(failures === 0 ? '\n✅ ALL PWA E2E TESTS PASSED' : `\n❌ ${failures} PWA E2E check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
