/* Trill Tuner — amplifier library, part 1: the tube classics.
 *
 * Every amp carries:
 *   controls  — the real front panel, in the real order, with real ranges,
 *               default positions and a note on what the knob actually does
 *   tones     — dialed-in settings (by knob name) for the sounds that made the
 *               amp famous, credited to the record/player that used them
 *   speakers  — the factory speaker/cab so the simulator can voice it
 *
 * Values are the positions players actually use, expressed on the amp's own
 * scale: 5 on a blackface Fender is 5/10, 5 on a Hiwatt is 5/10, "Edge of
 * breakup" for an AC30 is the amp turned up with the guitar volume backed off.
 */
(function () {
  'use strict';

  /* control(name, min, max, def, tip) */
  function ctl(name, min, max, def, tip) { return { name: name, min: min, max: max, def: def, tip: tip || '' }; }
  /* tone(name, settings, notes, song, artist) */
  function tn(name, settings, notes, song, artist) { return { name: name, settings: settings, notes: notes || '', song: song || '', artist: artist || '' }; }
  /* sw(name, def, options, tip) — a switch rather than a knob */
  function sw(name, def, options, tip) { return { name: name, min: 0, max: options.length - 1, def: def, options: options, tip: tip || '', isSwitch: true }; }

  function amp(o) {
    o.year = o.year || '';
    o.tube = o.tube || '';
    o.speakers = o.speakers || '';
    o.channels = o.channels || 1;
    o.controls = o.controls || [];
    o.tones = o.tones || [];
    o.artists = o.artists || [];
    o.genre = o.genre || [];
    return o;
  }

  const AMPS = [
    /* =================================================================== */
    /* Fender — the American clean                                          */
    /* =================================================================== */
    amp({
      id: 'bassman-59', brand: 'Fender', model: '’59 Bassman LTD', year: '1959', type: 'tube combo (4×10)',
      watts: 45, tube: '2× 12AX7, 2× 12AT7, 2× 6L6GC, 1× 5AR4', speakers: '4×10" Jensen P10R alnico',
      channels: 2, price: '£1,800',
      desc: 'The amp that became the Marshall blueprint: fat tweed mids, singing breakup and a hugely touch-sensitive clean. Jump the two channels for the classic thick tweed sound.',
      controls: [
        ctl('Presence', 0, 12, 6, 'Adds top-end bite and cut. Above 8 it starts to hiss — the tweed way is 5–7.'),
        ctl('Bright Volume', 1, 12, 5, 'Channel 1’s volume. Cranked it is the classic dirty tweed tone; above 7 it is a rock amp.'),
        ctl('Normal Volume', 1, 12, 6, 'Channel 2 — darker and fuller. Jumper the channels and blend for the real thing.'),
        ctl('Bass', 1, 12, 4, 'Tweed bass is loose and huge. Past 5 with a cranked amp the low end farts — keep it low.'),
        ctl('Mid', 1, 12, 7, 'The tweed heart. 6–8 is the fat, woody mids that sit perfectly in a band.'),
        ctl('Treble', 1, 12, 6, '1–12, no bright switch. 5–7 gives chime without ice-pick.'),
        sw('Channel jumper', 0, ['not jumpered', 'jumpered'], 'Plug into both inputs and bridge them — the classic 5F6-A trick.')
      ],
      tones: [
        tn('Tweed clean (jumped channels)', { Presence: 5, 'Bright Volume': 4, 'Normal Volume': 6, Bass: 3, Mid: 7, Treble: 5 },
          'Jumper the channels, keep both under 5, roll the guitar volume to 8. Big, woody clean that eats pedals.', 'Studio blues rhythm', 'Blues & country'),
        tn('Tweed grind', { Presence: 7, 'Bright Volume': 9, 'Normal Volume': 7, Bass: 2.5, Mid: 8, Treble: 6 },
          'Crank the bright channel, drop bass to 2–3 so the flub disappears, and control it all from the guitar.', 'Whole Lotta Love — Led Zeppelin', 'Led Zeppelin · Jimmy Page'),
        tn('Pedal platform', { Presence: 6, 'Bright Volume': 5, 'Normal Volume': 5, Bass: 4, Mid: 5, Treble: 6 },
          'Set it loud-clean and let a Tube Screamer do the dirt. Watch the bass knob — it feeds back fast when pushed.')
      ],
      artists: ['Jimi Hendrix (early)', 'Stevie Ray Vaughan (tweed period)', 'Josh Homme'],
      genre: ['blues', 'rock', 'country']
    }),

    amp({
      id: 'champ-57', brand: 'Fender', model: '’57 Custom Champ', year: '1957', type: 'tube combo (1×8)',
      watts: 5, tube: '1× 12AX7, 1× 6V6, 1× 5Y3', speakers: '1×8" alnico',
      price: '£900',
      desc: 'Five watts, one knob, one 8" speaker. The Champ is the sound of every 1960s session — it breaks up at bedroom volume and records brilliantly.',
      controls: [
        ctl('Volume', 1, 12, 6, 'From clean to full saturation: 3 is clean, 6 starts to break, 9+ is pure tweed snarl.'),
        ctl('Treble', 0, 10, 5, 'Tone control — cut only from the top end. 5 is neutral, below 3 is a fat jazz tone.')
      ],
      tones: [
        tn('Studio clean', { Volume: 3, Treble: 6 }, 'Microphone it at 10 cm and it sounds enormous. Add reverb in the mix, not the amp.', 'Layla sessions — Derek and the Dominos', 'Eric Clapton'),
        tn('Classic Champ crunch', { Volume: 8, Treble: 5 }, 'Turn the guitar down to clean up; dig in for grit. The most touch-sensitive 5 watts on earth.', 'Every early Rolling Stones record', 'Keith Richards'),
        tn('Fuzz favourite', { Volume: 5, Treble: 6 }, 'Set clean-ish and hit it with a germanium Fuzz Face — this is the Hendrix “rainy day” rig.', 'Are You Experienced — Jimi Hendrix', 'Jimi Hendrix')
      ],
      artists: ['Eric Clapton', 'Keith Richards', 'Jimmy Page (Led Zep I)'],
      genre: ['blues', 'rock', 'studio']
    }),

    amp({
      id: 'deluxe-reverb-65', brand: 'Fender', model: '’65 Deluxe Reverb', year: '1965', type: 'tube combo (1×12)',
      watts: 22, tube: '4× 12AX7, 2× 12AT7, 2× 6V6, 1× 5AR4', speakers: '1×12" Jensen C12K',
      channels: 2, price: '£1,500',
      desc: 'The most recorded amp in history. 22 watts that stay clean to 4 and then bloom into the best blues crunch there is. Reverb and tremolo built in.',
      controls: [
        ctl('Volume (Vibrato ch.)', 1, 10, 4, '3.5–4.5 is the sweet clean; 6+ is the blues jangle you know from a thousand records.'),
        ctl('Treble', 1, 10, 6, 'Blackface treble is strong: 6 is bright, 8 is spiky, 4 is warm jazz.'),
        ctl('Bass', 1, 10, 4, 'Above 5 at high volume the 6V6s mush out. The classic setting is 3–4.'),
        ctl('Reverb', 1, 10, 3, '2–4 is “in the room”. Above 5 it swallows the attack.'),
        ctl('Speed', 1, 10, 3, 'Tremolo speed — 2–3 for slow ballads, 6+ for swampy groove.'),
        ctl('Intensity', 1, 10, 4, 'Tremolo depth. 3–5 is classic; 8+ is full swamp.'),
        sw('Bright switch', 1, ['off', 'on'], 'The Vibrato channel’s bright cap — on for twang, off for pedals and dark humbuckers.')
      ],
      tones: [
        tn('Blackface clean', { 'Volume (Vibrato ch.)': 4, Treble: 6, Bass: 4, Reverb: 3, Speed: 3, Intensity: 0 },
          'The sound of thousands of sessions. Guitar volume at 8 for the brightest clean, 10 to push it.', 'Anything recorded in Nashville', 'Session players'),
        tn('Edge-of-breakup blues', { 'Volume (Vibrato ch.)': 6.5, Treble: 6, Bass: 4, Reverb: 4, Speed: 4, Intensity: 3 },
          'Use the guitar volume as your gain knob — strum softly for clean, dig in for grit.', 'Pride and Joy — Stevie Ray Vaughan (with a TS)', 'SRV'),
        tn('Tremolo swamp', { 'Volume (Vibrato ch.)': 5, Treble: 5, Bass: 5, Reverb: 5, Speed: 3.5, Intensity: 7 },
          'Slow deep tremolo with reverb — the swamp-rock staple.', 'Green Onions — Booker T. & the M.G.’s', 'Steve Cropper')
      ],
      artists: ['Steve Cropper', 'Mike Bloomfield', 'John Mayer'],
      genre: ['blues', 'country', 'rock & roll', 'indie']
    }),

    amp({
      id: 'twin-reverb-65', brand: 'Fender', model: '’65 Twin Reverb', year: '1965', type: 'tube combo (2×12)',
      watts: 85, tube: '4× 12AX7, 2× 12AT7, 4× 6L6GC, 1× 5AR4', speakers: '2×12" Jensen C12K',
      channels: 2, price: '£1,700',
      desc: '85 watts of headroom with a built-in reverb that is a legend in its own right. The loudest clean in the building — a pedal platform and a pedal-steel favourite.',
      controls: [
        ctl('Volume (Vibrato ch.)', 1, 10, 3.5, 'The Twin stays clean nearly everywhere. Below 3 it is quiet; past 6 it is painfully loud.'),
        ctl('Treble', 1, 10, 5, 'Set 5 for neutral; the Twin can be brutally bright above 7.'),
        ctl('Middle', 1, 10, 6, 'Scoop to 3–4 for surf, push to 7–8 for blues and steel.'),
        ctl('Bass', 1, 10, 4, 'Huge low end available — keep it under 5 or the mix gets muddy.'),
        ctl('Reverb', 1, 10, 3.5, 'The best spring reverb ever put in a combo. 3–4 is a lot already.'),
        ctl('Speed', 1, 10, 4, 'Tremolo speed.'),
        ctl('Intensity', 1, 10, 3, 'Tremolo depth — the Twin’s trem is deep and slow by nature.'),
        sw('Bright switch', 1, ['off', 'on'], 'On for surf and country; off when you stack drives.')
      ],
      tones: [
        tn('Surf clean', { 'Volume (Vibrato ch.)': 3.5, Treble: 6, Middle: 3.5, Bass: 4.5, Reverb: 5.5, Speed: 4, Intensity: 4, 'Bright switch': 1 },
          'Scooped mids, splashy reverb, heavy tremolo. The whole 1963 surf vocabulary.', 'Pipeline — The Chantays', 'Dick Dale · The Ventures'),
        tn('Blues loud-clean', { 'Volume (Vibrato ch.)': 5, Treble: 5, Middle: 7, Bass: 3.5, Reverb: 3, Speed: 3, Intensity: 0 },
          'Push mids, trim bass; hit it with a Klon or a TS for the blues leads.', 'BB King live rig', 'B.B. King'),
        tn('Pedal platform', { 'Volume (Vibrato ch.)': 4, Treble: 5, Middle: 5, Bass: 4, Reverb: 2.5, Speed: 3, Intensity: 0 },
          'Set neutral and loud-clean and let your board do everything.', 'Modern session work', 'Nashville session players')
      ],
      artists: ['B.B. King', 'Dick Dale', 'Buddy Guy'],
      genre: ['country', 'blues', 'surf', 'jazz']
    }),

    amp({
      id: 'princeton-reverb-65', brand: 'Fender', model: '’65 Princeton Reverb', year: '1965', type: 'tube combo (1×10)',
      watts: 15, tube: '3× 12AX7, 2× 12AT7, 2× 6V6, 1× 5AR4', speakers: '1×10" Jensen C10Q',
      price: '£1,000',
      desc: 'The bedroom-and-studio Fender: 15 watts, real reverb and tremolo, and it breaks up beautifully at a volume that will not get you evicted.',
      controls: [
        ctl('Volume', 1, 10, 4, '4 is clean with the guitar at 8; 6.5 is a thick, singing breakup.'),
        ctl('Treble', 1, 10, 6, 'Bright like all blackfaces. 5–6 with single coils is the classic.'),
        ctl('Bass', 1, 10, 4.5, 'Keep it at 4–5 — the 10" speaker flubs if you push it.'),
        ctl('Reverb', 1, 10, 3, 'The Princeton reverb is short and warm — 3–4 sits behind the notes.'),
        ctl('Speed', 1, 10, 4, 'Tremolo speed; 3–4 for slow ballads.'),
        ctl('Intensity', 1, 10, 5, 'Deep tremolo is part of the Princeton charm.')
      ],
      tones: [
        tn('Studio clean', { Volume: 4, Treble: 6, Bass: 4.5, Reverb: 3, Speed: 4, Intensity: 2 }, 'The ideal recording clean — mic it and it sounds like a record.', 'Session clean tones', 'Session players'),
        tn('Indie crunch', { Volume: 7, Treble: 6, Bass: 4, Reverb: 4, Speed: 4, Intensity: 3 }, 'Turn it to 7 and use the guitar volume to go from clean to roar.', 'Cure / indie jangle', 'Indie & alternative')
      ],
      artists: ['Nels Cline', 'Wilco', 'Bedroom studios everywhere'],
      genre: ['indie', 'blues', 'country']
    }),

    amp({
      id: 'blues-junior-iv', brand: 'Fender', model: 'Blues Junior IV', year: '2018', type: 'tube combo (1×12)',
      watts: 15, tube: '3× 12AX7, 2× EL84', speakers: '1×12" Celestion A-type',
      channels: 2, price: '£650',
      desc: 'The modern workhorse: 15 EL84 watts, a master volume so you can get dirt at home, and reverb. The amp you buy when you have one amp to buy.',
      controls: [
        ctl('Volume', 1, 12, 5, 'The “preamp” — dial in the crunch here.'),
        ctl('Master', 1, 12, 5, 'Now you can get the cranked tone at any level. 3 for home, 8 for a gig.'),
        ctl('Treble', 1, 12, 6, 'Bright and lively; 6 is home base.'),
        ctl('Bass', 1, 12, 4, 'Keep it low with the master up — small cabinet, big low end.'),
        ctl('Middle', 1, 12, 6, 'Push to 7 for mid-forward leads.'),
        ctl('Reverb', 1, 12, 3, 'Spring reverb, short and vintage.'),
        sw('Fat switch', 0, ['off', 'on'], 'Adds gain and low mids — the “fat” clean boost.')
      ],
      tones: [
        tn('Jazzy clean', { Volume: 4, Master: 4, Treble: 4, Bass: 4, Middle: 5, Reverb: 4, 'Fat switch': 0 }, 'Neck pickup, tone down, mids up. Warm and round.', 'Small-club jazz', 'Working players'),
        tn('Rock crunch', { Volume: 8, Master: 4, Treble: 6, Bass: 4, Middle: 7, Reverb: 2, 'Fat switch': 1 }, 'Preamp at 8 for the AC/DC-ish crunch, master to taste.', 'Rock rhythm', 'AC/DC-style'),
        tn('Pedal platform', { Volume: 3, Master: 6, Treble: 6, Bass: 4, Middle: 6, Reverb: 3, 'Fat switch': 0 }, 'Clean and loud enough to gig with a full pedalboard.')
      ],
      artists: ['Every working guitarist'],
      genre: ['rock', 'blues', 'indie']
    }),

    amp({
      id: 'hot-rod-deville', brand: 'Fender', model: 'Hot Rod DeVille 212 IV', year: '2018', type: 'tube combo (2×12)',
      watts: 60, tube: '3× 12AX7, 2× 6L6', speakers: '2×12" Celestion A-type', channels: 3, price: '£1,000',
      desc: 'Loud, clean and pedal-friendly, with a lead channel that has fuelled two decades of punk, indie and worship stages.',
      controls: [
        ctl('Drive', 1, 12, 4, 'Channel 2 gain — 4 is a mild crunch, 7+ is saturated.'),
        ctl('Volume', 1, 12, 5, 'Channel volume (also the clean channel level).'),
        ctl('Treble', 1, 12, 6, 'Careful: the DeVille is bright. 5–6 is plenty.'),
        ctl('Bass', 1, 12, 4, 'Keep it low; this amp is famous for boominess with the bass above 5.'),
        ctl('Middle', 1, 12, 6, 'Mids make the DeVille sound good — do not scoop them.'),
        ctl('Reverb', 1, 12, 4, 'Long spring reverb.')
      ],
      tones: [
        tn('Worship clean', { Drive: 3, Volume: 5, Treble: 6, Bass: 4, Middle: 6, Reverb: 6 }, 'Wet, mid-forward, with a compressor and a delay in front.', 'Modern worship', 'Worship players'),
        tn('Punk crunch', { Drive: 7, Volume: 6, Treble: 7, Bass: 3, Middle: 7, Reverb: 1, }, 'Drive channel, treble up, bass down — cuts through a loud band.')
      ],
      artists: ['Modern worship & punk stages'],
      genre: ['punk', 'worship', 'rock']
    }),

    /* =================================================================== */
    /* Marshall — the British crunch                                        */
    /* =================================================================== */
    amp({
      id: 'jtm45', brand: 'Marshall', model: 'JTM45 2245', year: '1962', type: 'tube head/combo (2×12)',
      watts: 30, tube: '3× 12AX7, 2× KT66 (or 6L6)', speakers: '2×12" Celestion G12H (combo)',
      price: '£2,000',
      desc: 'The first Marshall: a tweed Bassman clone with British tubes. Thick, syrupy, softer around the edges than a Plexi — blues-rock heaven.',
      controls: [
        ctl('Presence', 0, 10, 6, 'Top-end bite; 5–7 is the sweet spot.'),
        ctl('Bass', 0, 10, 5, 'Big and loose; past 7 at volume it flubs.'),
        ctl('Middle', 0, 10, 8, 'Marshall mids — this is where the “woody” tone lives. Keep it high.'),
        ctl('Treble', 0, 10, 6, 'Bright, glassy top. 6 is classic.'),
        ctl('High Treble Volume', 0, 10, 6, 'Channel 1 volume — the crunch control.'),
        ctl('Normal Volume', 0, 10, 4, 'Channel 2 — darker; blend with channel 1 in the jumped setup.')
      ],
      tones: [
        tn('Blues breaker', { Presence: 6, Bass: 5, Middle: 8, Treble: 6, 'High Treble Volume': 7, 'Normal Volume': 5 },
          'Jump the channels, roll the guitar back to 7 for the famous “Beano” tone.', 'Blues Breakers with Eric Clapton', 'Eric Clapton'),
        tn('Thick clean', { Presence: 5, Bass: 5, Middle: 7, Treble: 5, 'High Treble Volume': 4, 'Normal Volume': 4 }, 'Both channels under 5 — fat and warm, great with pedals.'),
        tn('Kossoff crunch', { Presence: 7, Bass: 4, Middle: 8, Treble: 7, 'High Treble Volume': 9, 'Normal Volume': 6 }, 'Cranked and loud: the roar of Free’s “All Right Now”.', 'All Right Now — Free', 'Paul Kossoff')
      ],
      artists: ['Eric Clapton', 'Paul Kossoff', 'Angus Young (early)'],
      genre: ['blues', 'rock & roll', 'classic rock']
    }),

    amp({
      id: 'plexi-1959', brand: 'Marshall', model: '1959SLP Super Lead Plexi', year: '1969', type: 'tube head',
      watts: 100, tube: '3× 12AX7, 4× EL34', speakers: '4×12" Celestion G12H-30 (basketweave)',
      price: '£2,300',
      desc: 'No master volume, no channel switching, four inputs and 100 watts. The Plexi is the sound of classic rock — and it is loud enough to take the paint off the walls.',
      controls: [
        ctl('Presence', 0, 10, 5, 'Adds upper-mid bite; go to 7 for the crisp high-gain Plexi sizzle.'),
        ctl('Bass', 0, 10, 4, 'Keep it 3–5. Plexis get flabby if you push bass.'),
        ctl('Middle', 0, 10, 7, 'The rock heart. 6–8.'),
        ctl('Treble', 0, 10, 7, 'Bright and aggressive; 7 is the classic dimed setting.'),
        ctl('High Treble Volume', 0, 10, 8, 'Sustain and gain. To get ACDC you want 5–6, for Zeppelin 8–10.'),
        ctl('Normal Volume', 0, 10, 5, 'Blend in for a fuller, less bright voice (jumper the inputs).')
      ],
      tones: [
        tn('AC/DC crunch', { Presence: 6, Bass: 4, Middle: 7, Treble: 7, 'High Treble Volume': 6, 'Normal Volume': 5 },
          'Guitar volume at 7, treble on the amp at 7. That is “Back in Black” in a sentence.', 'Back in Black — AC/DC', 'Angus & Malcolm Young'),
        tn('Zeppelin roar', { Presence: 7, Bass: 4.5, Middle: 8, Treble: 7, 'High Treble Volume': 9, 'Normal Volume': 6 },
          'Cranked plexi with a Tele or Les Paul — the whole first four Led Zeppelin albums.', 'Whole Lotta Love — Led Zeppelin', 'Jimmy Page'),
        tn('Kossoff / Free', { Presence: 5, Bass: 5, Middle: 7, Treble: 6, 'High Treble Volume': 7, 'Normal Volume': 4 }, 'Warm, mid-forward and dynamic — the Free live sound.'),
        tn('Cocked-wah metal', { Presence: 8, Bass: 3, Middle: 6, Treble: 8, 'High Treble Volume': 10, 'Normal Volume': 7 }, 'Dime it and put a wah half-cocked in front — early metal.', 'Black Sabbath — Paranoid', 'Tony Iommi')
      ],
      artists: ['Jimi Hendrix', 'Jimmy Page', 'Angus Young', 'Tony Iommi (modded)'],
      genre: ['classic rock', 'hard rock', 'metal']
    }),

    amp({
      id: 'jcm800-2203', brand: 'Marshall', model: 'JCM800 2203', year: '1981', type: 'tube head',
      watts: 100, tube: '3× 12AX7, 4× EL34', speakers: '4×12" Celestion G12T-75 (1960A)',
      price: '£2,200',
      desc: 'Preamp gain plus a master volume — the amp that invented 80s metal. Bright, cutting, unforgiving and perfectly suited to a Tube Screamer in front.',
      controls: [
        ctl('Presence', 0, 10, 6, 'The JCM800’s signature upper-mid attack lives at 6–8.'),
        ctl('Bass', 0, 10, 5, 'Keep it around 5 — the low end gets loose as the preamp gain comes up.'),
        ctl('Middle', 0, 10, 6, 'Scoop it to 3 for thrash, push it to 8 for classic rock.'),
        ctl('Treble', 0, 10, 7, 'Bright. Back it to 5 if you use an overdrive.'),
        ctl('Preamp (Gain)', 0, 10, 7, '7 is the 80s rock crunch; 10 with a TS in front is thrash territory.'),
        ctl('Master', 0, 10, 4, 'Where the punch comes from. Live: 4–6. At home: 2 with an attenuator.')
      ],
      tones: [
        tn('Classic 80s rock', { Presence: 6, Bass: 5, Middle: 6, Treble: 7, 'Preamp (Gain)': 7, Master: 5 },
          'Guitar straight in, gain at 7. Crunchy, dynamic and loud.', 'Appetite for Destruction era', 'Slash'),
        tn('Thrash (TS boost)', { Presence: 7, Bass: 4, Middle: 3, Treble: 6, 'Preamp (Gain)': 9, Master: 5 },
          'Tube Screamer with drive at 0, level at 10 in front — mid-scooped, tight and fast.', 'Master of Puppets — Metallica', 'Metallica'),
        tn('Hard-rock pedal platform', { Presence: 6, Bass: 4, Middle: 5, Treble: 4.5, 'Preamp (Gain)': 4, Master: 6 }, 'Gain at 4, pedal board up front. A Rig favourite for gigging.')
      ],
      artists: ['Slash', 'Zakk Wylde', 'Kirk Hammett', 'Tom Morello (early)'],
      genre: ['hard rock', 'metal', 'punk']
    }),

    amp({
      id: 'jcm900-4100', brand: 'Marshall', model: 'JCM900 4100 Dual Reverb', year: '1990', type: 'tube head',
      watts: 100, tube: '4× 12AX7, 4× 5881/6L6', speakers: '4×12" Celestion G12T-75', channels: 2, price: '£1,500',
      desc: 'The 90s Marshall: two channels, diode clipping in the preamp and more gain on tap than the 800. Bright, compressed and instantly recognisable.',
      controls: [
        ctl('Gain (Ch A)', 0, 10, 5, 'Channel A — crunch to rock rhythm.'),
        ctl('Gain (Ch B)', 0, 10, 8, 'Channel B — saturated lead gain.'),
        ctl('Bass', 0, 10, 5, 'Watch the flub with the gain up; 4–5 is safe.'),
        ctl('Mid', 0, 10, 6, 'Scoop to 4 for 90s rock, push to 7 for classic.'),
        ctl('Treble', 0, 10, 6.5, 'The JCM900 is bright — 6 is already a lot.'),
        ctl('Presence', 0, 10, 6, 'Upper-mid cut.'),
        ctl('Reverb', 0, 10, 3, 'Onboard spring reverb, short and snappy.')
      ],
      tones: [
        tn('90s rock rhythm', { 'Gain (Ch A)': 6, 'Gain (Ch B)': 7, Bass: 5, Mid: 5, Treble: 6.5, Presence: 6, Reverb: 2 }, 'Channel A gain 6, mids at 5 — the sound of 90s hard rock radio.'),
        tn('Lead solo', { 'Gain (Ch B)': 9, Bass: 5, Mid: 4, Treble: 7, Presence: 6, Reverb: 3 }, 'Channel B, gain high, solo up the neck with a wah.', 'Festival lead tones', '90s hard rock')
      ],
      artists: ['90s hard rock & punk bands'],
      genre: ['hard rock', 'punk', 'metal']
    }),

    amp({
      id: 'dsl40cr', brand: 'Marshall', model: 'DSL40CR', year: '2018', type: 'tube combo (1×12)',
      watts: 40, tube: '4× 12AX7, 2× EL34', speakers: '1×12" Celestion V-Type', channels: 2, price: '£800',
      desc: 'The modern Marshall workhorse: two channels, four modes, a master volume and a 40/20 watt switch — every classic Marshall tone at sane volumes.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Push it over 7 for leads — this channel is the JCM800-ish mode.'),
        ctl('Volume', 0, 10, 5, 'Channel volume; balance against the clean channel.'),
        ctl('Bass', 0, 10, 5, 'Keep it around 5 — the DSL gets boomy fast.'),
        ctl('Middle', 0, 10, 6, '6 for classic rock, 3–4 for modern metal.'),
        ctl('Treble', 0, 10, 6, 'Bright; 5.5–6.5 covers everything.'),
        ctl('Reverb', 0, 10, 3, 'Digital reverb, subtle.'),
        sw('Mode', 0, ['Classic Clean', 'Crunch', 'OD1', 'OD2'], 'Four modes: clean, JTM-ish crunch, JCM-ish OD1 and the hotter OD2.'),
        sw('Power', 0, ['40 W', '20 W'], 'Half power for home playing and earlier breakup.')
      ],
      tones: [
        tn('Crunch (mode: Crunch)', { Gain: 5, Volume: 5, Bass: 5, Middle: 6, Treble: 6, Reverb: 2, Mode: 1, Power: 0 },
          'Crunch mode with the guitar volume at 8 — vintage Marshall without the volume.', 'Classic rock', 'Marshall'),
        tn('Modern lead', { Gain: 8, Volume: 4.5, Bass: 5, Middle: 4, Treble: 6.5, Reverb: 3, Mode: 3, Power: 1 }, 'OD2, gain high, 20 W mode for touch-sensitive saturation.'),
        tn('Clean platform', { Gain: 3, Volume: 6, Bass: 5, Middle: 6, Treble: 6, Reverb: 4, Mode: 0, Power: 1 }, 'Classic Clean mode — a great pedal platform.')
      ],
      artists: ['Modern rock & metal players'],
      genre: ['rock', 'metal', 'punk']
    }),

    amp({
      id: 'jvm410', brand: 'Marshall', model: 'JVM410H', year: '2008', type: 'tube head',
      watts: 100, tube: '5× 12AX7, 4× EL34', speakers: '4×12" Celestion V30', channels: 4, price: '£1,700',
      desc: 'Four channels, twelve modes and 100 watts of Marshall gain — the Swiss Army amp for cover bands and metal bands alike.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Per-channel gain; 4–5 is crunch, 8–10 is modern metal.'),
        ctl('Volume', 0, 10, 5, 'Channel level.'),
        ctl('Bass', 0, 10, 5, 'Scoop carefully on the high-gain channels.'),
        ctl('Middle', 0, 10, 6, 'Mids to taste — 3 for scooped metal, 7 for classic.'),
        ctl('Treble', 0, 10, 6, 'Bright and detailed.'),
        ctl('Presence', 0, 10, 6, 'Final high-end bite.'),
        ctl('Reverb', 0, 10, 3, 'Digital, per-channel.')
      ],
      tones: [
        tn('Marshall high gain', { Gain: 8, Volume: 4, Bass: 5, Middle: 4, Treble: 6.5, Presence: 6, Reverb: 2 }, 'OD2 channel for saturated modern rock leads.'),
        tn('Vintage crunch', { Gain: 5, Volume: 5, Bass: 5, Middle: 7, Treble: 6, Presence: 5, Reverb: 2 }, 'Crunch channel at 5 — plexi-ish without the volume.')
      ],
      artists: ['Cover bands', 'Modern rock'],
      genre: ['rock', 'metal']
    }),

    amp({
      id: 'silver-jubilee-2555', brand: 'Marshall', model: 'Silver Jubilee 2555X', year: '1987', type: 'tube head',
      watts: 100, tube: '3× 12AX7, 4× EL34', speakers: '4×12" Celestion V30', channels: 2, price: '£1,900',
      desc: 'The amp Slash used on Appetite for Destruction and Use Your Illusion. Softer attack and more upper-mid bite than a JCM800, with a diode-clipped lead channel.',
      controls: [
        ctl('Gain', 0, 10, 7, 'Slash’s rhythm lives at 7–8 with the guitar volume rolled back.'),
        ctl('Lead Master', 0, 10, 6, 'Master for the lead channel — the key to the Jubilee’s tone.'),
        ctl('Bass', 0, 10, 6, 'Fatter than an 800; 5–6 is the Slash setting.'),
        ctl('Middle', 0, 10, 7, 'Upper-mid forward — this is your cut-the-mix frequency.'),
        ctl('Treble', 0, 10, 6, 'Smooth top — 5.5–6.'),
        ctl('Presence', 0, 10, 6, 'Adds the aggressive bite on leads.'),
        sw('Input / Output', 0, ['high', 'low'], 'Low input for cleaner pedal platform tones.')
      ],
      tones: [
        tn('Slash rhythm', { Gain: 7.5, 'Lead Master': 5, Bass: 6, Middle: 7, Treble: 6, Presence: 6 }, 'Les Paul, neck pickup dirty, guitar volume 7 — Sweet Child O’ Mine.', 'Sweet Child O’ Mine — Guns N’ Roses', 'Slash'),
        tn('Slash lead', { Gain: 8, 'Lead Master': 7, Bass: 5.5, Middle: 7, Treble: 6.5, Presence: 7 }, 'Push the lead master, add a wah and a touch of delay.', 'November Rain solo — Guns N’ Roses', 'Slash')
      ],
      artists: ['Slash', 'Joe Bonamassa (occasionally)'],
      genre: ['hard rock', 'metal']
    }),

    /* =================================================================== */
    /* Vox — the British chime                                              */
    /* =================================================================== */
    amp({
      id: 'ac30', brand: 'Vox', model: 'AC30 Custom (Top Boost)', year: '1961', type: 'tube combo (2×12)',
      watts: 30, tube: '3× 12AX7, 1× EF86, 4× EL84, 1× GZ34', speakers: '2×12" Celestion Blue alnico',
      price: '£1,900',
      desc: 'The voice of the British Invasion: four EL84s, alnico speakers and a chime that cuts through anything. Equally at home clean and screaming.',
      controls: [
        ctl('Normal Volume', 0, 10, 5, 'The darker channel — big and warm, great for humbuckers.'),
        ctl('Brilliant Volume', 0, 10, 6, 'The Top Boost channel: bright, chiming, the Beatle sound.'),
        ctl('Bass', 0, 10, 4, 'Top Boost bass; 3–4 keeps the AC30 from getting woofy.'),
        ctl('Treble', 0, 10, 7, 'Top Boost treble — 6–8 is the jangle zone.'),
        ctl('Cut', 0, 10, 5, 'Cuts high frequencies. It works backwards: 0 = brightest, 10 = warmest.'),
        ctl('Reverb', 0, 10, 3, 'Only on reverb models — spring, short.')
      ],
      tones: [
        tn('Beatles chime', { 'Normal Volume': 3, 'Brilliant Volume': 6, Bass: 4, Treble: 7, Cut: 3, Reverb: 2 },
          'Brilliant channel up, cut low, guitar on the bridge — instant “A Hard Day’s Night”.', 'A Hard Day’s Night — The Beatles', 'The Beatles'),
        tn('Queen jam', { 'Normal Volume': 5, 'Brilliant Volume': 8, Bass: 3, Treble: 6, Cut: 6, Reverb: 0 },
          'Both channels up, treble rolled back, and the guitar volume controlled — the Brian May recipe.', 'Bohemian Rhapsody — Queen', 'Brian May'),
        tn('U2 / Edge shimmer', { 'Normal Volume': 4, 'Brilliant Volume': 6, Bass: 4, Treble: 7, Cut: 4, Reverb: 3 },
          'Chime plus a dotted-eighth delay in front. That is the whole rig.', 'Where the Streets Have No Name — U2', 'The Edge'),
        tn('Rory Gallagher blues', { 'Normal Volume': 7, 'Brilliant Volume': 8, Bass: 5, Treble: 6, Cut: 6, Reverb: 2 },
          'Both channels cranked and the guitar rolled back for a thick, singing blues tone.', 'Bullfrog Blues — Rory Gallagher', 'Rory Gallagher')
      ],
      artists: ['The Beatles', 'Brian May', 'Rory Gallagher', 'The Edge'],
      genre: ['rock & roll', 'indie', 'classic rock', 'jangle pop']
    }),

    amp({
      id: 'ac15', brand: 'Vox', model: 'AC15C1', year: '2010', type: 'tube combo (1×12)',
      watts: 15, tube: '2× 12AX7, 1× EF86, 2× EL84', speakers: '1×12" Celestion Greenback', channels: 2, price: '£700',
      desc: 'The home-volume AC30: 15 watts of EL84 chime and early breakup, with tremolo and reverb. The jangle king at a volume you can actually use.',
      controls: [
        ctl('Normal Volume', 0, 10, 5, 'Warm, clear channel.'),
        ctl('Top Boost Volume', 0, 10, 6, 'The jangle channel — past 6 it breaks up beautifully.'),
        ctl('Bass', 0, 10, 4, 'Keep low on the Top Boost channel.'),
        ctl('Treble', 0, 10, 7, 'Bright and jangly; 6–8 is the sweet spot.'),
        ctl('Cut', 0, 10, 5, 'Again, backwards: low = bright, high = warm.'),
        ctl('Reverb', 0, 10, 3, 'Spring.'),
        ctl('Tremolo Speed', 0, 10, 4, 'Tremolo rate.'),
        ctl('Tremolo Depth', 0, 10, 4, 'Tremolo depth — 4–5 for vintage wobble.')
      ],
      tones: [
        tn('Jangle clean', { 'Normal Volume': 3, 'Top Boost Volume': 5, Bass: 4, Treble: 7, Cut: 4, Reverb: 3, 'Tremolo Speed': 3, 'Tremolo Depth': 0 }, 'Rickenbacker or a Tele, bridge pickup, slight reverb. Instant 1965.', 'The Byrds', 'Roger McGuinn'),
        tn('Edge of breakup', { 'Normal Volume': 4, 'Top Boost Volume': 7, Bass: 3.5, Treble: 6, Cut: 5, Reverb: 2, 'Tremolo Speed': 4, 'Tremolo Depth': 3 }, 'Turn it up and use the guitar volume — from clean to crunch with a twist of the wrist.')
      ],
      artists: ['The Byrds', 'Indie bands everywhere'],
      genre: ['indie', 'rock & roll', 'jangle pop']
    }),

    /* =================================================================== */
    /* Hiwatt / Orange — the loud and the dirty                             */
    /* =================================================================== */
    amp({
      id: 'hiwatt-dr103', brand: 'Hiwatt', model: 'DR103 Custom 100', year: '1971', type: 'tube head',
      watts: 100, tube: '4× 12AX7, 4× EL34', speakers: '4×12" Fane/Hiwatt',
      channels: 2, price: '£2,600',
      desc: 'The cleanest 100 watts ever made — a hi-fi, enormous-sounding amp with military-grade wiring. Cranked, it is the sound of British rock royalty.',
      controls: [
        ctl('Normal Volume', 0, 10, 5, 'Channel 1: full, round, incredibly hi-fi.'),
        ctl('Brilliant Volume', 0, 10, 6, 'Channel 2: brilliant, chiming, enormous. Bridge both for the classic setup.'),
        ctl('Bass', 0, 10, 5, 'Deep and tight — 4–6 with the master up is huge.'),
        ctl('Treble', 0, 10, 6, 'Clean and detailed, never harsh.'),
        ctl('Middle', 0, 10, 6, 'Mids are the Hiwatt’s body. Keep them at 5–7.'),
        ctl('Presence', 0, 10, 6, 'Final top-end cut.'),
        ctl('Master', 0, 10, 6, 'Master volume — a rarity in 1971. Use it.')
      ],
      tones: [
        tn('Pete Townshend live', { 'Normal Volume': 6, 'Brilliant Volume': 7, Bass: 6, Treble: 6, Middle: 6, Presence: 6, Master: 7 }, 'Bridge the channels, all volumes high, master to taste. The loudest clean in rock.', 'Live at Leeds — The Who', 'Pete Townshend'),
        tn('Gilmour clean', { 'Normal Volume': 5, 'Brilliant Volume': 5, Bass: 5, Treble: 6, Middle: 6, Presence: 5, Master: 6 }, 'Huge, clean, and the perfect bed for a Big Muff and a long delay.', 'Comfortably Numb — Pink Floyd', 'David Gilmour'),
        tn('Master-volume crunch', { 'Normal Volume': 5, 'Brilliant Volume': 6, Bass: 5, Treble: 6, Middle: 7, Presence: 6, Master: 8 }, 'Turn the master up for a tight, punchy British crunch.')
      ],
      artists: ['Pete Townshend', 'David Gilmour', 'Jimmy Page (live)'],
      genre: ['classic rock', 'rock']
    }),

    amp({
      id: 'orange-rockerverb', brand: 'Orange', model: 'Rockerverb 50 MKIII', year: '2017', type: 'tube head/combo',
      watts: 50, tube: '4× 12AX7, 2× 12AT7, 4× EL34', speakers: '2×12" V30 (combo)',
      channels: 2, price: '£1,700',
      desc: 'Thick, dark and British-loud: a clean channel with real headroom and a dirt channel that is pure stoner-rock saturation with a famous (and usable) reverb.',
      controls: [
        ctl('Volume', 0, 10, 5, 'Clean channel volume — it stays clean until 6, then gets punchy.'),
        ctl('Gain', 0, 10, 7, 'Dirty channel gain; 5 is crunch, 8+ is fuzz-adjacent saturation.'),
        ctl('Bass', 0, 10, 6, 'The Rockerverb is thick — 5–6, and mind the low end in a band.'),
        ctl('Middle', 0, 10, 5, 'Dark and mid-heavy; back it to 4 for scooped doom.'),
        ctl('Treble', 0, 10, 6, 'Smooth top — the Orange never gets harsh.'),
        ctl('Reverb', 0, 10, 4, 'The best reverb ever fitted to a British amp: long and gorgeous.'),
        sw('Attenuator', 0, ['50 W', '25 W', '15 W'], 'Internal power scaling for home use without losing tone.')
      ],
      tones: [
        tn('Stoner fuzz', { Volume: 6, Gain: 9, Bass: 7, Middle: 4, Treble: 5, Reverb: 4 }, 'Dirty channel dimed into a Big Muff — the desert-rock wall of sound.', 'Songs for the Deaf — Queens of the Stone Age', 'Josh Homme'),
        tn('British crunch', { Volume: 5, Gain: 6.5, Bass: 5, Middle: 6, Treble: 6, Reverb: 3 }, 'Classic-rock roar with the clarity to cut through.', 'Modern rock', 'Orange players'),
        tn('Clean + reverb', { Volume: 4.5, Gain: 3, Bass: 5, Middle: 6, Treble: 6, Reverb: 6 }, 'Clean channel, reverb up, pedalboard in front. Gorgeous ambient platform.')
      ],
      artists: ['Josh Homme', 'Jim Root', 'Bring Me The Horizon'],
      genre: ['stoner', 'rock', 'metal']
    }),

    amp({
      id: 'tiny-terror', brand: 'Orange', model: 'Tiny Terror', year: '2006', type: 'tube head',
      watts: 15, tube: '2× 12AX7, 2× EL34', speakers: '1×12" or 2×12" cab', price: '£450',
      desc: 'Fifteen EL34 watts in a lunchbox. One volume, one tone, one gain — and the gain is glorious.',
      controls: [
        ctl('Volume', 0, 10, 6, 'The power amp. At 6 it starts to bloom; at 9 it roars.'),
        ctl('Tone', 0, 10, 6, 'Simple top-end control — 5–7 is home.'),
        ctl('Gain', 0, 10, 7, 'From clean-ish crunch to thick lead saturation.'),
        sw('Power', 0, ['15 W', '7 W'], 'Half power for earlier breakup and lower volume.')
      ],
      tones: [
        tn('Classic crunch', { Volume: 7, Tone: 6, Gain: 6, Power: 0 }, 'Volume and gain both high, guitar volume for cleanup. The whole point of the amp.'),
        tn('Doom/stoner', { Volume: 9, Tone: 4, Gain: 8, Power: 1 }, 'Tone down, gain up, hit it with a fuzz. Filthy.', 'Stoner rock', 'Orange tradition')
      ],
      artists: ['Bedroom metalheads worldwide'],
      genre: ['rock', 'stoner', 'metal']
    }),

    /* =================================================================== */
    /* Mesa/Boogie — the Californian high gain                             */
    /* =================================================================== */
    amp({
      id: 'dual-rectifier', brand: 'Mesa/Boogie', model: 'Dual Rectifier (Rev G)', year: '1994', type: 'tube head',
      watts: 100, tube: '5× 12AX7, 1× 12AT7, 4× 6L6', speakers: '4×12" Celestion V30 (oversized)',
      channels: 3, price: '£2,400',
      desc: 'The 90s metal sound: a huge, slightly scooped wall of gain with a rectifier sag that makes palm mutes enormous. Famously unforgiving of bad technique.',
      controls: [
        ctl('Gain', 0, 10, 7, 'Channel 2/3 gain: 5 is rock, 8+ is the nu-metal wall.'),
        ctl('Treble', 0, 10, 7, 'The Recto is dark-ish; 6–8 brings the clarity.'),
        ctl('Middle', 0, 10, 4, 'Scoop to 3 for that scooped-mid wall, push to 6 to cut.'),
        ctl('Bass', 0, 10, 5, 'Do not push past 6 with the gain high — sag turns into flub.'),
        ctl('Presence', 0, 10, 6, 'Sizzle and cut; 6–8 for leads.'),
        ctl('Master', 0, 10, 4, 'Channel master.'),
        ctl('Output Level', 0, 10, 4, 'Global output — the Recto needs volume to breathe.'),
        sw('Mode (Ch 2/3)', 1, ['Clean', 'Vintage', 'Modern'], 'Modern = the tight, aggressive wall; Vintage = classic rock crunch.'),
        sw('Rectifier', 0, ['tube', 'solid-state'], 'Solid-state = tighter and punchier; tube = more sag and bloom.')
      ],
      tones: [
        tn('Nu-metal wall', { Gain: 8.5, Treble: 7, Middle: 3.5, Bass: 5.5, Presence: 7, Master: 4, 'Output Level': 4, 'Mode (Ch 2/3)': 2, Rectifier: 1 },
          'Channel 3 original “Modern”, mids scooped to 3.5, guitar in drop D. Tight palm mutes, enormous chords.', 'Chocolate Starfish era / nu-metal', 'Limp Bizkit · Korn era'),
        tn('Modern rock crunch', { Gain: 6, Treble: 6.5, Middle: 5, Bass: 5, Presence: 6, Master: 4.5, 'Output Level': 4, 'Mode (Ch 2/3)': 1, Rectifier: 0 },
          'Vintage mode on channel 2 — the alternative-rock crunch of the late 90s.', 'Alternative rock radio', '90s alternative'),
        tn('Recto lead', { Gain: 8, Treble: 7, Middle: 5, Bass: 5, Presence: 8, Master: 5, 'Output Level': 4.5, 'Mode (Ch 2/3)': 2, Rectifier: 1 },
          'Presence and treble up, a Tube Screamer in front for a tight, singing lead.')
      ],
      artists: ['Korn', 'Limp Bizkit', 'Dream Theater (early)', 'Foo Fighters (studio)'],
      genre: ['metal', 'nu metal', 'hard rock']
    }),

    amp({
      id: 'mark-v', brand: 'Mesa/Boogie', model: 'Mark V', year: '2009', type: 'tube head/combo',
      watts: 90, tube: '9× 12AX7, 4× 6L6', speakers: '1×12" C90 (combo)', channels: 3, price: '£2,900',
      desc: 'The Mark series in one amp: three channels, four modes each and the legendary five-band graphic EQ. From Santana sustain to Metallica crunch.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Per-channel gain — the Mark V’s IIC+ mode is the thrash voice.'),
        ctl('Treble', 0, 10, 7, 'Mesa treble is also a gain control — it feeds the next stage. 7–8 is normal.'),
        ctl('Middle', 0, 10, 5, 'Scoop with the graphic EQ instead of here.'),
        ctl('Bass', 0, 10, 4, 'Keep it at 3–4; the Mark preamp gets flabby fast.'),
        ctl('Presence', 0, 10, 6, 'Top-end bite.'),
        ctl('Master', 0, 10, 4, 'Channel master.'),
        ctl('Output', 0, 10, 4, 'Global output level.'),
        sw('Mode (Ch 3)', 0, ['IIC+', 'IV', 'Extreme'], 'Channel 3 modes: the IIC+ is the classic Metallica voice.'),
        sw('Graphic EQ', 0, ['off', 'on'], 'The five-band EQ — scoop the mids for thrash, boost 660 Hz for solos.')
      ],
      tones: [
        tn('Metallica IIC+ crunch', { Gain: 7.5, Treble: 7, Middle: 3, Bass: 3.5, Presence: 7, Master: 4, Output: 4, 'Mode (Ch 3)': 0, 'Graphic EQ': 1 },
          'Channel 3 IIC+ with the graphic EQ scooping 240 Hz and 750 Hz — the sound of the black album.', 'Enter Sandman — Metallica', 'James Hetfield'),
        tn('Santana sustain', { Gain: 7, Treble: 7.5, Middle: 5, Bass: 3, Presence: 5, Master: 4, Output: 4, 'Mode (Ch 3)': 1, 'Graphic EQ': 1 },
          'Neck pickup, mid-boosted EQ, endless sustain.', 'Oye Como Va — Santana', 'Carlos Santana'),
        tn('Clean (Ch 1 Fat)', { Gain: 4, Treble: 6, Middle: 6, Bass: 4, Presence: 5, Master: 5, Output: 4, 'Mode (Ch 3)': 0, 'Graphic EQ': 0 }, 'Channel 1 Fat mode — a warm, pedal-friendly blackface-style clean.')
      ],
      artists: ['James Hetfield', 'Carlos Santana', 'John Petrucci', 'Keith Richards (studio)'],
      genre: ['metal', 'thrash', 'rock', 'fusion']
    }),

    amp({
      id: 'lonestar', brand: 'Mesa/Boogie', model: 'Lone Star Special', year: '2004', type: 'tube combo (1×12)',
      watts: 30, tube: '5× 12AX7, 4× EL84', speakers: '1×12" Celestion C90', channels: 2, price: '£2,000',
      desc: 'Mesa’s take on the blackface Fender: a warm, round clean and a blues channel made for pedal-steel sustain. The country and blues session amp.',
      controls: [
        ctl('Gain', 0, 10, 4, 'Channel 2 gain — 4 is the singing blues zone.'),
        ctl('Treble', 0, 10, 6, 'Warm and round rather than blackface-bright.'),
        ctl('Middle', 0, 10, 6, 'Mids serve the sustain.'),
        ctl('Bass', 0, 10, 5, 'Full but tight.'),
        ctl('Presence', 0, 10, 5, 'Subtle.'),
        ctl('Reverb', 0, 10, 4, 'Long, gorgeous spring reverb.')
      ],
      tones: [
        tn('Country clean', { Gain: 3, Treble: 6, Middle: 6, Bass: 5, Presence: 5, Reverb: 4 }, 'Clean channel, a compressor and a delay. The Nashville sound.', 'Modern country', 'Session players'),
        tn('Blues lead', { Gain: 6, Treble: 5.5, Middle: 7, Bass: 4.5, Presence: 5, Reverb: 3 }, 'Channel 2 with mids pushed — creamy, singing lead tone.')
      ],
      artists: ['Session & country players'],
      genre: ['country', 'blues', 'jazz']
    }),

    amp({
      id: '5150-iii', brand: 'EVH', model: '5150 III 50W (6L6)', year: '2011', type: 'tube head',
      watts: 50, tube: '8× 12AX7, 2× 6L6', speakers: '4×12" Celestion G12H-30', channels: 3, price: '£1,300',
      desc: 'The Peavey 5150 lineage perfected: a sparkly clean, a Marshall-ish crunch and one of the tightest, angriest lead channels ever built.',
      controls: [
        ctl('Gain', 0, 10, 7, 'Channel 3 gain; 6 is hot-rodded Marshall, 9 is modern metal.'),
        ctl('Volume', 0, 10, 5, 'Channel volume.'),
        ctl('Bass', 0, 10, 5, 'Tight — 4–5 keeps palm mutes dry and percussive.'),
        ctl('Middle', 0, 10, 4, 'Scoop for metal, push for classic rock.'),
        ctl('Treble', 0, 10, 6, 'Detailed top end.'),
        ctl('Presence', 0, 10, 6, 'Attack and bite.'),
        ctl('Resonance', 0, 10, 5, 'Low-end thump — the 5150 signature. Keep at 5 or it gets boomy.')
      ],
      tones: [
        tn('Modern metal', { Gain: 8.5, Volume: 4, Bass: 4.5, Middle: 3.5, Treble: 6.5, Presence: 7, Resonance: 6 }, 'Channel 3, scooped mids, resonance at 6 for chunk. Tuned down and palm-muted.', 'Modern metal', 'EVH 5150 players'),
        tn('Brown sound', { Gain: 6, Volume: 5, Bass: 5, Middle: 6, Treble: 6, Presence: 6, Resonance: 4 }, 'Channel 2 with a phase 90 in front — the “brown” Eddie tone.', 'Van Halen', 'Eddie Van Halen'),
        tn('Rock crunch', { Gain: 5, Volume: 5.5, Bass: 5, Middle: 6, Treble: 6, Presence: 5, Resonance: 4 }, 'Channel 2 — crunchy, dynamic and great with the guitar volume.')
      ],
      artists: ['Eddie Van Halen', 'Modern metal players'],
      genre: ['metal', 'hard rock']
    }),

    amp({
      id: 'slo100', brand: 'Soldano', model: 'SLO-100 Super Lead Overdrive', year: '1987', type: 'tube head',
      watts: 100, tube: '4× 12AX7, 4× 5881/6L6', speakers: '4×12" Celestion V30', channels: 2, price: '£3,500',
      desc: 'The boutique high-gain icon: the most liquid, harmonically rich overdrive channel ever made. Warren DeMartini, Steve Vai and dozens of 90s records live here.',
      controls: [
        ctl('Gain', 0, 10, 7, 'The magic knob. 6 is throaty rock, 8+ is liquid sustain.'),
        ctl('Bass', 0, 10, 5, 'Tight and musical.'),
        ctl('Middle', 0, 10, 6, 'Rich mids are the SLO’s whole personality.'),
        ctl('Treble', 0, 10, 6, 'Smooth and bright at once.'),
        ctl('Presence', 0, 10, 6, 'Cut and definition.'),
        ctl('Master', 0, 10, 5, 'Output stage driven — the SLO needs the master up to sing.')
      ],
      tones: [
        tn('Liquid lead', { Gain: 8, Bass: 5, Middle: 6, Treble: 6, Presence: 6, Master: 6 }, 'Gain 8, master 6. Long sustained notes that bloom into feedback — the 80s shred tone.', 'Yankee Rose — David Lee Roth', 'Steve Vai'),
        tn('Hard rock rhythm', { Gain: 6, Bass: 5.5, Middle: 7, Treble: 6, Presence: 5, Master: 5 }, 'Mids pushed, gain moderate — thick, throaty rock chords.')
      ],
      artists: ['Steve Vai', 'Warren DeMartini', 'Neal Schon'],
      genre: ['hard rock', 'metal', 'shred']
    }),

    /* =================================================================== */
    /* Boutique & modern classics                                          */
    /* =================================================================== */
    amp({
      id: 'bogner-ecstasy', brand: 'Bogner', model: 'Ecstasy 101B', year: '1993', type: 'tube head',
      watts: 100, tube: '6× 12AX7, 4× EL34', speakers: '4×12" Celestion V30', channels: 3, price: '£3,800',
      desc: 'A boutique chameleon: plexi-ish crunch on channel 2, an enormous high-gain lead on channel 3, and a plexi mode switch that changes everything.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Channel 2/3 gain — 5 is crunchy, 8 is a singing lead.'),
        ctl('Bass', 0, 10, 5, 'Tight, with a “B1/B2” low-end character switch in the real amp.'),
        ctl('Middle', 0, 10, 6, 'Sweet, complex mids.'),
        ctl('Treble', 0, 10, 6, 'Smooth and detailed.'),
        ctl('Presence', 0, 10, 6, 'Airy top end.'),
        ctl('Volume', 0, 10, 5, 'Channel volume.'),
        sw('Plexi mode', 0, ['off', 'on'], 'Takes channel 2 into plexi territory — a totally different amp.')
      ],
      tones: [
        tn('Boutique crunch', { Gain: 6, Bass: 5, Middle: 6, Treble: 6, Presence: 6, Volume: 5, 'Plexi mode': 1 }, 'Plexi mode on, gain 6 — the boutique take on a cranked Marshall.'),
        tn('High-gain lead', { Gain: 8.5, Bass: 5, Middle: 5, Treble: 6.5, Presence: 7, Volume: 4.5, 'Plexi mode': 0 }, 'Channel 3 for a modern, tight lead with a liquid top end.')
      ],
      artists: ['Steve Lukather', 'Session & boutique players'],
      genre: ['rock', 'fusion', 'metal']
    }),

    amp({
      id: 'diezel-vh4', brand: 'Diezel', model: 'VH4', year: '1994', type: 'tube head',
      watts: 100, tube: '8× 12AX7, 4× EL34 (or 6L6)', speakers: '4×12" V30', channels: 4, price: '£4,000',
      desc: 'The German high-gain tank: four channels, ridiculous headroom and a channel 3 that defined modern metal tone. Built like a vault.',
      controls: [
        ctl('Gain', 0, 10, 7, 'Channel 3/4 gain. Channel 3 is the signature.'),
        ctl('Bass', 0, 10, 5, 'Tight and percussive — never flabby.'),
        ctl('Middle', 0, 10, 5, 'Back it to 3–4 for modern metal.'),
        ctl('Treble', 0, 10, 6, 'Clear and articulate.'),
        ctl('Presence', 0, 10, 6, 'Upper-mid cut.'),
        ctl('Deep', 0, 10, 4, 'Sub-low thump. Beyond 5 it is too much for most mixes.'),
        ctl('Master', 0, 10, 4, 'Channel master.')
      ],
      tones: [
        tn('Modern metal ch3', { Gain: 7, Bass: 5, Middle: 4, Treble: 6.5, Presence: 6, Deep: 4, Master: 4 }, 'Channel 3, gain 7 — the tight, articulate modern metal voice.', 'Tool · Adam Jones territory', 'Adam Jones'),
        tn('Rock crunch ch2', { Gain: 5, Bass: 5, Middle: 6, Treble: 6, Presence: 5, Deep: 3, Master: 4.5 }, 'Channel 2 — a big, dynamic British crunch.')
      ],
      artists: ['Adam Jones (Tool)', 'Modern metal'],
      genre: ['metal', 'progressive']
    }),

    amp({
      id: 'friedman-be', brand: 'Friedman', model: 'BE-100 Deluxe', year: '2010', type: 'tube head',
      watts: 100, tube: '4× 12AX7, 4× EL34', speakers: '4×12" Celestion Greenback', channels: 2, price: '£3,200',
      desc: 'A hot-rodded Plexi done right: the brown sound and 80s hard rock in one amp, with a saturating preamp and a HBE (higher-gain) mode.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Plexi-ish at 5, aggressive at 8.'),
        ctl('Bass', 0, 10, 5, 'Warm and tight.'),
        ctl('Middle', 0, 10, 6, 'Classic Marshall mids.'),
        ctl('Treble', 0, 10, 6, 'Bright but not harsh.'),
        ctl('Presence', 0, 10, 6, 'Cut.'),
        ctl('Master', 0, 10, 5, 'Output level.'),
        sw('HBE mode', 0, ['off', 'on'], 'Higher-gain mode — three more “clicks” of gain on top.')
      ],
      tones: [
        tn('Brown sound', { Gain: 6, Bass: 5, Middle: 6, Treble: 6, Presence: 6, Master: 5, 'HBE mode': 0 }, 'Gain 6, all the classic Marshall settings. Add a Phase 90 and you are in 1979.', 'Van Halen territory', 'Eddie Van Halen'),
        tn('80s hard rock', { Gain: 7.5, Bass: 5, Middle: 6, Treble: 6.5, Presence: 6, Master: 5, 'HBE mode': 1 }, 'HBE on, gain 7.5 — the sound of 80s Sunset Strip.', '80s hard rock', 'Hair metal')
      ],
      artists: ['Friedman players', 'Modern hard rock'],
      genre: ['hard rock', 'metal']
    }),

    amp({
      id: 'matchless-dc30', brand: 'Matchless', model: 'DC-30', year: '1989', type: 'tube combo (2×12)',
      watts: 30, tube: '5× 12AX7, 1× EF86, 4× EL84', speakers: '2×12" Celestion Blue', channels: 2, price: '£3,600',
      desc: 'The boutique AC30: tighter, chimier and even more dynamic. A favourite of players who want Vox chime with modern reliability.',
      controls: [
        ctl('Volume', 0, 10, 6, 'Top Boost-ish channel volume.'),
        ctl('Bass', 0, 10, 4, 'Tight low end.'),
        ctl('Treble', 0, 10, 7, 'Glorious chime.'),
        ctl('Cut', 0, 10, 5, 'Works backwards, exactly like a Vox.'),
        ctl('Master', 0, 10, 6, 'Master volume — crank it and control the room with the guitar.')
      ],
      tones: [
        tn('Chime clean', { Volume: 5, Bass: 4, Treble: 7, Cut: 4, Master: 6 }, 'The boutique jangle: bright, tight and alive.', 'Modern jangle pop', 'Matchless players'),
        tn('Cranked bloom', { Volume: 8, Bass: 4, Treble: 6, Cut: 6, Master: 7 }, 'Both volumes up — the amp blooms into a thick, harmonically rich crunch.')
      ],
      artists: ['Boutique players', 'Indie & session'],
      genre: ['indie', 'rock', 'session']
    }),

    amp({
      id: 'dumble-style', brand: 'Dumble (style)', model: 'Overdrive Special-style', year: '1981', type: 'tube combo (1×12)',
      watts: 50, tube: '4× 12AX7, 2× 6L6', speakers: '1×12" EVM12L',
      channels: 2, price: '—',
      desc: 'The most mythologised amp in history — fewer than 300 made, used on a decade of session records. A warm clean and a singing, mid-forward overdrive that never gets harsh.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Overdrive channel gain — the ODS’s famous smooth, vocal snarl.'),
        ctl('Level', 0, 10, 5, 'Overdrive channel level.'),
        ctl('Treble', 0, 10, 6, 'Warm and thick rather than sharp.'),
        ctl('Middle', 0, 10, 7, 'Mids are the whole point — 7 is the Dumble voice.'),
        ctl('Bass', 0, 10, 4, 'Keep it at 4; the low end sags with the gain up.'),
        ctl('Presence', 0, 10, 5, 'Gentle.'),
        sw('Ratio', 0, ['clean', '50/50', 'overdrive'], 'Blends clean and overdrive stages — the famous ODS trick.')
      ],
      tones: [
        tn('Smooth lead', { Gain: 6.5, Level: 5, Treble: 6, Middle: 7, Bass: 4, Presence: 5, Ratio: 2 }, 'The singing session-lead tone: thick, vocal, never harsh.', 'Studio lead tones', 'Session guitarists'),
        tn('Warm clean', { Gain: 3, Level: 5, Treble: 5.5, Middle: 6, Bass: 4.5, Presence: 4, Ratio: 0 }, 'Clean with a warm mid push — the “Dumble clean” church', 'Anything recorded in LA 1982–1995', 'Larry Carlton')
      ],
      artists: ['Larry Carlton', 'Robben Ford', 'Stevie Ray Vaughan (in “Couldn’t Stand the Weather” era, borrowed)'],
      genre: ['blues', 'fusion', 'session']
    }),

    amp({
      id: 'dr-z-maz18', brand: 'Dr. Z', model: 'Maz 18 Jr', year: '1998', type: 'tube combo (1×12)',
      watts: 18, tube: '2× 12AX7, 3× 12AX7 (reverb), 4× EL84', speakers: '1×12" Celestion Blue', channels: 2, price: '£2,000',
      desc: 'American boutique EL84 combo: a chiming, punchy clean that sits perfectly under pedals, with a master volume that makes it gig-friendly.',
      controls: [
        ctl('Volume', 0, 10, 6, 'Preamp volume — the crunch control.'),
        ctl('Master', 0, 10, 6, 'Output level.'),
        ctl('Treble', 0, 10, 6, 'Chime without harshness.'),
        ctl('Middle', 0, 10, 6, 'Rich British mids.'),
        ctl('Bass', 0, 10, 4, 'Tight.'),
        ctl('Reverb', 0, 10, 3, 'Spring — short and sweet.')
      ],
      tones: [
        tn('Chime crunch', { Volume: 7, Master: 5, Treble: 6, Middle: 6, Bass: 4, Reverb: 3 }, 'Volume up, master down: the EL84 crunch at home-friendly levels.', 'Modern boutique rock', 'Dr. Z players'),
        tn('Pedal platform clean', { Volume: 4, Master: 7, Treble: 6, Middle: 6, Bass: 4, Reverb: 4 }, 'Loud and clean with plenty of headroom for a full board.')
      ],
      artists: ['Boutique session players'],
      genre: ['indie', 'blues', 'rock']
    }),

    /* =================================================================== */
    /* Bass & acoustic                                                      */
    /* =================================================================== */
    amp({
      id: 'ampeg-svt', brand: 'Ampeg', model: 'SVT-CL', year: '1969', type: 'bass tube head',
      watts: 300, tube: '3× 12AX7, 2× 12AU7, 6× 6550', speakers: '8×10" Ampeg SVT cabinet', channels: 2, price: '£2,600',
      desc: 'The bass amp that defined rock: 300 valve watts, an 8×10 fridge and a tone that fills arenas. Heavy in every sense of the word.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Drive the preamp with a bass + a pedal — it is the sound of the SVT.'),
        ctl('Bass', 0, 10, 6, 'Huge low end; keep an eye on the venue.'),
        ctl('Midrange', 0, 10, 4, 'The “Ultra Mid” switch is the character control.'),
        ctl('Treble', 0, 10, 6, 'Clarity and string definition.'),
        ctl('Master', 0, 10, 5, 'Output; the SVT is loud very early on the dial.'),
        sw('Ultra Lo', 0, ['off', 'on'], 'Deep low-end boost — reggae and dub territory.'),
        sw('Ultra Hi', 0, ['off', 'on'], 'Bright, scooped "click" — slap and funk.')
      ],
      tones: [
        tn('Rock bass', { Gain: 6, Bass: 6, Midrange: 4, Treble: 6, Master: 5, 'Ultra Lo': 0, 'Ultra Hi': 0 }, 'P-bass, tone up, dirty preamp — the sound of every 70s rock record.', 'Live rock', 'Rock bassists'),
        tn('Funk slap', { Gain: 4, Bass: 5, Midrange: 3, Treble: 8, Master: 5, 'Ultra Lo': 0, 'Ultra Hi': 1 }, 'Ultra Hi on, mids scooped, treble up — the slapper’s clarity.', 'Funk & soul', 'Marcus Miller territory'),
        tn('Reggae dub', { Gain: 5, Bass: 8, Midrange: 3, Treble: 4, Master: 4.5, 'Ultra Lo': 1, 'Ultra Hi': 0 }, 'Ultra Lo on, bass up, treble down. Deep, round and heavy.', 'Dub reggae', 'Reggae tradition')
      ],
      artists: ['Every rock bassist'],
      genre: ['rock', 'funk', 'reggae']
    }),

    amp({
      id: 'acoustic-amp', brand: 'Generic', model: 'Acoustic combo (Fishman-style)', year: '', type: 'solid-state acoustic amp',
      watts: 60, tube: 'none — solid state + a tweeter', speakers: '1×8" + tweeter', channels: 2, price: '£400',
      desc: 'The acoustic amp: full-range and clean, with a tweeter so the sparkle survives. Anti-feedback control, onboard reverb and usually a second channel for a vocal mic.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Set so the clip light just flickers on your hardest strum.'),
        ctl('Low', 0, 10, 5, 'Cut here first if the guitar booms.'),
        ctl('Mid', 0, 10, 5, 'Sweepable mid cut on many models — find the boxy frequency and pull it.'),
        ctl('High', 0, 10, 6, 'The tweeter gives you real sparkle — 6 is plenty.'),
        ctl('Reverb', 0, 10, 3, 'Short and natural. 3 is a room, 6 is a hall.'),
        sw('Anti-feedback', 0, ['off', 'on'], 'Notch filter — turn it on before you turn up.')
      ],
      tones: [
        tn('Fingerstyle clean', { Gain: 5, Low: 4, Mid: 4, High: 6, Reverb: 3, 'Anti-feedback': 0 }, 'Piezo through a clean, full-range amp with a touch of reverb.', 'Fingerstyle & folk', 'Acoustic players'),
        tn('Strummed singer-songwriter', { Gain: 5.5, Low: 3.5, Mid: 5, High: 6.5, Reverb: 4, 'Anti-feedback': 1 }, 'Cut the lows, mid slightly up, reverb 4 — the guitar sits under the voice.', 'Singer-songwriter stages', 'Acoustic tradition')
      ],
      artists: ['Every acoustic stage'],
      genre: ['acoustic', 'folk']
    })
  ];

  const api = {
    AMPS: AMPS, ctl: ctl, tn: tn, sw: sw, amp: amp,
    byId: function (id) { for (let i = 0; i < AMPS.length; i++) if (AMPS[i].id === id) return AMPS[i]; return AMPS[0]; },
    add: function (list) { list.forEach(function (a) { AMPS.push(a); }); return AMPS.length; },
    families: function () { const out = []; AMPS.forEach(a => { if (out.indexOf(a.brand) === -1) out.push(a.brand); }); return out; }
  };
  const root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.TT = root.TT || {};
  root.TT.amps = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
