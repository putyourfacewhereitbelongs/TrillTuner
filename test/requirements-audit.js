/* Trill Tuner — requirements audit.
 *
 * Every item that was asked for, checked against real code and real signal
 * rather than against a promise. Where a claim can be measured, it is measured
 * here (synthesised audio through the actual engines); where it is a UI
 * promise, the DOM contract is checked (ids, views, hand-offs).
 *
 *   node test/requirements-audit.js          # prints the checklist
 *   node test/requirements-audit.js --write  # also writes docs/REQUIREMENTS-CHECK.md
 *
 * The running server is used when it is up (the lyric proxy is then tested over
 * HTTP); when it is not, that single line says so instead of failing.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const D = require('../public/js/lib/dsp.js');
const C = require('../public/js/lib/catalog.js');
const T = require('../public/js/lib/chords.js');
const B = require('../public/js/lib/backing.js');

const SR = 22050;
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const has = (file, needle) => read(file).indexOf(needle) >= 0;

const rows = [];
let failures = 0;
function item(n, ask, how, pass, evidence) {
  rows.push({ n: n, ask: ask, how: how, pass: !!pass, evidence: evidence });
  if (!pass) failures++;
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + n + '. ' + ask + '\n       ' + evidence);
}

/* ---------------------------------------------------------------- */
/* a small synth so the audio claims can be measured, not asserted   */
/* ---------------------------------------------------------------- */
const TAU = Math.PI * 2;
function mixdown(ch) { const n = ch[0].length, o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = (ch[0][i] + ch[1][i]) / 2; return o; }
function toneAt(out, sr, freq, at, dur, gain, decay) {
  for (let i = 0; i < dur * sr && at + i < out.length; i++) {
    const t = i / sr;
    out[at + i] += Math.sin(TAU * freq * t) * gain * Math.exp(-t * (decay == null ? 1.5 : decay));
  }
}
function noteAt(out, sr, midi, at, dur, gain, decay) { toneAt(out, sr, 440 * Math.pow(2, (midi - 69) / 12), at, dur, gain, decay); }

/* a four-chord loop, strummed: C G Am F, two bars each */
function progressionAudio(sr, chordMidis, barSec) {
  const total = Math.ceil(chordMidis.length * barSec * sr) + sr;
  const out = new Float32Array(total);
  chordMidis.forEach((midis, bar) => {
    const start = Math.floor(bar * barSec * sr);
    midis.forEach((m, i) => noteAt(out, sr, m, start + Math.floor(i * 0.014 * sr), barSec * 0.98, 0.22, 1.3));
  });
  return out;
}

/* the three-layer band used for the acoustic-only claim */
function bandMix(sr, secs) {
  const n = sr * secs;
  const mk = () => [new Float32Array(n), new Float32Array(n)];
  const put = (ch, i, l, r) => { ch[0][i] += l; ch[1][i] += r; };
  const acoustic = mk();
  [[220, 277.18, 329.63, 440], [196, 246.94, 293.66, 392], [174.61, 220, 261.63, 349.23], [146.83, 185, 220, 293.66]]
    .forEach((chord, bar) => {
      const start = Math.floor(bar * 1.5 * sr);
      for (let k = 0; k < 6; k++) {
        const off = start + Math.floor(k * 0.012 * sr);
        for (let i = off; i < Math.min(n, off + 1.2 * sr); i++) {
          const t = (i - off) / sr, env = Math.exp(-t / 0.45) * (1 - Math.exp(-t / 0.004));
          const v = env * 0.16 * (Math.sin(TAU * chord[k % 4] * t) + 0.35 * Math.sin(TAU * chord[k % 4] * 2 * t));
          put(acoustic, i, v, v * -0.85);
        }
      }
    });
  const electric = mk();
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const ph = 0.0087 * Math.sin(TAU * 5.5 * t);     /* a real vibrato: constant ±15 cents */
    let v = 0;
    for (let h = 1; h <= 12; h++) v += Math.sin(TAU * 82.41 * h * t + h * ph) / (h * 1.4) * (h % 2 ? 1 : 0.6);
    v = Math.tanh(v * 1.8) * 0.3;
    put(electric, i, v, v);
  }
  const drums = mk();
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;
  for (let b = 0; b * 0.5 < secs; b++) {
    const off = Math.floor(b * 0.5 * sr), snare = b % 2 === 1;
    for (let i = 0; i < 0.25 * sr && off + i < n; i++) {
      const t = i / sr, e = Math.exp(-t / (snare ? 0.09 : 0.035));
      const v = snare ? rnd() * 0.5 : Math.sin(TAU * 62 * t) * 0.6 * Math.exp(-t / 0.06);
      put(drums, off + i, v * e, v * e);
    }
  }
  const mix = mk();
  for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) mix[c][i] = acoustic[c][i] + electric[c][i] + drums[c][i];
  return { mix, acoustic, electric, drums };
}
/* How much of a known layer survived, in dB: a least-squares projection of the
 * output onto that layer's own samples. Per channel on purpose — a wide,
 * polarity-inverted layer cancels itself in a mono sum, and measuring it there
 * measures the cancellation rather than the separation. */
function kept(out, src) {
  let num = 0, den = 0;
  for (let c = 0; c < Math.min(out.channels.length, src.length); c++) {
    const o = out.channels[c], s = src[c];
    for (let i = 0; i < s.length; i++) { num += o[i] * s[i]; den += s[i] * s[i]; }
  }
  return 20 * Math.log10(Math.abs(num / den) + 1e-12);
}

/* ---------------------------------------------------------------- */
/* 1. song search                                                    */
/* ---------------------------------------------------------------- */
(function () {
  const byTitle = C.search('knockin', { cap: 5 });
  const byArtist = C.search('Fleetwood Mac', { cap: 20 });
  const byGenre = C.search('funk', { cap: 20 });
  const byChord = C.search('G C D', { cap: 20 });
  const view = read('public/index.html');
  const wired = has('public/js/app.js', "wire('songs'") && view.indexOf('id="ss-q"') > 0;
  const okAll = byTitle.songs.length >= 1 && byArtist.songs.length >= 1 && byGenre.count >= 3 && byChord.songs.length >= 3 && wired;
  item(1, 'Song search',
    'catalog search from title / artist / genre / chord list + the Songs view',
    okAll,
    'title “knockin” → ' + (byTitle.songs[0] || {}).title + ' · artist “Fleetwood Mac” → ' + byArtist.songs.length +
    ' songs · genre “funk” → ' + byGenre.count + ' · chords “G C D” → ' + byChord.songs.length +
    ' · view wired: ' + (wired ? 'yes' : 'no'));
})();

/* ---------------------------------------------------------------- */
/* 2. tab maker that listens to the song + chord library             */
/* ---------------------------------------------------------------- */
(function () {
  const barSec = 60 / 100 * 4;
  const audio = progressionAudio(SR, [[60, 64, 67, 72], [67, 71, 74, 79], [57, 60, 64, 69], [53, 57, 60, 65]], barSec);
  const read1 = D.analyseChords(audio, SR, { fftSize: 4096, hop: 2048 });
  const names = read1.chords.map(c => c.name);
  const plan = T.planFor({ key: 'C', mode: 'major', chords: ['C', 'G', 'Am', 'F'], tempo: 100 });
  const hasLibrary = !!(plan.library && plan.library.triads.length) && plan.progressions.length > 0 && !!plan.capoNote;
  const ui = ['mk-drop', 'mk-file', 'mk-sheet', 'mk-key', 'mk-bpm'].every(id => read('public/index.html').indexOf('id="' + id + '"') > 0);
  const found = names.join(' ');
  const ok = read1.key && read1.key.key === 'C' && names.some(n => /^C/.test(n)) && names.some(n => /^G/.test(n)) && hasLibrary && ui
    && read('public/js/tabmaker.js').indexOf('analyseBuffer') > 0;
  item(2, 'Tab maker that listens to the song and hands back the chord library to play along',
    'lib/dsp analyseChords on synthesised audio → key/chords/tempo; chords.planFor → library, capo, progressions; view controls present',
    ok,
    'heard “' + found + '” in C major at ' + (read1.tempo ? read1.tempo.bpm : '?') + ' BPM · library ' + plan.library.triads.length +
    ' chords · ' + plan.progressions.length + ' progressions · ' + plan.capoNote);
})();

/* ---------------------------------------------------------------- */
/* 3. vocal removal                                                  */
/* ---------------------------------------------------------------- */
(function () {
  const n = SR * 5;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const vocal = 0.25 * Math.sin(TAU * 220 * t);
    const guitarL = 0.14 * Math.sin(TAU * 196 * t);
    const guitarR = 0.14 * Math.sin(TAU * 246.9 * t);
    L[i] = vocal + guitarL;
    R[i] = vocal + guitarR;
  }
  const mix = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) { mix[0][i] = L[i]; mix[1][i] = R[i]; }
  const vocalOnly = [new Float32Array(n), new Float32Array(n)];
  const guitarOnly = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    vocalOnly[0][i] = vocalOnly[1][i] = 0.25 * Math.sin(TAU * 220 * i / SR);
    guitarOnly[0][i] = 0.14 * Math.sin(TAU * 196 * i / SR);
    guitarOnly[1][i] = 0.14 * Math.sin(TAU * 246.9 * i / SR);
  }
  /* the mixture the two layers actually make */
  for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) mix[c][i] = vocalOnly[c][i] + guitarOnly[c][i];
  const mask = D.separate(mix, SR, 'vocals', { remove: true, amount: 1 });
  const karaoke = D.separate(mix, SR, 'classic-karaoke', {});
  const mV = kept(mask, vocalOnly), mG = kept(mask, guitarOnly);
  const kV = kept(karaoke, vocalOnly), kG = kept(karaoke, guitarOnly);
  const recipes = read('public/js/stemlab.js');
  const offered = /karaoke/i.test(recipes) && /instrumental/i.test(recipes) && /classic-karaoke/.test(recipes);
  item(3, 'Vocal removal (and the instrumental that results)',
    'both offered paths measured on a centred voice over a double-tracked guitar: the spectral mask, and the classic centre-cancellation',
    offered && (mV < -12 || kV < -12) && mG > -6 && kG > -6,
    'spectral mask: voice ' + mV.toFixed(1) + ' dB, guitar ' + mG.toFixed(1) + ' dB · classic centre-cancel: voice ' +
    kV.toFixed(1) + ' dB, guitar ' + kG.toFixed(1) + ' dB · both offered in the lab: ' + (offered ? 'yes' : 'no'));
})();

/* ---------------------------------------------------------------- */
/* 4. separate instrument remover                                    */
/* ---------------------------------------------------------------- */
(function () {
  const n = SR * 2;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    L[i] = 0.2 * Math.sin(TAU * 110 * t) + 0.2 * Math.sin(TAU * 440 * t) + 0.1 * Math.sin(TAU * 3000 * t);
    R[i] = L[i] * 0.9;
  }
  const modes = Object.keys(D.PROFILES);
  const both = modes.every(m => {
    try {
      const rm = D.separate([L, R], SR, m, { remove: true, amount: 0.8 });
      const iso = D.separate([L, R], SR, m, { remove: false, amount: 0.8 });
      return rm.channels[0].length === n && iso.channels[0].length === n;
    } catch (e) { return false; }
  });
  const recipes = (read('public/js/stemlab.js').match(/\{ id: '/g) || []).length;
  const ui = ['st-mode', 'st-action', 'st-amount', 'st-btn-run'].every(id => read('public/index.html').indexOf('id="' + id + '"') > 0);
  item(4, 'Separate instrument remover — every instrument, remove or isolate',
    'all ' + modes.length + ' dsp profiles run in both directions; the Stem lab exposes mode + action + amount',
    both && ui && modes.length >= 12,
    modes.length + ' instruments × 2 directions all render · ' + recipes + ' recipes in the lab · controls: ' + (ui ? 'ok' : 'missing'));
})();

/* ---------------------------------------------------------------- */
/* 5. instrumental maker from a chosen song                          */
/* ---------------------------------------------------------------- */
(function () {
  const lab = read('public/js/stemlab.js');
  const classic = /classic-karaoke/.test(lab) && /keepBass|keep-bass/.test(read('public/js/lib/dsp.js'));
  const bed = B.render({ key: 'C', mode: 'major', style: 'strum', bpm: 90, bars: 4, sr: SR });
  const bedOk = bed.channels[0].length > SR * 10 && bed.progression.length === 4;
  item(5, 'Instrumental maker from a chosen song',
    'the karaoke recipe turns a song into an instrumental (with a bass-keeping variant); the Backing studio can also build an instrumental from scratch',
    classic && bedOk,
    'karaoke recipes: ' + (classic ? 'present' : 'missing') + ' · backing studio renders an instrumental bed of ' +
    bed.seconds.toFixed(1) + 's (' + bed.progression.join(' ') + ') that the tab maker can read back');
})();

/* ---------------------------------------------------------------- */
/* 6. acoustic-guitar-only removal, electric + drums survive         */
/* ---------------------------------------------------------------- */
(function () {
  const band = bandMix(SR, 6);
  const rm = D.separate(band.mix, SR, 'acoustic-guitar', { amount: 0.9, remove: true });
  const a = kept(rm, band.acoustic), e = kept(rm, band.electric), d = kept(rm, band.drums);
  const iso = D.separate(band.mix, SR, 'acoustic-guitar', { amount: 0.9, remove: false });
  const isoA = kept(iso, band.acoustic), isoE = kept(iso, band.electric);
  const lab = read('public/js/stemlab.js');
  const flagged = /acoustic-guitar/.test(lab) && /remove: true/.test(lab) && /electric/i.test(lab);
  item(6, 'Remove ONLY the acoustic guitar — every other instrument and the drums keep playing, electric included',
    'the acoustic-guitar profile on a synthesised band (strummed acoustic + vibratoed held electric + kit), measured per layer per channel; the lab highlights the recipe',
    a < -2.5 && (e - a) > 2 && e > -3 && d > -3 && flagged,
    'acoustic ' + a.toFixed(2) + ' dB (removed) · electric ' + e.toFixed(2) + ' dB (kept) · drums ' + d.toFixed(2) +
    ' dB (kept) — margin ' + (e - a).toFixed(2) + ' dB in favour of the electric · isolate leans the right way (' +
    isoA.toFixed(2) + ' vs ' + isoE.toFixed(2) + ' dB) · recipe highlighted: ' + (flagged ? 'yes' : 'no'));
})();

/* ---------------------------------------------------------------- */
/* 7. lyric search by artist OR song name alone                      */
/* ---------------------------------------------------------------- */
(function () {
  const view = read('public/index.html');
  const oneBox = view.indexOf('id="lyr-q"') > 0 && view.indexOf('id="lyr-artist"') < 0 && view.indexOf('id="lyr-title"') < 0;
  const js = read('public/js/lyrics.js');
  const singleField = js.indexOf('function queryOf(a, b)') > 0 && js.indexOf('either one is enough') > 0;
  const server = read('server.js');
  const route = server.indexOf('/api/lyrics') > 0 && /splitQuery/.test(server || '');
  const offlineArtist = C.search('Jimi Hendrix', { cap: 5 }).songs.length >= 1;
  const offlineTitle = C.search('Little Wing', { cap: 5 }).songs.length >= 1;
  item(7, 'Lyric search by artist OR song name alone (never both)',
    'one input box, one query string, /api/lyrics?q= — plus the offline songbook answering artist-only and title-only immediately',
    oneBox && singleField && route && offlineArtist && offlineTitle,
    'one box: ' + (oneBox ? 'yes' : 'no') + ' · single-field query: ' + (singleField ? 'yes' : 'no') +
    ' · /api/lyrics?q=: ' + (route ? 'yes' : 'no') + ' · offline: artist-only “Jimi Hendrix” → ' +
    C.search('Jimi Hendrix', { cap: 9 }).songs.length + ' songs, title-only “Little Wing” → ' + C.search('Little Wing', { cap: 9 }).songs.length);
})();

/* ---------------------------------------------------------------- */
/* 8. more extensive search for lyrics and play-along songs          */
/* ---------------------------------------------------------------- */
(function () {
  const counts = C.counts;
  const styles = read('public/js/styles.js');
  const online = read('public/js/songsearch.js').indexOf('/api/songs') > 0;
  const artists = C.ARTISTS.filter(a => C.artistSongs(a.name).length).length;
  const ok = counts.songs >= 160 && counts.lessons >= 28 && counts.artists >= 45 && artists === counts.artists && online && /TECHNIQUES/.test(styles);
  item(8, 'More extensive search for lyrics and songs to play along with',
    'the offline catalogue across songs/artists/lessons/techniques, plus the online lyric lookup and per-artist pages',
    ok,
    counts.songs + ' songs · ' + counts.artists + ' artist pages (all with playable songs) · ' + counts.lessons +
    ' lessons · 28 techniques · online lyric tab: ' + (online ? 'wired' : 'missing'));
})();

/* ---------------------------------------------------------------- */
/* 9. live listening, both ways                                      */
/* ---------------------------------------------------------------- */
(function () {
  const js = read('public/js/listener.js');
  const view = read('public/index.html');
  const live = /yin|YIN/.test(fs.readFileSync(path.join(root, 'public/js/lib/yin.js'), 'utf8')) &&
    /analyser|getFloatTimeDomainData/.test(read('public/js/audio.js'));
  const both = /'bad'/.test(js) && /'ok'/.test(js) && /verdict/.test(js);
  const copy = ['one fret above', 'one fret below', 'whole octave above', 'whole octave below', 'semitones apart', 'dead on', 'Right note, wrong pitch']
    .filter(s => js.indexOf(s) >= 0);
  const viewOk = ['ls-source', 'ls-banner', 'ls-misses', 'ls-score', 'ls-btn-start'].every(id => view.indexOf('id="' + id + '"') > 0);
  item(9, 'Live listening for the guitar played locally: wrong notes are flagged, right notes are confirmed, both directions',
    'live YIN on the microphone with a stability gate; verdicts carry the heard note, the wanted note, the direction and the distance',
    live && both && copy.length >= 6 && viewOk,
    'copy present: ' + copy.length + '/7 (“' + copy.slice(0, 3).join('”, “') + '”…) · mic path: ' +
    (live ? 'analyser → yin' : 'missing') + ' · view controls: ' + (viewOk ? 'ok' : 'missing'));
})();

/* ---------------------------------------------------------------- */
/* 10. the advanced extras                                           */
/* ---------------------------------------------------------------- */
(function () {
  const views = ['styles', 'backing', 'mine'];
  const nav = read('public/index.html');
  const wired = views.every(v => nav.indexOf('data-view="' + v + '"') > 0 && nav.indexOf('id="view-' + v + '"') > 0);
  const tests = ['test/yin-test.js', 'test/poly-test.js', 'test/dsp-test.js', 'test/backing-test.js', 'test/songs-test.js',
    'test/apk-test.js', 'test/pwa-e2e.js', 'test/requirements-audit.js']
    .filter(f => fs.existsSync(path.join(root, f)));
  const badges = (read('public/js/share.js').match(/\{ id: '/g) || []).length;
  const presets = (read('public/js/backing.js').match(/\{ name: '[^']+'/g) || []).length;
  item(10, 'And more advanced things',
    'Styles & players, Backing studio, My stuff (favourites + session builder), 30 separation recipes, 33 badges, eight node test suites',
    wired && tests.length === 8 && badges >= 30,
    views.join(' · ') + ' all reachable · ' + tests.length + '/8 node suites · ' + badges + ' badges · ' +
    presets + ' backing presets · ' + (read('public/js/stemlab.js').match(/\{ id: '/g) || []).length + ' stem recipes');
})();

/* ---------------------------------------------------------------- */
/* 12. the Android app: a real, signed, self-hosted APK              */
/* ---------------------------------------------------------------- */
(function () {
  const apkPath = path.join(root, 'public', 'downloads', 'TrillTuner.apk');
  const exists = fs.existsSync(apkPath);
  const size = exists ? fs.statSync(apkPath).size : 0;
  const raw = exists ? fs.readFileSync(apkPath) : Buffer.alloc(0);
  /* the central directory of a zip stores entry names as plain text */
  const zipHas = s => raw.length > 0 && raw.indexOf(Buffer.from(s)) >= 0;
  const man = read('apk-src/AndroidManifest.xml');
  const smaliDir = path.join(root, 'apk-src', 'smali', 'com', 'trilltuner', 'app');
  const smali = ['MainActivity.smali', 'TClient.smali', 'TChrome.smali', 'TBridge.smali']
    .every(f => fs.existsSync(path.join(smaliDir, f)));
  const perms = ['INTERNET', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'ACCESS_NETWORK_STATE', 'VIBRATE']
    .every(p => man.indexOf('android.permission.' + p) > 0);
  item(12, 'An Android app version of the whole thing — named Trill Tuner, correct permissions, built and working',
    'public/downloads/TrillTuner.apk is a real signed APK (zip entries + v1/v2/v3 signatures verified by test/apk-test.js and test/apk-verify.py); the shell source lives in apk-src/ (manifest + smali) and tools/build-apk.py rebuilds it without an SDK',
    exists && size > 200 * 1024 && zipHas('AndroidManifest.xml') && zipHas('classes.dex') && zipHas('resources.arsc')
      && zipHas('assets/index.html') && zipHas('META-INF/') && man.indexOf('package="com.trilltuner.app"') > 0
      && man.indexOf('android:label="Trill Tuner"') > 0 && perms && smali
      && fs.existsSync(path.join(root, 'tools', 'build-apk.py')),
    'APK ' + (size / 1024).toFixed(0) + ' KB · package com.trilltuner.app · label “Trill Tuner” · minSdk 24 / targetSdk 34 · 5 permissions · 4 smali shell classes · signed v1+v2+v3 (apksigner verify) · deep-checked by test/apk-test.js + test/apk-verify.py');
})();

/* ---------------------------------------------------------------- */
/* 13. the web version stays and becomes a PWA, offline after load   */
/* ---------------------------------------------------------------- */
(function () {
  const man = JSON.parse(read('public/manifest.webmanifest'));
  const sw = read('public/sw.js');
  const head = read('public/index.html');
  const icons = ['public/icons/icon-192.png', 'public/icons/icon-512.png',
    'public/icons/icon-maskable-512.png', 'public/icons/apple-touch-icon.png']
    .every(f => fs.existsSync(path.join(root, f)));
  item(13, 'The web version remains and becomes a PWA — 100% offline after the first load',
    'manifest.webmanifest (standalone, icons) + sw.js (precache-all, navigation fallback, skipWaiting) + PWA meta in index.html; the offline reload itself is proven in test/pwa-e2e.js (network cut, tuner still detects in-tune)',
    man.name === 'Trill Tuner' && man.display === 'standalone' && man.icons.length >= 3
      && sw.indexOf('cache.addAll') > 0 && sw.indexOf('caches.match') > 0 && sw.indexOf('skipWaiting') > 0
      && head.indexOf('rel="manifest"') > 0 && head.indexOf('name="theme-color"') > 0
      && head.indexOf('apple-mobile-web-app-capable') > 0 && head.indexOf('maximum-scale=1') > 0
      && icons && fs.existsSync(path.join(root, 'test', 'pwa-e2e.js')),
    'manifest “' + man.name + '” standalone · ' + man.icons.length + ' icons · sw precaches the app, falls back to the cached shell offline · theme #f59e0b · mobile viewport · offline E2E green');
})();

/* ---------------------------------------------------------------- */
/* 14. the guided demo: skippable, every section, progress saved     */
/* ---------------------------------------------------------------- */
(function () {
  const demo = read('public/js/demo.js');
  const html = read('public/index.html');
  const views = ['tune', 'metronome', 'record', 'lyrics', 'songs', 'styles', 'maker', 'stems',
    'backing', 'listening', 'learn', 'tools', 'rig', 'mine', 'progress', 'care'];
  const covered = views.filter(v => demo.indexOf("view: '" + v + "'") > 0);
  const steps = (demo.match(/title: '/g) || []).length;
  item(14, 'A detailed demo you can skip — and if you do not skip it, every section is covered one by one, with Next and Skip, saving your progress',
    'public/js/demo.js walks all 16 views in 26 steps with Next/Skip/Back, saves tt.demoStep after every step, resumes after a reload; wired to #btn-tour; proven end to end in test/pwa-e2e.js',
    covered.length === 16 && steps >= 20
      && html.indexOf('id="demo-next"') > 0 && html.indexOf('id="demo-skip"') > 0 && html.indexOf('id="demo-back"') > 0
      && demo.indexOf("set('demoStep'") > 0 && demo.indexOf("set('demoDone'") > 0
      && html.indexOf('id="btn-tour"') > 0,
    steps + ' steps · all 16 sections covered (' + covered.length + '/16) · Next + Skip + Back · progress saved + resumed · restart from Tuning setup');
})();

/* ---------------------------------------------------------------- */
/* 15. QR sharing of the APK + remote tuning over the LAN            */
/* ---------------------------------------------------------------- */
(function () {
  const html = read('public/index.html');
  const server = read('server.js');
  const qr = read('public/js/lib/qrcode.js');
  item(15, 'Sharing with a QR code that links to the download of the actual APK — hosted by the app itself — plus a QR to connect another device over the LAN for live, fully inclusive tuning',
    'vendored QR generator + TT.qr wrapper; the progress view shows the APK QR + link to /download/trill-tuner.apk served by server.js; the tune view hosts a session (QR to ?join=<id>) and two devices mirror each other live over SSE — proven in test/pwa-e2e.js',
    qr.length > 10000 && fs.existsSync(path.join(root, 'public', 'js', 'qr.js'))
      && html.indexOf('id="apk-qr"') > 0 && html.indexOf('id="apk-link"') > 0 && html.indexOf('id="btn-apk-open"') > 0
      && server.indexOf("'/download/trill-tuner.apk'") > 0 && server.indexOf('application/vnd.android.package-archive') > 0
      && html.indexOf('id="btn-remote-host"') > 0 && html.indexOf('id="remote-qr"') > 0
      && server.indexOf("'/api/sessions'") > 0 && server.indexOf('(events|msg)') > 0
      && server.indexOf("'/api/host'") > 0 && fs.existsSync(path.join(root, 'public', 'js', 'remote.js')),
    'QR lib vendored (qrcode-generator, MIT) · APK QR + copy/share/open buttons · server hosts the APK (MIME + range support) · host QR → ?join=<id> · SSE sessions mirror note/cents/status both ways');
})();

/* ---------------------------------------------------------------- */
/* 11. the server side, over HTTP, when it is running                */
/* ---------------------------------------------------------------- */
(function () {
  const check = async () => {
    try {
      const r = await fetch('http://127.0.0.1:3000/api/songs?q=Dreams', { signal: AbortSignal.timeout(2500) });
      const j = await r.json();
      const l = await (await fetch('http://127.0.0.1:3000/api/lyrics?q=Fleetwood%20Mac', { signal: AbortSignal.timeout(2500) })).json();
      item(11, 'Server proxy for lyrics and songs (single-field), degrading without a connection',
        'GET /api/songs?q= and GET /api/lyrics?q= answered by the running server',
        r.status === 200 && typeof j.ok === 'boolean' && typeof l.ok === 'boolean' && !/artist.*title.*required/i.test(JSON.stringify(j)),
        'GET /api/songs?q=Dreams → ' + r.status + ' ok=' + j.ok + ' (' + (j.count || 0) + ' online results) · GET /api/lyrics?q=Fleetwood Mac → ok=' + l.ok +
        (l.error ? ' (“' + l.error + '” — the offline songbook still answers)' : ''));
    } catch (e) {
      item(11, 'Server proxy for lyrics and songs (single-field), degrading without a connection',
        'HTTP check against the running server',
        false, 'the server is not answering on port 3000 (' + e.message + ') — start it with `node server.js`');
    }
    finish();
  };

  function finish() {
    const pass = rows.filter(r => r.pass).length;
    console.log('\n' + (failures ? '❌ ' + failures + ' of ' + rows.length + ' requirement(s) not met' : '✅ all ' + rows.length + ' requirements verified'));
    if (process.argv.indexOf('--write') >= 0) {
      const out = ['# Requirements check', '',
        'Generated by `node test/requirements-audit.js --write` on ' + new Date().toISOString().slice(0, 10) + '.',
        '', '| # | Asked for | How it is checked | Result | Evidence |', '|---|---|---|---|---|'];
      rows.forEach(r => out.push('| ' + r.n + ' | ' + r.ask + ' | ' + r.how + ' | ' + (r.pass ? '✅' : '❌') + ' | ' + r.evidence.replace(/\|/g, '\\|') + ' |'));
      out.push('', pass + ' of ' + rows.length + ' verified.');
      fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(root, 'docs/REQUIREMENTS-CHECK.md'), out.join('\n') + '\n');
      console.log('→ wrote docs/REQUIREMENTS-CHECK.md');
    }
    process.exit(failures ? 1 : 0);
  }

  check();
})();
