# My Guitar 🎸

A complete guitar companion web app — **tuner, metronome, recorder, lyric search, learning tools and guitar-care toolkit** — with pitch detection written from scratch (no audio libraries).

## Run it

```bash
node server.js        # → http://localhost:3000  (zero npm dependencies)
```

`npm test` runs the pitch-detection unit tests. `npm run test:e2e` runs the full
browser end-to-end suite (requires `npm i puppeteer` and a running server).

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
- **Learn** — 15 lessons from first chord to modes & improvisation, a 23-chord
  library with playable diagrams, and an ear-training game with easy→hard modes.
- **Care** —
  - **String health**: log string changes; a wear meter blends play-time and age,
    warns when strings are dull and at breakage risk.
  - **Intonation helper**: auto-listens while you play each string open and at the
    12th fret, then tells you which saddle to move — and which way.
  - **Room & wood watch**: enter temperature/humidity; get dry-air, humidity and
    heat warnings for your wooden instrument.

Everything runs client-side; the server only serves static files and proxies
lyric searches. Audio never leaves your machine.
