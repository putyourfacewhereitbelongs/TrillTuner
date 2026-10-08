'use strict';
const path = require('path');
const puppeteer = require('puppeteer');
let fails = 0;
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

  // mobile layout check
  await page.setViewport({ width: 420, height: 900 });
  await new Promise(r => setTimeout(r, 400));
  const mob = await page.evaluate(() => {
    const nav = document.querySelector('.sidenav').getBoundingClientRect();
    return {
      noHoriz: document.documentElement.scrollWidth <= window.innerWidth + 1,
      navVisible: nav.width > 100 && nav.top < 900
    };
  });
  ok(mob.noHoriz, 'mobile: no horizontal overflow');
  ok(mob.navVisible, 'mobile: nav bar visible');
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
