/* Trill Tuner — pedal & effect library, part 2: time, modulation & utility.
 *
 * chorus · flanger · phaser · vibe · tremolo · delay · reverb · pitch ·
 * octave · looper · switching
 *
 * Loads after lib/pedals.js and merges into TT.pedals.
 */
(function () {
  'use strict';

  const P1 = (typeof require === 'function' && typeof window === 'undefined')
    ? require('./pedals.js')
    : window.TT.pedals.P1;
  const ctl = P1.ctl, ic = P1.ic, Pd = P1.Pd;
  const P = [];

  /* =================================================================== */
  /* Chorus & flanger                                                     */
  /* =================================================================== */
  P.push(Pd('chorus', 'Boss', 'CE-2 Chorus', 'chorus', 1979,
    'The warm, analogue chorus of the 80s: two knobs, a soft wobble and instant “pretty”. Still the benchmark for a chorus that does not sound like a sea-sick robot.',
    [ctl('Rate', 0, 10, 3, 'Slow (2–3) is the classic shimmery chorus; fast is a wobbly effect.'),
     ctl('Depth', 0, 10, 5, '5 is the classic setting — obvious without being seasick.')],
    [ic('80s clean shimmer', '—', { Rate: 3, Depth: 5 }, 'Into a clean amp with a delay — the sound of every 80s ballad.', 'Every 1985 ballad', '80s session players'),
     ic('Watery rhythm', '—', { Rate: 2, Depth: 7 }, 'Subtle enough for verse chords, magical on clean arpeggios.')],
    { slot: 'mod', price: '£150', power: '9 V DC, ~14 mA (older MIJ units use 12 V ACA — check!)', bypass: 'buffered' }));

  P.push(Pd('ce-2w', 'Boss', 'CE-2W Waza Craft', 'chorus', 2016,
    'Two choruses in one: the CE-2 standard mode plus the CE-1 mode with its huge, hi-fi stereo shimmer. The modern way to buy a great chorus.',
    [ctl('Rate', 0, 10, 3, 'Slow and lush in CE-1 mode; the CE-2 mode is slightly faster by nature.'),
     ctl('Depth', 0, 10, 5, 'The classic sweet spot.'),
     ctl('Mode', 0, 2, 0, 'Standard (CE-2) · CE-1 Chorus · CE-1 Vibrato — the vibrato mode is the aggressive one.')],
    [ic('CE-1 shimmer', '—', { Rate: 2, Depth: 6, Mode: 1 }, 'The big, glassy stereo chorus of the late 70s and 80s.', 'Andy Summers-style clean', 'The Police era')],
    { slot: 'mod', price: '£200' }));

  P.push(Pd('small-clone', 'Electro-Harmonix', 'Small Clone', 'chorus', 1979,
    'The Nirvana chorus: one rate knob, one depth switch — “Come As You Are” in two controls.',
    [ctl('Rate', 0, 10, 3, 'Slow and deep is the whole trick.'),
     ctl('Depth', 0, 1, 1, 'Switch: shallow or deep. Deep is the famous setting.')],
    [ic('Come As You Are — Nirvana', 'Kurt Cobain', { Rate: 3, Depth: 1 }, 'The intro riff: deep chorus, clean-ish amp, neck pickup.', 'Come As You Are — Nirvana', 'Kurt Cobain'),
     ic('Watery 80s lead', '—', { Rate: 4, Depth: 1 }, 'Chorus on leads — think every 80s rock solo.')],
    { slot: 'mod', price: '£90', bypass: 'true bypass', power: '9 V DC, ~3 mA' }));

  P.push(Pd('julia', 'Walrus Audio', 'Julia Chorus/Vibrato', 'chorus', 2015,
    'The boutique chorus of the 2010s: blend from dry to vibrato, with a lag control for a more analogue character.',
    [ctl('Rate', 0, 10, 3, 'The LED blinks with the modulation — nice for matching a song’s tempo.'),
     ctl('Depth', 0, 10, 5, 'Amount of modulation.'),
     ctl('Lag', 0, 10, 5, 'Adds delay before the modulation — a weirder, more lo-fi wobble.'),
     ctl('D-C-V', 0, 10, 5, 'Blend: 0 is dry, 5 is classic chorus, 10 is pure vibrato (no dry).')],
    [ic('Modern dream pop', '—', { Rate: 2, Depth: 6, Lag: 3, 'D-C-V': 6 }, 'Mostly chorus with a hint of vibrato — the sound of modern dream pop.', 'Beach House-style ambience', 'Dream pop'),
     ic('Lo-fi indie', '—', { Rate: 4, Depth: 7, Lag: 8, 'D-C-V': 7 }, 'High lag makes it wobbly and tape-like.')],
    { slot: 'mod', price: '£200' }));

  P.push(Pd('electric-mistress', 'Electro-Harmonix', 'Electric Mistress', 'flanger', 1976,
    'The lush, jet-plane flanger of the 70s: colour, range and rate — and the shimmer of Andy Summers in every Police chorus.',
    [ctl('Rate', 0, 10, 3, 'Slow for the classic flanged chorus.'),
     ctl('Range', 0, 10, 5, 'Sweep width.'),
     ctl('Color', 0, 10, 5, 'Feedback/resonance — higher for the metallic jet sound.')],
    [ic('Police shimmer', 'Andy Summers', { Rate: 3, Range: 6, Color: 3 }, 'A subtle flange used as a chorus — the sound of every Police clean.', 'Every Breath You Take — The Police', 'Andy Summers'),
     ic('Jet plane', '—', { Rate: 5, Range: 7, Color: 7 }, 'High colour and fast rate — the classic 70s “jet taking off” flange.')],
    { slot: 'mod', price: '£150', power: '9 V DC (reissues) / 18 V (originals)' }));

  P.push(Pd('m117-flanger', 'MXR', 'M117R Flanger', 'flanger', 1977,
    'Four knobs of analogue flange: manual, width, speed and regeneration. From a subtle sweep to a hollow, metallic roar.',
    [ctl('Manual', 0, 10, 5, 'Sets the centre of the sweep — low is deep, high is thin.'),
     ctl('Width', 0, 10, 5, 'Sweep range.'),
     ctl('Speed', 0, 10, 3, 'Modulation rate.'),
     ctl('Regen', 0, 10, 4, 'Feedback — the more metallic/whistling character.')],
    [ic('Hard rock lead', '—', { Manual: 5, Width: 6, Speed: 3, Regen: 5 }, 'Flanged solo brilliance — from EVH to Zappa.', 'Ain’t Talkin’ ’bout Love — Van Halen', 'Eddie Van Halen')],
    { slot: 'mod', price: '£160', power: '18 V DC (M117R comes with a supply)' }));

  /* =================================================================== */
  /* Phaser & vibe                                                        */
  /* =================================================================== */
  P.push(Pd('phase-90', 'MXR', 'Phase 90 (M101)', 'phaser', 1974,
    'One knob, one of the most recognisable sounds ever: a slow, four-stage swirl that defined 70s rock and 80s hair metal.',
    [ctl('Speed', 0, 10, 3, 'Slow (2–3) is the classic sweep; the famous “Van Halen” setting is around 2.')],
    [ic('Eruption / Ain’t Talkin’ ’bout Love', 'Eddie Van Halen', { Speed: 2.5 }, 'A slow, deep swirl behind the guitar — the brown sound’s secret ingredient.', 'Eruption — Van Halen', 'Eddie Van Halen'),
     ic('70s funk rhythm', '—', { Speed: 4 }, 'A slight wobble on a clean Strat — the sound of 70s soul.', '70s funk', 'Session players')],
    { slot: 'mod', price: '£100', power: '9 V DC (script-logo versions need 9 V battery or a mod)', bypass: 'true bypass' }));

  P.push(Pd('phase-95', 'MXR', 'Phase 95', 'phaser', 2016,
    'Two classics in one small box: Phase 90 and Phase 45, each with a script or block-logo voicing. The pedal to buy if you want options.',
    [ctl('Speed', 0, 10, 3, 'Same range as a Phase 90.'),
     ctl('Mode', 0, 3, 0, 'Script Phase 90 (subtle) · Block Phase 90 (deep) · Script 45 (vintage, gentle) · Block 45.')],
    [ic('Script 90 swirl', '—', { Speed: 2.5, Mode: 0 }, 'The gentler script voicing — a great always-on swirl.', 'Van Halen', 'Eddie Van Halen'),
     ic('Deep block 90', '—', { Speed: 3, Mode: 1 }, 'More intense and obvious — 80s chorus-y rhythm.')],
    { slot: 'mod', price: '£120' }));

  P.push(Pd('small-stone', 'Electro-Harmonix', 'Small Stone', 'phaser', 1975,
    'Softer and more organic than an MXR: the Small Stone’s gentle sweep suits fat clean tones and psychedelic textures.',
    [ctl('Rate', 0, 10, 3, 'Slow and dreamy at 2–3.'),
     ctl('Color', 0, 1, 1, 'Switch: adds feedback for a more intense sweep.')],
    [ic('Psychedelic clean', '—', { Rate: 2, Color: 0 }, 'A slow, soft swirl on a clean tone — the sound of 70s psychedelia.', 'Late Beatles / Floyd-adjacent', '70s psychedelia')],
    { slot: 'mod', price: '£90', bypass: 'true bypass' }));

  P.push(Pd('uni-vibe', 'Dunlop', 'Uni-Vibe (M68 / UV-1)', 'vibe', 1968,
    'Not a phaser — a spinning-speaker simulator: a pulsing, watery swirl that made Hendrix’s ballads glow.',
    [ctl('Speed', 0, 10, 3, 'Slow for the watery pulse, fast for “Machine Gun” territory.'),
     ctl('Intensity', 0, 10, 6, 'Depth of the swirl.'),
     ctl('Mode', 0, 1, 0, 'Chorus (thick, with dry signal) or Vibrato (pitch-modulated, psychedelic).')],
    [ic('Little Wing', 'Jimi Hendrix', { Speed: 2, Intensity: 6, Mode: 0 }, 'The whole ballad tone: chorus mode, slow speed, neck pickup — utterly liquid.', 'Little Wing — Jimi Hendrix', 'Jimi Hendrix'),
     ic('Bridge of Sighs', 'Robin Trower', { Speed: 1.5, Intensity: 7, Mode: 0 }, 'Slow, deep and mournful — the sound of the 70s.')],
    { slot: 'mod', price: '£130', power: '9 V DC (Uni-Vibe) / 18 V (full-size vintage)' }));

  P.push(Pd('uni-vibe-full', 'Fulltone', 'Deja Vibe', 'vibe', 1994,
    'The boutique Uni-Vibe done properly, with a true photocell circuit and a real pedal sweep. If you want the Hendrix sound, this is the shortcut.',
    [ctl('Speed', 0, 10, 3, 'The pulse rate; match it to the song.'),
     ctl('Intensity', 0, 10, 6, 'Depth.'),
     ctl('Volume', 0, 10, 5, 'Output.'),
     ctl('Mode', 0, 1, 0, 'Chorus/Vibrato switch.')],
    [ic('Machine Gun', 'Jimi Hendrix', { Speed: 7, Intensity: 8, Volume: 5, Mode: 1 }, 'Fast vibrato mode — the Band of Gypsys freakout.', 'Machine Gun — Jimi Hendrix', 'Jimi Hendrix')],
    { slot: 'mod', price: '£260', power: '18 V DC, 100 mA or two 9 V batteries' }));

  P.push(Pd('lillian', 'Walrus Audio', 'Lillian Phaser', 'phaser', 2016,
    'A six-stage phaser with a blend control, so you can dial from a subtle wobble to a deep, vocal sweep.',
    [ctl('Rate', 0, 10, 3, 'Speed.'), ctl('Depth', 0, 10, 5, 'Depth.'),
     ctl('Feedback', 0, 10, 3, 'Resonance — adds a vocal peak to the sweep.'),
     ctl('Blend', 0, 10, 5, 'Wet/dry. Back it off for a subtle, always-on phase.')],
    [ic('Always-on phase', '—', { Rate: 2, Depth: 5, Feedback: 2, Blend: 4 }, 'A gentle, permanent movement behind your tone.'),
     ic('Deep sweep', '—', { Rate: 4, Depth: 8, Feedback: 6, Blend: 8 }, 'Loud, obvious and psychedelic.')],
    { slot: 'mod', price: '£200' }));

  P.push(Pd('tremolo', 'Boss', 'TR-2 Tremolo', 'tremolo', 1997,
    'The classic amp-style tremolo in a pedal: rate, depth and a waveform control. Turn it up and the whole band sways.',
    [ctl('Rate', 0, 10, 4, 'The pulse speed. 3–5 covers most songs.'),
     ctl('Depth', 0, 10, 5, 'How much the volume dips.'),
     ctl('Wave', 0, 10, 5, 'Shape of the pulse: 0 is a smooth sine, 10 is square and stuttery.')],
    [ic('Swampy ballad', '—', { Rate: 3, Depth: 6, Wave: 3 }, 'Slow and deep on a clean amp — the sound of the swamp.', 'Green Onions — Booker T. & the M.G.’s', 'Steve Cropper'),
     ic('Stutter tremolo', '—', { Rate: 6, Depth: 8, Wave: 8 }, 'Square waveform gives a gated, chopping effect.')],
    { slot: 'mod', price: '£95' }));

  P.push(Pd('supa-trem', 'Fulltone', 'Supa-Trem 2', 'tremolo', 1995,
    'Two tremolos in one: a warm analogue amp-style tremolo and a harder, more percussive one. The pedal for people who love Fender tremolo.',
    [ctl('Rate', 0, 10, 4, 'Speed.'), ctl('Depth', 0, 10, 6, 'Depth.'),
     ctl('Mode', 0, 1, 0, 'Soft (vintage amp feel) or Hard (percussive).'),
     ctl('Volume', 0, 10, 5, 'Output.')],
    [ic('Vintage amp tremolo', '—', { Rate: 3, Depth: 6, Mode: 0, Volume: 5 }, 'Soft mode — as close to a blackface tremolo as a pedal gets.')],
    { slot: 'mod', price: '£230' }));

  /* =================================================================== */
  /* Delay                                                                */
  /* =================================================================== */
  P.push(Pd('analog-delay', 'MXR', 'Carbon Copy Analog Delay', 'delay', 2008,
    'The modern classic analogue delay: dark, warm repeats and a modulation switch for a wobbly, tape-like tail.',
    [ctl('Delay', 0, 10, 4, 'Time — up to 600 ms of warm, dark repeats.'),
     ctl('Regen', 0, 10, 4, 'Feedback. 4 is a few repeats; 7+ is near-infinite.'),
     ctl('Mix', 0, 10, 4, 'Wet/dry. 4 is a subtle slap, 6 is a big ambient trail.'),
     ctl('Mod', 0, 1, 0, 'Adds gentle modulation to the repeats — that tape wobble.')],
    [ic('Slapback rockabilly', '—', { Delay: 1.5, Regen: 2, Mix: 4, Mod: 0 }, 'One repeat, bright and short — the 50s rockabilly echo.', 'Rockabilly & rock & roll', 'Rockabilly tradition'),
     ic('Ambient trail', '—', { Delay: 6, Regen: 6.5, Mix: 5.5, Mod: 1 }, 'Long, dark, wobbly repeats — great for post-rock and ambient.')],
    { slot: 'time', price: '£150', power: '9 V DC, ~26 mA' }));

  P.push(Pd('dd-3', 'Boss', 'DD-3 Digital Delay', 'delay', 1986,
    'The digital delay that has been on a million boards: clean, precise repeats, a hold function and total reliability.',
    [ctl('Level', 0, 10, 5, 'Mix of the repeats.'),
     ctl('Feedback', 0, 10, 4, 'Number of repeats.'),
     ctl('Time', 0, 10, 5, 'Delay time — short for slapback, long for ambience.'),
     ctl('Mode', 0, 3, 1, 'Mode 4 is the longest time (800 ms); modes 1–3 are shorter and brighter. Mode 4 is the classic ambient setting.')],
    [ic('U2 dotted eighth', 'The Edge', { Level: 5, Feedback: 5, Time: 4, Mode: 3 }, 'Set to a dotted eighth against the song tempo — the sound of Where the Streets Have No Name.', 'Where the Streets Have No Name — U2', 'The Edge'),
     ic('Slapback', '—', { Level: 4, Feedback: 2, Time: 1.5, Mode: 0 }, 'One short repeat — the rockabilly/country staple.')],
    { slot: 'time', price: '£110', bypass: 'buffered', power: '9 V DC, ~45 mA' }));

  P.push(Pd('dd-7', 'Boss', 'DD-7 Digital Delay', 'delay', 2008,
    'The DD-3’s cleverer sibling: up to 6.4 seconds of delay, analogue and modulation modes, tap tempo and a hold function.',
    [ctl('Level', 0, 10, 5, 'Mix.'), ctl('Feedback', 0, 10, 4, 'Repeats.'),
     ctl('Time', 0, 10, 5, 'Delay time.'),
     ctl('Mode', 0, 5, 2, '50 ms · 200 ms · 800 ms · Analog (warm, degraded) · Modulate (wobbling) · Reverse.')],
    [ic('Ambient delay', '—', { Level: 5, Feedback: 5, Time: 6, Mode: 3 }, 'Analog mode with a long time — warm and atmospheric.'),
     ic('Wobbly lead', '—', { Level: 5, Feedback: 4, Time: 3.5, Mode: 4 }, 'Modulate mode adds a warm chorus to the repeats.')],
    { slot: 'time', price: '£150', bypass: 'buffered', power: '9 V DC, ~55 mA' }));

  P.push(Pd('memory-man', 'Electro-Harmonix', 'Deluxe Memory Man', 'delay', 1978,
    'The most musical analogue delay ever made: warm bucket-brigade repeats, a little noise, and a chorus/vibrato section that turns it into a dream machine.',
    [ctl('Blend', 0, 10, 4, 'Wet/dry mix.'),
     ctl('Feedback', 0, 10, 4, 'Repeats.'),
     ctl('Delay', 0, 10, 4, 'Time — up to 550 ms of lush bucket-brigade echo.'),
     ctl('Level', 0, 10, 5, 'Output.'),
     ctl('Rate', 0, 10, 3, 'Chorus/vibrato speed.'),
     ctl('Depth', 0, 10, 4, 'Chorus/vibrato depth.')],
    [ic('Edge’s ambience', 'The Edge', { Blend: 4, Feedback: 4, Delay: 5, Level: 5, Rate: 2, Depth: 3 }, 'Warm, wide and always slightly modulated — the sound of early U2 and countless worship players.', 'With or Without You — U2', 'The Edge'),
     ic('Wobbly psychedelic echo', '—', { Blend: 5, Feedback: 6, Delay: 6, Level: 5, Rate: 4, Depth: 6 }, 'Long repeats with deep vibrato — psychedelic and seasick in the best way.')],
    { slot: 'time', price: '£280', power: '24 V DC (EHX supply) or 2× 9 V batteries' }));

  P.push(Pd('el-capistan', 'Strymon', 'El Capistan dTape Echo', 'delay', 2010,
    'A tape echo simulator: multiple tape heads, wow and flutter, tape age and even the sound of the machine’s preamp. The boutique delay benchmark.',
    [ctl('Time', 0, 10, 4, 'Delay time — or tap in with the footswitch.'),
     ctl('Repeats', 0, 10, 4, 'Feedback.'),
     ctl('Mix', 0, 10, 4, 'Wet/dry.'),
     ctl('Wow & Flutter', 0, 10, 3, 'The tape wobble — 2–4 is realistic, 8 is broken machine.'),
     ctl('Tape Age', 0, 10, 3, 'Darkens and degrades the repeats as you turn it up.'),
     ctl('Mode', 0, 2, 0, 'Single head · Fixed multi-head (the Echoplex/Space Echo rhythm) · Multi-head with tape speed.')],
    [ic('Tape ambience', '—', { Time: 5, Repeats: 4, Mix: 4, 'Wow & Flutter': 3, 'Tape Age': 4, Mode: 1 }, 'The multi-head mode gives that rhythmic, galloping ambience.', 'Pink Floyd & rockabilly tape echoes', 'Studio & stage'),
     ic('Worship ambient', '—', { Time: 6, Repeats: 6, Mix: 5, 'Wow & Flutter': 3, 'Tape Age': 5, Mode: 0 }, 'Long, warm, dark — the modern ambient worship sound.')],
    { slot: 'time', price: '£300', power: '9 V DC, 250 mA' }));

  P.push(Pd('flashback', 'TC Electronic', 'Flashback Delay', 'delay', 2010,
    'Eight delay types plus the TonePrint app, which beams custom settings from your phone. A Swiss Army delay for £150.',
    [ctl('Delay', 0, 10, 4, 'Time.'), ctl('Feedback', 0, 10, 4, 'Repeats.'),
     ctl('Level', 0, 10, 4, 'Mix.'), ctl('Mode', 0, 7, 1, 'Slapback · 2290 digital · Analogue · Tape · Reverse · Dynamic · Modulated · Lo-Fi.')],
    [ic('2290 delay', '—', { Delay: 5, Feedback: 4, Level: 4, Mode: 1 }, 'The clean, precise 2290 mode — a studio digital delay in a pedal.')],
    { slot: 'time', price: '£150', bypass: 'true bypass', power: '9 V DC, ~100 mA' }));

  P.push(Pd('holy-grail', 'Electro-Harmonix', 'Holy Grail (Nano/Plus)', 'reverb', 2002,
    'The pedal that made reverb affordable: spring, hall and room in a nano-sized box, with one knob. Simple and hugely popular.',
    [ctl('Reverb', 0, 10, 4, 'Wet/dry. 3 is an amp-like spring, 6+ is a cathedral.'),
     ctl('Mode', 0, 2, 0, 'Spring (amp-style) · Hall (big and lush) · Room (short and natural).')],
    [ic('Spring reverb', '—', { Reverb: 3, Mode: 0 }, 'As close as a pedal gets to a real Fender spring — great with a blackface-style clean.', 'Surf & rockabilly', 'Surf tradition'),
     ic('Cathedral ambient', '—', { Reverb: 7, Mode: 1 }, 'Hall mode near maximum — the ambient post-rock wash.')],
    { slot: 'time', price: '£100', bypass: 'true bypass', power: '9 V DC, ~100 mA (Nano)' }));

  P.push(Pd('bigsky', 'Strymon', 'BigSky', 'reverb', 2012,
    'Twelve reverb machines in one pedal — halls, plates, springs, shimmer, cloud and more. The studio-grade reverb that ended pedalboard arguments.',
    [ctl('Mix', 0, 10, 4, 'Wet/dry.'),
     ctl('Decay', 0, 10, 4, 'Tail length.'),
     ctl('Pre-Delay', 0, 10, 2, 'Gap before the reverb — keeps the dry attack clear.'),
     ctl('Tone / Damp', 0, 10, 5, 'Dark/bright of the tail.'),
     ctl('Param 1', 0, 10, 5, 'Machine-specific (modulation, low end, spring tension…).'),
     ctl('Param 2', 0, 10, 5, 'Machine-specific (shimmer, drive, diffusion…).'),
     ctl('Mode', 0, 11, 3, 'Spring · Plate · Room · Hall · Bloom · Cloud · Shimmer · Swell · Chorale · Magneto · Nonlinear · Reflections.')],
    [ic('Shimmer lead', '—', { Mix: 4, Decay: 6, 'Pre-Delay': 3, 'Tone / Damp': 6, Mode: 6 }, 'Shimmer mode with a long decay — the ambient/post-rock signature.', 'Post-rock ambience', 'Explosions in the Sky era'),
     ic('Plate for solos', '—', { Mix: 3, Decay: 4, 'Pre-Delay': 2, 'Tone / Damp': 6, Mode: 1 }, 'A plate reverb just behind a solo — the classic studio trick.')],
    { slot: 'time', price: '£430', power: '9 V DC, 300 mA' }));

  P.push(Pd('oceans-11', 'Electro-Harmonix', 'Oceans 11', 'reverb', 2017,
    'Eleven reverb types for the price of a decent dinner: spring, plate, hall, shimmer, reverse, modulate and more.',
    [ctl('Reverb', 0, 10, 4, 'Wet/dry.'),
     ctl('Tone', 0, 10, 5, 'Dark to bright tail.'),
     ctl('Mode', 0, 10, 0, 'Hall · Spring · Plate · Reverse · Echo · Trem · Modulate · Dynamic · Shimmer · Poly · Auto-Inf.')],
    [ic('Shimmer pad', '—', { Reverb: 6, Tone: 6, Mode: 8 }, 'Shimmer with a long tail — instant ambient pad.', 'Ambient guitar', 'Modern ambient'),
     ic('Dripping spring', '—', { Reverb: 4, Tone: 4, Mode: 1 }, 'Spring mode with a little twist.')],
    { slot: 'time', price: '£130', bypass: 'true bypass' }));

  P.push(Pd('tdr-plate', 'True Spring / Talisman', 'Catalinbread Talisman (Plate Reverb)', 'reverb', 2015,
    'A dedicated plate reverb: bright, dense and immediate, with a preamp that adds warmth. The studio plate sound in a pedal.',
    [ctl('Mix', 0, 10, 4, 'Wet/dry.'), ctl('Dwell', 0, 10, 5, 'Amount of reverb — like a real plate driver.'),
     ctl('Tone', 0, 10, 6, 'The plate’s characteristic bright top end.'),
     ctl('Pre-Delay', 0, 10, 2, 'Gap before the plate engages.')],
    [ic('Studio plate', '—', { Mix: 4, Dwell: 5, Tone: 6, 'Pre-Delay': 2 }, 'A plate behind a lead vocal or a solo — the 70s studio sound.')],
    { slot: 'time', price: '£180' }));

  /* =================================================================== */
  /* Pitch / octave                                                       */
  /* =================================================================== */
  P.push(Pd('whammy', 'DigiTech', 'Whammy (WH-1/5/DT)', 'pitch', 1993,
    'The pitch-shifting pedal of a generation: step on the treadle and bend notes an octave or two. The sound of Rage Against the Machine, Muse and Morello.',
    [ctl('Treadle position', 0, 10, 5, 'Heel down = no shift, toe down = the interval set by the mode.'),
     ctl('Mode', 0, 9, 1, '2 oct down · 1 oct down · 5th down · 4th down · harmony modes · 5th up · 1 oct up · 2 oct up · dive bomb.'),
     ctl('Depth', 0, 10, 5, 'Some models add a wet/dry depth control.')],
    [ic('Killing in the Name solo', 'Tom Morello', { 'Treadle position': 6, Mode: 2 }, 'Octave-up squeals and dive bombs — the signature sound of RATM.', 'Killing in the Name — Rage Against the Machine', 'Tom Morello'),
     ic('Plug In Baby', 'Matt Bellamy', { 'Treadle position': 5, Mode: 1 }, 'Octave up for the riff, then ride the treadle for the solo.', 'Plug In Baby — Muse', 'Matt Bellamy')],
    { slot: 'mod', price: '£200', power: '9 V DC, 300 mA' }));

  P.push(Pd('pitchfork', 'Electro-Harmonix', 'Pitch Fork', 'pitch', 2014,
    'A compact, polyphonic pitch shifter: shift up to two octaves either way, with a latching or momentary switch and an expression input.',
    [ctl('Blend', 0, 10, 10, 'Wet/dry — 10 is fully shifted, 5 is a blended octave.'),
     ctl('Shift', 0, 10, 5, 'Up/down selector; the treadle or knob sets the interval.'),
     ctl('Mode', 0, 3, 1, 'Dual (two octaves) · Up · Down · Dive.')],
    [ic('Octave-down riff', '—', { Blend: 10, Shift: 6, Mode: 2 }, 'Octave down for pseudo-bass riffs or a heavy doubled line.'),
     ic('Harmony lead', '—', { Blend: 5, Shift: 6, Mode: 1 }, 'Blend a fifth above for instant harmony leads.')],
    { slot: 'mod', price: '£150' }));

  P.push(Pd('micro-pog', 'Electro-Harmonix', 'Micro POG', 'pitch', 2008,
    'Polyphonic octave generator: octave up, octave down and dry, with the tracking that made POGs famous. Organs, basses and shimmer, all from one pedal.',
    [ctl('Dry', 0, 10, 5, 'Your original signal.'), ctl('Sub Octave', 0, 10, 3, 'One octave down — the organ/bass voice.'),
     ctl('Octave Up', 0, 10, 3, 'One octave up — the shimmer voice.')],
    [ic('Organ tone', '—', { Dry: 5, 'Sub Octave': 6, 'Octave Up': 4 }, 'Sub and up together with the dry — the classic POG organ sound.', 'Organ-style pads', 'Modern worship'),
     ic('Bass emulation', '—', { Dry: 3, 'Sub Octave': 8, 'Octave Up': 0 }, 'Octave down heavy — play bass parts on a guitar.')],
    { slot: 'mod', price: '£180', power: '9 V DC, 100 mA' }));

  /* =================================================================== */
  /* Looper & switching                                                   */
  /* =================================================================== */
  P.push(Pd('rc-1', 'Boss', 'RC-1 Loop Station', 'looper', 2014,
    'The simplest way to loop: one footswitch, twelve minutes of recording, sound-on-sound layering. The pedal that turns one player into a band.',
    [ctl('Level', 0, 10, 5, 'Volume of the loop against your live playing.')],
    [ic('Bedroom looping', '—', { Level: 5 }, 'Lay down a chord progression, then solo over it. Practise improvisation every single day.'),
     ic('Live one-man-band', '—', { Level: 6 }, 'Build a song in layers, live.')],
    { slot: 'utility', price: '£110', power: '9 V DC, ~90 mA' }));

  P.push(Pd('ditto-looper', 'TC Electronic', 'Ditto Looper', 'looper', 2013,
    'The looper that started the mini-loop revolution: one knob, five minutes, endless overdubs, true bypass.',
    [ctl('Level', 0, 10, 5, 'Loop volume.')],
    [ic('Practice loop', '—', { Level: 5 }, 'Record a progression, practise scales over it — the single best practice tool there is.', 'Practice', 'Every modern player')],
    { slot: 'utility', price: '£90', power: '9 V DC, ~100 mA' }));

  P.push(Pd('ls-2', 'Boss', 'LS-2 Line Selector', 'utility', 1991,
    'A two-loop switcher that routes your signal anywhere: A/B, A+B, or bypass. The pro rig glue nobody notices until they need one.',
    [ctl('Mode', 0, 6, 0, 'A→B→bypass · A+B→bypass · A→B→A+B · bypass→A→B and more — six routing modes.'),
     ctl('Level A', 0, 10, 5, 'Boost/cut on loop A (front-panel trimpots on some versions).'),
     ctl('Level B', 0, 10, 5, 'Boost/cut on loop B.')],
    [ic('Rig glue', '—', { Mode: 0 }, 'Put a noisy vintage fuzz in loop A and everything else in loop B, and switch between them without repatching.', 'Pro pedalboards', 'Touring players')],
    { slot: 'utility', price: '£130', bypass: 'buffered', power: '9 V DC, ~55 mA' }));

  /* =================================================================== */
  /* Amp-in-a-box                                                         */
  /* =================================================================== */
  P.push(Pd('sansamp-di', 'Tech 21', 'SansAmp Classic / GT2', 'amp-in-a-box', 1989,
    'The pedal that let you record a guitar straight into a desk: three amp flavours (Fender-ish, Marshall-ish, Mesa-ish) plus speaker-cab emulation.',
    [ctl('Level', 0, 10, 6, 'Output.'), ctl('Amp', 0, 10, 5, 'Preamp character.'),
     ctl('Character', 0, 10, 5, 'Mid/attack shaping.'),
     ctl('Drive', 0, 10, 5, 'Gain.'),
     ctl('Presence', 0, 10, 5, 'Top end.'),
     ctl('Chr/Drive/Mix', 0, 10, 5, 'On the Classic: character, drive, and the famous “mic position” blend.')],
    [ic('Direct recording', '—', { Level: 6, Amp: 5, Character: 5, Drive: 6, Presence: 6 }, 'Straight into the interface — no amp, no mic, no neighbours.', 'Session direct sounds', 'Studio workhorses')],
    { slot: 'utility', price: '£200', power: '9 V DC or battery' }));

  P.push(Pd('tech21-blonde', 'Tech 21', 'Character Series — Blonde', 'amp-in-a-box', 2010,
    'A blackface Fender in a pedal: the Character Series models one amp family with a full tone stack and a cab-emulated output.',
    [ctl('Level', 0, 10, 5, 'Output.'), ctl('Drive', 0, 10, 5, 'Amp gain.'),
     ctl('Low', 0, 10, 5, 'Bass.'), ctl('High', 0, 10, 5, 'Treble.'),
     ctl('Character', 0, 10, 5, 'The amp’s voicing — from clean blackface to a cranked Deluxe.')],
    [ic('Pedal-board Fender', '—', { Level: 5, Drive: 4, Low: 4, High: 6, Character: 6 }, 'A Fender-ish clean at the end of your board — perfect for playing into a PA.', 'Direct-to-PA rigs', 'Modern gigging')],
    { slot: 'utility', price: '£200', power: '9 V DC, ~30 mA' }));

  P.push(Pd('jhs-charlie-brown', 'JHS', 'Charlie Brown', 'amp-in-a-box', 2012,
    'JHS’s “Marshall in a box”: a plexi-style crunch with a mid control, designed to make a clean Fender rig sound British.',
    [ctl('Volume', 0, 10, 6, 'Output.'), ctl('Drive', 0, 10, 4, 'Gain — 4 is crunchy, 7 is a cranked plexi.'),
     ctl('Tone', 0, 10, 5, 'Treble.'), ctl('Mid', 0, 10, 6, 'British mids — the key to the whole pedal.')],
    [ic('Plexi into a clean amp', '—', { Volume: 6, Drive: 5, Tone: 5, Mid: 6 }, 'Into a blackface clean — suddenly you are playing through a Marshall.', 'Classic rock', 'JHS players')],
    { slot: 'dirt', price: '£180' }));

  P.push(Pd('zvox-box-of-rock', 'ZVEX', 'Box of Rock', 'amp-in-a-box', 2006,
    'A JTM45-style distortion with an independent SHO boost — the pedal that made “brown sound in a box” a genre.',
    [ctl('Volume', 0, 10, 6, 'Output.'), ctl('Tone', 0, 10, 5, 'Treble.'),
     ctl('Drive', 0, 10, 6, 'The JTM-ish crunch — 5–6 is the sweet spot.'),
     ctl('Boost', 0, 10, 0, 'A separate super-hard-on boost for solos. Set it to 6 for solos.')],
    [ic('Brown-sound crunch', '—', { Volume: 6, Tone: 5, Drive: 5, Boost: 0 }, 'Into a clean-ish amp for that classic Marshall crunch without the volume.', 'Van Halen & 70s rock', 'ZVEX players'),
     ic('Solo boost', '—', { Volume: 6, Tone: 5, Drive: 5, Boost: 7 }, 'Click the boost in for solos — the reason this pedal is on so many boards.')],
    { slot: 'dirt', price: '£250' }));

  /* =================================================================== */
  /* Tone-builders, power & everything else                               */
  /* =================================================================== */
  P.push(Pd('power-supply', 'Voodoo Lab', 'Pedal Power 2 Plus', 'utility', 1997,
    'The power supply that made pedalboards reliable: eight isolated 9 V outputs, two of them switchable to 12 V or 18 V, with a sag control for fuzz.',
    [ctl('Output 1–8', 0, 1, 0, 'Isolated, 9 V, 100 mA each — no ground loops, no noise.'),
     ctl('Sag (outputs 7–8)', 0, 10, 10, 'Starve a germanium fuzz to make it spit and clean up better.')],
    [ic('Clean pedalboard', '—', { 'Output 1–8': 0 }, 'One supply, no wall warts, no hum — the foundation of every pro board.', 'Every pro board', 'Touring players')],
    { slot: 'utility', price: '£200', bypass: 'n/a', power: 'own mains supply' }));

  P.push(Pd('board-buffer', 'JHS', 'Buffer / Little Black Buffer', 'utility', 2012,
    'A high-quality buffer for the end of a long pedalboard: keeps your highs and your dynamics intact through 20 feet of cable and twelve pedals.',
    [ctl('Level', 0, 10, 5, 'Output — some buffers add a little sparkle.')],
    [ic('Long board rescue', '—', { Level: 5 }, 'If your clean tone dies when the board is connected, this is the fix.', 'Big pedalboards', 'Touring players')],
    { slot: 'utility', price: '£70', power: '9 V DC' }));

  P.push(Pd('volume-x', 'Dunlop', 'DVP4 Volume (X) Mini', 'utility', 2014,
    'A mini volume/expression pedal with a smooth taper and an adjustable tension — the modern low-profile option.',
    [ctl('Treadle position', 0, 10, 8, 'Set your headroom and ride it for swells.'),
     ctl('Tension', 0, 10, 5, 'Set the pedal resistance to your foot.')],
    [ic('Volume swells', '—', { 'Treadle position': 3 }, 'Violin-style swells with the tone rolled back.', 'Ambient & post-rock', 'Ambient players')],
    { slot: 'utility', price: '£100', bypass: 'passive' }));

  /* =================================================================== */
  /* The merged library                                                   */
  /* =================================================================== */
  const ALL = P1.LB.concat(P);
  const api = {
    LIST: ALL,
    P1: P1, P2: P,
    byId: function (id) { for (let i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; },
    all: function () { return ALL.slice(); },
    cats: function () { const out = []; ALL.forEach(p => { if (out.indexOf(p.cat) === -1) out.push(p.cat); }); return out.sort(); },
    search: function (q) {
      const s = String(q || '').toLowerCase().trim();
      if (!s) return ALL.slice();
      return ALL.filter(p => (p.brand + ' ' + p.name + ' ' + p.cat + ' ' + p.desc).toLowerCase().indexOf(s) !== -1);
    },
    count: function () { return ALL.length; }
  };
  const root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.TT = root.TT || {};
  root.TT.pedals = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
