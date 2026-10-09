/* Trill Tuner — guided demo.
 *
 * A skippable, step-by-step tour that covers every section of the app, one
 * view at a time. It opens automatically on the very first visit (after the
 * splash), can be restarted any time from Tuning setup → "Take the tour", and
 * always offers Next and Skip. Progress is saved after every step, so closing
 * the tab mid-tour resumes exactly where you left off. */
(function () {
  'use strict';

  const D = { idx: 0, deferred: false, active: false };
  let els = {};

  /* Every section, one by one. `view` is switched to, `tab` (if any) is
   * activated inside that view, and `target` gets the spotlight. */
  const STEPS = [
    { view: 'tune', target: '#btn-mic-start', title: 'Welcome to Trill Tuner 🎸',
      text: 'This is the tuner. Everything runs on your device — pitch detection, chords, stems, all of it. Press “Start listening”, allow the mic, and play your low E: the wave turns green when you are in tune.' },
    { view: 'tune', target: '#wave-canvas', title: 'The live wave & the big notes',
      text: 'The wave is your string vibrating. On the left, the note you are playing; on the right, the note you are aiming for. The cents readout underneath tells you how far off you are.' },
    { view: 'tune', target: '#string-chips', title: 'String-by-string progress',
      text: 'Each chip is one string. Hold a string in tune and its chip locks in with a ✓, then the tuner auto-advances to the next string. Reset progress any time from Tuning setup.' },
    { view: 'tune', target: '#btn-strum', title: 'Strum check & the tuning guide',
      text: 'Strum all six strings at once and the polyphonic check grades every string in one go. The tuning guide tells you what a tuning sounds like and which famous songs use it — with a play-along button.' },
    { view: 'tune', target: '#select-tuning', title: '94 tunings, capo & sweeteners',
      text: 'Standard, drop D, DADGAD, open tunings, 7- and 8-strings, artist sets — search the box. The capo selector relabels every string for a clamped capo, and sweetened tunings apply real per-string cent offsets.' },
    { view: 'tune', target: '#btn-remote-host', title: 'Remote tuner — two devices, one tuning',
      text: 'Host a session here and scan the QR code with a second phone or laptop on the same Wi-Fi. Both tuners mirror each other live: notes, cents, guidance and per-string progress, fully in sync.' },
    { view: 'metronome', target: '#btn-metro-start', title: 'Metronome',
      text: 'Tap tempo or drag the BPM. The pendulum swings, the LEDs count the beats, and the accent colour follows your time signature. Space bar starts and stops it.' },
    { view: 'metronome', target: '#chk-jam', title: 'Jam track',
      text: 'Turn on the jam track and a chord progression follows the click in any key — ideal for improvising over a groove while the metronome keeps time.' },
    { view: 'record', target: '#btn-record', title: 'Recorder',
      text: 'Record a take straight from the mic — the metronome can count you in. Takes are saved locally with a timer, and you can play them back or download them as audio files.' },
    { view: 'lyrics', target: '#lyr-q', title: 'Lyric search — one box is enough',
      text: 'Type a song, an artist, or both — either one on its own works. Lyrics come from the lyric databases when online, and the built-in songbook answers instantly even with no connection.' },
    { view: 'songs', target: '#ss-songs', title: 'Play-along songbook',
      text: '165 songs with keys, tempos and chord charts, searchable by title, artist, genre or the chords you already know. Every song opens a play-along chart.' },
    { view: 'styles', target: '#sy-q', title: 'Styles & players',
      text: 'Search a player, a genre or a technique and get the story, the gear and the songs — plus a route into the rig that built that sound.' },
    { view: 'maker', target: '#view-maker .card', title: 'Tab maker — it listens to the song',
      text: 'Drop in any audio file and the tab maker works out the chords, the key, the tempo and the capo by listening — then hands you a play-along chart.' },
    { view: 'stems', target: '#view-stems .card', title: 'Stem lab — take the mix apart',
      text: 'Remove or isolate vocals, drums, bass, electric or acoustic guitar from any track — including an acoustic-only chop that leaves the electric and the kit playing.' },
    { view: 'backing', target: '#view-backing .card', title: 'Backing studio',
      text: 'Generate a practice bed in any key and feel — chords, bass, drums and more — and play along with a band that never gets tired.' },
    { view: 'listening', target: '#view-listening .card', title: 'Live listener',
      text: 'The listener hears what you play, names every wrong note and confirms every right one — a real-time ear trainer with instant feedback.' },
    { view: 'learn', target: '#learn-tabs', tab: 'beginner', title: 'Learning academy',
      text: 'Structured lessons from your first chord to advanced technique, each one naming real songs from the songbook so you always know why you are learning it.' },
    { view: 'learn', target: '#learn-tabs', tab: 'drills', title: 'Practice studio',
      text: 'Technique drills with a built-in timer and metronome, a riff player with scrolling tab, and routines that log your practice time automatically.' },
    { view: 'tools', target: '#tools-tabs', tab: 'scales', title: 'Scale explorer',
      text: 'Pick a scale and see it on a real fretboard — every note highlighted, with the intervals that make the scale sound like it does.' },
    { view: 'tools', target: '#tools-tabs', tab: 'circle', title: 'Circle of fifths',
      text: 'Tap any key to see its signature, its relative minor and its chords — the map that makes every key feel like home.' },
    { view: 'tools', target: '#tools-tabs', tab: 'builder', title: 'Chord builder & fretboard trainer',
      text: 'Build any chord and see it on a real fretboard, then take the fretboard trainer — it quizzes you on shapes until they are in your hands. The learn view has the full chord library with fingerings too.' },
    { view: 'tools', target: '#tools-tabs', tab: 'looper', title: 'Phrase looper, drone, CAGED & bends',
      text: 'Record a riff and play over it, hold a drone in any key, map the five CAGED shapes across the neck, chime natural harmonics, set a saddle, and land bends on pitch — the tools you actually reach for while the guitar is in your lap.' },
    { view: 'rig', target: '#rig-amp-select', title: 'The rig — amps & pedals',
      text: 'A library of real amplifiers with their actual panels and dialed-in settings, 140+ pedals with real controls, 40 famous rigs to load in one click, and a signal chain you can audition through Web Audio — or plug a real guitar in from Hookup.' },
    { view: 'hookup', target: '#view-hookup .card', title: 'Plug in a real guitar',
      text: 'A ¼″ cable into an audio interface, then into this app. Live guitar sends only the amped, pedaled sound to the speakers — the synthesized preview riffs stay off, and the dry guitar is not mixed in.' },
    { view: 'settings', target: '#view-settings .card', title: 'Settings — sun mode & more',
      text: 'White sun mode so you can read the tuner outdoors, a larger type size, A4 reference, input device, and a switch that mutes preview riffs while you play live.' },
    { view: 'mine', target: '#view-mine .card', title: 'My stuff',
      text: 'Favourites, saved rigs and tunings, and a session builder that turns your songs into a practice set — all saved on this device.' },
    { view: 'progress', target: '#apk-qr', title: 'Progress, sharing & the Android app',
      text: 'Your stats and achievements, a shareable progress card, backups you can export and import — and the QR code for the Trill Tuner Android app, hosted by this app itself. Scan it with another phone to install.' },
    { view: 'care', target: '#view-care .card', title: 'Guitar care',
      text: 'String health, an intonation worksheet and an environment monitor — log string changes and keep the neck happy where you live.' },
    { view: 'tune', target: '#btn-install', title: 'Install & go fully offline ⏬',
      text: 'Install Trill Tuner as an app (or grab the APK from the Progress tab): after the first load, every feature works with no connection at all. Enjoy the studio! 🎸' }
  ];

  function store() { return (window.TT && TT.store) ? TT.store : null; }

  function spotlightOn(sel) {
    if (!els.spot) return;
    const el = sel && document.querySelector(sel);
    if (!el || !el.offsetParent) { els.spot.hidden = true; return; }
    const r = el.getBoundingClientRect();
    els.spot.hidden = false;
    els.spot.style.left = (r.left - 8) + 'px';
    els.spot.style.top = (r.top - 8) + 'px';
    els.spot.style.width = (r.width + 16) + 'px';
    els.spot.style.height = (r.height + 16) + 'px';
  }

  function showStep(i) {
    D.idx = Math.max(0, Math.min(STEPS.length - 1, i));
    const s = STEPS[D.idx];
    if (s.view && TT.app && TT.app.showView) TT.app.showView(s.view);
    if (s.tab) {
      const tab = document.querySelector(`[data-tab="${s.tab}"]`);
      if (tab) setTimeout(() => tab.click(), 60);
    }
    if (els.step) els.step.textContent = (D.idx + 1) + ' / ' + STEPS.length;
    if (els.title) els.title.textContent = s.title;
    if (els.text) els.text.textContent = s.text;
    if (els.next) els.next.textContent = D.idx === STEPS.length - 1 ? 'Finish ✓' : 'Next →';
    if (els.back) els.back.disabled = D.idx === 0;
    if (els.dots) {
      els.dots.innerHTML = '';
      STEPS.forEach((_, k) => {
        const d = document.createElement('i');
        if (k === D.idx) d.className = 'on';
        els.dots.appendChild(d);
      });
    }
    setTimeout(() => spotlightOn(s.target), 120);
    const st = store();
    if (st) st.set('demoStep', D.idx);
  }

  D.start = function (fromIdx) {
    if (!els.overlay) return;
    D.active = true;
    els.overlay.hidden = false;
    showStep(fromIdx != null ? fromIdx : (store() ? (store().get('demoStep', 0) || 0) : 0));
  };

  D.hide = function () {
    /* hide without touching saved progress (used by tests / the splash flow) */
    D.active = false;
    D.deferred = true;
    if (els.overlay) els.overlay.hidden = true;
    if (els.spot) els.spot.hidden = true;
  };

  D.skip = function (silent) {
    D.active = false;
    if (els.overlay) els.overlay.hidden = true;
    if (els.spot) els.spot.hidden = true;
    const st = store();
    if (st) { st.set('demoStep', 0); st.set('demoDone', true); }
    if (!silent && TT.app) TT.app.toast('Tour skipped — restart it any time from Tuning setup → “Take the tour”.');
  };

  function finish() {
    D.active = false;
    if (els.overlay) els.overlay.hidden = true;
    if (els.spot) els.spot.hidden = true;
    const st = store();
    if (st) { st.set('demoStep', 0); st.set('demoDone', true); }
    if (TT.app) TT.app.toast('Tour complete 🎉 Every section covered — replay it any time from Tuning setup.');
  }

  D.init = function () {
    els = {
      overlay: document.getElementById('demo-overlay'),
      spot: document.getElementById('demo-spot'),
      card: document.getElementById('demo-card'),
      step: document.getElementById('demo-step'),
      title: document.getElementById('demo-title'),
      text: document.getElementById('demo-text'),
      next: document.getElementById('demo-next'),
      back: document.getElementById('demo-back'),
      skip: document.getElementById('demo-skip'),
      dots: document.getElementById('demo-dots')
    };
    if (!els.overlay) return;
    if (els.next) els.next.addEventListener('click', () => {
      if (D.idx >= STEPS.length - 1) finish();
      else showStep(D.idx + 1);
    });
    if (els.back) els.back.addEventListener('click', () => showStep(D.idx - 1));
    if (els.skip) els.skip.addEventListener('click', () => D.skip());
    const tourBtn = document.getElementById('btn-tour');
    if (tourBtn) tourBtn.addEventListener('click', () => D.start(0));

    /* resume / auto-start bookkeeping */
    const st = store();
    const done = st ? !!st.get('demoDone', false) : false;
    const saved = st ? (st.get('demoStep', 0) || 0) : 0;
    const firstRun = st ? !st.get('visited', false) : true;
    if (!done) {
      if (saved > 0) {
        TT.app.toast('Your tour was saved at step ' + (saved + 1) + ' — pick up where you left off?', { actionLabel: 'Resume tour', action: () => D.start(saved) });
      } else if (firstRun) {
        /* first visit: wait for the splash to clear, then open the tour */
        let tries = 0;
        const wait = setInterval(() => {
          tries++;
          const splash = document.getElementById('splash');
          const splashUp = splash && !splash.hidden && !splash.classList.contains('splash-out');
          if (!splashUp && !D.deferred) {
            clearInterval(wait);
            setTimeout(() => { if (!D.active && !D.deferred) D.start(0); }, 600);
          }
          if (tries > 40 || D.deferred) clearInterval(wait);
        }, 500);
      } else {
        TT.app.toast('New here? Take the guided tour — one minute, every section.', { actionLabel: 'Start tour', action: () => D.start(0) });
      }
    }
  };

  window.TT = window.TT || {};
  window.TT.demo = D;
})();
