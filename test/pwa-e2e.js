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

/* demo steps: view + (tab) the tour must land on, in order */
const TOUR = [
  ['tune'], ['tune'], ['tune'], ['tune'], ['tune'], ['tune'],
  ['metronome'], ['metronome'],
  ['record'], ['lyrics'], ['songs'], ['styles'], ['maker'], ['stems'],
  ['backing'], ['listening'],
  ['learn', 'beginner'], ['learn', 'drills'],
  ['tools', 'scales'], ['tools', 'circle'], ['tools', 'builder'], ['tools', 'looper'],
  ['rig'], ['mine'], ['progress'], ['care'], ['tune']
];
const TOUR_N = TOUR.length;

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
    ok(st.step === '1 / ' + TOUR_N, 'demo starts at step 1 / ' + TOUR_N, st.step);
    ok(st.title.length > 0, 'demo step has a title', st.title);
    ok(st.hasNext && st.hasSkip && st.hasBack, 'demo has Next + Skip + Back buttons');
    ok(st.backDisabled, 'Back is disabled on the first step');
    ok(st.dots === TOUR_N, 'demo shows ' + TOUR_N + ' progress dots', String(st.dots));

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
      const wantStep = (i + 1) + ' / ' + TOUR_N;
      if (after.step !== wantStep) { console.log('  step mismatch: ' + before + ' → ' + after.step); walkOk = false; }
      if (after.view !== 'view-' + view) { console.log('  view mismatch at step ' + (i + 1) + ': ' + after.view + ' != view-' + view); walkOk = false; }
      if (after.saved !== i) { console.log('  progress not saved at step ' + (i + 1) + ': ' + after.saved); walkOk = false; }
      if (tab && after.tab !== tab) { console.log('  tab mismatch at step ' + (i + 1) + ': ' + after.tab + ' != ' + tab); walkOk = false; }
    }
    ok(walkOk, 'demo walks all ' + TOUR_N + ' steps — every section covered one by one, progress saved each step');

    /* Back goes one step back */
    await page.click('#demo-back');
    await new Promise(r => setTimeout(r, 300));
    st = await page.evaluate(() => document.getElementById('demo-step').textContent);
    ok(st === (TOUR_N - 1) + ' / ' + TOUR_N, 'Back returns to the previous step', st);

    /* finish */
    await page.click('#demo-next');
    await page.click('#demo-next');   /* last → Finish */
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
    ok(st === '1 / ' + TOUR_N, '"Take the tour" restarts the tour from step 1', st);
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
    ok(st.visible && st.step === '4 / ' + TOUR_N, 'resume continues exactly at the saved step', st.step);
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
    const joinerStatus = await joiner.evaluate(() => (document.getElementById('remote-join-h') || {}).textContent || '');
    ok(/connected/i.test(joinerStatus), 'joiner UI says it is connected to the host', joinerStatus);

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
      await page.evaluate(id => TT.app.showView(id), v);
      await new Promise(r => setTimeout(r, 350));
      await checkOverflow(v);
    }
    const menu = await page.evaluate(() => {
      const btn = document.getElementById('btn-menu');
      return { shown: !!(btn && getComputedStyle(btn).display !== 'none') };
    });
    ok(menu.shown, 'mobile: a Menu button sits in the top bar so you are not stuck on Tune');
    await page.click('#btn-menu');
    await new Promise(r => setTimeout(r, 280));
    const opened = await page.evaluate(() => document.getElementById('nav').classList.contains('open'));
    ok(opened, 'mobile: Menu opens the navigation drawer');
    await page.click('.sidenav .nav-btn[data-view="stems"]');
    const jumped = await page.evaluate(() => document.getElementById('view-stems').classList.contains('active')
      && !document.getElementById('nav').classList.contains('open'));
    ok(jumped, 'mobile: picking Stems from the menu leaves Tune and closes the drawer');
    /* the tabbed views must also fit on every tab, not just the default one */
    for (const v of ['learn', 'tools', 'songs']) {
      await page.evaluate(id => TT.app.showView(id), v);
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
    await page.evaluate(() => TT.app.showView('progress'));
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

  /* ==================== 9. stem lab — the whole chain ==================== */
  console.log('\n== 9. stem lab: load → separate → play → export → hand off ==');
  {
    const { browser, page } = await launch();
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await dismissSplashAndDemo(page);
    await page.click('.nav-btn[data-view="stems"]');
    await new Promise(r => setTimeout(r, 250));

    /* drop a song on the drop zone the way a browser does it: a real File in a
       real DataTransfer (this is the path a user's drag-and-drop takes) */
    const dropped = await page.evaluate(async () => {
      const sr = 44100, secs = 6, n = sr * secs;
      const bytes = 44 + n * 4;
      const buf = new ArrayBuffer(bytes);
      const v = new DataView(buf);
      const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true);
      v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
      let o = 44;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        /* centred 440 Hz “vocal”, wide 330 Hz “guitar”, 110 Hz bass, a hat every 0.5 s */
        const vocal = Math.sin(2 * Math.PI * 440 * t) * 0.3;
        const guitar = Math.sin(2 * Math.PI * 330 * t) * 0.25;
        const bass = Math.sin(2 * Math.PI * 110 * t) * 0.3;
        const beat = t % 0.5, hat = beat < 0.02 ? (Math.random() * 2 - 1) * 0.3 * (1 - beat / 0.02) : 0;
        [vocal + guitar + bass + hat, vocal - guitar + bass + hat].forEach(s => {
          const x = Math.max(-1, Math.min(1, s));
          v.setInt16(o, Math.round(x < 0 ? x * 0x8000 : x * 0x7fff), true); o += 2;
        });
      }
      const file = new File([buf], 'e2e-song.wav', { type: 'audio/wav' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const el = document.getElementById('st-drop');
      ['dragenter', 'dragover', 'drop'].forEach(type =>
        el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt })));
      return true;
    });
    ok(dropped, 'stem lab: a dropped file is accepted');
    const loaded = await waitFor(page, () => /Loaded/.test(document.getElementById('st-status').textContent), 20000, 'decode');
    ok(loaded, 'stem lab: the dropped song is decoded');
    ok(await page.evaluate(() => !document.getElementById('st-btn-run').disabled),
      'stem lab: “Separate it” unlocks once something is loaded');
    const pre = await page.evaluate(() => {
      const c = document.getElementById('st-wave');
      const g = c && c.getContext && c.getContext('2d');
      let ink = 0;
      if (g) {
        const d = g.getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 8) ink++;
      }
      const t = TT.stems.transport();
      return {
        shown: !document.getElementById('st-result').hidden,
        heading: (document.getElementById('st-result-h') || {}).textContent || '',
        dur: t.dur, result: !!(TT.stems.state && TT.stems.state.result),
        wavOff: document.getElementById('st-btn-wav').disabled,
        ink: ink, px: c ? c.width * c.height : 0
      };
    });
    ok(pre.shown && /song/i.test(pre.heading) && pre.dur > 5 && !pre.result && pre.wavOff && pre.ink > pre.px * 0.05,
      'stem lab: the original song already has a waveform, a clock and skip, before any separation',
      'heading “' + pre.heading + '”, ' + pre.dur.toFixed(1) + ' s, ' + pre.ink + ' pixels painted');

    /* separate with the first recipe — it must run off the main thread, and the
       page must keep answering while it does */
    await page.evaluate(() => {
      window.__ticks = 0;
      window.__tickTimer = setInterval(() => { window.__ticks++; }, 50);
      document.querySelector('#st-presets .st-preset').click();   /* 🎤 Instrumental maker */
    });
    const sepT0 = Date.now();
    const done = await waitFor(page, () => !!(TT.stems.state && TT.stems.state.result)
      && !document.getElementById('st-btn-run').disabled, 180000, 'separate');
    const sepMs = Date.now() - sepT0;
    const run = await page.evaluate(() => ({
      ticks: window.__ticks,
      worker: !!TT.stems.state.result.worker,
      len: TT.stems.state.result.channels[0].length,
      ch: TT.stems.state.result.channels.length,
      pct: document.getElementById('st-pct').textContent,
      status: document.getElementById('st-status').textContent,
      resultShown: !document.getElementById('st-result').hidden,
      peak: (() => { let p = 0; const a = TT.stems.state.result.channels[0]; for (let i = 0; i < a.length; i++) p = Math.max(p, Math.abs(a[i])); return +p.toFixed(3); })()
    }));
    await page.evaluate(() => clearInterval(window.__tickTimer));
    ok(done && run.len > 0 && run.ch === 2, 'stem lab: the separation produced audio', run.status.slice(0, 60));
    ok(run.worker, 'stem lab: it runs in a background worker, so the interface stays alive');
    ok(run.ticks >= (sepMs / 50) * 0.5,
      'stem lab: the page kept painting while a whole song was separated',
      run.ticks + ' timer ticks in ' + sepMs + ' ms');
    ok(run.resultShown && run.pct === '100%', 'stem lab: the result panel and progress bar landed at the end', run.pct);
    ok(run.peak <= 1.0, 'stem lab: the result never clips', 'peak ' + run.peak);

    /* play / stop */
    await page.click('#st-btn-play');
    await new Promise(r => setTimeout(r, 400));
    const playing = await page.evaluate(() => ({ on: TT.stems.state.playing, label: document.getElementById('st-btn-play').textContent }));
    await page.click('#st-btn-play');
    await new Promise(r => setTimeout(r, 200));
    const stopped = await page.evaluate(() => ({ on: TT.stems.state.playing, label: document.getElementById('st-btn-play').textContent }));
    ok(playing.on && /Stop/.test(playing.label) && !stopped.on && /Play/.test(stopped.label),
      'stem lab: play and stop work');

    /* export: a real RIFF/WAVE container of the right length */
    const wav = await page.evaluate(async () => {
      let captured = null;
      const orig = URL.createObjectURL;
      URL.createObjectURL = b => { captured = b; return orig.call(URL, b); };
      document.getElementById('st-btn-wav').click();
      URL.createObjectURL = orig;
      if (!captured) return null;
      const ab = await captured.arrayBuffer();
      const dv = new DataView(ab);
      const tag = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
      const ch = dv.getUint16(22, true), sr = dv.getUint32(24, true), bits = dv.getUint16(34, true);
      return { tag, bytes: ab.byteLength, ch, sr, bits, expect: 44 + TT.stems.state.result.channels[0].length * 2 * ch };
    });
    ok(wav && wav.tag === 'RIFF' && wav.bytes === wav.expect && wav.ch === 2 && wav.bits === 16,
      'stem lab: “Save as WAV” writes a correct 16-bit stereo container',
      wav ? wav.bytes + ' bytes @ ' + wav.sr + ' Hz' : 'no blob');

    /* the transport: a real waveform, a real clock, real skipping, a real A–B loop */
    const drawn = await page.evaluate(() => {
      const c = document.getElementById('st-wave');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let ink = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) ink++;
      return { ink: ink, px: c.width * c.height, w: c.width, h: c.height, filled: c.clientWidth > 100 };
    });
    ok(drawn.ink > drawn.px * 0.05 && drawn.filled,
      'stem lab: the result is drawn as a waveform', drawn.ink + ' of ' + drawn.px + ' pixels painted, canvas ' + drawn.w + '×' + drawn.h);

    const skip = await page.evaluate(async () => {
      const c = document.getElementById('st-wave');
      const r = c.getBoundingClientRect();
      c.scrollIntoView({ block: 'center' });
      const r2 = c.getBoundingClientRect();
      const x = r2.left + r2.width * 0.75, y = r2.top + r2.height / 2;
      c.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
      c.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
      const t = TT.stems.transport();
      return { pos: t.pos, dur: t.dur, clock: document.getElementById('st-pos').textContent };
    });
    ok(Math.abs(skip.pos / skip.dur - 0.75) < 0.06,
      'stem lab: clicking the waveform skips through the song', 'click at 75 % → ' + skip.pos.toFixed(2) + ' s of ' + skip.dur.toFixed(1) + ' s (clock ' + skip.clock + ')');

    const painted = await page.evaluate(() => {
      const c = document.getElementById('st-wave');
      const r = c.getBoundingClientRect();
      const y = r.top + r.height / 2;
      const x0 = r.left + r.width * 0.2, x1 = r.left + r.width * 0.55;
      c.dispatchEvent(new PointerEvent('pointerdown', { clientX: x0, clientY: y, bubbles: true, pointerId: 2, cancelable: true }));
      c.dispatchEvent(new PointerEvent('pointermove', { clientX: x1, clientY: y, bubbles: true, pointerId: 2, cancelable: true }));
      c.dispatchEvent(new PointerEvent('pointerup', { clientX: x1, clientY: y, bubbles: true, pointerId: 2, cancelable: true }));
      const t = TT.stems.transport();
      return { a: t.a, b: t.b, loop: document.getElementById('st-loop').checked, label: document.getElementById('st-ab-label').textContent, dur: t.dur };
    });
    ok(painted.loop && painted.a != null && painted.b != null && (painted.b - painted.a) > painted.dur * 0.2,
      'stem lab: dragging from point A to point B on the wave starts a loop', painted.label);

    const ab = await page.evaluate(() => {
      TT.stems.seek(1); document.getElementById('st-btn-aset').click();
      TT.stems.seek(3); document.getElementById('st-btn-bset').click();
      const t = TT.stems.transport();
      return { a: t.a, b: t.b, label: document.getElementById('st-ab-label').textContent };
    });
    ok(Math.abs(ab.a - 1) < 0.02 && Math.abs(ab.b - 3) < 0.02 && /A 0:01/.test(ab.label) && /B 0:03/.test(ab.label),
      'stem lab: A and B can be dropped at any two points', ab.label);

    /* the clock runs while it plays, and with the loop on the playhead stays inside A–B */
    const loop = await page.evaluate(async () => {
      document.getElementById('st-loop').checked = true;
      document.getElementById('st-loop').dispatchEvent(new Event('change', { bubbles: true }));
      TT.stems.seek(1);
      document.getElementById('st-btn-play').click();
      const seen = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 4200) {
        await new Promise(r => setTimeout(r, 120));
        seen.push(+TT.stems.transport().pos.toFixed(2));
      }
      const node = TT.stems.state.node;
      const out = {
        seen: seen, nodeLoop: !!(node && node.loop),
        loopStart: node ? node.loopStart : null, loopEnd: node ? node.loopEnd : null,
        clock: document.getElementById('st-pos').textContent,
        playing: TT.stems.transport().playing,
        wrapped: seen.some((v, i) => i && v < seen[i - 1] - 0.5)
      };
      document.getElementById('st-btn-play').click();       /* stop */
      document.getElementById('st-loop').checked = false;
      document.getElementById('st-loop').dispatchEvent(new Event('change', { bubbles: true }));
      return out;
    });
    const inside = loop.seen.every(p => p >= 0.95 && p <= 3.05);
    ok(loop.nodeLoop && Math.abs(loop.loopStart - 1) < 0.02 && Math.abs(loop.loopEnd - 3) < 0.02 && inside && loop.wrapped && loop.playing,
      'stem lab: with the loop on, playback runs round the A–B section and the clock shows it',
      'positions ' + loop.seen.slice(0, 12).join(' ') + ' … every one inside 1.0–3.0 s, wrapped ' + loop.wrapped + ', clock ' + loop.clock);

    const halted = await page.evaluate(() => {
      const t = TT.stems.transport();
      return { playing: t.playing, label: document.getElementById('st-btn-play').textContent.trim(), pos: t.pos };
    });
    ok(!halted.playing && /Play/.test(halted.label),
      'stem lab: stop leaves the playhead where it is and the button resets', 'held at ' + halted.pos.toFixed(2) + ' s');

    /* the tab maker reads the separated audio back */
    await page.click('#st-btn-tab');
    await waitFor(page, () => document.getElementById('view-maker').classList.contains('active'), 8000, 'maker');
    const sheet = await page.evaluate(() => (document.getElementById('mk-sheet') || {}).textContent || '');
    ok(sheet.length > 200, 'stem lab: the result is handed to the tab maker', sheet.length + ' chars of chart');

    /* the backing studio hands a bed over without a download */
    await page.click('.nav-btn[data-view="backing"]');
    await waitFor(page, () => !!document.getElementById('bk-generate'), 8000, 'backing view');
    await page.click('#bk-generate');
    const rendered = await waitFor(page, () => !document.getElementById('bk-summary').hidden, 20000, 'render');
    ok(rendered, 'backing studio: a bed renders for the hand-off');
    await page.evaluate(() => document.getElementById('bk-stems').click());
    await new Promise(r => setTimeout(r, 400));
    const handoff = await page.evaluate(() => ({
      active: document.getElementById('view-stems').classList.contains('active'),
      hasAudio: !!(TT.stems.state.channels && TT.stems.state.channels.length),
      status: document.getElementById('st-status').textContent,
      enabled: !document.getElementById('st-btn-run').disabled
    }));
    ok(handoff.active && handoff.hasAudio && handoff.enabled,
      'stem lab: the backing bed arrives ready to separate', handoff.status.slice(0, 70));

    /* and the room recording opens the microphone by itself (shortened take) */
    await page.evaluate(() => { TT.stems.state.recordSeconds = 1; });
    await page.click('#st-btn-mic');
    const recStatus = await waitFor(page, () => /Recording/.test(document.getElementById('st-status').textContent), 12000, 'recording');
    ok(recStatus, 'stem lab: the record button asks for the microphone and starts recording');
    const recDone = await waitFor(page, () => /Recorded/.test(document.getElementById('st-status').textContent), 30000, 'take');
    const take = await page.evaluate(() => ({
      ch: TT.stems.state.channels.length,
      seconds: +(TT.stems.state.channels[0].length / TT.stems.state.sr).toFixed(1),
      mic: TT.audio.micState,
      enabled: !document.getElementById('st-btn-run').disabled
    }));
    ok(recDone && take.ch >= 1 && take.enabled, 'stem lab: the take is loaded and ready to separate', take.seconds + ' s, mic now ' + take.mic);
    ok(take.mic !== 'on', 'stem lab: the microphone is released after the recording');
    ok(page._errors.length === 0, 'stem lab: zero JS errors', page._errors.slice(0, 3).join(' | '));
    await browser.close();
  }

  console.log(failures === 0 ? '\n✅ ALL PWA E2E TESTS PASSED' : `\n❌ ${failures} PWA E2E check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
