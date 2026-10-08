/* Trill Tuner — pedal & effect library, part 3: the deep cuts.
 *
 * The classics that every other list leaves out — the second Big Muffs, the
 * Scandinavian chainsaw, the funk wah, the Dimension, the King of Tone, the
 * Talk Box, the rotary sim, the modern digital powerhouses.
 *
 * Loads after lib/pedals2.js and merges into TT.pedals, so rig.js sees one
 * library: 112 pedals across 22 categories, each with its real controls and
 * real-world settings.
 */
(function () {
  'use strict';

  const root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  const lib = root.TT.pedals;                    /* registered by pedals2.js */
  if (!lib || !lib.P1) throw new Error('pedals3.js must load after pedals.js/pedals2.js');

  const P1 = lib.P1, P2 = lib.P2;
  const ctl = P1.ctl, ic = P1.ic, Pd = P1.Pd;
  const P = [];

  /* =================================================================== */
  /* Overdrive — the ones that live next to the Tube Screamer             */
  /* =================================================================== */
  P.push(Pd('dod-250', 'DOD', 'Overdrive Preamp 250', 'overdrive', 1979,
    'A one-knob-and-a-half monster from 1979: the 250 is louder, rawer and less compressed than a Tube Screamer, and it is the sound of 80s hard rock through a cranked Marshall.',
    [ctl('Level', 0, 10, 7, 'This pedal gets loud — 7 is already a big push. Above 8 it slams the front of the amp.'),
     ctl('Gain', 0, 10, 6, '6 is classic crunch. Below 3 it is a clean boost with teeth.')],
    [ic('80s shred into a Marshall', 'Yngwie Malmsteen', { Level: 7, Gain: 6 }, 'A 250 in front of a cranked JCM800 or plexi — the original "more" pedal of the shred era.'),
     ic('Classic rock crunch', '—', { Level: 7, Gain: 5 }, 'One knob for boost, one for grit. Nothing to get lost in.')],
    { slot: 'dirt', price: '£120', stack: 'Loves a slightly dirty amp. Stacks after a wah and before a delay.' }));

  P.push(Pd('king-of-tone', 'Analog.Man', 'King of Tone', 'overdrive', 2002,
    'The two-years-long waiting list pedal: two independent, transparent overdrives in one box, designed to be left switching between rhythm and lead without touching a knob.',
    [ctl('Volume', 0, 10, 6, 'Output for the channel you are on — set both channels to match levels, or make the red side louder for solos.'),
     ctl('Drive', 0, 10, 3, 'Low drive is the whole point: 2–4 sounds like your amp, turned up.'),
     ctl('Tone', 0, 10, 5, 'A gentle treble control — 5 is neutral.'),
     ctl('Presence', 0, 10, 5, 'Internal-ish bite; higher adds shimmer to single coils.'),
     ctl('Channel', 0, 1, 0, 'Switch between the yellow (clean boost) and red (more drive) sides.')],
    [ic('Transparent rhythm stack', '—', { Volume: 6, Drive: 2, Tone: 5, Presence: 5, Channel: 0 }, 'Yellow side, low drive, into an amp already breaking up — the "your amp, but better" setting.'),
     ic('Lead bump', '—', { Volume: 7, Drive: 4, Tone: 5, Presence: 6, Channel: 1 }, 'Red side with a little more drive and presence for solos.')],
    { slot: 'dirt', price: '£350', stack: 'Both channels into one dirty amp. Nothing else needed in the drive section.' }));

  P.push(Pd('wampler-tumnus', 'Wampler', 'Tumnus', 'overdrive', 2015,
    'A tiny Klon-inspired boost/drive with the famous clean-blend transparency — the modern way to get the Klon mid-hump and touch response without the collector price.',
    [ctl('Volume', 0, 10, 6, 'The Klon-style trick: volume up, gain down, and the amp "wakes up".'),
     ctl('Gain', 0, 10, 2, '2 is the famous setting — barely any gain, all the character.'),
     ctl('Treble', 0, 10, 5, '5 is flat; dial up for a bright rig, down for a dark one.')],
    [ic('Always-on sparkle', '—', { Volume: 6, Gain: 2, Treble: 5 }, 'Left on all night, gain nearly off — the pedal that makes a rig sound expensive.'),
     ic('Blues lead push', '—', { Volume: 7, Gain: 4, Treble: 6 }, 'Into a cranked Deluxe or AC30 for singing blues leads.')],
    { slot: 'dirt', price: '£180', stack: 'Pairs with a Tube Screamer: Klon first for tone, TS after for dirt.' }));

  P.push(Pd('boss-od-1', 'Boss', 'OD-1 OverDrive', 'overdrive', 1977,
    'Boss’s first overdrive and one of the first ever — a warm, symmetrical mild drive that quietly invented the "pedal as an extra amp channel" idea.',
    [ctl('Level', 0, 10, 6, 'Output — the OD-1 has no tone knob, its voice is fixed and mid-forward.'),
     ctl('Over Drive', 0, 10, 5, '5 is the classic touch-sensitive crunch.')],
    [ic('70s studio crunch', '—', { Level: 6, 'Over Drive': 5 }, 'Two knobs, no tone control, and it still works on every board.')],
    { slot: 'dirt', price: '£250 (collector)', power: '9 V DC or 12 V ACA (vintage units!)' }));

  /* =================================================================== */
  /* Distortion & fuzz — the second wave                                  */
  /* =================================================================== */
  P.push(Pd('marshall-guvnor', 'Marshall', 'The Guv’nor', 'distortion', 1988,
    'Marshall put a JCM800 preamp in a pedal and gave it a three-band EQ. Still the reference for a "real amp" distortion that cleans up with your volume knob.',
    [ctl('Gain', 0, 10, 6, '6 is classic rock, 8 is metal. Roll your guitar volume back and it cleans up — that is the magic.'),
     ctl('Volume', 0, 10, 6, 'Output. This pedal can drive a clean amp very loud.'),
     ctl('Bass', 0, 10, 6, 'Adds the low-end thump a small amp lacks.'),
     ctl('Middle', 0, 10, 5, 'Scoop to 3 for thrash, push to 7 for classic rock.'),
     ctl('Treble', 0, 10, 6, 'Presence — 6 keeps chords cutting without fizz.')],
    [ic('Still Got the Blues', 'Gary Moore', { Gain: 6, Volume: 6, Bass: 6, Middle: 5, Treble: 6 }, 'Singing Les Paul blues-rock leads into a cooking amp.'),
     ic('Classic rock rhythm', '—', { Gain: 5, Volume: 6, Bass: 6, Middle: 5, Treble: 5 }, 'Into a clean Fender for an instant British crunch.')],
    { slot: 'dirt', price: '£200 (reissue)', stack: 'A wah in front, a delay behind, and you have a whole 80s rig.' }));

  P.push(Pd('boss-hm-2', 'Boss', 'HM-2 Heavy Metal', 'distortion', 1983,
    'The most extreme tone control ever built into a pedal: with Low and High at maximum it growls like a chainsaw through a wall — and a whole genre of Swedish death metal was built on it.',
    [ctl('Level', 0, 10, 7, 'Output — be brave, this pedal is loud.'),
     ctl('Low', 0, 10, 10, 'The chainsaw. Dimed is the genre sound; 6 if you have a boomy cab.'),
     ctl('High', 0, 10, 10, 'The buzz. Dimed for that razored Swedish tone.'),
     ctl('Dist', 0, 10, 8, '8–10. Any lower and it stops being an HM-2.')],
    [ic('Left Hand Path — Entombed', 'Entombed', { Level: 7, Low: 10, High: 10, Dist: 10 }, 'The Swedish chainsaw: all four knobs to the right, into a dirty amp.'),
     ic('Old-school thrash', '—', { Level: 7, Low: 7, High: 8, Dist: 8 }, 'Slightly tamer, still brutal, sits better in a busy mix.')],
    { slot: 'dirt', price: '£120', stack: 'Into a dirty channel. Also brilliant on bass at Low 10 / High 4.' }));

  P.push(Pd('mxr-dime-distortion', 'MXR', 'DD11 Dime Distortion', 'distortion', 2004,
    'Built to Dimebag Darrell’s specs: scooped, tight, aggressive and loud, with the five-knob EQ that lets you dial in the Cowboys from Hell tone at low volume.',
    [ctl('Output', 0, 10, 6, 'Plenty of level — 6 matches most amps.'),
     ctl('Gain', 0, 10, 8, '8 is the Pantera setting: tight, saturated, still articulate.'),
     ctl('Bass', 0, 10, 5, 'Keep it moderate — the amp supplies the thump.'),
     ctl('Mid', 0, 10, 3, 'Scooped. 3 is the classic Dime scoop.'),
     ctl('Treble', 0, 10, 7, 'Aggressive top end for pick attack.')],
    [ic('Walk — Pantera', 'Dimebag Darrell', { Output: 6, Gain: 8, Bass: 5, Mid: 3, Treble: 7 }, 'Scooped mids, high gain, tight playing. Roll the guitar tone back for the solo.'),
     ic('Mid-forward punch', '—', { Output: 6, Gain: 7, Bass: 5, Mid: 6, Treble: 6 }, 'Same gain, mids up — cuts through a two-guitar mix.')],
    { slot: 'dirt', price: '£140' }));

  P.push(Pd('boss-fz-2', 'Boss', 'FZ-2 Hyper Fuzz', 'fuzz', 1993,
    'Two fuzzes and a clean boost in one: Fuzz 1 is a screaming, octave-ish vintage fuzz, Fuzz 2 is a roaring low-end wall — the doom metal staple.',
    [ctl('Level', 0, 10, 7, 'Output. Dimed for doom, 5 for stacking.'),
     ctl('Gain', 0, 10, 10, 'Fuzz 2 with Gain maxed is the whole genre.'),
     ctl('Bass', 0, 10, 9, 'The FZ-2 has an absurd amount of low end — start at 7, not 10.'),
     ctl('Treble', 0, 10, 5, 'Adds splatter; 5 keeps it dark and heavy.'),
     ctl('Mode', 0, 2, 1, 'Fuzz 1 · Fuzz 2 · Boost. The Boost mode alone is worth the pedal.')],
    [ic('Dopethrone — Electric Wizard', 'Electric Wizard', { Level: 7, Gain: 10, Bass: 9, Treble: 5, Mode: 1 }, 'Fuzz 2 into a loud, dirty amp. Turn everything up and slow down.'),
     ic('Vintage fuzz lead', '—', { Level: 6, Gain: 8, Bass: 6, Treble: 7, Mode: 0 }, 'Fuzz 1 with treble up — a screaming 60s fuzz for leads.')],
    { slot: 'guitar', price: '£250 (used)', stack: 'Wants to be first in the chain, after the wah.' }));

  P.push(Pd('green-russian-muff', 'Electro-Harmonix', 'Green Russian Big Muff Pi', 'fuzz', 1993,
    'The tall, green Soviet-built Muff: more low end and more mids than any other version, which is why bass players and riff-heavy duos adore it.',
    [ctl('Volume', 0, 10, 8, 'This one is loud — it will push an amp hard.'),
     ctl('Tone', 0, 10, 4, 'Darker than other Muffs. 4 for fat, 7 for cutting.'),
     ctl('Sustain', 0, 10, 8, '8 is the fat, sustaining wall; 5 is a usable crunch.')],
    [ic('Black Keys riffing', 'Dan Auerbach', { Volume: 8, Tone: 4, Sustain: 8 }, 'Neck pickup, fuzz wide open, small amp — thick and warm.'),
     ic('Bass fuzz', '—', { Volume: 7, Tone: 3, Sustain: 7 }, 'On bass it keeps the fundamental instead of turning to mush.')],
    { slot: 'guitar', price: '£110', stack: 'Into an already-dirty amp for the full wall. Rolls off with the guitar volume.' }));

  P.push(Pd('op-amp-muff', 'Electro-Harmonix', 'Op-Amp Big Muff Pi', 'fuzz', 1978,
    'The op-amp version with the raw, mid-scooped roar that defined 90s alternative rock — the "Siamese Dream" Muff.',
    [ctl('Volume', 0, 10, 7, 'Output — paired with a clean-ish amp it stays crisp.'),
     ctl('Tone', 0, 10, 6, 'Brighter than a transistor Muff; 6 is the records setting.'),
     ctl('Sustain', 0, 10, 9, 'Crank it: this is a wall-of-guitars pedal, and layering is the sound.')],
    [ic('Siamese Dream-era walls', 'The Smashing Pumpkins', { Volume: 7, Tone: 6, Sustain: 9 }, 'Layered many times over into a clean, loud amp — the op-amp grind is unmistakable.'),
     ic('Fuzz lead', '—', { Volume: 8, Tone: 7, Sustain: 7 }, 'Bridge pickup, tone up, for a screaming solo voice.')],
    { slot: 'guitar', price: '£110' }));

  P.push(Pd('mosrite-fuzzrite', 'Mosrite', 'Fuzzrite', 'fuzz', 1966,
    'A primitive two-transistor fuzz from the garage-rock era: spluttery, gated and gloriously wrong. Named in every psychedelic record of 1967.',
    [ctl('Depth', 0, 10, 8, 'The fuzz amount. 8 gives that raspy, dying-battery splutter.'),
     ctl('Volume', 0, 10, 6, 'Output; the Fuzzrite is not a loud pedal, which is part of its character.')],
    [ic('In-A-Gadda-Da-Vida', 'Iron Butterfly', { Depth: 8, Volume: 6 }, 'The organ-like fuzz riff that made the Fuzzrite immortal.'),
     ic('Garage rock splutter', '—', { Depth: 10, Volume: 6 }, 'Dimed and gated — every note starts with a spit.')],
    { slot: 'guitar', price: '£400 (vintage) / reissues cheaper', bypass: 'true bypass' }));

  /* =================================================================== */
  /* Wah — the rest of the famous sweeps                                  */
  /* =================================================================== */
  P.push(Pd('ibanez-wh10', 'Ibanez', 'WH10 Wah', 'wah', 1983,
    'A wah designed with a bass-friendly sweep and a plastic case that players either love or hate — and the funk-rock wah sound of the 90s and 2000s.',
    [ctl('Wah', 0, 10, 5, 'Sweep depth/range. 5 gives that vocal, slightly overdriven sweep.'),
     ctl('Volume', 0, 10, 7, 'This wah is LOUD. Set it to match your bypassed level, then ride the treadle.')],
    [ic('Funk rock riffing', 'John Frusciante', { Wah: 5, Volume: 7 }, 'Cocked halfway for the rhythmic "chika" parts, then swept wide for leads.'),
     ic('Classic sweep', '—', { Wah: 6, Volume: 6 }, 'Fast, vocal sweeps into a dirty amp.')],
    { slot: 'guitar', price: '£150', stack: 'Best into an amp already breaking up; add a compressor to keep the funk even.' }));

  P.push(Pd('colorsound-wah', 'Colorsound', 'Wah-Wah Pedal', 'wah', 1968,
    'The big, brassy British wah with a throatier sweep than a Vox — the sound of 70s rock solos and film soundtracks.',
    [ctl('Sweep', 0, 10, 6, 'A wide, vocal range; 6 is the classic position.'),
     ctl('Volume', 0, 10, 5, 'Output trim to match your board.')],
    [ic('70s rock lead', '—', { Sweep: 6, Volume: 5 }, 'Into a cranked British amp with the treble up — a honking, vocal wah.'),
     ic('Wah rhythm', '—', { Sweep: 4, Volume: 5 }, 'Parked low for groove parts.')],
    { slot: 'guitar', price: '£220 (reissue)' }));

  P.push(Pd('hendrix-wah', 'Dunlop', 'Jimi Hendrix Wah', 'wah', 1996,
    'A tuned Vox-style inductor wah voiced to Hendrix’s recordings, with a second "Fuzz" mode that adds the spit and howl of a fuzz that is being swept.',
    [ctl('Wah', 0, 10, 5, 'The sweep — 5 is the most vocal, Hendrix-like setting.'),
     ctl('Volume', 0, 10, 6, 'Output level.'),
     ctl('Fuzz', 0, 1, 0, 'Off = classic wah. On = a fuzz-like growl under the sweep.')],
    [ic('Voodoo Child (Slight Return)', 'Jimi Hendrix', { Wah: 6, Volume: 7, Fuzz: 1 }, 'Fuzz on, wah cocked and swept slowly under the riff.'),
     ic('Clean-ish funk', '—', { Wah: 5, Volume: 6, Fuzz: 0 }, 'Fuzz off for the tight, clean sweep.')],
    { slot: 'guitar', price: '£140' }));

  P.push(Pd('dunlop-cry-baby-mini', 'Dunlop', 'Cry Baby Mini Wah', 'wah', 2015,
    'A half-size Cry Baby with three voices inside and no compromise on the sweep — the answer to "I have no room left on the board".',
    [ctl('Voice', 0, 2, 1, 'Low · Mid · High — the three internal voicings, exposed as a switch.'),
     ctl('Volume', 0, 10, 6, 'Output trim.')],
    [ic('Board-space saver', '—', { Voice: 1, Volume: 6 }, 'Mid voice sits perfectly in a band mix.'),
     ic('Bass wah', '—', { Voice: 0, Volume: 6 }, 'Low voice keeps the bottom end for bass or baritone.')],
    { slot: 'guitar', price: '£130' }));

  /* =================================================================== */
  /* Filter / envelope                                                    */
  /* =================================================================== */
  P.push(Pd('boss-aw-3', 'Boss', 'AW-3 Dynamic Wah', 'filter', 2001,
    'An envelope filter with a trick up its sleeve: a "Humanizer" mode that makes the guitar talk, plus a tap-tempo auto-wah for groove playing.',
    [ctl('Manual', 0, 10, 5, 'Where the filter sits — lower is darker and more vocal.'),
     ctl('Depth', 0, 10, 6, 'How far the filter sweeps on each pick.'),
     ctl('Rate', 0, 10, 4, 'Speed in the tempo-wah modes.'),
     ctl('Mode', 0, 3, 0, 'Auto Wah · Up · Down · Humanizer — the Humanizer is the talking effect.')],
    [ic('Funk rhythm', '—', { Manual: 5, Depth: 6, Rate: 4, Mode: 0 }, 'Into a clean amp with the bridge pickup — instant 70s funk.'),
     ic('Talking lead', '—', { Manual: 4, Depth: 8, Rate: 5, Mode: 3 }, 'Humanizer mode, played with slides — it forms vowel sounds.')],
    { slot: 'guitar', price: '£130' }));

  P.push(Pd('dod-envelope-filter', 'DOD', 'Envelope Filter 440', 'filter', 1978,
    'One of the first envelope filters: a squelchy, funky auto-wah that responds to pick attack and cleans up when you play softly.',
    [ctl('Level', 0, 10, 6, 'Output — these have a volume jump, so match it to your clean level.'),
     ctl('Sensitivity', 0, 10, 5, 'How easily the filter triggers. Higher for humbuckers, lower for single coils.'),
     ctl('Range', 0, 10, 6, 'The sweep width — 6 is the classic "quack".')],
    [ic('Funk auto-wah', '—', { Level: 6, Sensitivity: 5, Range: 6 }, 'Pick hard, play staccato, and let the filter do the talking.'),
     ic('Subtle groove', '—', { Level: 6, Sensitivity: 3, Range: 3 }, 'With the range low it is a gentle tone shaper, always on.')],
    { slot: 'guitar', price: '£150' }));

  /* =================================================================== */
  /* Modulation — the rest of the classics                                */
  /* =================================================================== */
  P.push(Pd('boss-ce-1', 'Boss', 'CE-1 Chorus Ensemble', 'chorus', 1976,
    'The first Boss pedal: an enormous, hi-fi analogue chorus/vibrato with an AC cord and a stereo output. Still the richest chorus ever made.',
    [ctl('Level', 0, 10, 6, 'Output — the CE-1 can boost massively when engaged.'),
     ctl('Rate', 0, 10, 3, 'Slow is the lush setting; faster rates are the wobble.'),
     ctl('Depth', 0, 10, 7, 'The CE-1’s depth is enormous — 5 is already huge.'),
     ctl('Mode', 0, 1, 0, 'Chorus (wet + dry) or Vibrato (wet only, pitch wobble).')],
    [ic('Big 80s clean', '—', { Level: 6, Rate: 2, Depth: 6, Mode: 0 }, 'Chorus mode, slow rate — the glassy, three-dimensional clean tone of the era.'),
     ic('Vibrato wobble', '—', { Level: 6, Rate: 4, Depth: 5, Mode: 1 }, 'Vibrato mode for a Lo-Fi wobble on lofi and indie records.')],
    { slot: 'mod', price: '£700+ (vintage) / CE-2W has the mode', power: 'own AC lead' }));

  P.push(Pd('boss-bf-2', 'Boss', 'BF-2 Flanger', 'flanger', 1980,
    'The jet-plane flanger: four knobs that go from a subtle metallic shimmer to a full whoosh across the whole chord.',
    [ctl('Manual', 0, 10, 5, 'The resting point of the sweep — lower is deeper and darker.'),
     ctl('Depth', 0, 10, 6, 'How far it sweeps. 6 is dramatic.'),
     ctl('Rate', 0, 10, 3, 'Slow for textures, fast for a wobble.'),
     ctl('Resonance', 0, 10, 6, 'The metallic whistle. 6 is the classic 80s jet sound.')],
    [ic('80s jet-plane rock', '—', { Manual: 5, Depth: 7, Rate: 2, Resonance: 7 }, 'Slow sweep, deep resonance — the sound of every 80s power ballad intro.'),
     ic('Subtle metallic shimmer', '—', { Manual: 6, Depth: 3, Rate: 2, Resonance: 4 }, 'Low depth adds movement without washing out the chords.')],
    { slot: 'mod', price: '£120' }));

  P.push(Pd('boss-dc-2', 'Boss', 'DC-2 Dimension C', 'chorus', 1985,
    'No knobs, four buttons, one perfect sound: the Dimension C is the studio chorus that does not sound like a chorus, just wider.',
    [ctl('Mode', 0, 3, 1, 'Four presets of increasing depth — button 1 is subtle, 4 is full. There are no knobs to get wrong.')],
    [ic('Widest clean tone', '—', { Mode: 1 }, 'Mode 1 in stereo: your clean tone becomes enormous without obvious wobble.'),
     ic('Fingerstyle shimmer', '—', { Mode: 3 }, 'Mode 3 for acoustic-like arpeggios with a slow, wide movement.')],
    { slot: 'mod', price: '£450 (vintage) / Waza reissue', bypass: 'buffered' }));

  P.push(Pd('boss-vb-2', 'Boss', 'VB-2 Vibrato', 'chorus', 1982,
    'The cult Boss vibrato: true pitch-bending vibrato, not chorus, with a "Latch" mode that turns a footswitch into a musical gesture.',
    [ctl('Rate', 0, 10, 4, 'How fast the pitch wobbles.'),
     ctl('Depth', 0, 10, 6, 'How far. High depth is a seasick, tape-like flutter.'),
     ctl('Mode', 0, 1, 0, 'Latch · Unlatch — Latch holds the effect after a tap, so you can play with both hands free.')],
    [ic('Tape-like flutter', '—', { Rate: 4, Depth: 5, Mode: 1 }, 'Low rate and depth: the wobble of a slightly tired tape machine.'),
     ic('Surf & moody leads', '—', { Rate: 6, Depth: 7, Mode: 0 }, 'Deep enough to hear the pitch move — the classic cult VB-2 sound.')],
    { slot: 'mod', price: '£500 (vintage) / Waza reissue' }));

  P.push(Pd('deja-vibe', 'Fulltone', 'Deja’Vibe', 'vibe', 1997,
    'A faithful, road-ready take on the Uni-Vibe: the photocell wobble of late-60s psychedelia, without the museum prices or the servicing.',
    [ctl('Volume', 0, 10, 6, 'Output — the vibe has a level jump, match it.'),
     ctl('Speed', 0, 10, 4, 'Slow for the swirl under chords, faster for the wobble.'),
     ctl('Intensity', 0, 10, 6, 'The depth of the throb.'),
     ctl('Mode', 0, 1, 0, 'Chorus (vibrato + dry) · Vibrato (wet only, the rotary-ish wobble).')],
    [ic('Machine Gun swirl', 'Jimi Hendrix', { Volume: 6, Speed: 3, Intensity: 7, Mode: 1 }, 'Slow vibrato mode under long, screaming notes — the sound of 1969.'),
     ic('Bridge of Sighs', 'Robin Trower', { Volume: 6, Speed: 3, Intensity: 6, Mode: 0 }, 'Chorus mode, slow speed, into a cranked Marshall — the classic Trower swirl.')],
    { slot: 'mod', price: '£330', stack: 'After the wah and fuzz, before the delay — the Hendrix order.' }));

  P.push(Pd('boss-tr-2', 'Boss', 'TR-2 Tremolo', 'tremolo', 1997,
    'A no-nonsense analogue tremolo with a wave control, so you can go from a soft Fender throb to a hard, choppy gate.',
    [ctl('Rate', 0, 10, 4, 'Slow throb (2–3) or a fast stutter (7+).'),
     ctl('Depth', 0, 10, 6, 'How far the volume drops. 6–8 for a proper surf throb.'),
     ctl('Wave', 0, 10, 3, 'Triangle (soft) to square (hard on/off chopping).')],
    [ic('Surf & spy themes', '—', { Rate: 5, Depth: 8, Wave: 2 }, 'Deep and slow with a triangle wave — the classic amp-style throb.'),
     ic('Hard chop', '—', { Rate: 6, Depth: 9, Wave: 8 }, 'Square wave for a gated, stuttering chop.')],
    { slot: 'mod', price: '£110' }));

  P.push(Pd('strymon-lex', 'Strymon', 'Lex Rotary', 'tremolo', 2014,
    'A rotary-speaker simulation rather than a tremolo: a moving horn and rotor, in stereo, with the acceleration of the real thing.',
    [ctl('Speed', 0, 1, 0, 'Slow · Fast — the horn ramps up like a real Leslie when you switch.'),
     ctl('Horn Level', 0, 10, 6, 'Balance of the upper horn.'),
     ctl('Mic Distance', 0, 10, 5, 'Close is punchy; far is roomy and diffuse.'),
     ctl('Mix', 0, 10, 7, 'How much rotary you hear.'),
     ctl('Drive', 0, 10, 4, 'A little tube drive helps the rotor "sing".')],
    [ic('Rotary swirl', '—', { Speed: 0, 'Horn Level': 6, 'Mic Distance': 5, Mix: 7, Drive: 4 }, 'Slow rotor under chords, fast for the chorus — the organ-like swirl.'),
     ic('Fast rotor solo', '—', { Speed: 1, 'Horn Level': 7, 'Mic Distance': 4, Mix: 8, Drive: 5 }, 'Switch to fast for the ramp-up at the end of a solo.')],
    { slot: 'mod', price: '£300', kind: 'digital' }));

  P.push(Pd('strymon-mobius', 'Strymon', 'Mobius', 'chorus', 2013,
    'Twelve modulation machines in one box — chorus, flanger, phaser, tremolo, rotary, filter, destroyer — with presets and MIDI on top.',
    [ctl('Speed', 0, 10, 4, 'Rate of whichever machine you loaded.'),
     ctl('Depth', 0, 10, 5, 'How much movement.'),
     ctl('Tone', 0, 10, 5, 'Tilt EQ for the wet signal.'),
     ctl('Mix', 0, 10, 6, 'Blend of effect and dry.'),
     ctl('Machine', 0, 11, 0, 'Chorus · Flanger · Phaser · Tremolo · Rotary · Filter · Destroyer · Quadrature…')],
    [ic('All-in-one modulation board', '—', { Speed: 4, Depth: 5, Tone: 5, Mix: 6, Machine: 0 }, 'One box replaces a whole modulation drawer — save a preset per song.'),
     ic('Rotary for leads', '—', { Speed: 6, Depth: 7, Tone: 6, Mix: 7, Machine: 4 }, 'Rotary machine, mid speed, mid depth for solo colouring.')],
    { slot: 'mod', price: '£450', kind: 'digital' }));

  /* =================================================================== */
  /* Delay & reverb — the other legends                                   */
  /* =================================================================== */
  P.push(Pd('boss-dm-2', 'Boss', 'DM-2 Delay', 'delay', 1981,
    'The first compact analogue delay: a BBD chip, about 300 ms, and the warmest, most musical slapback ever put in a stompbox.',
    [ctl('Delay Time', 0, 10, 4, 'Short for slapback (2–4), longer for echoes. Past 8 it is all decay and no repeats.'),
     ctl('Feedback', 0, 10, 3, 'Keep it low — a couple of repeats, no runaway.'),
     ctl('Level', 0, 10, 5, 'Blend with the dry signal at 5.')],
    [ic('Rockabilly slapback', '—', { 'Delay Time': 2, Feedback: 1, Level: 5 }, 'One short slap behind every note — the 50s sound.'),
     ic('Warm analogue echo', '—', { 'Delay Time': 6, Feedback: 5, Level: 5 }, 'In a band mix it adds depth without ever sounding digital.')],
    { slot: 'time', price: '£350 (vintage) / DM-2W reissue' }));

  P.push(Pd('strymon-timeline', 'Strymon', 'Timeline', 'delay', 2011,
    'Twelve delay machines — tape, bucket brigade, digital, ice, dTape, LoFi, reverse — with tap tempo, presets and MIDI. The pro-board standard.',
    [ctl('Time', 0, 10, 5, 'Delay time, or tap it in with the footswitch.'),
     ctl('Repeats', 0, 10, 4, 'Number of echoes. 4 is ambience, 7+ is a wall.'),
     ctl('Mix', 0, 10, 5, 'Blend; keep it under 6 for rhythm work.'),
     ctl('Speed', 0, 10, 3, 'Modulation speed of the repeats (machine dependent).'),
     ctl('Depth', 0, 10, 3, 'How much the repeats wobble — a little tape flutter keeps it human.'),
     ctl('Machine', 0, 11, 0, 'dTape · dBucket · Digital · Dig · Ice · Trem · LoFi · Reverse · Swell · Duck · Dual · Pattern')],
    [ic('Ambient lead', '—', { Time: 5, Repeats: 5, Mix: 6, Speed: 3, Depth: 3, Machine: 0 }, 'Tape machine with light flutter — the endless solo sound.'),
     ic('Dotted-eighth U2', '—', { Time: 4, Repeats: 4, Mix: 5, Speed: 4, Depth: 4, Machine: 2 }, 'Tap the dotted eighth, one or two clean repeats, and the edge of the song appears.')],
    { slot: 'time', price: '£400', kind: 'digital' }));

  P.push(Pd('strymon-flint', 'Strymon', 'Flint', 'reverb', 2011,
    'A vintage amp’s spring reverb and its bias tremolo, in a pedal — the two effects that were always inside Fender combos, finally on the floor.',
    [ctl('Mix', 0, 10, 4, 'Reverb blend — 4 is the "amp with the reverb on 4" setting.'),
     ctl('Decay', 0, 10, 5, 'Spring size; longer decay is a bigger tank.'),
     ctl('Speed', 0, 10, 4, 'Tremolo rate.'),
     ctl('Intensity', 0, 10, 5, 'Tremolo depth.'),
     ctl('Mode', 0, 2, 0, 'Capacitor / Bias / Hall reverb types · 61/63 Tube tremolo types.')],
    [ic('Vintage combo tone', '—', { Mix: 4, Decay: 5, Speed: 4, Intensity: 5, Mode: 0 }, 'Spring reverb plus bias tremolo — a Deluxe in pedal form.'),
     ic('Wet ambient', '—', { Mix: 7, Decay: 8, Speed: 3, Intensity: 4, Mode: 2 }, 'Hall mode with a long decay for ambient swells.')],
    { slot: 'time', price: '£300', kind: 'digital' }));

  P.push(Pd('tc-hall-of-fame', 'TC Electronic', 'Hall of Fame 2', 'reverb', 2011,
    'The people’s reverb: small, cheap, and it has every essential reverb type plus the MASH footswitch that lets you push your way into infinite ambience.',
    [ctl('Decay', 0, 10, 5, 'Length of the tail.'),
     ctl('Tone', 0, 10, 5, 'Dark to bright; darker reverb sits behind the guitar.'),
     ctl('Level', 0, 10, 4, 'Reverb mix.'),
     ctl('Mode', 0, 7, 0, 'Room · Hall · Spring · Plate · Church · Mod · LoFi · Ambience — MASH the footswitch for more.')],
    [ic('Studio plate', '—', { Decay: 5, Tone: 6, Level: 4, Mode: 3 }, 'Plate reverb with a bright tail — the classic vocal-guitar space.'),
     ic('Ambient swell', '—', { Decay: 8, Tone: 4, Level: 6, Mode: 7 }, 'Ambience mode with MASH for swelling pads under long notes.')],
    { slot: 'time', price: '£130', kind: 'digital' }));

  P.push(Pd('boss-rv-6', 'Boss', 'RV-6 Reverb', 'reverb', 2015,
    'Eight reverb modes including a Shimmer that turns chords into a cathedral, in a Boss-sized box that survives a tour.',
    [ctl('Level', 0, 10, 4, 'How much reverb is in the blend.'),
     ctl('Tone', 0, 10, 5, 'Tilt of the reverb tail.'),
     ctl('Time', 0, 10, 5, 'Decay length.'),
     ctl('Mode', 0, 7, 0, 'Room · Hall · Plate · Spring · Modulate · Shimmer · Dynamic · +Delay')],
    [ic('Shimmer pad', '—', { Level: 5, Tone: 6, Time: 8, Mode: 5 }, 'Shimmer mode for octave-up pads under held chords.'),
     ic('Amp spring', '—', { Level: 4, Tone: 5, Time: 4, Mode: 3 }, 'Spring mode to give a dry amp the Fender treatment.')],
    { slot: 'time', price: '£160', kind: 'digital' }));

  /* =================================================================== */
  /* Pitch, synth & the weird stuff                                       */
  /* =================================================================== */
  P.push(Pd('digitech-drop', 'DigiTech', 'The Drop', 'pitch', 2014,
    'A polyphonic drop-tune pedal: set it to Drop D, Drop C or a whole octave down and your guitar becomes a different instrument — with no retuning.',
    [ctl('Tune', 0, 9, 2, 'Semitones down (0 = off): 1 = E♭, 2 = Drop D, 4 = Drop C, 7 = B-ish, 9 = Baritone.'),
     ctl('Dry/Wet', 0, 10, 10, 'Keep at 10 for full re-pitched signal.')],
    [ic('Drop D without retuning', '—', { Tune: 2, 'Dry/Wet': 10 }, 'One button and every Drop D song works on a standard-tuned guitar.'),
     ic('Instant baritone', '—', { Tune: 7, 'Dry/Wet': 10 }, 'Seven semitones down turns a Telecaster into a baritone.')],
    { slot: 'mod', price: '£150', kind: 'digital', stack: 'Put it first in the chain so everything after it hears the low tuning.' }));

  P.push(Pd('ehx-pog2', 'Electro-Harmonix', 'POG2', 'pitch', 2008,
    'A polyphonic octave generator with eight sliders: two octaves down, two up, detune, attack and a resonant low-pass filter — an organ, a synth and a 12-string in one.',
    [ctl('Dry', 0, 10, 10, 'Your clean signal; keep it high so you keep your attack.'),
     ctl('Sub Octave', 0, 10, 4, 'Octave down — discreet bottom, or a synth bass.'),
     ctl('Octave Up', 0, 10, 3, 'Octave up, organ-like shimmer.'),
     ctl('Detune', 0, 10, 3, 'Two slightly detuned voices — a 12-string-ish chorus.'),
     ctl('Attack', 0, 10, 0, 'Slider down = instant, up = slow swell for pads.'),
     ctl('LP Filter', 0, 10, 8, 'Tames the highs of the octaves.'),
     ctl('Preset', 0, 5, 0, 'Save your own six presets with the buttons.')],
    [ic('Organ pad', '—', { Dry: 10, 'Sub Octave': 6, 'Octave Up': 6, Detune: 2, Attack: 2, 'LP Filter': 6, Preset: 0 }, 'Sub and up octaves together, slow-ish attack — an organ under your chords.'),
     ic('12-string shimmer', '—', { Dry: 10, 'Sub Octave': 0, 'Octave Up': 4, Detune: 5, Attack: 0, 'LP Filter': 8, Preset: 1 }, 'Detune plus one octave up — the closest a single coil gets to a Rick.')],
    { slot: 'mod', price: '£330', kind: 'digital' }));

  P.push(Pd('boss-oc-3', 'Boss', 'OC-3 Super Octave', 'pitch', 2003,
    'A polyphonic octave with a bone-shaking range: two octaves down, a drive mode for synth-like grunt, and it tracks chords cleanly.',
    [ctl('Mode', 0, 3, 0, 'Poly 1 · Poly 2 · Oct 1 · Drive — Drive turns the octaves into a synth-like fuzz.'),
     ctl('Direct', 0, 10, 6, 'How much of your clean guitar you hear.'),
     ctl('Octave', 0, 10, 5, 'Level of the octave voice.'),
     ctl('Range', 0, 10, 5, 'Low-pass on the octaves — lower is darker and synthier.')],
    [ic('Synth bass lines', '—', { Mode: 3, Direct: 2, Octave: 8, Range: 4 }, 'Drive mode with the direct signal almost off — a synth with strings.'),
     ic('Octave riffing', '—', { Mode: 1, Direct: 8, Octave: 5, Range: 5 }, 'Poly mode for chords with a fat octave underneath.')],
    { slot: 'mod', price: '£140' }));

  P.push(Pd('ehx-micro-synth', 'Electro-Harmonix', 'Micro Synth', 'filter', 1978,
    'An analogue synth engine in a pedal: a trigger, a sweep, a resonance and four octave voices that turn a guitar into a Moog. The sound of 80s art-rock.',
    [ctl('Trigger', 0, 10, 5, 'How the envelope fires — higher needs a harder pick.'),
     ctl('Sweep', 0, 10, 6, 'The filter sweep range; the heart of the sound.'),
     ctl('Resonance', 0, 10, 6, 'How vocal the filter is. 6 is the classic squelch.'),
     ctl('Sub Octave', 0, 10, 3, 'Octave down voice.'),
     ctl('Octave Up', 0, 10, 0, 'Octave up voice.'),
     ctl('Square Wave', 0, 10, 0, 'Adds a square-wave synth voice.')],
    [ic('Analog synth lead', '—', { Trigger: 5, Sweep: 7, Resonance: 7, 'Sub Octave': 4, 'Octave Up': 0, 'Square Wave': 2 }, 'Sweep high, resonance high, and play single notes — it sounds like a mono synth.'),
     ic('Funk filter', '—', { Trigger: 6, Sweep: 5, Resonance: 5, 'Sub Octave': 0, 'Octave Up': 0, 'Square Wave': 0 }, 'No octaves, just the filter — a snappy analogue envelope.')],
    { slot: 'filter', price: '£350', kind: 'analog' }));

  P.push(Pd('heil-talk-box', 'Dunlop', 'Heil Talk Box', 'utility', 1973,
    'Not an effect but a physical experience: the amp’s output drives a compression horn, the sound travels up a tube into your mouth, and your mouth shapes the words.',
    [ctl('Horn Level', 0, 10, 10, 'Driven by your amp — never plug a talk box’s driver straight into anything else, and never run it without the horn connected.'),
     ctl('Amp Level', 0, 10, 7, 'The amp feeding the driver; too much level and the driver clips.')],
    [ic('Rocky Mountain Way', 'Joe Walsh', { 'Horn Level': 10, 'Amp Level': 7 }, 'Set the amp clean and loud, and shape the words with your mouth on the tube.'),
     ic('Livin’ on a Prayer', 'Richie Sambora', { 'Horn Level': 10, 'Amp Level': 7 }, 'The Talk Box solo — a cranked amp, a tube in the mouth, and a wah-like vowel shape.')],
    { slot: 'utility', price: '£250', bypass: 'n/a — it is inline with the amp output', power: 'passive (driven by the amp)', stack: 'Always last: amp speaker out → talk box → speaker cabinet.' }));

  /* =================================================================== */
  /* Compression, EQ & boost — the last of the board staples               */
  /* =================================================================== */
  P.push(Pd('keeley-comp-plus', 'Keeley', 'Compressor Plus', 'compressor', 2017,
    'The country and session staple: four knobs, a blend for your clean attack, and a switch that flips the voicing between single coils and humbuckers.',
    [ctl('Level', 0, 10, 6, 'Output — this pedal can boost, use it to push an amp.'),
     ctl('Sustain', 0, 10, 5, 'How much compression. 5 is squishy enough for chicken pickin’.'),
     ctl('Blend', 0, 10, 6, 'Mixes dry back in — keep the pick attack alive.'),
     ctl('Attack', 0, 10, 5, 'Faster clamps the note, slower lets the attack through.'),
     ctl('Switch', 0, 1, 0, 'Single coil · Humbucker voicing.')],
    [ic('Country chicken pickin’', '—', { Level: 6, Sustain: 6, Blend: 5, Attack: 4, Switch: 0 }, 'High sustain, fast attack, and every note snaps out evenly.'),
     ic('Always-on studio glue', '—', { Level: 6, Sustain: 3, Blend: 7, Attack: 5, Switch: 1 }, 'Subtle compression that makes a clean part sit in the mix.')],
    { slot: 'comp', price: '£180', stack: 'First or second in the chain — before drive so it controls the input.' }));

  P.push(Pd('empress-comp-mkii', 'Empress Effects', 'Compressor MkII', 'compressor', 2019,
    'A studio compressor that happens to live on the floor: full attack, release, ratio and sidechain controls, with meters to prove what is happening.',
    [ctl('Input', 0, 10, 5, 'How hard you hit the comp — the input meter is your friend.'),
     ctl('Mix', 0, 10, 8, 'Parallel blend; high mix keeps the natural feel.'),
     ctl('Ratio', 0, 10, 4, 'From a gentle 2:1 to a brick wall.'),
     ctl('Attack', 0, 10, 5, 'Slower lets the transient through.'),
     ctl('Release', 0, 10, 5, 'How quickly it recovers — match it to your playing.'),
     ctl('Output', 0, 10, 5, 'Make-up gain.'),
     ctl('Sidechain HPF', 0, 10, 4, 'Keeps the low end from triggering the comp — essential for a tight feel.')],
    [ic('Studio-clean rhythm', '—', { Input: 5, Mix: 8, Ratio: 3, Attack: 5, Release: 5, Output: 6, 'Sidechain HPF': 5 }, 'Gentle ratio, generous mix — the tone stays open and the dynamics tighten.'),
     ic('Funk squash', '—', { Input: 7, Mix: 6, Ratio: 6, Attack: 3, Release: 4, Output: 5, 'Sidechain HPF': 6 }, 'Faster attack and a higher ratio for that spiky, even funk sound.')],
    { slot: 'comp', price: '£280' }));

  P.push(Pd('mxr-10-band-eq', 'MXR', 'M108 10-Band EQ', 'eq', 1981,
    'A ten-band graphic EQ with level and gain sliders: the most precise way to fix a guitar’s voice, a room, or a solo that will not cut.',
    [ctl('100 Hz', 0, 10, 5, 'Fixes a thin-sounding rig (boost) or a boomy one (cut).'),
     ctl('200 Hz', 0, 10, 5, 'The "boxy" range — cut here if chords sound muddy.'),
     ctl('400 Hz', 0, 10, 5, 'Warmth/stuffiness.'),
     ctl('800 Hz', 0, 10, 5, 'The honk of a mid-heavy amp.'),
     ctl('1.6 kHz', 0, 10, 5, 'Guitar presence — small boosts make solos jump forward.'),
     ctl('3.2 kHz', 0, 10, 5, 'Attack and pick detail.'),
     ctl('6.4 kHz', 0, 10, 5, 'Brightness; too much sounds harsh.'),
     ctl('Level', 0, 10, 6, 'Overall output; the M108 has plenty of boost on tap.')],
    [ic('Solo boost', '—', { '800 Hz': 6, '1.6 kHz': 7, '3.2 kHz': 6, Level: 7 }, 'A gentle mid push with level up — your solo cuts without getting louder in the wedges.'),
     ic('Fix a boomy room', '—', { '100 Hz': 3, '200 Hz': 4, '400 Hz': 4, Level: 6 }, 'Cut the low-mid mud where your amp is sitting, and every note gets clearer.')],
    { slot: 'eq', price: '£120', stack: 'After drive, before modulation — shape the tone once it is made.' }));

  P.push(Pd('xotic-ac-booster', 'Xotic', 'AC Booster', 'boost', 1998,
    'A warm, fat booster with a real tone control — less clinical than a clean boost, it makes a small amp sound bigger without adding fizz.',
    [ctl('Volume', 0, 10, 6, 'Output — this one can slam an amp.'),
     ctl('Gain', 0, 10, 3, 'A touch of fatness at 3; 6 gets crunchy.'),
     ctl('Treble', 0, 10, 6, 'Sparkle on top.'),
     ctl('Bass', 0, 10, 6, 'Thickness at the bottom.')],
    [ic('Fat single-coil boost', '—', { Volume: 7, Gain: 3, Treble: 6, Bass: 6 }, 'Into a Fender on the edge of breakup — the "bigger guitar" setting.'),
     ic('Lead push', '—', { Volume: 7, Gain: 5, Treble: 6, Bass: 5 }, 'A little gain and a lot of level for solos.')],
    { slot: 'dirt', price: '£170' }));

  P.push(Pd('super-hard-on', 'ZVEX', 'Super Hard-On', 'boost', 1995,
    'The legendary one-knob boost: a discreet FET circuit that makes an amp sound like itself, only more. One knob, and every player who owns one leaves it on.',
    [ctl('Drive', 0, 10, 6, 'Unlike the name suggests, this mostly adds volume and shimmer. 6 is a big, clean push.')],
    [ic('Always-on magic', '—', { Drive: 6 }, 'First in the chain, always on, and suddenly every other pedal sounds better.'),
     ic('Solo level jump', '—', { Drive: 8 }, 'Set it as a preset level jump for solos — louder, not dirtier.')],
    { slot: 'dirt', price: '£230', power: '9 V DC or battery' }));

  /* =================================================================== */
  /* The merged library                                                   */
  /* =================================================================== */
  const ALL = P1.LB.concat(P2, P);
  const api = {
    LIST: ALL,
    P1: P1, P2: P2, P3: P,
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
  root.TT = root.TT || {};
  root.TT.pedals = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
