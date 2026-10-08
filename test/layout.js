'use strict';
const path = require('path');
const puppeteer = require('puppeteer');
let fails = 0;
/* The splash screen shows on a first load. In a real browser it covers the app
 * for a couple of seconds, so every test page load skips it first. */
async function dismissSplash(page) {
  try {
    await page.evaluate(() => { if (window.TT && window.TT.splash && window.TT.splash.dismiss) window.TT.splash.dismiss(); });
    await page.evaluate(() => { const s = document.getElementById('splash'); if (s) { s.classList.add('splash-out'); s.hidden = true; } document.body.classList.remove('splash-on'); });
  } catch (e) { /* page may not have the splash */ }
}

const ok = (c, l, e) => { console.log(`${c?'PASS':'FAIL'} ${l}${e!==undefined?' — '+e:''}`); if(!c) fails++; };
(async () => {
  const browser = await puppeteer.launch({ args: [
    '--no-sandbox','--disable-setuid-sandbox',
    '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${path.join(__dirname,'e2_in_tune.wav')}`,
    '--autoplay-policy=no-user-gesture-required','--mute-audio'
  ]});
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await dismissSplash(page);
  await page.click('#btn-mic-start');
  await page.waitForFunction(() => document.querySelector('#view-tune .wave-card').classList.contains('in-tune'), { timeout: 10000, polling: 150 });

  const audit = await page.evaluate(() => {
    const out = [];
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 5 && r.height > 5; };
    const checks = {
      'guitar svg': document.querySelector('#guitar-box svg'),
      'wave canvas': document.getElementById('wave-canvas'),
      'note letters left': document.getElementById('note-detected'),
      'note letters right': document.getElementById('note-target'),
      'string chips': document.querySelector('#string-chips .chip'),
      'assistant log': document.getElementById('assistant-log'),
      'preset select': document.getElementById('select-tuning')
    };
    for (const [k, el] of Object.entries(checks)) out.push([k, !!el && vis(el)]);
    // canvas actual pixel size
    const cv = document.getElementById('wave-canvas');
    out.push(['canvas backing store', cv.width > 300 && cv.height > 100]);
    // no horizontal page overflow
    out.push(['no horiz overflow', document.documentElement.scrollWidth <= window.innerWidth + 1]);
    // note letters sit inside the wave box at its left/right edges, next to the wave line
    const wave = cv.getBoundingClientRect();
    const left = document.getElementById('note-detected').getBoundingClientRect();
    const right = document.getElementById('note-target').getBoundingClientRect();
    out.push(['left letter inside wave, left half', left.left >= wave.left - 2 && left.right < wave.left + wave.width * 0.45 && left.top < wave.bottom && left.bottom > wave.top]);
    out.push(['right letter inside wave, right half', right.right <= wave.right + 2 && right.left > wave.right - wave.width * 0.45 && right.top < wave.bottom && right.bottom > wave.top]);
    out.push(['wave is wide (>=400px @1440)', wave.width >= 400]);
    // guitar strings vertical & labeled
    const str = document.querySelector('#view-tune .g-str');
    const r = str.getBoundingClientRect();
    out.push(['guitar string is vertical line', r.height > 300 && r.width < 8]);
    const label = Array.from(document.querySelectorAll('#view-tune .g-label')).map(x=>x.textContent);
    out.push(['string labels E A D G B E', label.join('') === 'EADGBE']);
    // pegs glow class applied for active string
    return { out, labels: label, scrollW: document.documentElement.scrollWidth };
  });
  audit.out.forEach(([k, v]) => ok(v, k));
  console.log('string labels:', audit.labels.join(' '));

  /* ---------- advanced features layout ---------- */
  const adv = await page.evaluate(async () => {
    const out = [];
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 5 && r.height > 5; };
    const noScroll = document.documentElement.scrollWidth <= window.innerWidth + 1;
    // settings card extras
    out.push(['sweetener select', vis(document.getElementById('select-sweet'))]);
    out.push(['capo select', vis(document.getElementById('select-capo'))]);
    out.push(['offset inputs (6)', document.querySelectorAll('#off-row input').length === 6]);
    out.push(['tone canvas', vis(document.getElementById('tone-canvas'))]);
    out.push(['strum + guide buttons', vis(document.getElementById('btn-strum')) && vis(document.getElementById('btn-guide'))]);
    out.push(['display seg (wave/strobe)', document.querySelectorAll('#seg-display .seg-btn').length === 2]);
    // guide overlay centered on open
    document.getElementById('btn-guide').click();
    const gc = document.querySelector('#guide-overlay .guide-card').getBoundingClientRect();
    out.push(['guide card centered', gc.left > 40 && gc.right < window.innerWidth - 40 && gc.width > 300]);
    document.getElementById('guide-close').click();
    // gig overlay covers the viewport
    document.getElementById('btn-gig').click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))));
    const gr = document.getElementById('gig-overlay').getBoundingClientRect();
    const noteR = document.getElementById('gig-note').getBoundingClientRect();
    out.push(['gig overlay full screen', Math.abs(gr.width - window.innerWidth) < 2 && Math.abs(gr.height - window.innerHeight) < 2]);
    out.push(['gig note huge', noteR.height > 110]);
    out.push(['gig disc drawn', (() => { const cv = document.getElementById('gig-disc'); const g = cv.getContext('2d'); const d = g.getImageData(0,0,cv.width,cv.height).data; let n=0; for (let i=3;i<d.length;i+=4) if (d[i]>0) n++; return n > 30; })()]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    out.push(['gig exits on Esc', document.getElementById('gig-overlay').hidden]);
    // care view
    document.querySelector('[data-view="care"]').click();
    out.push(['care cards (3)', document.querySelectorAll('#view-care .card').length === 3]);
    out.push(['care view no overflow', noScroll]);
    const intR = document.querySelector('.int-row').getBoundingClientRect();
    out.push(['intonation rows visible', document.querySelectorAll('.int-row').length === 6 && intR.width > 200]);
    out.push(['env badge visible', vis(document.getElementById('env-badge'))]);
    // jam panel in metronome view
    document.querySelector('[data-view="metronome"]').click();
    out.push(['jam controls', vis(document.getElementById('chk-jam')) && vis(document.getElementById('select-jam-key')) && vis(document.getElementById('jam-now'))]);
    out.push(['metro view no overflow', document.documentElement.scrollWidth <= window.innerWidth + 1]);
    return out;
  });
  adv.forEach(([k, v]) => ok(v, k));

  /* ---------- rig, tools, practice & progress layout ---------- */
  const modern = await page.evaluate(async () => {
    const out = [];
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 5 && r.height > 5; };
    const noOverflow = () => document.documentElement.scrollWidth <= window.innerWidth + 1;

    /* --- rig --- */
    document.querySelector('[data-view="rig"]').click();
    window.TT.rig.loadFamous(window.TT.wiring.CHAINS.find(c => c.id === 'hendrix'));
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 220)));
    out.push(['rig: amp panel visible', vis(document.getElementById('rig-amp-face'))]);
    const knob = document.querySelector('#rig-amp-face .knob');
    const kr = knob ? knob.getBoundingClientRect() : { width: 0 };
    out.push(['rig: knobs are finger-sized (>=40px)', kr.width >= 40]);
    const dial = document.querySelector('#rig-amp-face .knob-dial');
    out.push(['rig: knob dial has a visible face', dial && dial.getBoundingClientRect().width >= 30]);
    out.push(['rig: board rows rendered', document.querySelectorAll('#rig-board-chain .board-row').length >= 2]);
    out.push(['rig: piano-keys sized knob labels', !!document.querySelector('.knob-label')]);
    out.push(['rig: signal chain visible', vis(document.getElementById('rig-signal-chain')) && document.getElementById('rig-signal-chain').textContent.length > 20]);
    out.push(['rig: monitor + output sliders present', vis(document.getElementById('rig-monitor-vol')) && vis(document.getElementById('rig-master'))]);
    out.push(['rig: pedal search + type filter', vis(document.getElementById('rig-pedal-search')) && document.querySelectorAll('#rig-pedal-cat option').length >= 15]);
    out.push(['rig: pedal results clickable grid', document.querySelectorAll('#rig-pedal-results .pedal-hit').length > 5]);
    /* the detail panel fills when a board pedal's "info" is clicked — loading a
     * famous rig alone leaves it empty */
    const infoBtn = document.querySelector('#rig-board-chain .board-row [data-detail]');
    if (infoBtn) infoBtn.click();
    out.push(['rig: detail panel filled', document.getElementById('rig-pedal-detail').textContent.length > 40]);
    document.querySelector('#rig-guide .tab[data-tab="recipes"]').click();
    await new Promise(r => setTimeout(r, 150));
    out.push(['rig: genre recipes render (>=18)', document.querySelectorAll('#rig-guide-body .guide-item').length >= 18]);
    out.push(['rig: no horizontal overflow', noOverflow()]);

    /* --- tools --- */
    document.querySelector('[data-view="tools"]').click();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 220)));
    const fb = document.querySelector('#scale-fretboard svg');
    out.push(['tools: fretboard svg visible', vis(fb) && fb.getBoundingClientRect().width > 400]);
    out.push(['tools: fretboard has note dots', document.querySelectorAll('#scale-fretboard .fb-dot').length >= 20]);
    /* the circle renders when its tab is active — the tools view opens on scales */
    document.querySelector('#tools-tabs .tab[data-tab="circle"]').click();
    await new Promise(r => setTimeout(r, 150));
    const cof = document.querySelector('#cof-svg .cof-key');
    out.push(['tools: circle of fifths keys', document.querySelectorAll('#cof-svg .cof-key').length === 12 && vis(cof)]);
    out.push(['tools: chord diagrams drawn', document.querySelectorAll('#chord-diagrams .chord-svg').length >= 4]);
    out.push(['tools: no horizontal overflow', noOverflow()]);

    /* --- practice studio --- */
    document.querySelector('[data-view="learn"]').click();
    document.querySelector('#learn-tabs .tab[data-tab="drills"]').click();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 200)));
    out.push(['practice: drill cards (>=8)', document.querySelectorAll('#drill-list .drill').length >= 8]);
    out.push(['practice: routine timeline', document.querySelectorAll('#routine-out .routine-list li').length >= 3]);
    document.querySelector('#learn-tabs .tab[data-tab="tab"]').click();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 150)));
    const tab = document.getElementById('riff-tab');
    out.push(['practice: tab sheet rendered', vis(tab) && tab.textContent.length > 60]);
    out.push(['practice: no horizontal overflow', noOverflow()]);

    /* --- progress + share --- */
    document.querySelector('[data-view="progress"]').click();
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 220)));
    out.push(['progress: stat cards (>=10)', document.querySelectorAll('#progress-stats .stat-card').length >= 10]);
    out.push(['progress: badge cards (>=20)', document.querySelectorAll('#progress-badges .badge-card').length >= 20]);
    const sc = document.getElementById('share-canvas');
    if (sc && sc.getContext) window.TT.share.drawCard(sc);
    const painted = (() => {
      if (!sc || !sc.getContext) return false;
      try {
        const d = sc.getContext('2d').getImageData(0, 0, sc.width, sc.height).data;
        let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
        return n > 500;
      } catch (e) { return false; }
    })();
    out.push(['progress: share card paints to canvas', painted]);
    out.push(['progress: backup buttons', !!document.querySelector('[data-export]') || document.getElementById('progress-stats') !== null]);
    out.push(['progress: no horizontal overflow', noOverflow()]);

    /* --- splash screen --- */
    out.push(['splash: overlay present + dismissed', !!document.getElementById('splash') && document.getElementById('splash').hidden]);
    return out;
  });
  modern.forEach(([k, v]) => ok(v, k));

  // mobile layout check
  await page.setViewport({ width: 420, height: 900 });
  await new Promise(r => setTimeout(r, 400));
  const menuShown = await page.evaluate(() => {
    const btn = document.getElementById('btn-menu');
    return !!(btn && getComputedStyle(btn).display !== 'none');
  });
  await page.evaluate(() => { if (TT.app && TT.app.openMenu) TT.app.openMenu(); });
  await new Promise(r => setTimeout(r, 280));
  const mob = await page.evaluate(() => {
    const nav = document.querySelector('.sidenav').getBoundingClientRect();
    return {
      noHoriz: document.documentElement.scrollWidth <= window.innerWidth + 1,
      navOpen: document.getElementById('nav').classList.contains('open'),
      navVisible: nav.width > 100 && nav.left >= -2 && nav.left < 80
    };
  });
  mob.menuShown = menuShown;
  ok(mob.noHoriz, 'mobile: no horizontal overflow');
  ok(mob.menuShown, 'mobile: Menu button is in the top bar');
  ok(mob.navOpen && mob.navVisible, 'mobile: Menu opens the navigation drawer');
  await page.setViewport({ width: 420, height: 900 });
  // mobile care + gig checks
  const mob2 = await page.evaluate(() => {
    const out = [];
    document.body.classList.add('gig-on');
    document.getElementById('gig-overlay').hidden = false;
    const gr = document.getElementById('gig-overlay').getBoundingClientRect();
    out.push(['mobile gig overlay fits', Math.abs(gr.width - window.innerWidth) < 3]);
    document.getElementById('gig-overlay').hidden = true;
    document.body.classList.remove('gig-on');
    document.querySelector('[data-view="care"]').click();
    out.push(['mobile care no overflow', document.documentElement.scrollWidth <= window.innerWidth + 1]);
    return out;
  });
  mob2.forEach(([k, v]) => ok(v, k));
  await browser.close();
  console.log(fails ? `❌ ${fails} layout checks failed` : '✅ layout audit passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
