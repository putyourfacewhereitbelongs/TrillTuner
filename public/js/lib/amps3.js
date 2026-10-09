/* Trill Tuner — amplifier library, part 3: more heads, combos and modelers.
 * Loads after lib/amps2.js and appends to TT.amps.AMPS.
 */
(function () {
  'use strict';

  const A = (typeof require === 'function' && typeof window === 'undefined')
    ? require('./amps.js')
    : window.TT.amps;
  const amp = A.amp, ctl = A.ctl, tn = A.tn, sw = A.sw;

  const MORE = [
    amp({
      id: 'fender-super-reverb', brand: 'Fender', model: '’65 Super Reverb', year: '1965', type: 'tube combo (4×10)',
      watts: 45, tube: '4× 12AX7, 2× 12AT7, 2× 6L6GC, 1× 5AR4', speakers: '4×10\" Jensen C10R',
      channels: 2, price: '£2,200',
      desc: 'The blackface club amp: four tens, lush reverb and a clean that stays clean until it doesn’t. The sound of Chicago blues and a thousand bar bands.',
      controls: [
        ctl('Volume', 1, 10, 4, 'Blackface volume. 3–4 is sparkling clean, 6 starts to bloom, 8 is a small-room roar.'),
        ctl('Treble', 1, 10, 6, 'Bright without ice-pick. 6 is the classic blackface chime.'),
        ctl('Bass', 1, 10, 4, 'Four tens already have low end. Keep bass at 3–5 or it gets flubby.'),
        ctl('Reverb', 0, 10, 4, 'The tank. 3–5 is a room, 7 is surf.'),
        ctl('Speed', 0, 10, 3, 'Vibrato speed — slow for a pulse, faster for a shimmer.'),
        ctl('Intensity', 0, 10, 0, 'Vibrato depth. 0 is off; 3–5 is the blackface throb.')
      ],
      tones: [
        tn('Club clean', { Volume: 4, Treble: 6, Bass: 4, Reverb: 4, Speed: 3, Intensity: 0 }, 'The default Super Reverb: loud, clean, a little reverb, no vibrato.', 'Chicago blues nights', 'Buddy Guy · Magic Sam'),
        tn('Surf tank', { Volume: 5, Treble: 7, Bass: 3, Reverb: 7, Speed: 4, Intensity: 4 }, 'Reverb and vibrato up — the wet blackface surf sound.', 'Pipeline-era surf', 'Surf guitar')
      ],
      artists: ['Buddy Guy', 'Mike Campbell'], genre: ['blues', 'rock', 'surf']
    }),
    amp({
      id: 'fender-vibro-champ', brand: 'Fender', model: 'Vibro Champ', year: '1964', type: 'tube combo (1×8)',
      watts: 6, tube: '2× 12AX7, 1× 6V6, 1× 5Y3', speakers: '1×8\"',
      price: '£900',
      desc: 'A Champ with onboard vibrato. Six watts, one eight-inch speaker, and it records bigger than it has any right to.',
      controls: [
        ctl('Volume', 1, 10, 5, '3 is clean, 6 is grind, 8+ is full Champ snarl.'),
        ctl('Treble', 1, 10, 6, 'Tone. 6 keeps the 8\" speaker from getting dark.'),
        ctl('Speed', 0, 10, 4, 'Vibrato rate.'),
        ctl('Intensity', 0, 10, 3, 'Vibrato depth. 0 is a Champ; 4 is a Vibro Champ.')
      ],
      tones: [
        tn('Bedroom grind', { Volume: 6, Treble: 6, Speed: 4, Intensity: 3 }, 'The whole point of a 6-watt amp: loud-feeling breakup at apartment volume.', 'Home recording', 'Session players')
      ],
      artists: ['Home recordists'], genre: ['blues', 'indie']
    }),
    amp({
      id: 'marshall-origin20', brand: 'Marshall', model: 'Origin 20H', year: '2018', type: 'tube head',
      watts: 20, tube: '3× 12AX7, 2× EL34', speakers: '4×12\" (paired)',
      price: '£450',
      desc: 'A modern 20-watt Plexi-voiced head with a tilt control that walks from JTM cream to Super Lead bite. Power-scaling lets it break up at living-room volume.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Plexi-style gain. 4–6 is classic rock, 8 is a small crunch stack.'),
        ctl('Bass', 0, 10, 4, 'Keep it moderate — EL34s already have low end.'),
        ctl('Mid', 0, 10, 6, 'The Marshall punch. 6–7 is the rock voice.'),
        ctl('Treble', 0, 10, 6, 'Presence-adjacent bite. 6 is typical.'),
        ctl('Master', 0, 10, 5, 'Power-stage volume. Turn this up and Gain down for real power-tube grind.'),
        sw('Tilt', 1, ['JTM (cream)', 'Plexi (bite)'], 'Voicing: creamier JTM45 or brighter Super Lead.')
      ],
      tones: [
        tn('Living-room Plexi', { Gain: 5, Bass: 4, Mid: 6, Treble: 6, Master: 6, Tilt: 1 }, 'Tilt on Plexi, master up, gain moderate — the Origin’s trick.', 'Practice Marshall', 'Working players')
      ],
      artists: ['Working rock players'], genre: ['rock', 'blues']
    }),
    amp({
      id: 'mesa-mark-iic-plus', brand: 'Mesa/Boogie', model: 'Mark IIC+', year: '1983', type: 'tube combo/head',
      watts: 100, tube: '5× 12AX7, 4× 6L6', speakers: '1×12\" or 4×12\"',
      price: '£3,500+',
      desc: 'The graphic-EQ Boogie that defined 80s metal and fusion. Cascading gain, a 5-band EQ and that singing, compressed lead voice.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Lead-channel gain. 6–7 is the IIC+ singing lead; 8+ is saturation city.'),
        ctl('Treble', 0, 10, 6, 'Lead treble. 6 keeps it from getting fizzy.'),
        ctl('Bass', 0, 10, 3, 'Pull bass down on the lead channel or it gets muddy.'),
        ctl('Mid', 0, 10, 5, 'Before the graphic. 5 is a starting point.'),
        ctl('Presence', 0, 10, 5, 'Power-amp bite.'),
        ctl('Master', 0, 10, 4, 'Channel master. The IIC+ wants this lower than you think.'),
        ctl('Graphic 750 Hz', 0, 10, 3, 'The scoop. Pull 750 Hz down for the classic metal V.')
      ],
      tones: [
        tn('Master of Puppets rhythm', { Gain: 7, Treble: 6, Bass: 3, Mid: 5, Presence: 5, Master: 4, 'Graphic 750 Hz': 2 },
          'Gain 7, bass down, 750 Hz scooped — the Hetfield IIC+ voice.', 'Master of Puppets — Metallica', 'James Hetfield')
      ],
      artists: ['James Hetfield', 'John Petrucci'], genre: ['metal', 'fusion']
    }),
    amp({
      id: 'mesa-triple-rectifier', brand: 'Mesa/Boogie', model: 'Triple Rectifier', year: '1995', type: 'tube head',
      watts: 150, tube: '5× 12AX7, 6× 6L6, 3× 5U4', speakers: '4×12\" Recto cab',
      price: '£2,400',
      desc: 'Three rectifier tubes, 150 watts and the tight, aggressive high-gain that owned 90s/00s metal. Modern mode is a wall; vintage mode still has sag.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Modern high gain. 5–6 is already a lot; 8 is a wall.'),
        ctl('Bass', 0, 10, 4, 'Tight low end. Above 5 it can get flubby with drop tunings.'),
        ctl('Mid', 0, 10, 5, '5 is the Recto mid. Scoop with an EQ pedal rather than killing this.'),
        ctl('Treble', 0, 10, 6, 'Aggressive top. 6 is typical, 8 is ice-picky.'),
        ctl('Presence', 0, 10, 5, 'Power-amp sizzle.'),
        ctl('Master', 0, 10, 4, 'Loud. Always.'),
        sw('Mode', 1, ['vintage', 'modern'], 'Vintage = sag and bloom. Modern = tight and aggressive.')
      ],
      tones: [
        tn('Modern metal', { Gain: 6, Bass: 4, Mid: 5, Treble: 6, Presence: 5, Master: 4, Mode: 1 }, 'Modern mode, gain 6, a TS in front — 2000s metal.', 'Early 2000s metal', 'Metalcore & nu-metal')
      ],
      artists: ['2000s metal'], genre: ['metal', 'hard-rock']
    }),
    amp({
      id: 'evh-5150iii-lbx', brand: 'EVH', model: '5150 III LBX', year: '2017', type: 'tube head',
      watts: 15, tube: '4× 12AX7, 2× 6V6', speakers: '1×12\" or 2×12\"',
      price: '£900',
      desc: 'The lunchbox 5150: the same three-channel EVH voice in 15 watts, so the power amp actually moves at club volume. Red channel is the brown sound’s grandchild.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Red-channel gain. 5–6 is singing, 8 is a wall.'),
        ctl('Bass', 0, 10, 5, 'Tight EVH low end.'),
        ctl('Mid', 0, 10, 6, 'The EVH mid-hump. Don’t scoop this.'),
        ctl('Treble', 0, 10, 6, 'Cut and harmonics.'),
        ctl('Presence', 0, 10, 5, 'Power-amp sheen.'),
        ctl('Master', 0, 10, 5, '15 watts means this can actually go up.')
      ],
      tones: [
        tn('Brown lunchbox', { Gain: 6, Bass: 5, Mid: 6, Treble: 6, Presence: 5, Master: 5 }, 'The 5150 voice at a volume you can keep.', 'Club high-gain', 'EVH-inspired players')
      ],
      artists: ['EVH-inspired players'], genre: ['hard-rock', 'metal']
    }),
    amp({
      id: 'peavey-classic-30', brand: 'Peavey', model: 'Classic 30', year: '1990', type: 'tube combo (1×12)',
      watts: 30, tube: '3× 12AX7, 4× EL84', speakers: '1×12\"',
      price: '£450',
      desc: 'EL84 American combo with a surprisingly British crunch. Cheap, loud, and the secret weapon of a lot of indie and alternative records.',
      controls: [
        ctl('Pre', 0, 10, 5, 'Preamp gain. 4 is clean-ish, 7 is crunch.'),
        ctl('Low', 0, 10, 5, 'Bass. 5 is a good start.'),
        ctl('Mid', 0, 10, 6, 'The Classic 30’s useful midrange.'),
        ctl('High', 0, 10, 6, 'Treble. 6 keeps the 12\" from getting dark.'),
        ctl('Post', 0, 10, 5, 'Master volume.'),
        ctl('Reverb', 0, 10, 3, 'Spring. 3 is a room.')
      ],
      tones: [
        tn('Indie crunch', { Pre: 6, Low: 5, Mid: 6, High: 6, Post: 5, Reverb: 3 }, 'The 90s alternative combo: EL84 grind, a little reverb.', '90s alternative', 'Indie players')
      ],
      artists: ['Indie & alternative'], genre: ['indie', 'rock']
    }),
    amp({
      id: 'orange-ad30ht', brand: 'Orange', model: 'AD30HTC', year: '2004', type: 'tube head',
      watts: 30, tube: '4× ECC83, 4× EL84', speakers: '2×12\" PPC',
      price: '£1,300',
      desc: 'Class-A EL84 Orange with two channels and that woody, mid-forward British voice. Channel B is the singing, compressed lead.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Channel B gain. 4–6 sings, 8 is saturated Orange.'),
        ctl('Bass', 0, 10, 4, 'Woody low mids. Don’t overdo it.'),
        ctl('Treble', 0, 10, 6, 'EL84 top. 6 is typical.'),
        ctl('Master', 0, 10, 5, 'Class-A — this wants to be up.')
      ],
      tones: [
        tn('British class-A', { Gain: 5, Bass: 4, Treble: 6, Master: 6 }, 'Channel B, master up, gain moderate — the AD30 voice.', 'British rock', 'Orange players')
      ],
      artists: ['British rock'], genre: ['rock', 'indie']
    }),
    amp({
      id: 'vox-ac4tv', brand: 'Vox', model: 'AC4TV', year: '2010', type: 'tube combo (1×10)',
      watts: 4, tube: '1× 12AX7, 1× EL84', speakers: '1×10\"',
      price: '£280',
      desc: 'Four watts, a wattage switch (4 / 1 / 0.25) and a real Top Boost voicing. Bedroom AC30.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Top Boost gain. 6 is chime with grind.'),
        ctl('Tone', 0, 10, 6, 'Single tone. 6 is Vox-bright.'),
        ctl('Volume', 0, 10, 5, 'Master.'),
        sw('Watts', 0, ['4 W', '1 W', '0.25 W'], 'Power scaling. 0.25 W breaks up at whisper volume.')
      ],
      tones: [
        tn('Bedroom Top Boost', { Gain: 6, Tone: 6, Volume: 5, Watts: 2 }, '0.25 W, gain 6 — AC30 chime in a flat.', 'Practice Vox', 'Apartment players')
      ],
      artists: ['Practice rooms'], genre: ['indie', 'rock']
    }),
    amp({
      id: 'revv-generator-120', brand: 'Revv', model: 'Generator 120', year: '2016', type: 'tube head',
      watts: 120, tube: '5× 12AX7, 4× 6L6', speakers: '4×12\"',
      price: '£1,800',
      desc: 'Four channels of modern high-gain with a tight, articulate low end. Purple is the aggressive rhythm; red is the singing lead.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Purple/red gain. 5 is already modern metal.'),
        ctl('Bass', 0, 10, 4, 'Tight. Keep it at 4 with drop tunings.'),
        ctl('Mid', 0, 10, 5, 'Revv mids are useful — don’t scoop them away.'),
        ctl('Treble', 0, 10, 6, 'Aggressive but not fizzy at 6.'),
        ctl('Presence', 0, 10, 5, 'Power-amp cut.'),
        ctl('Master', 0, 10, 4, '120 watts. Respect it.')
      ],
      tones: [
        tn('Modern tight', { Gain: 5, Bass: 4, Mid: 5, Treble: 6, Presence: 5, Master: 4 }, 'Purple channel, gain 5, tight bass.', 'Modern metal', 'Revv players')
      ],
      artists: ['Modern metal'], genre: ['metal']
    }),
    amp({
      id: 'victory-sheriff-22', brand: 'Victory', model: 'Sheriff 22', year: '2015', type: 'tube head',
      watts: 22, tube: '3× 12AX7, 2× EL34', speakers: '1×12\" or 2×12\"',
      price: '£900',
      desc: 'A 22-watt British head voiced by Guthrie Robertson: JCM800-adjacent crunch that cleans up from the guitar volume.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Crunch gain. 4–6 is classic rock, 8 is a small 800.'),
        ctl('Bass', 0, 10, 4, 'EL34 low end. 4 is tight.'),
        ctl('Mid', 0, 10, 6, 'British mid-push.'),
        ctl('Treble', 0, 10, 6, 'Presence-adjacent.'),
        ctl('Master', 0, 10, 5, '22 watts — this can go up.')
      ],
      tones: [
        tn('British club', { Gain: 5, Bass: 4, Mid: 6, Treble: 6, Master: 6 }, 'The Sheriff’s home: gain 5, master up, guitar volume does the rest.', 'Club rock', 'Victory players')
      ],
      artists: ['British rock'], genre: ['rock', 'hard-rock']
    }),
    amp({
      id: 'suhr-badger-18', brand: 'Suhr', model: 'Badger 18', year: '2011', type: 'tube combo/head',
      watts: 18, tube: '3× 12AX7, 2× EL84', speakers: '1×12\"',
      price: '£1,500',
      desc: 'Cathode-biased EL84 American-British hybrid with a gain that goes from blackface clean to crunchy rock. The power scaling is the trick.',
      controls: [
        ctl('Gain', 0, 10, 4, '4 is a loud clean, 6 is crunch, 8 is rock.'),
        ctl('Bass', 0, 10, 5, 'Full but tight.'),
        ctl('Mid', 0, 10, 5, 'Neutral-useful.'),
        ctl('Treble', 0, 10, 6, 'American chime.'),
        ctl('Master', 0, 10, 5, 'Power scaling lives here.')
      ],
      tones: [
        tn('Studio hybrid', { Gain: 4, Bass: 5, Mid: 5, Treble: 6, Master: 6 }, 'Clean-loud, pedals in front. The Badger as a platform.', 'Studio rock', 'Session players')
      ],
      artists: ['Session players'], genre: ['rock', 'indie']
    }),
    amp({
      id: 'toneking-imperial', brand: 'Tone King', model: 'Imperial Mk II', year: '2016', type: 'tube combo (1×12)',
      watts: 20, tube: '3× 12AX7, 2× 6V6', speakers: '1×12\"',
      price: '£2,400',
      desc: 'Two-channel American combo with a built-in Ironman attenuator, so the power tubes work at whisper volume. Rhythm is blackface; lead is a tweed grind.',
      controls: [
        ctl('Volume', 0, 10, 5, 'Channel volume. The attenuator means this can sit at 7 without being a neighbour complaint.'),
        ctl('Treble', 0, 10, 6, 'American top.'),
        ctl('Bass', 0, 10, 4, 'Tight low.'),
        ctl('Reverb', 0, 10, 3, 'Lush, short tank.'),
        ctl('Attenuate', 0, 10, 4, 'Ironman attenuation. 0 is full power, 10 is a whisper.')
      ],
      tones: [
        tn('Attenuated blackface', { Volume: 6, Treble: 6, Bass: 4, Reverb: 3, Attenuate: 6 }, 'Volume up, attenuator down — real power-tube grind at bedroom level.', 'Home studio', 'Tone King players')
      ],
      artists: ['Session & home studio'], genre: ['blues', 'rock']
    }),
    amp({
      id: 'magnatone-panoramic', brand: 'Magnatone', model: 'Panoramic Stereo', year: '1963 / reissue', type: 'tube stereo combo',
      watts: 22, tube: '6× 12AX7, 4× 6V6', speakers: '2×12\"',
      price: '£2,800',
      desc: 'True pitch-shifting vibrato (not tremolo) in stereo. The watery, three-dimensional Magnatone sound Lonnie Mack and Buddy Holly chased.',
      controls: [
        ctl('Volume', 0, 10, 4, 'Clean platform. This amp is about the vibrato, not the grind.'),
        ctl('Treble', 0, 10, 6, 'Chime.'),
        ctl('Bass', 0, 10, 4, 'Full but not flubby.'),
        ctl('Speed', 0, 10, 4, 'Vibrato rate. Slow is a pulse, medium is the Magnatone swim.'),
        ctl('Intensity', 0, 10, 5, 'True pitch vibrato depth. 5 is the signature.')
      ],
      tones: [
        tn('Stereo swim', { Volume: 4, Treble: 6, Bass: 4, Speed: 4, Intensity: 5 }, 'The Magnatone trick: true vibrato, stereo, clean.', 'Lonnie Mack', 'Surf & Americana')
      ],
      artists: ['Lonnie Mack', 'Buddy Holly era'], genre: ['surf', 'americana']
    }),
    amp({
      id: 'silvertone-1484', brand: 'Silvertone', model: '1484 Twin Twelve', year: '1963', type: 'tube piggyback (2×12)',
      watts: 23, tube: '4× 6EU7, 2× 6L6, 1× 6X5', speakers: '2×12\"',
      price: '£600 used',
      desc: 'The Danelectro-built Sears catalogue amp with the transformer-coupled tremolo. Jack White, Beck and a thousand garage bands.',
      controls: [
        ctl('Volume', 0, 10, 6, '6 is the garage grind. These were never clean amps.'),
        ctl('Treble', 0, 10, 5, 'Dark-ish. 5–7 to wake it up.'),
        ctl('Bass', 0, 10, 5, 'Loose and huge.'),
        ctl('Tremolo', 0, 10, 4, 'Transformer trem. 4 is a throb.')
      ],
      tones: [
        tn('Garage throb', { Volume: 6, Treble: 5, Bass: 5, Tremolo: 4 }, 'Volume 6, a little trem — the White Stripes-adjacent 1484.', 'Garage rock', 'Jack White-inspired')
      ],
      artists: ['Jack White', 'Beck'], genre: ['garage', 'indie']
    }),
    amp({
      id: 'line6-helix-floor', brand: 'Line 6', model: 'Helix Floor', year: '2015', type: 'modeler',
      watts: 0, tube: 'none (modelled)', speakers: 'FRFR / powered cab',
      price: '£1,200',
      desc: 'A floor modeler with dual-DSP amp/cab/fx. Direct to PA or into an FRFR cab — the modern no-amp gig rig.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Modelled preamp gain of the current amp block.'),
        ctl('Bass', 0, 10, 5, 'Cab/IR low.'),
        ctl('Mid', 0, 10, 5, 'Cab/IR mid.'),
        ctl('Treble', 0, 10, 5, 'Cab/IR high.'),
        ctl('Level', 0, 10, 6, 'Output to FRFR or interface.'),
        sw('Path', 0, ['amp + cab', 'amp only (to real cab)'], 'Cab block on for FRFR/PA; off if you are hitting a real speaker.')
      ],
      tones: [
        tn('FRFR gig', { Gain: 5, Bass: 5, Mid: 5, Treble: 5, Level: 6, Path: 0 }, 'Amp+cab into FRFR or PA. Headphones for silent practice.', 'Modern gigging', 'Cover / fly dates')
      ],
      artists: ['Modern gigging'], genre: ['all']
    }),
    amp({
      id: 'neural-quad-cortex', brand: 'Neural DSP', model: 'Quad Cortex', year: '2021', type: 'modeler',
      watts: 0, tube: 'none (captured)', speakers: 'FRFR / IEMs',
      price: '£1,500',
      desc: 'Amp-capture modeler: you can load a capture of a real amp in the room, or run Neural’s own models. Four cores, stereo, tiny.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Capture/model gain.'),
        ctl('Bass', 0, 10, 5, 'Low.'),
        ctl('Mid', 0, 10, 5, 'Mid.'),
        ctl('Treble', 0, 10, 5, 'High.'),
        ctl('Level', 0, 10, 6, 'Output.'),
        sw('Scene', 0, ['clean capture', 'crunch capture', 'lead capture'], 'QC scenes. Switch without glitch.')
      ],
      tones: [
        tn('Captured crunch', { Gain: 5, Bass: 5, Mid: 5, Treble: 5, Level: 6, Scene: 1 }, 'A captured crunch amp into IEMs — the fly-date rig.', 'Fly dates', 'Modern players')
      ],
      artists: ['Modern players'], genre: ['all']
    }),
    amp({
      id: 'fractal-fm9', brand: 'Fractal Audio', model: 'FM9', year: '2021', type: 'modeler',
      watts: 0, tube: 'none (Cygnus modelling)', speakers: 'FRFR / studio monitors',
      price: '£1,700',
      desc: 'Axe-Fx modelling in a floor unit: Cygnus amp models, ultra-res cabs, and the quietest noise floor in modelling. The studio-in-a-board.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Amp-block gain.'),
        ctl('Bass', 0, 10, 5, 'Tone stack bass.'),
        ctl('Mid', 0, 10, 5, 'Tone stack mid.'),
        ctl('Treble', 0, 10, 5, 'Tone stack treble.'),
        ctl('Level', 0, 10, 6, 'Output.'),
        sw('Cab', 0, ['IR on (FRFR)', 'IR off (power amp + cab)'], 'IRs on for direct; off if you are hitting a real cab.')
      ],
      tones: [
        tn('Direct studio', { Gain: 5, Bass: 5, Mid: 5, Treble: 5, Level: 6, Cab: 0 }, 'Cygnus amp + IR, straight into the interface.', 'Studio modelling', 'Session players')
      ],
      artists: ['Session & modern metal'], genre: ['metal', 'rock']
    })
  ];

  A.AMPS.push.apply(A.AMPS, MORE);
})();
