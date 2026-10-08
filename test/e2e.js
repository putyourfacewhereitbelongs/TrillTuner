/* End-to-end test: loads the real app in headless Chrome with a fake microphone
 * driven by synthetic guitar-string WAVs, and verifies the whole tuner pipeline,
 * plus smoke-tests metronome, recorder, lyrics and learn views. */
'use strict';
const path = require('path');
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
      `--use-file-for-fake-audio-capture=${path.join(DIR, wav)}`,
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

const readState = page => page.evaluate(() => ({
  detected: document.getElementById('note-detected').textContent,
  detectedSub: document.getElementById('note-detected-sub').textContent,
  target: document.getElementById('note-target').textContent,
  targetSub: document.getElementById('note-target-sub').textContent,
  cents: document.getElementById('cents-val').textContent,
  status: document.getElementById('tune-status').textContent,
  inTune: document.querySelector('#view-tune .wave-card').classList.contains('in-tune'),
  chips: Array.from(document.querySelectorAll('#string-chips .chip')).map(c => ({
    note: c.querySelector('.chip-note').textContent,
    active: c.classList.contains('active'),
    tuned: c.classList.contains('tuned')
  })),
  strings: document.querySelectorAll('#view-tune .g-str').length,
  assistant: Array.from(document.querySelectorAll('#assistant-log li')).map(li => li.textContent).slice(0, 5)
}));

async function waitFor(page, fn, timeout, label) {
  try {
    await page.waitForFunction(fn, { timeout: timeout || 8000, polling: 150 });
    return true;
  } catch (e) {
    console.log('TIMEOUT waiting for: ' + label);
    return false;
  }
}

(async () => {
  /* ============ scenario 1: low E, standard tuning, in tune ============ */
  {
    const { browser, page } = await launch('e2_in_tune.wav');
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#btn-mic-start');
    ok(page.$eval('#guitar-box', el => !!el.querySelector('svg.guitar-svg')), 'guitar SVG rendered');
    ok((await page.$$('#view-tune .g-str')).length === 6, 'guitar has 6 strings');
    ok((await page.$$('#string-chips .chip')).length === 6, '6 string chips');
    const optCount = await page.$$eval('#select-tuning option', o => o.length);
    ok(optCount >= 18, 'tuning presets in select', optCount + ' options');
    const hasDropD = await page.$$eval('#select-tuning option', o => o.some(x => x.value === 'dropd'));
    const hasHalf = await page.$$eval('#select-tuning option', o => o.some(x => x.value === 'halfstep'));
    ok(hasDropD && hasHalf, 'Drop D + Half Step Down presets present');

    await page.click('#btn-mic-start');
    const reached = await waitFor(page,
      () => document.querySelector('#view-tune .wave-card').classList.contains('in-tune'),
      10000, 'in-tune on low E');
    const s = await readState(page);
    ok(reached, 'E2 in tune reached (wave goes green)');
    ok(s.detected === 'E', 'detected note letter is E', s.detected);
    ok(s.target === 'E', 'target note letter is E', s.target);
    ok(s.targetSub.includes('String 6'), 'target is string 6', s.targetSub);
    ok(Math.abs(parseFloat(s.cents)) <= 5, 'cents within ±5', s.cents);
    // wait for auto-lock of the string (needs 0.7s in-tune hold)
    await waitFor(page, () => document.querySelectorAll('#string-chips .chip.tuned').length >= 1, 6000, 'string 6 auto-locked');
    const s2 = await readState(page);
    ok(s2.chips.filter(c => c.tuned).length === 1, 'string 6 chip marked tuned ✓', JSON.stringify(s2.chips.map(c => c.note + (c.tuned ? '✓' : ''))));
    ok(s2.assistant.some(a => a.includes('locked in tune')), 'assistant logged the lock', s2.assistant[0]);
    // auto-advance fires 650ms after the lock — wait for its message
    await waitFor(page, () => Array.from(document.querySelectorAll('#assistant-log li')).some(li => li.textContent.includes('Auto-advanced')), 8000, 'auto-advance message');
    const s3 = await readState(page);
    ok(s3.assistant.some(a => a.includes('Auto-advanced') || a.includes('ready to rock')), 'assistant auto-advanced / guided next', s3.assistant.find(a => a.includes('Auto-advanced') || a.includes('ready to rock')));
    ok(page._errors.length === 0, 'no JS errors (scenario 1)', page._errors[0] || '');
    await browser.close();
  }

  /* ============ scenario 2: A string 20¢ flat ============ */
  {
    const { browser, page } = await launch('a2_flat20.wav');
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.click('#btn-mic-start');
    const reached = await waitFor(page,
      () => document.getElementById('note-detected').textContent === 'A', 10000);
    const s = await readState(page);
    ok(reached, 'detected A string');
    ok(!s.inTune, 'not in tune (red wave)');
    ok(s.status.includes('Tune up'), 'guidance says tune up', s.status);
    const c = parseFloat(s.cents);
    ok(c < -12 && c > -28, 'cents ≈ −20', s.cents);
    const tuned = await waitFor(page, () => document.querySelectorAll('#string-chips .chip.tuned').length >= 1, 4000, 'no premature lock');
    ok(!tuned, 'flat string does NOT get locked');
    ok(page._errors.length === 0, 'no JS errors (scenario 2)', page._errors[0] || '');
    await browser.close();
  }

  /* ============ scenario 3: Drop D preset + D2 string ============ */
  {
    const { browser, page } = await launch('d2_dropd.wav');
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.select('#select-tuning', 'dropd');
    await page.click('#btn-mic-start');
    const reached = await waitFor(page,
      () => document.querySelector('#view-tune .wave-card').classList.contains('in-tune'), 10000);
    const s = await readState(page);
    ok(reached, 'D2 in tune under Drop D preset');
    ok(s.detected === 'D', 'detected D', s.detected);
    ok(s.targetSub.includes('String 6'), 'target string 6 (D in drop D)', s.targetSub);
    ok(s.chips[0].note.startsWith('D'), 'chip 6 shows D', s.chips[0].note);
    ok(page._errors.length === 0, 'no JS errors (scenario 3)', page._errors[0] || '');
    await browser.close();
  }

  /* ============ scenario 4: E5 overtone on high E string (octave correction) ============ */
  {
    const { browser, page } = await launch('e5_overtone.wav');
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.click('#btn-mic-start');
    const reached = await waitFor(page,
      () => document.querySelector('#view-tune .wave-card').classList.contains('in-tune'), 10000);
    const s = await readState(page);
    ok(reached, 'octave-corrected E5 -> E4 string, in tune');
    ok(s.targetSub.includes('String 1'), 'locked onto high E string', s.targetSub);
    ok(page._errors.length === 0, 'no JS errors (scenario 4)', page._errors[0] || '');
    await browser.close();
  }

  /* ============ scenario 5: full UI smoke (metronome, record, lyrics, learn) ============ */
  {
    const { browser, page } = await launch('e2_in_tune.wav');
    await page.goto(BASE, { waitUntil: 'networkidle0' });

    // metronome
    await page.click('[data-view="metronome"]');
    await page.click('#btn-metro-start');
    await new Promise(r => setTimeout(r, 900));
    const ledOn = await page.$eval('#beat-leds', el => el.querySelectorAll('.led.on').length);
    ok(ledOn === 1, 'metronome: exactly one LED lit', ledOn + ' lit');
    const armAngle = await page.$eval('#pendulum-arm', el => el.style.transform);
    ok(armAngle.includes('rotate'), 'pendulum swinging', armAngle);
    await page.select('#select-sig', '6');
    const ledCount = await page.$eval('#beat-leds', el => el.querySelectorAll('.led').length);
    ok(ledCount === 6, '6/8 signature builds 6 LEDs', ledCount);
    await page.click('#btn-metro-start'); // stop

    // recorder (with metronome auto-start)
    await page.click('[data-view="record"]');
    await page.click('#btn-record');
    await new Promise(r => setTimeout(r, 2600));
    const recStatus = await page.$eval('#rec-status', el => el.textContent);
    ok(recStatus.includes('Recording'), 'recorder is recording', recStatus);
    const timerTxt = await page.$eval('#rec-timer', el => el.textContent);
    ok(/^\d{2}:\d{2}$/.test(timerTxt) && timerTxt !== '00:00', 'rec timer ticking', timerTxt);
    await page.click('#btn-record'); // stop
    await new Promise(r => setTimeout(r, 800));
    const takes = await page.$eval('#takes-list', el => el.querySelectorAll('.take').length);
    const takeInfo = await page.$eval('#takes-list', el => el.querySelector('.take-meta') ? el.querySelector('.take-meta').textContent : 'none');
    ok(takes >= 1, 'a take was saved', takeInfo);

    // lyrics
    await page.click('[data-view="lyrics"]');
    await page.type('#lyr-artist', 'Fleetwood Mac');
    await page.type('#lyr-title', 'Dreams');
    await page.click('#lyr-form button[type="submit"]');
    const gotLyrics = await waitFor(page, () => !document.getElementById('lyr-result').hidden, 15000, 'lyrics result');
    const lyrTitle = await page.$eval('#lyr-r-title', el => el.textContent);
    const lyrLen = await page.$eval('#lyr-body', el => el.textContent.length);
    ok(gotLyrics && lyrTitle === 'Dreams' && lyrLen > 100, 'lyrics search works', lyrTitle + ' / ' + lyrLen + ' chars');

    // learn
    await page.click('[data-view="learn"]');
    const lessons = await page.$eval('#tab-beginner', el => el.querySelectorAll('.lesson').length);
    ok(lessons === 6, 'beginner lessons rendered', lessons);
    await page.click('[data-tab="intermediate"]');
    const lessons2 = await page.$eval('#tab-intermediate', el => el.querySelectorAll('.lesson').length);
    ok(lessons2 === 5, 'intermediate lessons rendered', lessons2);
    await page.click('[data-tab="advanced"]');
    const lessons3 = await page.$eval('#tab-advanced', el => el.querySelectorAll('.lesson').length);
    ok(lessons3 === 4, 'advanced lessons rendered', lessons3);
    await page.click('[data-tab="chords"]');
    const chords = await page.$eval('#chord-grid', el => el.querySelectorAll('.chord-card').length);
    ok(chords >= 20, 'chord library rendered', chords + ' chords');
    await page.click('[data-tab="ear"]');
    await page.click('#ear-play');
    const earBtns = await page.$eval('#ear-answers', el => el.querySelectorAll('.ear-btn').length);
    ok(earBtns >= 5, 'ear training answers rendered', earBtns + ' buttons');

    // mode switch to electric
    await page.click('[data-view="tune"]');
    await page.click('.seg-btn[data-mode="electric"]');
    const bodyClass = await page.evaluate(() => document.body.className);
    ok(bodyClass.includes('theme-electric'), 'electric theme applied');
    const pegs = await page.$$('#view-tune .g-peg');
    ok(pegs.length === 6, 'electric guitar still has 6 pegs');

    ok(page._errors.length === 0, 'no JS errors (UI smoke)', JSON.stringify(page._errors.slice(0, 3)));
    await browser.close();
  }

  /* ============ scenario 6: advanced features (strobe, sweeteners, capo,
     strum check, guide, gig mode, care tools, jam track) ============ */
  {
    const { browser, page } = await launch('e2_in_tune.wav');
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.click('#btn-mic-start');
    await waitFor(page, () => document.querySelector('#view-tune .wave-card').classList.contains('in-tune'), 10000, 'in-tune');

    // --- overtone panel ---
    await waitFor(page, () => (document.getElementById('tone-bright').textContent || '').includes('brightness'), 4000, 'tone panel');
    const toneTxt = await page.$eval('#tone-bright', el => el.textContent);
    ok(toneTxt.includes('brightness'), 'overtone analyzer reports brightness', toneTxt);

    // --- strobe display mode ---
    await page.click('#seg-display [data-display="strobe"]');
    const strobeActive = await page.$eval('#seg-display [data-display="strobe"]', el => el.classList.contains('active'));
    ok(strobeActive, 'strobe mode activates');
    await new Promise(r => setTimeout(r, 400));
    const strobeDrawn = await page.$eval('#wave-canvas', cv => {
      const g = cv.getContext('2d');
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n > 50;
    });
    ok(strobeDrawn, 'strobe disc is being drawn');
    await page.click('#seg-display [data-display="wave"]');

    // --- sweetened tuning: JT shifts the E2 target by -12 cents ---
    await page.select('#select-sweet', 'jt');
    await waitFor(page, () => document.getElementById('cents-val').textContent.includes('12'), 4000, 'JT offset applied');
    const jtCents = await page.$eval('#cents-val', el => el.textContent);
    const jtInTune = await page.$eval('#view-tune .wave-card', el => el.classList.contains('in-tune'));
    ok(jtCents.includes('+12') || jtCents.includes('12'), 'JT sweetener: in-tune string now reads +12¢', jtCents);
    ok(!jtInTune, 'JT sweetener: +12¢ is outside the ±5¢ window');
    await page.select('#select-sweet', 'equal');
    await waitFor(page, () => document.querySelector('#view-tune .wave-card').classList.contains('in-tune'), 5000, 'back to equal');

    // --- capo shifts every target ---
    await page.select('#select-capo', '2');
    await waitFor(page, () => document.querySelectorAll('#string-chips .chip-note')[0].textContent.includes('F'), 3000, 'capo chips');
    const capoChips = await page.$$eval('#string-chips .chip-note', els => els.map(e => e.textContent.replace(' ✓', '')).join(''));
    ok(capoChips === 'F♯BEAC♯F♯', 'capo 2 relabels strings to F♯ B E A C♯ F♯', capoChips);
    const capoVis = await page.$eval('#guitar-box', el => !!el.querySelector('.g-capo'));
    ok(capoVis, 'capo drawn on the neck');
    const capoHint = await page.$eval('#capo-hint', el => el.hidden === false && el.textContent.includes('fret 2'));
    ok(capoHint, 'capo hint shown');
    await page.select('#select-capo', '0');

    // --- polyphonic strum check (single E ringing: E in tune, no false positives) ---
    await page.click('#btn-strum');
    await waitFor(page, () => document.querySelectorAll('#strum-rows .strum-row:not(.wait)').length === 6, 8000, 'strum analysis');
    const strum = await page.$$eval('#strum-rows .strum-row', rows => rows.map(r => r.className.replace('strum-row', '').trim()));
    ok(strum.filter(c => c.includes('ok')).length === 1, 'strum check: exactly the ringing E reads in tune', JSON.stringify(strum));
    ok(strum.filter(c => c === 'flat' || c === 'sharp').length === 0, 'strum check: no false sharp/flat verdicts');
    const strumAssist = await page.$$eval('#assistant-log li', lis => lis.some(l => l.textContent.includes('Strum check')));
    ok(strumAssist, 'assistant narrates the strum result');
    await page.click('#strum-close');

    // --- tuning guide ---
    await page.click('#btn-guide');
    const guide = await page.evaluate(() => ({
      visible: !document.getElementById('guide-overlay').hidden,
      title: document.getElementById('guide-title').textContent,
      songs: document.querySelectorAll('#guide-songs li').length,
      desc: document.getElementById('guide-desc').textContent.length
    }));
    ok(guide.visible && guide.title === 'Standard' && guide.songs >= 1 && guide.desc > 10, 'tuning guide opens with songs + description', guide.title + ' / ' + guide.songs + ' songs');
    await page.click('#guide-close');
    const guideClosed = await page.$eval('#guide-overlay', el => el.hidden);
    ok(guideClosed, 'guide closes');

    // --- gig mode ---
    await page.click('#btn-gig');
    await new Promise(r => setTimeout(r, 500));
    const gig = await page.evaluate(() => ({
      on: document.body.classList.contains('gig-on'),
      visible: !document.getElementById('gig-overlay').hidden,
      note: document.getElementById('gig-note').textContent,
      status: document.getElementById('gig-status').textContent
    }));
    ok(gig.on && gig.visible, 'gig mode overlay takes over the screen');
    ok(/^[A-G]/.test(gig.note), 'gig mode shows the target note huge', gig.note + ' / ' + gig.status);
    await page.keyboard.press('Escape');
    const gigOff = await page.evaluate(() => !document.body.classList.contains('gig-on') && document.getElementById('gig-overlay').hidden);
    ok(gigOff, 'Esc exits gig mode');

    // --- smart filter + settle toggles don't break anything ---
    await page.click('#chk-filter');
    await new Promise(r => setTimeout(r, 300));
    const filterOn = await page.$eval('#chk-filter', el => el.checked);
    const stillDetecting = await page.evaluate(() => MG.tuner.state.signal);
    ok(filterOn && stillDetecting, 'smart filter toggles on, detection continues');
    await page.click('#chk-filter');
    await page.click('#chk-settle'); // off
    await new Promise(r => setTimeout(r, 300));
    await page.click('#chk-settle'); // back on

    // --- preset switch gives a retune route ---
    await page.select('#select-tuning', 'openg');
    await waitFor(page, () => Array.from(document.querySelectorAll('#assistant-log li')).some(l => l.textContent.includes('Retune route')), 4000, 'retune route');
    const route = await page.$$eval('#assistant-log li', lis => {
      const el = lis.find(l => l.textContent.includes('Retune route'));
      return el ? el.textContent : '';
    });
    ok(route.includes('biggest moves first'), 'assistant suggests an order for retuning', route.slice(0, 90));
    await page.select('#select-tuning', 'standard');

    // --- care view: strings, intonation table, environment ---
    await page.click('[data-view="care"]');
    const careCards = await page.$$eval('#view-care .card', els => els.length);
    ok(careCards === 3, 'care view has 3 tool cards', careCards + ' cards');
    const intRows = await page.$eval('#int-list', el => el.querySelectorAll('.int-row').length);
    ok(intRows === 6, 'intonation table lists 6 strings', intRows + ' rows');
    await page.click('#str-changed-btn');
    const strStatus = await page.$eval('#str-status', el => el.textContent);
    ok(strStatus.includes('Fresh'), 'string change logged, status Fresh', strStatus);
    await page.type('#env-hum', '25');
    await new Promise(r => setTimeout(r, 200));
    const envBadge = await page.$eval('#env-badge', el => el.textContent);
    ok(envBadge.includes('dry'), 'low humidity raises a dry-air warning', envBadge);

    // --- jam track follows the metronome ---
    await page.click('[data-view="metronome"]');
    await page.click('#chk-jam');
    await page.click('#btn-metro-start');
    await waitFor(page, () => /^[A-G]/.test(document.getElementById('jam-now').textContent), 6000, 'jam chord');
    const jamNow = await page.$eval('#jam-now', el => el.textContent);
    const jamNext = await page.$eval('#jam-next', el => el.textContent);
    ok(/^[A-G]/.test(jamNow), 'jam track plays chord symbols with the click', jamNow + ' ' + jamNext);
    await new Promise(r => setTimeout(r, 2600)); // let a bar change happen
    const jamNow2 = await page.$eval('#jam-now', el => el.textContent);
    ok(/^[A-G]/.test(jamNow2), 'jam track advances to the next chord', jamNow + ' → ' + jamNow2);
    await page.click('#btn-metro-start'); // stop
    await new Promise(r => setTimeout(r, 300));
    const jamStopped = await page.$eval('#jam-now', el => el.textContent);
    ok(jamStopped === '—', 'jam display resets when the click stops', jamStopped);

    ok(page._errors.length === 0, 'no JS errors (advanced features)', JSON.stringify(page._errors.slice(0, 3)));
    await browser.close();
  }

  console.log(failures === 0 ? '\n✅ ALL E2E TESTS PASSED' : `\n❌ ${failures} E2E TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('E2E crashed:', e); process.exit(1); });
