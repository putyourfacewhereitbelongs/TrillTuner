# Trill Tuner 🎸

A complete guitar companion web app — **tuner, metronome, recorder, lyric search, a deep learning
academy, an advanced guitar toolkit, a virtual amplifier + pedalboard, progress sharing and a
guitar-care kit** — with pitch detection written from scratch (no audio libraries).

Built as **Trill Tuner** (the app was renamed from its earlier working title; any settings, lessons,
practice time or presets saved under the old name are migrated automatically, so nothing is lost).

**At a glance** — 52 amps · 122 amp tones · 125 pedals · 22 genre recipes · 26 famous rigs · 94 tunings ·
26 scales · 31 chord types · 15 lessons · 12 practice riffs · 9 drills · 24 badges — all local, no
accounts, no uploads.

## Run it

```bash
node server.js        # → http://localhost:3000  (zero npm dependencies)
```

`npm test` runs the pitch-detection unit tests. `npm run test:e2e` runs the full
browser end-to-end suite (requires `npm i puppeteer` and a running server).
`node test/dom-smoke.js` runs the dependency-light DOM smoke suite (jsdom) that boots the whole app,
walks every view/pane/control and checks the libraries, rig, practice, sharing and persistence.

## The tuner

- **Pitch detection from scratch** — the YIN algorithm (de Cheveigné & Kawahara, 2002):
  squared-difference function → cumulative mean normalized difference → absolute
  threshold → parabolic interpolation, with 2:1 decimation for bass-range tunings.
- **Waveform line** — a live oscilloscope of your guitar that is **red until the
  string is in tune, then turns green**, with the **detected note letter on the left**
  and the **target string's note on the right**, plus a cents readout.
- **Strobe display mode** — a professional rotating strobe disc (Wave/Strobe toggle):
  it spins left when flat, right when sharp, and **locks perfectly still when you're
  dead in tune**.
- **Polyphonic strum check** — hit **⚡ Strum check** and strum all strings at once:
  a Goertzel ±160¢ scan per string (Hann-windowed, harmonic-masked, dual-window
  voting) grades every string in one pass — green in-tune, red flat, amber sharp —
  and the neck lights up per string, Polytune-style.
- **Sweetened tunings** — per-string cent offsets on top of any preset: James
  Taylor's famous acoustic recipe, acoustic/electric compensation, or your own
  custom offsets (editable ¢ boxes per string).
- **Capo mode** — pick fret 1–7: every target shifts (+N semitones), the neck shows
  the capo, chips and note names re-label, and detection follows.
- **Smart filter** — band-limits the analysis feed to 65–1600 Hz so room chatter,
  TVs and hiss stay out of the detector (recordings keep the full signal).
- **Attack settle** — skips the first ~260 ms after a pluck, when strings ring
  sharp from the pick attack, so the needle doesn't bounce.
- **Overtone analyzer** — live H1–H8 harmonic bars and a brightness score for the
  note you're holding: diagnose muddy vs zingy strings.
- **Gig mode** (`G` key) — a full-screen, high-contrast stage display readable from
  six feet away on a dark stage; Esc exits.
- **19 tuning presets** — Standard (default), Drop D, Half Step Down, Full Step Down,
  Drop D♭, Drop C, Drop B, Drop A, 7-String, Open G/D/E/C, DADGAD, Double Drop D,
  bass (standard + Drop D), ukulele, mandolin.
- **Tuning guide** — every preset ships with a description and famous songs that
  use it, plus a **hear-it** strum so you know the target before you tune.
- **Neck display** — an SVG guitar neck (headstock, tuning pegs, fretboard) with all
  strings drawn in rosewood (acoustic) or maple (electric) finish; the string you're
  strumming lights up (with its tuning peg), vibrates while it rings, turns green
  with a ✓ when locked, and shows ▲/▼ peg direction.
- **Acoustic / Electric modes** — different detection profiles (overtone handling,
  thresholds, smoothing) and a different guitar on screen.
- Reference tones for every string (Karplus–Strong plucked-string synthesis, also
  from scratch), adjustable A4 (415–466 Hz), ±3/±5/±10¢ in-tune window.

## Autonomous behavior

- **Auto string detect** — just play; it knows which string you're on.
- **Auto-advance** — a string held in tune for ~0.7 s is locked in ✓ and the next
  string is called out for you.
- **Octave correction** — hears through strong overtones to the true fundamental.
- **Auto noise calibration** — measures your room's noise floor on startup.
- **Preset hints** — plays something that fits another tuning (e.g. Drop C)? It
  offers to switch.
- **Smart retune routes** — switch presets and it orders your string changes
  biggest-first to keep neck tension even.
- **Strum-check triage** — after a strum it names the worst offender and tells you
  to fix that one first.
- **Auto assistant log** — narrates every decision it makes.
- Settings, lesson progress, practice streaks and lyric favorites persist locally.

## Amplifier & pedalboard (the "rig" view)

Everything a real rig does, modelled in software — **no cables or hardware needed**; it runs on the
Web Audio engine that is already in the page.

- **52 classic and modern amps** across 29 brands — Fender Twin/Deluxe/Pro Junior, Vox AC30/AC10,
  Marshall Plexi/JCM800/Silver Jubilee/Bluesbreaker, Mesa Mark V & Dual Rectifier, Peavey 6505,
  EVH, Diezel VH4, Roland JC-120, Boss Katana, Fender Tone Master, Yamaha THR10II, Positive Grid
  Spark, Kemper, PRS Archon, Blackstar HT, Morgan AC20, Two-Rock Burnside, Dumble-style, Supro
  Thunderbolt, Ampeg B-15, Fender Rumble 500, Laney Lionheart, Cornford Harlequin and more — each
  with its **real control layout** (knob names, taper ranges, switch positions), speaker/cab,
  wattage, era, genre notes and **122 voiced tones** taken from how players actually set them.
- **Turn the knobs** — the amp face is interactive; every knob is drag-to-adjust, and the values are
  the published/typical settings for that circuit, not random numbers.
- **125 pedals in 19 categories** — overdrive, distortion, fuzz, boost, EQ, compressor, wah, filter,
  chorus, flanger, phaser, vibe, tremolo, delay, reverb, pitch, amp-in-a-box, looper and utility.
  Every pedal carries its real control set, a description, **iconic song settings** and usage tips
  (TS808 — drive 9 / tone 6 / level 7 for that mid-hump solo boost; Big Muff — sustain 3 o'clock for
  Gilmour; V847 Wah — sweep the sweet spot; Boss HM-2 — every knob to the right for the Swedish
  chainsaw; Op-Amp Muff — the Siamese Dream wall). The deep cuts are covered too: DOD 250, Guv’nor,
  FZ-2 Hyper Fuzz, Green Russian and Op-Amp Big Muff, Fuzzrite, WH10, Colorsound and Jimi Hendrix
  wah, AW-3, DOD 440 Envelope Filter, Micro Synth, CE-1, BF-2, DC-2, VB-2, Deja’Vibe, TR-2, Lex
  Rotary, Mobius, DM-2, Timeline, Flint, Hall of Fame, RV-6, The Drop, POG2, OC-3, King of Tone,
  Tumnus, AC Booster, SHO, Keeley Compressor Plus, Empress Compressor MkII, M108 10-band EQ, Heil
  Talk Box and more.
- **Signal-chain view** — guitar → dirt/comp → EQ → modulation → time → utility → amp, colour-coded
  with the live chain and active-pedal count.
- **22 genre recipes** — doom, Swedish death metal (chainsaw), groove metal, dream pop, rockabilly,
  garage/psych, funk rock and the classic rock/blues/metal/country/jazz/surf/stoner/shoegaze/indie
  recipes, each with the amp, the cab, the pedal order and the settings it is actually built from.
  One click loads the whole rig.
- **26 famous rigs, one click** — Hendrix (Plexi + Fuzz Face + V847 + Uni-Vibe), SRV, Gilmour
  (Hiwatt DR103 + Big Muff + Electric Mistress + Phase 95), The Edge, Slash, Hetfield, EVH, Cobain,
  Brian May, Jack White, Frusciante (WH10 + DS-2 + CE-1 + Memory Man), Knopfler, Petty, Santana,
  McCready, Hammett, Trower, Electric Wizard, Entombed, Dimebag Darrell, The Smashing Pumpkins,
  The Black Keys, Brian Setzer and Angus Young (guitar → cable → Plexi, nothing else).
- **Audition it** — test riffs and strums are *played through the actual chain* (Karplus–Strong
  strings → pedal DSP → amp voicing → cab filter → master), so changing a knob changes what you hear.
- **Wiring guides** — per-rig guidance on the amp's front panel, pedal order, power/grounding,
  4-cable-method and in-amp effects-loop advice.
- **Play through it** — turn the monitor on and your microphone is routed through the rig into the
  amp model (headphones strongly recommended) — that is the "wires" part: an interface or a mic.
- Your rig auto-saves: amp, every pedal, its knobs, on/off states and master level survive a reload.

## Tools for advanced players

- **Scale explorer** — 26 scales/modes with notes, degrees and colour-coded fretboard (root, 3rd, 5th).
- **Circle of fifths** — click any of the 12 keys for its signature, relative minor, diatonic chords
  and a one-click scale launch.
- **Chord builder** — 31 chord types, automatic voicings across string sets, six playable diagrams.
- **Fretboard trainer** — find-the-note and name-the-note games with live scoring.
- **String tension calculator** — real D'Addario-style math, per-string and per-set totals, plus a
  safe-set warning; matches published charts within a pound.
- **Setup specs** — relief, action and pickup height for six guitar types, with fret maths (spacing,
  scale length, fret positions).
- **Capo & transpose** — capo position, transposition, and the shapes you need to play a song in any key.
- **Pickups & mods** — 10 wiring/mod cards (coil split, treble bleed, 50s wiring, series/parallel…)
  with what it does and why.

## Practice studio

- **9 drills** (alternate picking, spider walk, legato, string skipping, sweep, bend accuracy,
  vibrato, chord changes, ear focus) with goals, difficulty and how-to text.
- **Routines** — timed 15/30/45-minute sessions built from the drills, step by step.
- **12 riff trainer** entries with on-screen tab that highlights the note you're on, tempo control
  and a metronome you can launch straight into.
- **Rhythm trainer** — tap along to phases, graded in milliseconds (under ~30 ms is tight).
- **Interval trainer** — 13 intervals with mnemonics, played through the same Karplus–Strong engine.

## Progress, sharing & persistence

- **Progress dashboard** — 12 stats (practice minutes, streak, tunings used, amps loaded, pedals
  added, lessons done…), 24 unlockable badges and a snapshot history.
- **Share your progress** — generates a share card image, a compact share link/code you can copy
  (no server, no account — it is encoded in the link itself) and an import box for a code someone
  sent you, safe-merged into your own data.
- **Backup & restore** — export/import the whole save as JSON, plus a text snapshot/restore with
  rollback, and a storage panel that shows what is stored and whether it is persisted
  (`navigator.storage.persist()` is requested so the browser is less likely to evict it).
- **Everything persists**: settings, tuner state, lessons, practice minutes, streaks, badges,
  recordings metadata, lyrics favorites, rig presets, tool prefs and progress snapshots — all in
  `localStorage` under the `tt.` prefix, written straight away (no save button). Data saved by the
  app's earlier version is imported on first load.

## Splash screen

Every launch shows a branded splash — logo, version, live library counters ("94 tunings · 125
pedals · 52 amps"), a boot log that reports what actually loaded and what was skipped (mic, storage,
polyphony), a progress bar, and then it lets you in. Press **Enter** (or *Enter without waiting*)
at any time to skip straight to the app.

## Metronome · Recorder · Lyrics · Learn · Care

- **Metronome** — 30–280 BPM, tap tempo, 2/4–9/8 (compound accents), subdivisions,
  swinging pendulum, space-bar start/stop, practice-time tracking.
- **Jam tracks** — flip on the backing loop and the metronome strums a chord
  progression (12-bar blues, I–V–vi–IV, I–IV–V, ii–V–I) in any key with the
  Karplus–Strong strings — synced to your BPM, shown as chord symbols, and captured
  by the recorder. Tune up → hit Space → jam.
- **Recorder** — records your mic **plus the metronome click and jam track**, optional
  one-bar count-in, take management with playback and download.
- **Lyrics** — artist + title search (server proxies lrclib.net → lyrics.ovh), with
  favorites and recent history.
- **Learn** — 15 lessons from first chord to modes & improvisation across 9 tabs (beginner →
  intermediate → advanced, chords, scales, technique, theory, songs, ear training, practice),
  a 23-chord library with playable diagrams, and an ear-training game with easy→hard modes.
- **Care** —
  - **String health**: log string changes; a wear meter blends play-time and age,
    warns when strings are dull and at breakage risk.
  - **Intonation helper**: auto-listens while you play each string open and at the
    12th fret, then tells you which saddle to move — and which way.
  - **Room & wood watch**: enter temperature/humidity; get dry-air, humidity and
    heat warnings for your wooden instrument.

Everything runs client-side; the server only serves static files and proxies
lyric searches. Audio never leaves your machine.
