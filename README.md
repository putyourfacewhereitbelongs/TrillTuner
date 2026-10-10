# Trill Tuner 🎸

A complete guitar companion — **tuner, metronome, recorder, lyric search, a deep learning
academy, an advanced guitar toolkit, a virtual amplifier + pedalboard, progress sharing and a
guitar-care kit** — with pitch detection written from scratch (no audio libraries).

It runs as a **web app you can install (PWA — 100% offline after the first load)**, and as a
**native Android app** (`TrillTuner.apk`, built from this repo with no Android SDK, hosted by
the app itself at `/download/trill-tuner.apk`). The same code powers both: the APK is a thin
WebView shell around the web app, so it always ships exactly the code the test suites cover.

Built as **Trill Tuner** (the app was renamed from its earlier working title; any settings, lessons,
practice time or presets saved under the old name are migrated automatically, so nothing is lost).

**At a glance** — 70 amps · 141 amp tones · 145 pedals · 22 genre recipes · 41 famous rigs · 94 tunings ·
26 scales · 31 chord types · 621 songs · 30 lessons · 51 artists · 28 techniques · 8 backing feels ·
18 views · 33 badges — no accounts; audio never leaves your device.

## Run it

```bash
node server.js        # → http://localhost:3000  (no runtime dependencies)
```

```bash
npm test              # yin + poly + audio lab + backing studio + songbook + play tools + HTTP range rules
                      # + APK structure + the PWA cache build + the requirements audit
npm run test:dom      # the whole app booted in jsdom: every view, control and hand-off
npm run test:e2e      # full browser end-to-end: the app + layout + PWA/offline/demo/QR/remote-sync
npm run test:apk      # APK structure + a real `apksigner verify` + androguard deep validation
npm run build:apk     # rebuild public/downloads/TrillTuner.apk (fetches its own tools on first run)
node test/requirements-audit.js --write   # the feature checklist, with measurements, into docs/
```

`npm test` needs no browser and no audio files: every suite synthesises the signal it measures
(a plucked string, a strummed triad, a full band mix) and checks the engine against it.
**`test/requirements-audit.js`** is the one to read first: it walks every requested feature —
song search, the listening tab maker, vocal removal, per-instrument removal, the acoustic-only
chop, single-field lyric search, the live listener — and either measures it against synthesised
audio or checks the DOM contract, printing the number it measured. `docs/REQUIREMENTS-CHECK.md`
is that run written out.

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
- **94 tunings in 9 categories** — Standard (default), Drop D, Half Step Down, Full Step Down,
  Drop D♭, Drop C, Drop B, Drop A, 7- and 8-string, Open G/D/E/C, DADGAD, Double Drop D,
  Nashville, mandolin, mandocello, ukulele, guitalele, baritone, bass (standard, 5- and 6-string,
  Drop D) and more, each with string gauges, tension and famous songs.
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

- **70 classic and modern amps** across 38 brands — Fender Twin/Deluxe/Pro Junior, Vox AC30/AC10,
  Marshall Plexi/JCM800/Silver Jubilee/Bluesbreaker, Mesa Mark V & Dual Rectifier, Peavey 6505,
  EVH, Diezel VH4, Roland JC-120, Boss Katana, Fender Tone Master, Yamaha THR10II, Positive Grid
  Spark, Kemper, PRS Archon, Blackstar HT, Morgan AC20, Two-Rock Burnside, Dumble-style, Supro
  Thunderbolt, Ampeg B-15, Fender Rumble 500, Laney Lionheart, Cornford Harlequin and more — each
  with its **real control layout** (knob names, taper ranges, switch positions), speaker/cab,
  wattage, era, genre notes and **141 voiced tones** taken from how players actually set them.
- **Turn the knobs** — the amp face is interactive; every knob is drag-to-adjust, and the values are
  the published/typical settings for that circuit, not random numbers.
- **145 pedals in 19 categories** — overdrive, distortion, fuzz, boost, EQ, compressor, wah, filter,
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
- **41 famous rigs, one click** — Hendrix (Plexi + Fuzz Face + V847 + Uni-Vibe), SRV, Gilmour
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

### Phrase looper — five takes, locked to the tempo

**Where it lives:** the side menu, under **Play → Looper** (it opens the looper tab of Tools).

The floor-pedal trick without the pedal, and without the usual fumble at the record button.

**It does the timing for you.** Press **Rec** and the looper starts the metronome if it is not already
running, counts one bar in, then starts recording **on the downbeat**, runs for exactly the number of
bars you picked (1/2/4/8) and **stops itself on the beat**. Recording is armed against
`ctx.currentTime` — the same clock the metronome schedules its clicks from — and the captured audio is
cut by sample timestamp, so "starts on the beat" is literally true rather than roughly true. You never
have to hit a button at the right moment, which is the reason most home-recorded loops drift.

**Then it cleans the take up.** In order: DC offset removed (a non-zero mean makes the loop point pop),
leading and trailing silence trimmed against a threshold derived from the take's own noise floor (so a
treated room and a loud amp both work, with 15 ms of pre-roll kept so the attack is not clipped), the
length landed on a whole number of bars, and a 30 ms equal-power **crossfade folded into the loop
seam** — the tail of the phrase is blended over its own head, so the wrap sits between two samples that
were neighbours in the source. No gap, no click, no doubled first note. Level is normalised to a 0.95
ceiling on the way out.

**No metronome? It reads the tempo off your playing.** With auto-align on but no clock locked, an
onset-envelope autocorrelation (`detectTempo`, 60–180 BPM) works the tempo out of the take and the loop
is quantised to that instead. With auto-align off it records free, still trims the air and still folds
the seam.

**Five takes, A–E.** Recording writes to the selected slot, so you can bank a few passes and switch the
instant one stops sitting right — click a letter, press **A–E**, or use **←/→** on the take row. Takes
are independent: switch and the loop restarts on that one immediately. **Overdub** stacks a layer onto
the active take instead of replacing it, and **Undo** takes the last pass back either way. **Clear**
empties the active take; press it again on an empty take to empty all five.

On the waveform, the faint vertical lines are bar boundaries at the grid tempo and the shaded strip at
the left is the seam crossfade — so you can *see* the alignment instead of trusting it. If the loop is
on the grid, every bar line lands on the same place in your phrase every time round.

All of the alignment maths is pure functions over a `Float32Array` (`alignTake`, `trimSilence`,
`detectTempo`, `foldSeam`, `crossfadeSeam`), unit-tested in `test/playtools-test.js`, and the whole
record → count-in → quantise → store pipeline is driven end to end against a fake AudioContext and
metronome in `test/looper-test.js`.

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
  added, lessons done…), 33 unlockable badges and a snapshot history.
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

Every launch shows a branded splash — logo, version, live library counters ("94 tunings · 145
pedals · 70 amps", read from the libraries that actually loaded), a boot log that reports what
actually loaded and what was skipped (mic, storage,
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
- **Lyrics** — **one search box**: a song title on its own, an artist on its own, or both — either
  field is enough. The offline songbook is searched first and rendered straight away, then the
  server proxy checks lrclib.net → lyrics.ovh, so a missing connection degrades to "here is what I
  already know" instead of an error. Favourites and recent searches are kept locally.
- **Learn** — **30 lessons** from first chord to modes & improvisation across 9 tabs (beginner →
  intermediate → advanced, chords, technique, drills, riff player, rhythm trainer, intervals),
  a chord library with playable diagrams fed by the theory engine, an ear-training game with
  easy→hard modes, and a session builder that lays out a 15/30/45-minute routine.
- **Care** —
  - **String health**: log string changes; a wear meter blends play-time and age,
    warns when strings are dull and at breakage risk.
  - **Intonation helper**: auto-listens while you play each string open and at the
    12th fret, then tells you which saddle to move — and which way.
  - **Room & wood watch**: enter temperature/humidity; get dry-air, humidity and
    heat warnings for your wooden instrument.

Everything runs client-side; the server only serves static files and proxies
lyric searches. Audio never leaves your machine.

## Songs, styles and players

- **Songbook (621 songs)** — every entry carries the key, tempo, capo, the chords **as the shapes you
  actually play**, the progression written out, difficulty and playing notes. The offline catalogue
  also holds 30 technique lessons, 51 artist pages and a 28-entry technique glossary — no connection
  needed, ever.
- **Search that works from any field** — a half-remembered title, an artist on its own, a genre
  ("shoegaze"), a difficulty, or a chord list ("G C D") all find songs; results carry play-along
  charts, lyrics, metronome settings, a favourite star and a copyable chart.
- **Styles & players** — a page per artist: what they are known for, the gear, the moves, the songs
  we can hand you, the songs worth listening to that we do not carry, a **rig recipe** loaded and
  configured for that genre, the lessons that build the skill, and 28 glossary entries that each say
  what the technique is, who is famous for it and the drill that teaches it.
- **Theory engine** — every song in the book maps onto roman numerals (I–V–vi–IV, blues, secondary
  dominants, borrowed chords, with a chromatic label for anything outside the key), all 24 keys
  build a chord library, 20 progressions are scored against what you played, and the capo engine
  answers the real question: *which capo and which shapes make this song easy?*

## Tab maker — it listens to the song

Drop in any audio file (WAV/MP3/M4A/OGG) and the tab maker reads it: **key, mode, tempo and the
actual chord sequence**, with confidence, over a bar grid and a chord library for that key — plus
the capo position, the progressions it matches and similar songs to learn next. Everything is
`lib/dsp.js`: a from-scratch FFT, an exclusive-assignment chroma with fundamental weighting, a
triad/seventh template match with an octave-disambiguated spectrum, and autocorrelation tempo
estimation. Reading a library song works with no audio at all; the sheet transposes, prints, and
plays back through the practice suite.

## Stem lab — a whole band, minus the part you choose

30 recipes over 28 separation modes: **vocals out (karaoke)**, drums/bass/electric/acoustic **out or
isolated**, keys, strings, synths, all guitars, plus the **classic karaoke with the bass kept**. Each
one is a real spectral mask (Hann FFT, per-bin tonal × percussive × stereo-coherence × presence
gating, a robust 25th-percentile noise floor and a neighbourhood-widened notch), not a filter sweep.

The **"Remove ONLY the acoustic guitar"** mode is the hard one, and it is tuned for exactly that
request. A strummed acoustic is harmonic like a distorted electric, so the mask does not rely on the
spectrum at all: it follows the **envelope of each bin's neighbourhood**. A plucked chord rises and
then dies away; a held, distorted, even vibratoed electric does not — and measuring the *neighbourhood*
rather than the single bin is what makes the measure immune to pitch modulation (vibrato, a whammy
dip or a chorus move energy between neighbouring bins without removing any of it). Percussive
transients are explicitly excluded, which is what keeps the kit alive.

Measured on a synthesised band — a strummed acoustic, a saturated electric holding a power chord with
a real ±15-cent vibrato, and a kick/snare pattern — the numbers in `npm test` are:

| layer | remove the acoustic | isolate the acoustic |
|---|---|---|
| acoustic | **−6.8 dB** | −2.8 dB |
| electric | −2.2 dB | −3.3 dB |
| drums | −2.1 dB | −4.9 dB |

so the acoustic loses roughly 4.5 dB more than anything else, and both other layers stay within a
couple of dB of where they started. Fewer than −190 dB of the vocal survives the classic karaoke
recipe. Results can be handed straight to the tab maker.

### The player: waveform, clock, skip, and an A–B loop

The moment a song is loaded — before any separation — it comes up with a **waveform and a clock**,
directly under the file (not buried under the recipes). Click the wave to skip; **drag from point A
to point B** on the wave to loop that section (the loop checkbox arms itself). You can still drop
**⟦ A** and **Set B ⟧** at the playhead, press `[` / `]`, or drag the handles. The loop is handed to
the audio node itself (`loopStart`/`loopEnd`), so there is no glitch at the wrap. With nothing set it
loops the whole take. Arrow keys skip ±5 s, `Home`/`End` jump to the ends. The playhead follows the
AudioContext clock rather than a wall timer, so the picture and the sound cannot drift apart. After
you separate, the same player switches to the result (Save as WAV and “read its chords” unlock then).

### Not fading the voice

The mask is applied as a **running gain**, not frame by frame. A soft per-frame mask multiplies the
voice by its own confidence, which is audible: words ramp in when isolating, and the first tenth of
every word leaks through the notch when removing. So the gain now snaps in the direction that
*protects* the target — the notch deepens and the island opens on the very frame a note appears — and
eases *towards the new target* over ~40 ms (isolate) / ~110 ms (remove) once it stops (decaying
towards silence instead was a fade all by itself: a held vowel wandered down 4 dB). The acoustic
profile is deliberately excluded: its whole discriminator is the *shape* of the envelope, and holding
gains across frames would smooth away the feature it is measuring.

Measured against the real voice (10 ms frames, synthesised words over a band, plus a dead-steady
vowel — the numbers `npm test` prints):

| | word onset vs steady | held vowel |
|---|---|---|
| isolate, before | onset 3.5 dB off, 1.8 dB quieter than the body (a fade-in) | **−4 dB and falling** |
| isolate, now | onset and body within **1.6 dB** of each other | **−0.1 dB**, ripple ±1.4 dB |
| remove, before | 1.9 dB *more* voice leaked at the onset than mid-word | |
| remove, now | −10 dB at the onset vs −11 dB mid-word — no swell back in | |

What is left at a word's onset is the analysis window's own resolution (a 4096-point Hann window at
22 kHz smears a transient over ±90 ms); making that shorter would cost the frequency resolution the
notch needs to find harmonics.

Long files are processed in overlapping slices through `separateChunked`, so a 10-minute song does not
freeze the page; progress is reported as it goes.

## Live listener — told both when you are wrong and when you are right

Turn the microphone on and the listener scores what you play against the tuning you are in, a scale, a
song's chords or your own note names: **YIN pitch detection** on the live stream, a stability gate so a
stray noise cannot score, string-by-string targets, a tolerance slider and an optional "must be in
tune" rule. It answers both ways round:

- a wrong note says which note it heard, which one it wanted, whether it was sharp or flat, and **how
  far** — "one fret above", "a whole octave below", "2 semitones apart";
- the right note is confirmed with the note name and the running streak;
- a right note at the wrong pitch gets the tuning advice instead (loosen or tighten, bend up or down);
- streaks, best run, cents trend, a miss log and a history of rounds are kept in local storage.

## Backing studio — a band that plays what you tell it

Pick a **key**, a **mode** (major, minor, dorian, mixolydian, blues), one of **8 feels** (strum,
fingerpicked arpeggio, rock/palm mute, shuffle, funk 16ths, reggae off-beat, ballad, country
boom-chick), a tempo, a bar count, swing, meters 4/4 or 3/4 and which parts you want — then it renders
a practice bed: from-scratch **Karplus–Strong** strings for the chords, bass and arpeggios and a
synthesised kit (sine-sweep kick, filtered-noise snare, difference-filtered hats). It is deterministic
for a given seed, normalised, exportable as a **WAV**, playable in the app, and readable by the
analysis engine — the tab maker reads the key, the tempo and the chords straight back out of the
render, which is what the backing tests assert.

## My stuff — favourites, history and a session that builds itself

Star songs, tunings and rigs; the store keeps them (local storage, no account). The page also shows
what you have actually been doing (charts read, separations run, listener best, lessons, tunings
tried, badges) and builds a **practice plan** of 10/20/30/45 minutes from it: tune up in the tuning you
use, warm up with the drill for the level you are playing at, run your hardest song at 70/85/100 % of
its tempo with the metronome, play into the listener, then record one clean pass — with a button on
every step that actually starts that step.

## Android app (APK) — built from this repo, no SDK needed

`npm run build:apk` (i.e. `python3 tools/build-apk.py`) produces
**`public/downloads/TrillTuner.apk`** — the whole app as a native Android app:

- **The web app, bundled.** The APK is a small WebView shell (`apk-src/smali/`: `MainActivity`,
  `TClient`, `TChrome`, `TBridge`) that loads `file:///android_asset/index.html` with the entire
  `public/` folder as assets. Every asset in the APK is byte-identical to the tested web app
  (a test enforces it), so the APK *is* the app.
- **Named "Trill Tuner"**, package `com.trilltuner.app`, versionName 2.1.0, minSdk 24 /
  targetSdk 34, launcher icon in all five densities.
- **The right permissions**: `INTERNET` (lyrics/API), `RECORD_AUDIO` (the tuner),
  `MODIFY_AUDIO_SETTINGS`, `ACCESS_NETWORK_STATE`, `VIBRATE` (remote-tune haptics).
  The mic is requested at runtime and granted through the WebView's permission callback.
- **Signed properly**: v1 + v2 + v3 signatures (`apksigner verify` passes; the build script
  creates a keystore with `keytool` on first run and keeps it in `tools/.cache/`, git-ignored).
- **The build needs no Android SDK and no Gradle** — it fetches the few tools it needs itself
  on first run (smali + apksigner + android.jar from a GitHub repo, aapt2 + a JRE from pypi)
  into `tools/.cache/`, assembles the shell with smali, links the manifest + assets with aapt2,
  merges `classes.dex` with correct zip alignment (resources.arsc stored + 4-byte aligned, as
  Android 11+ requires), and signs.
- **Inside the APK** a small `Android` JavaScript bridge adds what a WebView cannot do alone:
  the device's LAN address for QR codes, the native share sheet, opening links in the browser,
  keeping the screen awake in gig mode, and the app version.
- **Verified without a device** as far as that is possible: `npm run test:apk` checks the zip
  layout, asset fidelity, alignment, signature blocks, runs a real `apksigner verify`, and
  `test/apk-verify.py` decodes the binary manifest with androguard (package, label, version,
  permissions, launcher activity, dex classes, signature schemes, certificate). The web app
  itself is also loaded over **file://** in the E2E — exactly the context the WebView loads
  it in — and the tuner is proven to work there (mic, detection, in-tune lock, zero JS errors).

## PWA — install it, then work 100% offline

The web version is a full **progressive web app**:

- `public/manifest.webmanifest` — name/short_name "Trill Tuner", standalone display,
  amber theme colour, dark background, 192/512/maskable icons (generated by
  `tools/make-icons.py`), apple-touch-icon and iOS meta tags, a mobile viewport
  (`maximum-scale=1`, `viewport-fit=cover`).
- `public/sw.js` — a service worker that **precaches every asset on first load**
  (`node tools/build-pwa.js` stamps the asset list + a content-hash cache version),
  serves cache-first, falls back to the cached shell for navigations when the network
  is gone, runtime-caches the APK download, skips waiting and cleans old caches.
- **100% offline after the first load** — proven, not promised: `test/pwa-e2e.js` loads
  the app, cuts the network (`page.setOfflineMode(true)`), reloads, and the tuner still
  detects an in-tune low E from the microphone with zero JavaScript errors.
- Installable: the browser's install prompt is captured and offered as an
  **📱 Install app** button in Tuning setup; installed, it runs standalone.
- **Mobile-optimized and measured**: the E2E sweeps all 18 views *and every tab* at a
  390×844 phone viewport (no horizontal overflow anywhere), checks the sidebar stays
  tappable while the page scrolls, the demo card fits the screen, and the tuner works at
  phone size. Boot time and mic→in-tune latency are measured too (~0.8 s boot,
  ~1.8 s to a locked in-tune low E).

## Guided demo — skippable, every section, progress saved

A **29-step guided tour** covers all 18 sections one by one — it opens automatically on
the very first visit (after the splash), and can be restarted any time from
Tuning setup → **🧭 Take the tour**:

- **Next →** and **← Back** move step by step (Back is disabled on step 1),
  **Skip tour** closes it, and the last step offers **Finish ✓**.
- Every step switches to its view (and its tab, for Learn/Tools), spotlights the control
  it talks about, and explains it in one or two sentences.
- **Progress is saved** after every step (`tt.demoStep`); closing the tab mid-tour and
  coming back offers **Resume tour** from the exact step. Finishing or skipping marks
  the tour done (`tt.demoDone`).
- All of it is walked end to end by `test/pwa-e2e.js`.

## Sharing the app — a QR code for the APK, hosted by the app itself

The **Progress** view has a **Get the Android app** card:

- a **QR code** (generated in the browser by the vendored `qrcode-generator`, MIT) that
  encodes `…/download/trill-tuner.apk` — **the APK is hosted by the app itself**:
  `server.js` serves it with the right MIME type (`application/vnd.android.package-archive`),
  a `Content-Disposition` download name, `X-APK-Version`, and HTTP **range support**
  (so downloads resume), and the service worker caches it for offline sharing too.
- the raw link in a read-only box, **📋 Copy link**, **📤 Share** (Web Share API, or the
  native Android share sheet inside the APK), and **⤓ Download TrillTuner.apk**
  (inside the APK this opens the browser instead of navigating the WebView away).
- Scan the code with any other phone on the same network → it installs Trill Tuner
  straight from this device.

## Remote tuner — two devices, one tuning, over your own network

The **Tune** view has a **Remote tuner** card for fully inclusive device-to-device tuning:

- **📡 Host a session** on one device (the web version, served by `server.js`) — it shows a
  **QR code** and a link (`http://<lan-ip>:3000/?join=<id>`) built from the server's own
  LAN address (`GET /api/host`).
- Scan it (or open the link) on a **second device — any browser, or the Trill Tuner APK** —
  and that device joins automatically: its tuner is mirrored to the host and the host's
  tuner is mirrored to it, **live**: detected note, cents, in-tune guidance and per-string
  progress, both directions, over zero-dependency Server-Sent Events
  (`POST /api/sessions`, `GET /api/sessions/:id/events`, `POST /api/sessions/:id/msg`).
- Each side sees the other lock in tune (with a small haptic on phones), and either side
  can stop; sessions expire on their own. No accounts, no cloud — just your Wi-Fi.
- Proven in `test/pwa-e2e.js` with two real browser pages: both in tune on the low E,
  both mirroring each other's note/cents/status, and the joiner notified when the host stops.
