/* Trill Tuner — physical rig wiring guide.
 *
 * Everything you need to actually connect a guitar, a pedalboard and an amp
 * without hum, buzz, ground loops, blown speakers or magic smoke. Plus the
 * signal chains of famous rigs, so you can copy a real setup end to end.
 */
(function () {
  'use strict';

  /* ---------------- signal chain order rules ---------------- */
  const ORDER = [
    { pos: 1, name: 'Guitar → Tuner', why: 'A tuner first means you can mute and tune without hunting for a pedal. Buffered tuners also give the chain a clean signal. Power it from its own isolated output.', pedal: 'Boss TU-3, TC Polytune 3' },
    { pos: 2, name: 'Wah / Envelope filter / Fuzz (germanium)', why: 'Wah and vintage fuzz want the raw, unbuffered guitar signal. Put fuzz FIRST if it’s germanium (Fuzz Face, Tone Bender) — a buffer in front ruins its cleanup. Many players put the wah before the fuzz; try both, the fuzz usually wins first place.', pedal: 'Fuzz Face, Cry Baby, Mu-Tron III' },
    { pos: 3, name: 'Compressor', why: 'Before the dirt so it can feed a consistent signal into the drive stages, and so the drives don’t fight the compressor’s dynamics. If you want the drive to ride your playing dynamics, put the comp AFTER the drive instead.', pedal: 'Dyna Comp, Keeley Comp Plus' },
    { pos: 4, name: 'Overdrive / Boost', why: 'Boost into drive, drive into distortion: gain stacking works because each stage compounds the next. Put the pedal you want to sound “loudest” last in the dirt section.', pedal: 'TS-808, Klon, SD-1' },
    { pos: 5, name: 'Distortion / Fuzz (silicon, Muff)', why: 'Higher-gain, more compressed pedals go later in the dirt stack. A Muff after a RAT sounds like a wall; a RAT after a Muff sounds like a splat.', pedal: 'RAT, Big Muff, DS-1' },
    { pos: 6, name: 'EQ / Volume pedal', why: 'EQ here shapes everything that came before it. A volume pedal before modulation keeps the delay/reverb tails ringing out at the end of a swell — put it before the time-based pedals, not at the very end.', pedal: 'Boss GE-7, Ernie Ball VP Jr' },
    { pos: 7, name: 'Modulation (chorus · flanger · phaser · tremolo · vibe)', why: 'Modulation goes after dirt so it modulates the distorted signal evenly. Before dirt it gets mushy and loses definition. Uni-Vibe is the exception: many players put it in front of the drive.', pedal: 'CE-2, Phase 90, BF-2' },
    { pos: 8, name: 'Delay', why: 'After modulation so the repeats are clean and consistent. Time-based effects last = a “mix” of the whole board.', pedal: 'DD-3, Memory Man, El Capistan' },
    { pos: 9, name: 'Reverb', why: 'Reverb last: it’s the room at the end of the room. Delay into reverb = classic; reverb into delay = surreal (a valid choice, just know what you’re doing).', pedal: 'Flint, BigSky, Holy Grail' },
    { pos: 10, name: 'Looper', why: 'A looper at the very end captures everything you heard, including your reverb. If you want to loop a dry signal, put it before the time-based pedals instead.', pedal: 'RC-5, Ditto X2' },
    { pos: 11, name: '→ Amp input, or → FX loop', why: 'Time-based and modulation pedals sound clearer in a series FX loop (after the preamp). Anything that shapes distortion belongs in FRONT of the amp input.', pedal: 'See the FX loop section' }
  ];

  /* ---------------- effects loop / 4-cable method ---------------- */
  const FX_LOOP = [
    '**The loop sits after the amp’s preamp and before the power amp.** That means delay, reverb and modulation in the loop stay clean and hi-fi — the preamp distortion doesn’t smear them.',
    '**Put in FRONT of the amp:** tuner, wah, fuzz, comp, overdrive, distortion, EQ, boost. These shape what the preamp sees.',
    '**Put in the LOOP:** chorus, flanger, phaser, tremolo, delay, reverb, looper. These reproduce what the preamp made.',
    '**Series loop (most amps):** amp send → pedal → amp return. Simple, always works, and the pedals’ dry signal is your amp’s sound.',
    '**Parallel loop (some Mesas/old Marshalls):** the amp mixes the loop signal with the dry signal. Pedals with a wet/dry mix (like a Timeline) work best; digital pedals with a delay in their own conversion can cause phase trouble.',
    '**The 4-cable method** (gate + some pedals in the loop, some in front): guitar → front pedals → amp input · amp send → loop pedals → amp return. That’s four cables: two for the front run and two for the loop.',
    '**Gain staging in the loop:** start with the pedal’s output at unity and use the amp’s loop level if it has one. A hot pedal in the loop = clipped preamp = bad. A weak one = hiss.',
    '**No loop?** Put the time-based pedals in front and accept a slightly smeared repeat — that’s exactly how Hendrix, Gilmour (early) and The Edge got their sounds. It’s not a compromise, it’s a tone.',
    '**The 4-cable gate (Decimator G-String / NS-2 with loop):** guitar → gate → front pedals → amp input; amp send → gate return → gate output → amp return. Now the gate silences both your pedals AND the amp’s own hiss.'
  ];

  /* ---------------- power ---------------- */
  const POWER = [
    '**Most pedals are 9V DC, centre-negative** (Boss-style barrel). Check every pedal — a few (older Colorsound, some germanium fuzzes, Positive Grid) are centre-POSITIVE and will be damaged by a standard supply.',
    '**Daisy-chaining works for analog pedals** with small current draw (usually under 100 mA). It fails for anything digital or noisy.',
    '**Never daisy-chain:** digital delays, reverbs, tuners, modelers or anything with a clock. They inject ticking and whine into every pedal sharing the chain.',
    '**Add up the milliamps.** Every pedal lists its draw (typically 5–50 mA analog, 100–500 mA digital). Buy a supply at least 30% above your total, and never exceed an individual output’s rating.',
    '**Isolated outputs are the fix for hum.** An isolated supply (Truetone CS12, Voodoo Lab Pedal Power 3, Cioks DC7) gives every pedal its own ground reference — no ground loops.',
    '**Voltage matters:** 12V and 18V outputs give more headroom to pedals that accept them (many overdrives and delays love 18V — MXR Carbon Copy and most analog delays do NOT; check first).',
    '**Battery vs supply:** germanium fuzzes often sound better on a battery (Fuzz Face, Tone Bender). They also hate sharing a supply with a buffered/digital pedal.',
    '**Amp power:** 100W tube heads draw 300–500W from the wall. Use a proper IEC cable, a grounded outlet, and never lift the ground pin to kill hum — fix the hum.',
    '**Wall warts vs supplies:** a single cheap wall-wart feeding six pedals through a daisy chain is the #1 cause of “my board hums”. Spend the money on isolation.',
    '**Cable length = tone loss.** Instrument cable has capacitance (~30 pF/ft). 30 ft of cable into a passive guitar rolls off high end noticeably. Keep boards short, use buffered pedals or a dedicated buffer at the start and end.'
  ];

  /* ---------------- cables & levels ---------------- */
  const CABLES = [
    { name: 'Instrument cable (TS, unbalanced)', use: 'Guitar → pedals → amp input.', tip: '1/4" TS jack. Keep runs under 20 ft when possible; use 20–25 ft for stage freedom and accept the tiny high-end loss, or add a buffer.' },
    { name: 'Speaker cable', use: 'Amp output → speaker cabinet.', tip: 'NEVER use an instrument cable here. It is thinner, and the current will melt it — or worse, short the amp and kill the output transformer. Speaker cable is unshielded and heavier gauge.' },
    { name: 'Balanced TRS / XLR cable', use: 'Line out, DI, loop-level signals, mic cables.', tip: 'Balanced sends cancel noise over long runs. Use XLR to the desk, TRS for line-level loops.' },
    { name: 'Patch cable (pedalboard)', use: 'Pedal → pedal.', tip: 'Flat pancake jacks save space. Measure before you buy: 6 in, 12 in, and a couple of 18 in covers most boards.' },
    { name: 'Patch cable with TRS (expression)', use: 'Expression pedal → pedal.', tip: 'Most expression inputs need a TRS cable (tip = wiper, ring = 3.3V). A TS cable will make the pedal behave like an on/off switch instead of a sweep.' },
    { name: 'USB / interface cable', use: 'Recording into a computer.', tip: 'A class-compliant interface + the Katana/Tone Master USB out is the cheapest good recording setup there is.' },
    { name: 'Y / insert cable', use: 'Parallel amps, insert points, TRS effects loops.', tip: 'A “Y” insert cable (TRS → 2 × TS) is the standard for a single-jack insert loop.' }
  ];

  /* ---------------- impedance & speaker loads ---------------- */
  const IMPEDANCE = [
    '**Match the impedance.** A tube amp wants its rated load (usually 8Ω or 16Ω, some have a switch). Mismatching DOWN (amp expects 8Ω, cab is 4Ω) stresses the output transformer; mismatching UP (amp expects 8Ω, cab is 16Ω) is quieter and usually survivable but not ideal.',
    '**Never run a tube amp with no speaker connected.** No load = the output transformer’s voltage spikes into the thousands of volts and destroys the amp. Some amps have a “headphone out” or a built-in load — those are safe.',
    '**Solid-state amps** are generally more tolerant of mismatches but will still overheat — check the manual.',
    '**Two cabs, half each:** two 8Ω cabs in parallel = 4Ω total. Two 16Ω cabs in parallel = 8Ω. Set the amp’s impedance switch to the total, not to one cab.',
    '**Combos** usually have a fixed internal speaker — the external jack gives you a total-load change. Read the label before you plug in another cab.',
    '**Wattage headroom:** a cab should handle at least 1.5× the amp’s rated power. A 100W amp needs 150W+ of speakers; a 4×12 of 25W Greenbacks (=100W) is NOT enough for a 100W Plexi.',
    '**Attenuators and load boxes** (Fryette Power Station, Two notes Captor, Weber Mass) sit between the amp and the speaker and let you crank the amp quietly. They’re the honest way to get power-amp distortion at home volume.',
    '**Impedance mismatch and pedals:** pedals care about *input* impedance (1 MΩ is the standard for guitar). Some vintage fuzzes have a low input impedance — that’s exactly why they must be first in the chain.'
  ];

  /* ---------------- troubleshooting ---------------- */
  const TROUBLE = [
    { symptom: 'Loud hum that stops when you touch the strings', cause: 'Ground loop or a bad cable shield.', fix: 'Try another cable first, then a different outlet for the amp. Isolated power supply outputs fix most pedalboard ground loops. Never remove the ground pin from the amp’s plug.' },
    { symptom: 'High-pitched whine that changes with a delay pedal’s settings', cause: 'A digital pedal sharing a daisy chain.', fix: 'Give the digital pedal its own isolated output. This one fix solves 80% of pedalboard noise.' },
    { symptom: 'Radio station / taxi radio through the amp', cause: 'Poor shielding, long unbalanced runs, or a bad cable.', fix: 'Shorten the cable run, check for a broken shield (wiggle test), and add a buffer. Move the board away from power supplies.' },
    { symptom: 'Tuner / wah makes everything thin when off', cause: 'The pedal is a tone-sucking vintage bypass or an unbuffered hardwire bypass with a long cable run behind it.', fix: 'Add a buffer first in the chain, or put the pedal in a bypass loop (Boss LS-2 / a true-bypass looper).' },
    { symptom: 'Fuzz sounds thin and sputtery', cause: 'A buffer (or a non-true-bypass pedal) in front of a germanium fuzz.', fix: 'Move the fuzz to position 1, directly after the guitar. Nothing between the guitar and a Fuzz Face, ever.' },
    { symptom: 'Notes cut off awkwardly at high gain', cause: 'A noise gate set too aggressively, or the input signal too low.', fix: 'Lower the gate threshold and set the release slower. Also check your pickup height — a weak input makes gates misbehave.' },
    { symptom: 'Amp squeals whenever you turn up', cause: 'Microphonic tube, or a high-gain oscillation.', fix: 'Tap each preamp tube with a pencil (amp off, then on and listening): a ringing tube is microphonic. Replace it. Otherwise, check pedal order and gain staging.' },
    { symptom: 'Amp crackles and fades in and out', cause: 'A tired power tube or a dirty tube socket.', fix: 'Reseat the tubes (amp off, cooled down, pins aligned). If it continues, replace the power tubes in matched pairs.' },
    { symptom: 'Everything sounds fine alone but disappears in the band', cause: 'Too much bass / too little midrange, or a scooped EQ.', fix: 'Turn the bass DOWN and the mids UP. Live guitar lives between 300 Hz and 3 kHz — a mid-forward tone always cuts better.' },
    { symptom: 'Pedal LED dims when you engage it', cause: 'Not enough current from the supply.', fix: 'Add the pedals’ mA ratings and buy adequate power. Undervolted digital pedals do all kinds of strange things.' },
    { symptom: 'Buzzing/rattle from the amp or cab', cause: 'A loose screw, tube retainer, or a speaker baffle screw.', fix: 'Tighten every screw you can find. Rattle is almost always mechanical, not electronic.' },
    { symptom: 'Scratchy knob noise', cause: 'A dirty potentiometer.', fix: 'DeoxIT D5 into the pot (very small amount), work it back and forth 20 times. Do not soak the circuit board.' }
  ];

  /* ---------------- recording ---------------- */
  const RECORDING = [
    '**Mic the amp** for the real thing: SM57 1 inch off the grille at the cap edge → interface → DAW. Record at a moderate level (peaks around −12 dBFS) so you can re-amp or re-process later.',
    '**Blend a close mic with a room mic** for depth: close for punch, 3–6 ft back for space. Check phase by flipping one channel’s polarity and keeping whichever version sounds fuller.',
    '**DI + reamp** is the flexible route: record the dry DI, then send it back out to a real amp later and mic it. You can also send a DI through the virtual rig here.',
    '**Load box / cab sim** (Two notes Captor, UA OX, Power Station) lets you record a cranked tube amp at 3 a.m. with headphones.',
    '**USB amp outs** (Katana, Tone Master, most modern practice amps) are the cheapest path to good recorded tone. No mic, no room, no neighbours.',
    '**High-pass at 80–100 Hz** on rhythm guitars and let the bass own the low end. Cutting low end on guitar is the fastest way to make a mix sound professional.',
    '**Double-track rhythms**, pan one hard left and one hard right, and play the part twice rather than copying a track — the tiny timing differences are what make it huge.',
    '**Don’t record at maximum gain.** High gain loses definition in a mix. Use enough gain to feel right and let the bass guitar and cymbals carry the impression of “heavy”.',
    '**Headroom for pedals:** keep pedal levels near unity unless you deliberately want to push the amp. Recording with everything dimed means nothing is left for the mix.',
    '**Headphones rule:** if you monitor the amp through speakers while recording a mic, you will create feedback and bleed. Use closed-back headphones.'
  ];

  /* ---------------- famous rigs, in order ---------------- */
  const CHAINS = [
    {
      id: 'hendrix', artist: 'Jimi Hendrix (1968–70)', guitar: 'Fender Stratocaster (upside down, right-handed)',
      chain: ['Fuzz Face (germanium, first — no buffer)', 'Vox V846 wah (after the fuzz)', 'Roger Mayer Octavia (octave-up fuzz)', 'Uni-Vibe', 'Marshall Plexi Super Lead 100 (jumped channels) → 4×12'],
      amp: 'Marshall 1959SLP: Presence 5 · Bass 6 · Mid 7 · Treble 7 · Vol I 8 · Vol II 5, channels jumpered',
      notes: 'Everything lives on the guitar’s volume knob. Fuzz first, always; the Univibe is a texture, not an effect.'
    },
    {
      id: 'srv', artist: 'Stevie Ray Vaughan', guitar: 'Fender Stratocaster, heavy strings (.013–.058), tuned E♭',
      chain: ['Ibanez TS-808 (or a second TS-9, stacked)', 'Vox Wah', 'Fuzz Face (on “Couldn’t Stand the Weather”)', 'Fender Vibroverb / Bassman + a Dumble-style amp', 'Tube reverb tank'],
      amp: 'Vibroverb: Vol 6 · Treble 6 · Bass 4 · Reverb 3; Bassman: Presence 5 · B 5 · M 6 · T 6 · Vol 6',
      notes: 'Two Tube Screamers, one at low gain and one higher, each doing half of the work. Heavy strings + E♭ tuning = his tone’s foundation.'
    },
    {
      id: 'gilmour', artist: 'David Gilmour (Pink Floyd)', guitar: 'Fender Stratocaster (EMG or stock), Fender Esquire',
      chain: ['Dyna Comp', 'Big Muff (Ram’s Head)', 'Fulltone/Fuzz Face', 'Cry Baby wah', 'MXR Phase 100', 'Electric Mistress', 'Boss DD-2 / TC 2290 delay', 'Hiwatt DR103 or Fender Twin → 4×12 WEM'],
      amp: 'Hiwatt: Normal 7 · Brilliant 6 · B 6 · T 7 · Master 4 (Big Muff in front)',
      notes: 'The “Comfortably Numb” solo = Big Muff + delay (around 350–450 ms with a couple of repeats) + a mid-heavy amp. Keep the delay mix low so the fuzz stays articulate.'
    },
    {
      id: 'edge', artist: 'The Edge (U2)', guitar: 'Fender Stratocaster, Rickenbacker, Gibson Explorer',
      chain: ['Polytune / TU-3', 'SD-1 or a boost', 'Delay (dotted-eighth, ~350 ms)', 'Memory Man / Korg SDD-3000 rack delay', 'Boss CE-1 / AC30 for chime', 'Vox AC30 ×2 in stereo'],
      amp: 'AC30: Top Boost 5 · Bass 3 · Treble 8 · Cut 3',
      notes: 'The dotted-eighth delay IS the sound. Hold a Herdim pick sideways for the scratch. Two amps in stereo, hard-panned, is the other half.'
    },
    {
      id: 'slash', artist: 'Slash (Guns N’ Roses)', guitar: 'Gibson Les Paul Standard (Seymour Duncan Alnico II)',
      chain: ['Cry Baby wah', 'Ibanez TS-808 reissue (Drive low)', 'MXR Phase 90', 'Boss DD-3 delay', 'Marshall JCM800 2203 or Silver Jubilee → 4×12 G12T-75'],
      amp: 'JCM800: Pre 7 · Master 4 · Presence 5 · B 5 · M 6 · T 6',
      notes: 'Les Paul + JCM800 + a low-gain TS boost. Turn the guitar’s tone knob down to 7 for the “Welcome to the Jungle” intro.'
    },
    {
      id: 'hetfield', artist: 'James Hetfield (Metallica)', guitar: 'ESP/LTD Explorer-style, EMG 81/60 pickups',
      chain: ['TC Electronic tuner', 'TS-9 or TS-808 (Drive 0 · Level high) — the classic boost', 'Mesa/Boogie Mark IIC+ / Dual Rectifier / Diezel VH4 (blended)', 'Boss GE-7 or a rack EQ for the mid scoop', 'Noise gate in the loop'],
      amp: 'Mark IIC+: Gain 7 · B 3 · M 5 · T 7 · Presence 5 · 5-band EQ V-curve with a 750 Hz cut',
      notes: 'The secret is not “more gain”: it’s a mid-focused amp with a graphic EQ cutting 750 Hz, double-tracked four times with tight palm muting.'
    },
    {
      id: 'evh', artist: 'Eddie Van Halen', guitar: 'Frankenstrat (humbucker, dive-bombing Floyd Rose)',
      chain: ['MXR Phase 90', 'MXR Flanger', 'Echoplex EP-3 (in the studio)', 'Marshall Plexi 100W (variac’d to ~90V) → 4×12'],
      amp: 'Plexi: Presence 4 · B 6 · M 8 · T 6 · Vol I 9 · Vol II 6 (jumped)',
      notes: 'No distortion pedal — just a cranked Plexi at dangerous volume, a Phase 90, and the guitar’s volume knob. The variac trick is famous and dangerous; a good attenuator gets you there safely.'
    },
    {
      id: 'cobain', artist: 'Kurt Cobain (Nirvana)', guitar: 'Fender Mustang / Jaguar / Univox, humbuckers',
      chain: ['Boss DS-1 or DS-2 (Turbo mode II)', 'EHX Small Clone (deep)', 'Polychorus', 'Mesa/Boogie Studio .22 / Fender Twin / Marshall'],
      amp: 'DS-2 into a clean-ish amp: Dist 8 · Tone 5 · Mode II · Level 6',
      notes: 'The chorus is a Small Clone with the depth switch DOWN. The distortion is nastier than you think — do not smooth it out.'
    },
    {
      id: 'brianmay', artist: 'Brian May (Queen)', guitar: 'Red Special (Burns Tri-Sonic pickups, 24" scale)',
      chain: ['Rangemaster-style treble booster (Dallas Arbiter) → Vox AC30 ×3, all cranked', 'A second amp for the delay'],
      amp: 'AC30: Normal 6 · Top Boost 8 · Bass 4 · Treble 7 · Cut 5',
      notes: 'The treble booster into a cranked AC30 is the entire sound. The Red Special’s out-of-phase pickup switches are the other half — a coil-split guitar with a treble boost gets in the neighbourhood.'
    },
    {
      id: 'jackwhite', artist: 'Jack White (The White Stripes)', guitar: 'Airline / Montgomery Ward Res-O-Glas, cheap vintage amps',
      chain: ['DigiTech Whammy (octave down)', 'Big Muff / Fuzz War', 'MXR Micro Amp (jump the input gain)', 'Silvertone / Supro / Montgomery Ward combos — loud and broken-up'],
      amp: 'Small vintage combo at 10, everything at 10, no master, no apologies',
      notes: 'Part of the sound is broken equipment: a ripped speaker cone, a dying amp, a plastic guitar. Don’t clean it up.'
    },
    {
      id: 'mayerclean', artist: 'John Mayer (Continuum era)', guitar: 'Fender Stratocaster (’63 style), vintage pickups',
      chain: ['Analog Man King of Tone / TS-808', 'Klon Centaur (boost)', 'Cry Baby / Clyde wah', 'MXR Phase 90', 'Strymon / Aqua Puss delay', 'Fender ’65 Deluxe Reverb + Two-Rock Studio Signature'],
      amp: 'Deluxe Reverb: Vol 5 · T 6 · B 4.5 · Reverb 3',
      notes: 'The “clean” is not clean: it’s a Deluxe Reverb at the edge of breakup with a Klon pushing it. Mids up, bass down, reverb modest.'
    },
    {
      id: 'mccready', artist: 'Mike McCready (Pearl Jam)', guitar: 'Fender Stratocaster (Texas Specials)',
      chain: ['Cry Baby wah', 'Ibanez Tube Screamer', 'Big Muff (lead tones)', 'MXR Phase 90', 'Line 6 DL4 delay', 'Marshall JCM800 + Fender Twin (stereo)'],
      amp: 'JCM800 crunch + a clean Twin: the classic “one dirty, one clean” stereo rig',
      notes: 'The “Alive” solo is a cranked Marshall with a wah left cocked for the scream. Stereo amps give the width.'
    },
    {
      id: 'petty', artist: 'Tom Petty & Mike Campbell', guitar: 'Rickenbacker, Fender Broadcaster/Telecaster',
      chain: ['MXR Dyna Comp', 'Boss DM-2 / DD-2 delay (slap)', 'Vox AC30 / Fender Bassman', 'Tremolo from the amp'],
      amp: 'AC30: Top Boost 5 · Bass 3 · Treble 7 · Cut 4',
      notes: 'Simple, bright and dry: a Rickenbacker into a Vox with a short slapback and a compressor. The jangle comes from the guitar, not the pedals.'
    },
    {
      id: 'santana', artist: 'Carlos Santana', guitar: 'PRS Santana (humbuckers, 24.5" scale)',
      chain: ['Ibanez Tube Screamer', 'Mu-Tron III (envelope filter)', 'Mesa/Boogie Mark Series', 'A touch of delay'],
      amp: 'Mark-style: Gain 6 · B 4 · M 6 · T 6 · Presence 5 · 750 Hz cut',
      notes: 'Sustain from a mid-heavy amp, and phrasing from the fingers. The wah is used as a filter, parked, for the signature vocal honk.'
    },
    {
      id: 'knopfler', artist: 'Mark Knopfler (Dire Straits)', guitar: 'Fender Stratocaster (early), Pensa-Suhr (later)',
      chain: ['Dyna Comp / Boss CS-2', 'Tube Screamer (light)', 'MXR Analog Delay / Roland rack delay', 'Fender Twin / Soldano (later)'],
      amp: 'Twin: Vol 3 · T 6 · M 5 · B 4 · Reverb 3',
      notes: 'Fingerstyle, out-of-phase Strat positions (2 and 4), and a slightly dark amp. Nothing else needed.'
    },
    {
      id: 'hammett', artist: 'Kirk Hammett (Metallica solos)', guitar: 'ESP with EMG 81',
      chain: ['Cry Baby (KH95)', 'TS-9 boost', 'Big Muff (early)', 'Dunlop Rotovibe', 'Boss DD-3', 'Mesa Mark IIC+/Dual Recto'],
      amp: 'Recto lead: Vintage/Orange · Gain 8 · B 4 · M 5 · T 7 · delay in the loop',
      notes: 'Wah + delay + a mid-heavy lead channel. The wah is parked to find the sweet spot on sustained notes.'
    },
    {
      id: 'frusciante', artist: 'John Frusciante (RHCP)', guitar: 'Fender Stratocaster (vintage), Gretsch White Falcon',
      chain: ['Ibanez WH10 wah (always on for solos)', 'Boss DS-2', 'Big Muff', 'MXR Dyna Comp', 'Boss CE-1 chorus', 'Line 6 DL4 / EHX Deluxe Memory Man', 'Marshall Major / Silver Jubilee'],
      amp: 'Marshall crunch: Pre 5 · Master 5 · B 6 · M 6 · T 6 · Mid-heavy, no scoops',
      notes: 'Clean funk requires a bright, mid-forward amp and a compressor. The DS-2 does the dirty work in Turbo mode.'
    },
    {
      id: 'animals', artist: 'Animals as Leaders (Tosin Abasi)', guitar: 'Ibanez 8-string, active pickups',
      chain: ['Compressor', 'Clean boost', 'Digital delay + reverb', 'Fractal / Mesa + matrix power amp', 'Studio monitors / FRFR'],
      amp: 'Modeled: tight high-gain, low-end controlled with a high-pass at ~90 Hz, mids present',
      notes: 'Extended range needs the low end carved out. A high-pass at 80–100 Hz and a tight drive pedal keep 8-string riffs articulate.'
    },
    {
      id: 'trower', artist: 'Robin Trower', guitar: 'Fender Stratocaster (big strings, low action)',
      chain: ['Wah (Cry Baby, parked for the honk)', 'Uni-Vibe / Deja’Vibe (chorus mode, slow)', 'Marshall Plexi — volume up, everything else at noon', 'A little amp reverb for depth'],
      amp: 'Plexi: both channels jumped · Volume 7 · Bass 5 · Mid 6 · Treble 6 · Presence 5',
      notes: 'The vibe is never off. Speed slow enough to feel like the room is breathing, and the guitar volume knob does the gain staging.'
    },
    {
      id: 'electricwizard', artist: 'Electric Wizard (Jus Oborn)', guitar: 'Gibson SG (humbuckers), tuned down',
      chain: ['Boss FZ-2 Hyper Fuzz (Fuzz 2)', 'Big Muff (stacked)', 'Analog delay (long, dark)', 'Orange / Laney head into a 4×12 — very loud'],
      amp: 'Orange Rockerverb: Gain 9 · Bass 8 · Mid 3 · Treble 4 · Master 7',
      notes: 'Doom is not a pedal setting, it is a decision: tune down, slow down, and let the low end swamp everything. Fuzz 2 with Bass high is the wall.'
    },
    {
      id: 'entombed', artist: 'Entombed (Ulf Cederlund / Alex Hellid)', guitar: 'Gibson Les Paul, humbuckers, tuned to C or B',
      chain: ['Boss HM-2 Heavy Metal — all four knobs maxed', 'Noise gate (kills the hiss, keeps the buzz)', 'Dirty British amp channel'],
      amp: 'HM-2: Level 7 · Low 10 · High 10 · Dist 10 into a JCM800 crunch channel',
      notes: 'The “Stockholm sound” is one pedal, four knobs, and no restraint. Low and High both dimed is the whole genre.'
    },
    {
      id: 'pantera', artist: 'Dimebag Darrell (Pantera)', guitar: 'Dean ML / Washburn with Bill Lawrence or Dimebucker pickups',
      chain: ['Cry Baby 535Q (parked for the squeals)', 'MXR DD11 Dime Distortion (scooped)', 'Graphic EQ', 'Noise gate', 'Randall RG100ES solid-state head (or a Peavey 5150)', 'Short digital delay in the loop'],
      amp: 'Solid-state crunch: Gain 8 · Bass 5 · Mids 3 · Treble 7 · Presence 7',
      notes: 'Solid-state attack, scooped mids and a wah parked mid-travel for the “Walk” squeal. Play hard, tune low, hit every divebomb.'
    },
    {
      id: 'pumpkins', artist: 'The Smashing Pumpkins (Billy Corgan)', guitar: 'Fender Stratocaster with Lace Sensors, layered many times',
      chain: ['Op-Amp Big Muff Pi (loud, mid-scooped)', 'Phase 90 (leads)', 'Boss DD-3 (short delay)', 'Marshall JCM800 / Mesa + a clean amp layered', 'Studio layering — the same part recorded again and again'],
      amp: 'JCM800: Preamp 7 · Bass 6 · Mid 4 · Treble 6 with the Muff doing the distortion',
      notes: 'The Siamese Dream wall is not one tone: it is the same guitar played four times, each with a slightly different Muff setting.'
    },
    {
      id: 'blackkeys', artist: 'The Black Keys (Dan Auerbach)', guitar: 'Cheap vintage guitars into small amps, fuzz first',
      chain: ['Green Russian Big Muff (fat, dark)', 'Tremolo (slow, deep)', 'Analog delay (heavy, lo-fi)', 'Small vintage combo — Supro, Fender Champ, Magnatone'],
      amp: 'Supro Thunderbolt: Volume 8 · single Tone knob at 6',
      notes: 'Two-piece bands need the guitar to occupy the low end too. Neck pickup, fuzz wide open, and no treble roll-off.'
    },
    {
      id: 'setzer', artist: 'Brian Setzer (Stray Cats)', guitar: 'Gretsch 6120 (Filter’Tron pickups, bigsby)',
      chain: ['Slapback delay (~90–120 ms, one repeat)', 'Amp tremolo for the surf parts', 'Fender Bassman — bright channel, loud and clean'],
      amp: 'Bassman: Volume 6 · Treble 7 · Bass 4 · Presence 4 (bright channel)',
      notes: 'Rockabilly is a clean amp and a slapback. Set the delay just long enough to hear the echo as a separate note, then play with the bigsby.'
    },
    {
      id: 'angus', artist: 'Angus Young (AC/DC)', guitar: 'Gibson SG Standard (humbuckers)',
      chain: ['Nothing. Guitar → wireless → amp.'],
      amp: 'Plexi: Volume 10 · Bass 3 · Mid 7 · Treble 6 · Presence 5',
      notes: 'The most famous “no pedals” rig in rock. Every tone change comes from the guitar’s volume and tone knobs and from how hard he plays.'
    }
  ];

  /* ---------------- pedalboard layout / ergonomics ---------------- */
  const BOARD_TIPS = [
    'Signal flows left to right and top to bottom — put the pedals you switch mid-song on the front row, where your foot finds them without looking.',
    'The amp-facing end of the board should have the pedals that always stay on (comp, always-on drive) at the back — you don’t need to stomp them.',
    'Leave a finger-width of space between pedals or you will hit two at once on stage. Buy a board one size bigger than you think you need.',
    'Velcro the whole board, not just the corners. Label every jack with tape — future you will thank present you at 2 a.m. at load-out.',
    'Mount the power supply underneath and bundle the DC cables. A tidy board is a quiet board.',
    'A tuner with a mute output at the very start lets you tune in silence between songs.',
    'Bring a spare instrument cable, a spare 9V battery and a spare patch cable. The failure always happens in the first song.',
    'Secure the board with a case or a lid — nothing kills a pedal like a loose board in a van.'
  ];


  /* ------------------------------------------------------------------ */
  /* Link every famous rig to a real amp in TT.amps and real pedals in    */
  /* TT.pedals, so the Rig can load the whole chain with one click.       */
  /* ------------------------------------------------------------------ */
  const RIG_MAP = {
    hendrix: { name: 'Jimi Hendrix — Fuzz Face into a Plexi', ampId: 'plexi-1959', pedalIds: ['fuzz-face', 'wah-v847', 'uni-vibe'] },
    srv: { name: 'Stevie Ray Vaughan — Tube Screamer into a Vibroverb', ampId: 'deluxe-reverb-65', pedalIds: ['ts808', 'wah-crybaby', 'fuzz-face'] },
    gilmour: { name: 'David Gilmour — Big Muff into a Hiwatt', ampId: 'hiwatt-dr103', pedalIds: ['dyna-comp', 'big-muff', 'wah-crybaby', 'phase-95', 'electric-mistress', 'dd-3'] },
    edge: { name: 'The Edge — AC30 chime and a dotted-eighth delay', ampId: 'ac30', pedalIds: ['sd-1', 'dd-7', 'ce-2w', 'memory-man'] },
    slash: { name: 'Slash — wah into a JCM800', ampId: 'jcm800-2203', pedalIds: ['wah-crybaby', 'ts808', 'phase-90', 'dd-3'] },
    hetfield: { name: 'James Hetfield — boost into a Boogie Mark', ampId: 'mark-v', pedalIds: ['ts9', 'noise-gate', 'eq-pedal'] },
    evh: { name: 'Eddie Van Halen — Phase 90 into a Plexi', ampId: 'plexi-1959', pedalIds: ['phase-90', 'm117-flanger'] },
    cobain: { name: 'Kurt Cobain — DS-2 and a Small Clone', ampId: 'twin-reverb-65', pedalIds: ['ds-2', 'small-clone'] },
    brianmay: { name: 'Brian May — treble booster into cranked AC30s', ampId: 'ac30', pedalIds: ['treble-boost'] },
    jackwhite: { name: 'Jack White — Whammy, Muff and a broken combo', ampId: 'supro-thunderbolt', pedalIds: ['whammy', 'big-muff', 'micro-amp'] },
    mayerclean: { name: 'John Mayer — Klon into a Deluxe Reverb', ampId: 'deluxe-reverb-65', pedalIds: ['klon-centaur', 'ts808', 'wah-crybaby', 'phase-90', 'analog-delay'] },
    mccready: { name: 'Mike McCready — wah, Tube Screamer and a Muff', ampId: 'jcm800-2203', pedalIds: ['wah-crybaby', 'ts808', 'big-muff', 'phase-90'] },
    petty: { name: 'Tom Petty & Mike Campbell — slapback and AC30', ampId: 'ac30', pedalIds: ['dyna-comp', 'dd-3'] },
    santana: { name: 'Carlos Santana — Tube Screamer and a Mu-Tron', ampId: 'mark-v', pedalIds: ['ts808', 'mu-tron-iii'] },
    knopfler: { name: 'Mark Knopfler — compressor into a Twin', ampId: 'twin-reverb-65', pedalIds: ['dyna-comp', 'ts808', 'analog-delay'] },
    hammett: { name: 'Kirk Hammett — wah and a boost into a Recto', ampId: 'dual-rectifier', pedalIds: ['wah-535q', 'ts9', 'big-muff', 'dd-3'] },
    frusciante: { name: 'John Frusciante — WH10 into a Marshall', ampId: 'silver-jubilee-2555', pedalIds: ['ibanez-wh10', 'ds-2', 'big-muff', 'dyna-comp', 'boss-ce-1', 'memory-man'] },
    animals: { name: 'Animals as Leaders — modelled clean-to-metal', ampId: 'diezel-vh4', pedalIds: ['compressor', 'spark-booster', 'el-capistan', 'bigsky'] },
    trower: { name: 'Robin Trower — Deja’Vibe swirl into a Plexi', ampId: 'plexi-1959', pedalIds: ['deja-vibe', 'wah-crybaby', 'analog-delay'] },
    electricwizard: { name: 'Electric Wizard — FZ-2 doom wall', ampId: 'orange-rockerverb', pedalIds: ['boss-fz-2', 'big-muff', 'analog-delay'] },
    entombed: { name: 'Entombed — HM-2 chainsaw into a JCM800', ampId: 'jcm800-2203', pedalIds: ['boss-hm-2', 'noise-gate'] },
    pantera: { name: 'Dimebag Darrell — scooped Dime Distortion', ampId: '6505', pedalIds: ['mxr-dime-distortion', 'wah-535q', 'eq-pedal', 'noise-gate'] },
    pumpkins: { name: 'The Smashing Pumpkins — op-amp Muff layers', ampId: 'jcm800-2203', pedalIds: ['op-amp-muff', 'phase-90', 'dd-3'] },
    blackkeys: { name: 'The Black Keys — Green Russian fuzz', ampId: 'supro-thunderbolt', pedalIds: ['green-russian-muff', 'tremolo', 'analog-delay'] },
    setzer: { name: 'Brian Setzer — slapback into a Bassman', ampId: 'bassman-59', pedalIds: ['boss-dm-2', 'tremolo'] },
    angus: { name: 'Angus Young — SG straight into a Plexi', ampId: 'plexi-1959', pedalIds: [] }
  };
  CHAINS.forEach(function (c) {
    const m = RIG_MAP[c.id];
    if (m) { c.name = m.name; c.ampId = m.ampId; c.pedalIds = m.pedalIds; }
  });

  const api = { ORDER, FX_LOOP, POWER, CABLES, IMPEDANCE, TROUBLE, RECORDING, CHAINS, BOARD_TIPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TT = window.TT || {}; window.TT.wiring = api; }
})();
