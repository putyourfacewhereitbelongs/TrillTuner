/* Trill Tuner — amplifier library, part 2: solid state, modellers, bass and
 * modern classics, plus the shared cabinet/microphone data and the genre
 * recipes that tie an amp + pedals + settings together.
 *
 * Loads after lib/amps.js and appends to the same list.
 */
(function () {
  'use strict';

  const A = (typeof require === 'function' && typeof window === 'undefined')
    ? require('./amps.js')
    : window.TT.amps;
  const amp = A.amp, ctl = A.ctl, tn = A.tn, sw = A.sw;

  const MORE = [
    /* =================================================================== */
    /* Solid state & classic hybrids                                        */
    /* =================================================================== */
    amp({
      id: 'jc-120', brand: 'Roland', model: 'JC-120 Jazz Chorus', year: '1975', type: 'solid-state combo (2×12)',
      watts: 120, tube: 'none — pure solid state', speakers: '2×12" Roland', channels: 2, price: '£1,100',
      desc: 'The clean amp that refuses to break up: 120 solid-state watts, one of the best choruses ever built, and a distortion knob nobody uses.',
      controls: [
        ctl('Volume', 0, 10, 5, 'The JC-120 stays clean at every setting. This is why pedalboards love it.'),
        ctl('Bass', 0, 10, 5, 'Neutral and tight.'),
        ctl('Middle', 0, 10, 5, 'Neutral — the JC-120 is famously flat.'),
        ctl('Treble', 0, 10, 6, 'Bright and immediate; 5–6 keeps it sweet.'),
        ctl('Chorus Rate', 0, 10, 3, 'The famous stereo chorus. Slow rate, depth around 5, is the signature shimmer.'),
        ctl('Chorus Depth', 0, 10, 5, 'Depth 5 with rate 2–3 is the “JC” shimmer.'),
        ctl('Reverb', 0, 10, 3, 'Short spring-style reverb.')
      ],
      tones: [
        tn('Jazz clean', { Volume: 5, Bass: 5, Middle: 5, Treble: 5, 'Chorus Rate': 2, 'Chorus Depth': 4, Reverb: 3 }, 'Neck humbucker, tone at 5, chorus slow and light. The jazz standard.', 'Jazz standard', 'Jazz players'),
        tn('80s chorus clean', { Volume: 5.5, Bass: 5, Middle: 5, Treble: 6, 'Chorus Rate': 3, 'Chorus Depth': 7, Reverb: 3 }, 'Chorus deep, treble up — the sound of every 80s clean record.', 'Every 1985 ballad', '80s session players'),
        tn('Shoegaze wall', { Volume: 7, Bass: 6, Middle: 5, Treble: 6, 'Chorus Rate': 4, 'Chorus Depth': 8, Reverb: 6 }, 'Crank it, chorus and reverb wide open, and put a Big Muff and a reverb in front. The wall of sound.', 'Loveless — My Bloody Valentine', 'My Bloody Valentine')
      ],
      artists: ['Andy Summers (Police)', 'Shoegaze & jazz players'],
      genre: ['jazz', 'shoegaze', '80s pop', 'session']
    }),

    amp({
      id: 'katana-50', brand: 'Boss', model: 'Katana 50 MkII', year: '2019', type: 'solid-state modelling combo (1×12)',
      watts: 50, tube: 'none — solid state, 5 amp models', speakers: '1×12" Custom', price: '£270',
      desc: 'The modern practice/gig all-rounder: five amp voices, onboard effects, 50/25/0.5 watt scaling and 0.5 watts for bedroom use.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Voice-dependent gain — from Fender-clean to modern metal.'),
        ctl('Volume', 0, 10, 5, 'Output level.'),
        ctl('Bass', 0, 10, 5, 'Global EQ — the Katana is a little mid-forward, so 5 is safe.'),
        ctl('Middle', 0, 10, 5, 'Scoop for metal, push for classic rock.'),
        ctl('Treble', 0, 10, 5.5, '5–6 is neutral.'),
        ctl('Reverb', 0, 10, 3, 'Onboard reverb.'),
        ctl('Delay', 0, 10, 3, 'Onboard delay.'),
        sw('Amp voice', 1, ['Clean', 'Crunch', 'Lead', 'Brown', 'Acoustic'], 'Five voices: Fender clean, Marshall crunch, high-gain lead, brown EVH and acoustic.'),
        sw('Power', 0, ['0.5 W', '25 W', '50 W'], '0.5 W for home, 50 W for a gig.')
      ],
      tones: [
        tn('Practice crunch', { Gain: 6, Volume: 4, Bass: 5, Middle: 6, Treble: 5.5, Reverb: 3, Delay: 2, 'Amp voice': 1, Power: 1 },
          'Crunch voice, gain 6, 25 W — everything you need at home.', 'Practice', 'Modern players'),
        tn('High-gain lead', { Gain: 8, Volume: 4.5, Bass: 5, Middle: 4, Treble: 6, Reverb: 2, Delay: 3, 'Amp voice': 2, Power: 1 },
          'Lead voice with the delay on — a full metal tone for £270.', 'Modern metal at home', 'Boss Katana users')
      ],
      artists: ['Home players and gigging amateurs'],
      genre: ['practice', 'rock', 'metal']
    }),

    amp({
      id: 'tone-master-deluxe', brand: 'Fender', model: 'Tone Master Deluxe Reverb', year: '2019', type: 'solid-state modelling combo (1×12)',
      watts: 100, tube: 'none — digital model of the ’65 Deluxe', speakers: '1×12" Jensen N-12K neodymium', price: '£1,000',
      desc: 'A digital replica of the ’65 Deluxe Reverb that weighs half as much and sounds like the real thing. Attenuation to 0.2 W, XLR out, and no tubes to replace.',
      controls: [
        ctl('Volume', 1, 10, 4, 'Exactly the blackface taper — 4 is clean, 6+ breaks up.'),
        ctl('Treble', 1, 10, 6, 'Bright Fender top end.'),
        ctl('Bass', 1, 10, 4, 'Keep it 3–4 like the real thing.'),
        ctl('Reverb', 1, 10, 3, 'Modelled spring — very convincing.'),
        ctl('Speed', 1, 10, 3, 'Tremolo speed.'),
        ctl('Intensity', 1, 10, 4, 'Tremolo depth.'),
        sw('Attenuator', 1, ['0.2 W', '5 W', '22 W', '100 W'], 'Power scaling: 0.2 W for bedroom, 22 W for the authentic feel.')
      ],
      tones: [
        tn('Deluxe studio clean', { Volume: 4, Treble: 6, Bass: 4, Reverb: 3, Speed: 3, Intensity: 2, Attenuator: 1 }, 'Tone Master on 22 W — the studio clean without the maintenance.', 'Tone Master demo rooms', 'Modern Fender'),
        tn('Bedroom breakup', { Volume: 7, Treble: 6, Bass: 4, Reverb: 4, Speed: 4, Intensity: 3, Attenuator: 0 }, 'Cranked Deluxe tone at 0.2 W. The neighbours will not notice.', 'Home playing', 'Modern players')
      ],
      artists: ['Modern working guitarists'],
      genre: ['blues', 'country', 'session']
    }),

    amp({
      id: 'thr10ii', brand: 'Yamaha', model: 'THR10II', year: '2019', type: 'desktop modelling amp (2×3")',
      watts: 20, tube: 'none — Yamaha VCM modelling', speakers: '2×3" full-range', price: '£300',
      desc: 'The desk amp: hi-fi stereo sound, believable models, audio interface built in, and it doubles as a Bluetooth speaker. The best bedroom practice tool ever made.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Model-dependent drive.'),
        ctl('Master', 0, 10, 5, 'Volume — plenty loud for a room.'),
        ctl('Bass', 0, 10, 5, 'Works like a hi-fi tone control rather than a guitar amp one.'),
        ctl('Middle', 0, 10, 5, 'Neutral is 5.'),
        ctl('Treble', 0, 10, 5.5, 'Brightness of the stereo image.'),
        sw('Amp model', 0, ['Clean', 'Crunch', 'Lead', 'Hi Gain', 'Special', 'Bass', 'Aco', 'Flat'], 'Eight voices covering everything from tweed to high gain.')
      ],
      tones: [
        tn('Late night clean', { Gain: 4, Master: 3, Bass: 5, Middle: 5, Treble: 6, 'Amp model': 0 }, 'Clean model, master at 3 — perfect for 11 pm practice.', 'Home practice', 'Everyone with neighbours'),
        tn('Hi-gain headphones', { Gain: 8, Master: 3, Bass: 5, Middle: 4, Treble: 6, 'Amp model': 3 }, 'Hi Gain model, volume low, headphones in — full metal at whisper level.')
      ],
      artists: ['Bedroom players everywhere'],
      genre: ['practice', 'home']
    }),

    amp({
      id: 'spark-40', brand: 'Positive Grid', model: 'Spark 40', year: '2019', type: 'desktop modelling amp (2×4")',
      watts: 40, tube: 'none — app-driven modelling', speakers: '2×4" full-range', price: '£250',
      desc: 'Ten thousand tones from a phone app: the Spark models amps and pedals, plays backing tracks from your phone, and even jams along with you.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Model-dependent.'),
        ctl('Master', 0, 10, 5, 'Level.'),
        ctl('Bass', 0, 10, 5, 'Global EQ.'),
        ctl('Middle', 0, 10, 5, 'Global EQ.'),
        ctl('Treble', 0, 10, 5.5, 'Global EQ.'),
        sw('Preset', 0, ['Clean', 'Crunch', 'Lead', 'Metal'], 'App presets replace these — the four onboard ones are a starting point.')
      ],
      tones: [
        tn('Backing track jam', { Gain: 5, Master: 4, Bass: 5, Middle: 5, Treble: 6, Preset: 1 }, 'Crunch preset, backing track from the app, jam along.', 'Home jam', 'Modern practice')
      ],
      artists: ['Home players'],
      genre: ['practice', 'home']
    }),

    amp({
      id: 'kemper', brand: 'Kemper', model: 'Profiler PowerHead', year: '2011', type: 'profiler',
      watts: 600, tube: 'none — DSP profile of a real amp', speakers: 'any cabinet', price: '£1,800',
      desc: 'Profiles — digital snapshots — of any amp you can borrow. A full studio of amps in one rack unit, with a 600 W power amp for real cabinets.',
      controls: [
        ctl('Gain', 0, 10, 5, 'The profiled amp’s gain, exactly as captured.'),
        ctl('Bass', 0, 10, 5, 'Post-profile EQ.'),
        ctl('Middle', 0, 10, 5, 'Post-profile EQ.'),
        ctl('Treble', 0, 10, 5, 'Post-profile EQ.'),
        ctl('Presence', 0, 10, 5, 'Post-profile presence.'),
        ctl('Master', 0, 10, 5, 'Output level.'),
        sw('Rig', 0, ['Clean Fender', 'Plexi crunch', 'Modern metal', 'Boutique lead'], 'Replaces the profile — a Kemper swaps amps in milliseconds.')
      ],
      tones: [
        tn('Profiled Plexi', { Gain: 6, Bass: 5, Middle: 7, Treble: 6, Presence: 6, Master: 4.5, Rig: 1 }, 'A cranked plexi profile with no tubes to wear out.', 'Studio amp collection', 'Session players'),
        tn('Modern metal profile', { Gain: 8, Bass: 5, Middle: 4, Treble: 6, Presence: 7, Master: 4, Rig: 2 }, 'A recto-style profile, tight and scooped.')
      ],
      artists: ['Touring & session players'],
      genre: ['everything']
    }),

    amp({
      id: 'prs-archon', brand: 'PRS', model: 'Archon 50', year: '2014', type: 'tube head',
      watts: 50, tube: '5× 12AX7, 2× 6L6', speakers: '4×12" V30', channels: 2, price: '£1,600',
      desc: 'A modern American high-gain head: a truly clean clean and a saturated, articulate lead channel that sits perfectly in a mix without a boost.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Channel 2 gain: 5 is hard rock, 8 is modern metal.'),
        ctl('Volume', 0, 10, 5, 'Channel volume.'),
        ctl('Bass', 0, 10, 5, 'Tight, but not dry.'),
        ctl('Middle', 0, 10, 5, 'Use the mid cut for modern tones.'),
        ctl('Treble', 0, 10, 6, 'Articulate top end.'),
        ctl('Presence', 0, 10, 6, 'Cut through the band.'),
        ctl('Master', 0, 10, 5, 'Global output.')
      ],
      tones: [
        tn('Modern high gain', { Gain: 7.5, Volume: 4, Bass: 5, Middle: 4, Treble: 6.5, Presence: 6, Master: 5 }, 'Channel 2, gain up, mids slightly scooped — modern hard rock in one box.'),
        tn('Big clean', { Gain: 3, Volume: 6, Bass: 5, Middle: 6, Treble: 6, Presence: 5, Master: 5 }, 'Channel 1 — clean with huge headroom for pedals.')
      ],
      artists: ['Modern rock & metal'],
      genre: ['metal', 'rock']
    }),

    amp({
      id: '6505', brand: 'Peavey', model: '6505 (5150 II)', year: '1992', type: 'tube head',
      watts: 120, tube: '5× 12AX7, 4× 6L6', speakers: '4×12" Sheffield/V30', channels: 2, price: '£1,300',
      desc: 'The original 5150: the amp that built the 90s and 2000s metal and hardcore sound. Insane gain, punishing volume, and a rhythm tone that sits perfectly in a heavy mix.',
      controls: [
        ctl('Pre Gain', 0, 10, 7, 'The legendary gain knob. 6 is crunch; 8+ is a wall of saturated harmonics.'),
        ctl('Post Gain', 0, 10, 4, 'Master — set it just loud enough to hear the speakers working.'),
        ctl('Bass', 0, 10, 5, 'Keep it under 6; the 6505 is already thick.'),
        ctl('Middle', 0, 10, 4, 'Scoop to 3 for that scooped metal wall.'),
        ctl('Treble', 0, 10, 7, 'Bright and cutting — 6–7 is normal.'),
        ctl('Resonance', 0, 10, 5, 'Low-end thump. 6 is the metal setting.'),
        ctl('Presence', 0, 10, 6, 'High-end attack, the reason it cuts through.'),
        sw('Rhythm channel', 0, ['Rhythm', 'Lead'], 'Rhythm = the crunch; Lead adds the saturation.')
      ],
      tones: [
        tn('Rhythm wall', { 'Pre Gain': 7.5, 'Post Gain': 3.5, Bass: 5, Middle: 3.5, Treble: 7, Resonance: 6, Presence: 6, 'Rhythm channel': 0 },
          'Rhythm channel, mids scooped, resonance 6 — the 90s and 2000s metal rhythm sound.', 'Metal & hardcore', 'Machine Head · Trivium era'),
        tn('Searing lead', { 'Pre Gain': 8.5, 'Post Gain': 3.5, Bass: 5, Middle: 5, Treble: 7, Resonance: 5, Presence: 7, 'Rhythm channel': 1 },
          'Lead channel with the presence up — saturated, cutting, perfect for solos over a wall.', 'Modern metal lead', 'EVH-style'),
        tn('Rock crunch', { 'Pre Gain': 5.5, 'Post Gain': 4, Bass: 5.5, Middle: 6, Treble: 6, Resonance: 4, Presence: 5, 'Rhythm channel': 0 }, 'Pre gain at 5.5 and mids up — a genuinely great hard-rock crunch.')
      ],
      artists: ['Machine Head', 'Trivium (early)', 'Everyone in metal 1995–2010'],
      genre: ['metal', 'hardcore', 'hard rock']
    }),

    amp({
      id: 'blackstar-ht', brand: 'Blackstar', model: 'HT Club 40 MkII', year: '2016', type: 'tube combo (1×12)',
      watts: 40, tube: '2× 12AX7, 2× EL34', speakers: '1×12" Celestion Seventy 80', channels: 2, price: '£650',
      desc: 'A hybrid: a real tube power section with an ISF control that sweeps from British to American voicing. Extremely practical for gigging.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Channel 2 gain — from blues crunch to modern saturation.'),
        ctl('Volume', 0, 10, 5, 'Channel volume.'),
        ctl('Bass', 0, 10, 5, 'Tight and predictable.'),
        ctl('Middle', 0, 10, 5, 'The ISF does the voicing; mids here are conventional.'),
        ctl('Treble', 0, 10, 6, '5–6 is home.'),
        ctl('ISF', 0, 10, 5, 'Infinite Shape Feature: 0 = British (mid-forward), 10 = American (scooped). 5 is neutral.'),
        ctl('Reverb', 0, 10, 3, 'Digital, usable.')
      ],
      tones: [
        tn('British crunch', { Gain: 5.5, Volume: 5, Bass: 5, Middle: 5, Treble: 6, ISF: 2, Reverb: 2 }, 'ISF at 2 for a Marshall-ish mid-forward crunch.'),
        tn('American high gain', { Gain: 7.5, Volume: 4, Bass: 5.5, Middle: 4, Treble: 6.5, ISF: 8, Reverb: 2 }, 'ISF at 8, mids scooped — a Californian high-gain voice.')
      ],
      artists: ['Modern gigging guitarists'],
      genre: ['rock', 'metal']
    }),

    amp({
      id: 'morgan-ac20', brand: 'Morgan', model: 'AC20 Deluxe', year: '2009', type: 'tube head/combo',
      watts: 20, tube: '3× 12AX7, 2× EL84', speakers: '1×12" Celestion Blue', price: '£2,200',
      desc: 'A modern, hand-wired take on the AC15/AC30 with a power-scaling knob so you can crank it at home and still get the EL84 bloom.',
      controls: [
        ctl('Volume', 0, 10, 6, 'Crank it — this is a non-master amp on purpose.'),
        ctl('Bass', 0, 10, 4, 'Keep it lean.'),
        ctl('Treble', 0, 10, 7, 'Chime.'),
        ctl('Cut', 0, 10, 5, 'Backwards, Vox-style: low = bright.'),
        ctl('Power', 0, 10, 5, 'Power scaling — 10 is full 20 W, lower is bedroom level with the same tone.')
      ],
      tones: [
        tn('Cranked chime', { Volume: 8, Bass: 4, Treble: 7, Cut: 5, Power: 3 }, 'Crank the volume, scale the power down — the boutique trick.', 'Boutique jangle', 'Morgan players')
      ],
      artists: ['Boutique players'],
      genre: ['indie', 'rock']
    }),

    amp({
      id: 'two-rock-burnside', brand: 'Two-Rock', model: 'Burnside 35', year: '2013', type: 'tube combo (1×12)',
      watts: 35, tube: '4× 12AX7, 2× 6L6/6V6', speakers: '1×12" Creamback', channels: 2, price: '£4,500',
      desc: 'The modern Dumble-style boutique amp: a blooming clean, an overdrive that sings, and a build quality that costs as much as a car.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Overdrive channel gain — smooth and vocal rather than aggressive.'),
        ctl('Volume', 0, 10, 5, 'Channel volume.'),
        ctl('Bass', 0, 10, 4.5, 'Warm but tight.'),
        ctl('Middle', 0, 10, 7, 'Mid-forward sustain.'),
        ctl('Treble', 0, 10, 6, 'Silky top end.'),
        ctl('Presence', 0, 10, 5, 'Subtle air.'),
        ctl('Reverb', 0, 10, 4, 'Lush and long.')
      ],
      tones: [
        tn('Boutique blues lead', { Gain: 6, Volume: 5, Bass: 4.5, Middle: 7, Treble: 6, Presence: 5, Reverb: 4 }, 'Warm, sustaining lead tone with mids pushed — the “Dumble” thing at its most musical.', 'Modern blues', 'Boutique blues players'),
        tn('Warm clean', { Gain: 3, Volume: 6, Bass: 5, Middle: 6, Treble: 5.5, Presence: 4, Reverb: 5 }, 'The most beautiful clean in the room — and it takes pedals like nothing else.')
      ],
      artists: ['Modern blues & session players'],
      genre: ['blues', 'fusion', 'session']
    }),

    amp({
      id: 'bass-rumble-500', brand: 'Fender', model: 'Rumble 500', year: '2010', type: 'solid-state bass combo (2×10)',
      watts: 500, tube: 'none — solid state with overdrive', speakers: '2×10" + horn', price: '£600',
      desc: 'The modern bass standard: 500 watts, light as a briefcase, XLR out for the PA, an overdrive channel and a great DI. The working bassist’s amp.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Set for a flickering clip light.'),
        ctl('Bass', 0, 10, 6, 'Deep and controlled.'),
        ctl('Low Mid', 0, 10, 5, 'Body of the bass.'),
        ctl('High Mid', 0, 10, 5, 'Attack and growl.'),
        ctl('Treble', 0, 10, 6, 'String definition and jazz clarity.'),
        ctl('Overdrive', 0, 10, 0, 'Onboard valve-ish drive — 3–5 for rock grit.'),
        sw('Preset', 0, ['—', 'Bright', 'Contour', 'Vintage'], 'Contour scoops the mids (modern); Vintage warms and rolls off the top.')
      ],
      tones: [
        tn('Modern rock bass', { Gain: 5, Bass: 6, 'Low Mid': 5, 'High Mid': 5, Treble: 6, Overdrive: 3, Preset: 2 }, 'Contour on, a bit of drive — the modern rock bass sound.', 'Modern rock', 'Working bassists'),
        tn('Vintage Motown', { Gain: 4, Bass: 6, 'Low Mid': 6, 'High Mid': 4, Treble: 4, Overdrive: 0, Preset: 3 }, 'Vintage preset, treble down, foam under the strings at the bridge. Motown.', 'Motown records', 'James Jamerson'),
        tn('Slap bright', { Gain: 4, Bass: 5, 'Low Mid': 3, 'High Mid': 7, Treble: 8, Overdrive: 0, Preset: 1 }, 'Bright preset with mids scooped — popping and slapping clarity.', 'Funk slap', 'Funk players')
      ],
      artists: ['Working bassists'],
      genre: ['rock', 'pop', 'funk']
    }),

    amp({
      id: 'ampeg-b15', brand: 'Ampeg', model: 'B-15 Portaflex', year: '1961', type: 'bass tube combo (1×15)',
      watts: 30, tube: '2× 12AX7, 2× 6L6', speakers: '1×15" CTS', price: '£3,000',
      desc: 'Thirty valve watts in a flip-top box: the bass sound of Motown, Stax, James Brown and half of the 60s. Round, warm and unbelievably deep.',
      controls: [
        ctl('Volume', 0, 10, 5, 'Valves compress beautifully past 6.'),
        ctl('Bass', 0, 10, 6, 'Huge, warm low end.'),
        ctl('Treble', 0, 10, 5, 'Round and soft rather than bright.'),
        ctl('Tone', 0, 10, 6, 'Overall tone shaping.'),
        sw('Select', 0, ['Normal', 'Bass Booster'], 'The “Bass Booster” input is the driving, bluesy setting.')
      ],
      tones: [
        tn('60s session bass', { Volume: 5, Bass: 6, Treble: 5, Tone: 6, Select: 0 }, 'Flatwound strings, foam mute, played with the side of the thumb. The whole 60s.', 'Motown & Stax', 'Jamerson · Duck Dunn'),
        tn('Blues bass grit', { Volume: 7, Bass: 5, Treble: 5, Tone: 5, Select: 1 }, 'Valve breakup — blues and early rock’n’roll bass with some hair on it.')
      ],
      artists: ['James Jamerson', 'Duck Dunn'],
      genre: ['soul', 'blues', 'rock & roll']
    }),

    amp({
      id: 'supro-thunderbolt', brand: 'Supro', model: 'Thunderbolt', year: '1962', type: 'tube combo (1×15)',
      watts: 35, tube: '2× 12AX7, 2× 6L6, 1× 5U4', speakers: '1×15" Jensen', price: '£1,900',
      desc: 'The Jimmy Page amp: a hot, gritty 35-watt 1×15 with a bold, midrange-heavy grind. Page used one on Led Zeppelin I — and on the riff everybody plays first.',
      controls: [
        ctl('Volume', 0, 10, 6, 'Breaks up early and hard. 6 is already rocking.'),
        ctl('Tone', 0, 10, 6, 'One tone control: 5–7 is the Page setting.'),
        ctl('Bass', 0, 10, 5, 'Rather than a full EQ stack — the Thunderbolt has a single tone, but many reissues add bass/treble.'),
        ctl('Treble', 0, 10, 6, 'Brightness.')
      ],
      tones: [
        tn('Whole Lotta Love', { Volume: 7, Tone: 6, Bass: 5, Treble: 6 }, 'Cranked, with a Telecaster bridge pickup and a fuzz for the rhythm figure.', 'Whole Lotta Love — Led Zeppelin', 'Jimmy Page'),
        tn('Gritty rhythm', { Volume: 6, Tone: 6, Bass: 5, Treble: 6 }, 'Dirty, mid-heavy, blues-rock rhythm.', 'Led Zeppelin I', 'Jimmy Page')
      ],
      artists: ['Jimmy Page'],
      genre: ['rock', 'blues rock']
    }),

    amp({
      id: 'marshall-bluesbreaker', brand: 'Marshall', model: '1962 Bluesbreaker', year: '1965', type: 'tube combo (2×12)',
      watts: 30, tube: '3× 12AX7, 2× KT66', speakers: '2×12" Celestion Greenback', price: '£2,700',
      desc: 'The combo version of the JTM45 that gave its name to an album. Warm, woody, and the reason every boutique builder chases “that Clapton tone”.',
      controls: [
        ctl('Presence', 0, 10, 6, 'Top-end bite.'),
        ctl('Bass', 0, 10, 5, 'Warm and full.'),
        ctl('Middle', 0, 10, 8, 'Woody mids, keep them high.'),
        ctl('Treble', 0, 10, 6, 'Glassy and clear.'),
        ctl('High Treble Volume', 0, 10, 7, 'Channel 1 — the crunch.'),
        ctl('Normal Volume', 0, 10, 5, 'Channel 2 — blend for the fuller sound.')
      ],
      tones: [
        tn('Beano tone', { Presence: 6, Bass: 5, Middle: 8, Treble: 6, 'High Treble Volume': 7, 'Normal Volume': 5 }, 'Les Paul, neck pickup, guitar volume 7 — the exact “Blues Breakers” recipe.', 'Blues Breakers with Eric Clapton', 'Eric Clapton'),
        tn('Warm cleans', { Presence: 5, Bass: 5, Middle: 7, Treble: 5.5, 'High Treble Volume': 4, 'Normal Volume': 4 }, 'Both volumes low — a big, warm clean.')
      ],
      artists: ['Eric Clapton', 'John Mayer'],
      genre: ['blues', 'rock']
    }),

    amp({
      id: 'laney-lionheart', brand: 'Laney', model: 'Lionheart L20T-112', year: '2008', type: 'tube combo (1×12)',
      watts: 20, tube: '4× 12AX7, 2× EL84', speakers: '1×12" Celestion Greenback', channels: 2, price: '£800',
      desc: 'A British boutique-flavoured EL84 combo with a master volume and a genuinely useful drive channel. Tony Iommi’s brand, in a home-friendly package.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Drive channel — blues to rock crunch.'),
        ctl('Volume', 0, 10, 6, 'Channel volume.'),
        ctl('Bass', 0, 10, 5, 'Full but tight.'),
        ctl('Middle', 0, 10, 6, 'British mids.'),
        ctl('Treble', 0, 10, 6, 'Chimey top end.'),
        sw('Power', 0, ['20 W', '<1 W'], 'The Lionheart has a sub-1-watt mode for home crunch.')
      ],
      tones: [
        tn('Home crunch', { Gain: 7, Volume: 5, Bass: 5, Middle: 6, Treble: 6, Power: 1 }, 'Drive channel, sub-1-watt mode: real EL84 saturation at talking volume.'),
        tn('Blues clean', { Gain: 3, Volume: 6, Bass: 5, Middle: 6, Treble: 6, Power: 0 }, 'Clean channel, master up — warm and touch-sensitive.')
      ],
      artists: ['Tony Iommi (Laney heritage)'],
      genre: ['blues', 'rock']
    }),

    amp({
      id: 'mesa-fillmore', brand: 'Mesa/Boogie', model: 'Fillmore 50', year: '2019', type: 'tube head/combo',
      watts: 50, tube: '5× 12AX7, 2× 6L6', speakers: '1×12" C90 (combo)', channels: 2, price: '£1,900',
      desc: 'Mesa’s take on classic American gain: simpler than a Mark or a Recto, with a warm, dynamic crunch channel that loves pedals.',
      controls: [
        ctl('Gain', 0, 10, 5, 'Crunch channel — 4 is break-up, 7 is full rock roar.'),
        ctl('Treble', 0, 10, 6, 'Warm and musical.'),
        ctl('Middle', 0, 10, 6, 'Mid-forward crunch.'),
        ctl('Bass', 0, 10, 5, 'Full but controlled.'),
        ctl('Presence', 0, 10, 5, 'Subtle bite.'),
        ctl('Master', 0, 10, 4.5, 'Output — the Fillmore is loud when you want it.'),
        ctl('Reverb', 0, 10, 4, 'Long, lush spring.')
      ],
      tones: [
        tn('Classic rock crunch', { Gain: 6, Treble: 6, Middle: 6, Bass: 5, Presence: 5, Master: 5, Reverb: 3 }, 'The Fillmore doing what it does best — classic American crunch with a gorgeous reverb.'),
        tn('Pedal platform', { Gain: 3.5, Treble: 6, Middle: 6, Bass: 5, Presence: 5, Master: 5.5, Reverb: 4 }, 'Clean-ish and loud, ready for a full board.')
      ],
      artists: ['Modern blues & rock'],
      genre: ['blues', 'classic rock']
    }),

    amp({
      id: 'vox-ac10', brand: 'Vox', model: 'AC10C1', year: '2015', type: 'tube combo (1×10)',
      watts: 10, tube: '2× 12AX7, 2× EL84', speakers: '1×10" Celestion VX10', price: '£420',
      desc: 'The smallest AC: 10 watts of chime and early breakup, with reverb. The cheapest way into the Vox sound.',
      controls: [
        ctl('Volume', 0, 10, 6, 'Breaks up around 5 and gets glorious.'),
        ctl('Bass', 0, 10, 4, 'Lean.'),
        ctl('Treble', 0, 10, 6.5, 'Jangle.'),
        ctl('Reverb', 0, 10, 4, 'Digital but convincing.')
      ],
      tones: [
        tn('Classic jangle', { Volume: 6, Bass: 4, Treble: 6.5, Reverb: 4 }, 'The Beatles-in-a-bedroom tone.', 'Early Beatles', 'Vox tradition'),
        tn('Cranked rock', { Volume: 9, Bass: 3.5, Treble: 6, Reverb: 2 }, 'Full crank: thick, compressed EL84 rock.')
      ],
      artists: ['Home & small-gig players'],
      genre: ['indie', 'rock & roll']
    }),

    amp({
      id: 'cornford-harlequin', brand: 'Cornford', model: 'Harlequin', year: '2003', type: 'tube combo (1×12)',
      watts: 6, tube: '3× 12AX7, 2× 6V6', speakers: '1×12" Celestion', channels: 2, price: '—',
      desc: 'A British boutique 6-watt single-ended combo with a huge, saturated voice — a cult favourite for recording.',
      controls: [
        ctl('Gain', 0, 10, 6, 'Saturates beautifully at low volume.'),
        ctl('Volume', 0, 10, 5, 'Surprisingly loud for 6 watts.'),
        ctl('Bass', 0, 10, 5, 'Big for a small amp.'),
        ctl('Middle', 0, 10, 6, 'Rich.'),
        ctl('Treble', 0, 10, 6, 'Sweet.')
      ],
      tones: [
        tn('Studio saturation', { Gain: 8, Volume: 4, Bass: 5, Middle: 6, Treble: 6 }, 'Dimed and mic’d — a huge recorded sound from a tiny amp.', 'Studio rock', 'Boutique studios')
      ],
      artists: ['Session players'],
      genre: ['rock', 'studio']
    }),

    amp({
      id: 'fender-pro-junior', brand: 'Fender', model: 'Pro Junior IV', year: '2018', type: 'tube combo (1×10)',
      watts: 15, tube: '2× 12AX7, 2× EL84', speakers: '1×10" Jensen P10R', price: '£550',
      desc: 'Two knobs, 15 EL84 watts, and a reputation as the best-sounding small Fender for blues-rock. Loud, simple and honest.',
      controls: [
        ctl('Volume', 1, 12, 6, 'The amp does everything: clean below 3, grind above 6.'),
        ctl('Tone', 1, 12, 6, 'Single tone control. 5–7 keeps it sweet with single coils.')
      ],
      tones: [
        tn('Blues-rock grind', { Volume: 8, Tone: 6 }, 'Crank it and use the guitar volume. That is the entire amp.', 'Small-club blues rock', 'Working blues players'),
        tn('Jangly clean', { Volume: 3, Tone: 7 }, 'Set clean with the tone bright — a great pedal platform at 15 watts.')
      ],
      artists: ['Indie & blues players'],
      genre: ['indie', 'blues', 'rock']
    })
  ];

  A.AMPS.push.apply(A.AMPS, MORE);

  /* =================================================================== */
  /* Cabinets & speakers                                                  */
  /* =================================================================== */
  const CABS = [
    { id: 'v30-412', name: '4×12" Celestion Vintage 30 closed back', character: 'Mid-forward, tight low end, aggressive top — the modern rock/metal standard', use: 'Rectifiers, 5150s, high-gain heads', pairing: 'Anything high gain', tips: 'Close-mike at the dust cap for bite, at the cone edge for warmth.' },
    { id: 'greenback-412', name: '4×12" Celestion Greenback (25–30 W) closed back', character: 'Woody mids, soft top, warm and classic — the sound of classic rock', use: 'Plexis, JTM45s, AC30s (2×12)', pairing: 'British amps', tips: 'Only 25–30 W per speaker: a 100 W amp needs four of them and still compresses.' },
    { id: 'g12h-412', name: '4×12" Celestion G12H-30', character: 'Bigger low end and brighter top than a Greenback, 30 W handling', use: 'AC/DC, Hendrix-era Marshall', pairing: 'Plexi, JTM', tips: 'The basketweave-era cabinet speaker — that “Back in Black” thump.' },
    { id: 'g12t75-412', name: '4×12" Celestion G12T-75', character: 'Scooped mids, extended top and bottom', use: '80s and 90s rock cabs (Marshall 1960A)', pairing: 'JCM800/900, DSL', tips: 'Scooped mids make it forgiving live but it can get lost in a band mix.' },
    { id: 'blue-212', name: '2×12" Celestion Blue alnico open back', character: 'Chime, compression and a sweet top end', use: 'Vox AC30, Matchless', pairing: 'EL84 amps', tips: 'Handle only 15 W each — a cranked AC30 is right at the limit.' },
    { id: 'jensen-c12k', name: '1×12" Jensen C12K open back', character: 'Bright American clean with a firm low end', use: 'Deluxe Reverb, Princeton', pairing: 'Blackface Fenders', tips: 'Open-back cabinets throw the sound behind you — mike from the front, amp angled up.' },
    { id: 'twin-212', name: '2×12" Jensen C12K open back', character: 'Huge, bell-like clean with real low-end weight', use: 'Twin Reverb', pairing: 'Blackface Fenders', tips: 'Heavy. Casters change the tone — lift it off the floor for the real sound.' },
    { id: 'svt-810', name: '8×10" Ampeg SVT fridge', character: 'Massive, tight and punchy bass with horn clarity', use: 'Bass heads', pairing: 'SVT, big bass heads', tips: 'The 8×10 is sealed: expect a tight, fast response rather than deep boom.' },
    { id: 'bass-115', name: '1×15" bass cabinet', character: 'Deep, round and warm with less definition', use: 'Vintage bass combos (B-15)', pairing: 'Valve bass amps', tips: 'A 1×15 records beautifully — the mic does not have to work as hard.' },
    { id: 'frfr', name: 'Full-range flat-response (FRFR)', character: 'Neutral — reproduces a modeller exactly as designed', use: 'Kemper, Fractal, Line 6', pairing: 'Modellers & profiles', tips: 'Turn off cabinet simulation if you plug into a guitar cabinet.' }
  ];

  /* =================================================================== */
  /* Microphones & positions                                              */
  /* =================================================================== */
  const MICS = [
    { id: 'sm57', name: 'Shure SM57 (dynamic)', best: 'Guitar cabinets, drums, snare', tone: 'Mid-forward, punchy, sits in a mix with almost no EQ', position: '2–5 cm from the grille, aimed at the point where the dust cap meets the cone', cost: '£100' },
    { id: 'sm58', name: 'Shure SM58 (dynamic)', best: 'Vocals live, loud cabinets', tone: 'Similar to a 57 with a smaller top end', position: 'Same as a 57 but always check the grille is not touching the cloth', cost: '£100' },
    { id: 'md421', name: 'Sennheiser MD421 (dynamic)', best: 'Toms, guitar cabs, bass cabs', tone: 'Full and natural with a controlled top — the “hi-fi dynamic”', position: '1–3 cm from the grille, slightly off-centre; the classic Motown guitar sound', cost: '£350' },
    { id: 'e906', name: 'Sennheiser e906 (dynamic)', best: 'Guitar cabinets live', tone: 'Smoother than a 57 with more top end, hangs on the cab', position: 'Hangs in front of the grille, flat against the cloth', cost: '£170' },
    { id: 'r121', name: 'Royer R-121 (ribbon)', best: 'Guitar cabinets, brass', tone: 'Warm, smooth, no harsh top — the classic “fat” guitar sound', position: '15–30 cm back, slightly off-axis; pair with a 57 for the classic blend', cost: '£1,200' },
    { id: 'u87', name: 'Neumann U87 (large diaphragm condenser)', best: 'Clean guitar amps, vocals, room', tone: 'Detailed and bright; captures the sparkle of a clean amp', position: '30–60 cm back and off-axis for clean amps; watch the SPL on loud cabs (use the pad)', cost: '£2,800' },
    { id: 'km184', name: 'Neumann KM184 (small diaphragm condenser)', best: 'Acoustic guitar, hi-hats', tone: 'Honest, fast transients, natural top end', position: 'Acoustic: 12th fret, 20–30 cm away, angled slightly towards the sound hole', cost: '£700' },
    { id: 're20', name: 'Electro-Voice RE20 (dynamic)', best: 'Bass cabs, kick drum, vocals', tone: 'Deep and tight with no proximity boom — the bass-cabinet standard', position: 'On the grille, slightly off-centre of the cone', cost: '£450' },
    { id: 'roommics', name: 'Room mics (pair of condensers or a single mono mic)', best: 'Adding depth to a close-miked sound', tone: 'Ambience and low-end bloom; move the mic to change the tone', position: '1.5–3 m from the cabinet, at speaker height, angled across the room', cost: 'variable' }
  ];

  const MIKING = [
    { id: 'cap', name: 'On the dust cap (dead centre)', effect: 'Brightest, most aggressive — the classic “metal” placement', how: 'Aim the mic exactly where the dust cap sits, 2 cm from the grille.' },
    { id: 'capedge', name: 'Between dust cap and cone (on-axis)', effect: 'The balanced studio standard: bright but not harsh', how: 'Slide the mic out ~2 cm from centre. The default 57 position.' },
    { id: 'edge', name: 'On the cone edge', effect: 'Warmer, rounder, less attack', how: 'Move to the outside of the speaker, still perpendicular.' },
    { id: 'offaxis', name: 'Off-axis (angled 30–45°)', effect: 'Tames the high end without EQ', how: 'Angle the mic across the cone rather than straight in.' },
    { id: 'distance', name: 'Distance (15–60 cm back)', effect: 'Less low end, more room and air; thinner and more “live”', how: 'Pull the mic back and lower the gain — the proximity effect disappears.' },
    { id: 'two', name: 'Two mics (57 + 121 or 57 + 421)', effect: 'Blend punch and warmth — the classic studio guitar sound', how: 'Push both mics into phase (align the capsules), record to two tracks and blend.' },
    { id: 'reamp', name: 'Re-amping', effect: 'Play a DI track back through a real amp later, in a different mood', how: 'Record DI → send it out through a reamp box → into the amp → mic it.' },
    { id: 'iso', name: 'Isolation / off-axis room treatment', effect: 'Removes room boom when you must record loud', how: 'Blankets, a reflection filter or simply pointing the cab at a sofa.' }
  ];

  /* =================================================================== */
  /* Genre recipes: the amp + the pedals + the settings, per style        */
  /* =================================================================== */
  const GENRES = [
    { id: 'classic-rock', name: 'Classic rock', amp: 'plexi-1959', cabs: 'greenback-412', pedals: ['fuzz-face', 'wah-crybaby', 'phase-90'],
      settings: 'Plexi on High Treble Volume 8, mids 7, bass 4. Fuzz Face for the psychedelic crunch, wah for the leads, Phase 90 slow for the swirl.',
      song: 'Whole Lotta Love — Led Zeppelin', note: 'The whole rig is the amp; the pedals are seasoning. Play with the guitar volume.' },
    { id: 'blues', name: 'Electric blues', amp: 'deluxe-reverb-65', cabs: 'jensen-c12k', pedals: ['ts808', 'analog-delay', 'wah-crybaby'],
      settings: 'Deluxe on 6, bass 4, treble 6, reverb 3; TS808 drive 4, tone 5, level 6 for the mid push.',
      song: 'Pride and Joy — Stevie Ray Vaughan', note: 'Dynamics come from your picking hand, not the gain knob.' },
    { id: 'hard-rock', name: 'Hard rock', amp: 'jcm800-2203', cabs: 'greenback-412', pedals: ['sd-1', 'dd-3', 'wah-crybaby'],
      settings: 'JCM800 preamp 7, mids 6, bass 5; SD-1 drive 2, tone 5, level 7 in front for the tight low end.',
      song: 'Back in Black — AC/DC', note: 'Very little gain, a lot of volume, and the guitar volume doing the work.' },
    { id: '80s-metal', name: '80s metal / thrash', amp: 'jcm800-2203', cabs: 'g12t75-412', pedals: ['ts808', 'noise-gate', 'dd-3'],
      settings: 'JCM800 preamp 9, mids 3, bass 4 with a TS808 set drive 0, level 10 as a boost; gate just killing the hiss.',
      song: 'Master of Puppets — Metallica', note: 'The Tube Screamer is a tone-shaping boost here, not a distortion — drive at 0.' },
    { id: 'modern-metal', name: 'Modern metal', amp: 'dual-rectifier', cabs: 'v30-412', pedals: ['maxon-od808', 'noise-gate', 'analog-delay'],
      settings: 'Recto channel 3 Modern, gain 8.5, mids 3.5, bass 5.5, presence 7; OD808 drive 0, tone 5, level 10.',
      song: 'Modern metal rhythm', note: 'Tight, scooped and gated. Tune down and use a heavy pick.' },
    { id: 'droptuned', name: 'Drop-tuned metalcore', amp: '5150-iii', cabs: 'v30-412', pedals: ['ts9', 'noise-gate', 'chorus'],
      settings: '5150 III channel 3 gain 8, mid 3, presence 7, resonance 6; a gate in the loop and a subtle chorus on the cleans.',
      song: 'Modern metalcore', note: 'Resonance is the secret to the palm-mute thump.' },
    { id: 'stoner', name: 'Stoner / doom', amp: 'orange-rockerverb', cabs: 'v30-412', pedals: ['big-muff', 'phase-90', 'analog-delay'],
      settings: 'Rockerverb gain 9, bass 7, mids 4 with a Big Muff in front; slow phaser and a long analog delay for the swirl.',
      song: 'Songs for the Deaf — Queens of the Stone Age', note: 'Fuzz into a dirty amp, tuned low, played slow.' },
    { id: 'shoegaze', name: 'Shoegaze / dream pop', amp: 'jc-120', cabs: 'twin-212', pedals: ['big-muff', 'dd-3', 'holy-grail'],
      settings: 'JC-120 clean, chorus on, reverb 6, with a Big Muff and a long delay in front.',
      song: 'Loveless — My Bloody Valentine', note: 'The amp stays clean; every texture comes from the pedals.' },
    { id: 'indie', name: 'Indie / alternative', amp: 'ac30', cabs: 'blue-212', pedals: ['rat', 'dd-3', 'holy-grail'],
      settings: 'AC30 brilliant channel 6, cut 4, with a RAT at low gain for the crunch and a delay for the leads.',
      song: 'Indie rock radio', note: 'Chime first, drive second — do not bury the amp’s character.' },
    { id: 'blues-rock', name: 'Blues rock', amp: 'jtm45', cabs: 'greenback-412', pedals: ['ts808', 'wah-crybaby', 'uni-vibe'],
      settings: 'JTM45 jumped channels both at 6, middle 8; a Tube Screamer for solos and the vibe for the psychedelic swirl.',
      song: 'Blues rock live', note: 'The amp is already dirty — the pedals just push it harder.' },
    { id: 'funk', name: 'Funk / soul', amp: 'twin-reverb-65', cabs: 'twin-212', pedals: ['auto-wah', 'compressor', 'phase-90'],
      settings: 'Twin clean, treble 6, mids 7, bass 3.5; envelope filter set sensitive, Dyna Comp for the snap.',
      song: 'Funk rhythm', note: 'Play staccato, palm-mute the bass strings and let the envelope filter track your attack.' },
    { id: 'country', name: 'Country / Nashville', amp: 'twin-reverb-65', cabs: 'jensen-c12k', pedals: ['compressor', 'analog-delay', 'holy-grail'],
      settings: 'Twin clean with the bright switch on, reverb 4; a compressor at medium and a slapback delay at ~90 ms.',
      song: 'Nashville session', note: 'Compression and the Telecaster bridge pickup do the work.' },
    { id: 'jazz', name: 'Jazz', amp: 'jc-120', cabs: 'jensen-c12k', pedals: ['eq-pedal', 'chorus'],
      settings: 'JC-120 clean, treble 5, mids 5, bass 5, chorus light. Maybe a subtle EQ for the neck pickup’s boom.',
      song: 'Jazz standard', note: 'Almost no pedals. The tone is in the neck pickup and your hands.' },
    { id: 'surf', name: 'Surf', amp: 'twin-reverb-65', cabs: 'twin-212', pedals: ['holy-grail', 'tremolo', 'tdr-plate'],
      settings: 'Twin with treble 6, mids 3.5, bass 4.5, reverb 5.5 and the tremolo slow and deep.',
      song: 'Pipeline — The Chantays', note: 'Scooped mids and a splashy spring reverb — the sound of a Fender and a lot of water.' },
    { id: 'acoustic', name: 'Acoustic / singer-songwriter', amp: 'acoustic-amp', cabs: 'frfr', pedals: ['compressor', 'analog-delay', 'chorus'],
      settings: 'Acoustic amp with low cut for the boom, mid slightly up, reverb 3–4 and a compressor for even strumming.',
      song: 'Singer-songwriter stage', note: 'Cut the low end first and the vocal will sit on top of the guitar.' },
    { id: 'doom', name: 'Doom / stoner', amp: 'orange-rockerverb', cabs: 'v30-412', pedals: ['boss-fz-2', 'green-russian-muff', 'analog-delay'],
      settings: 'FZ-2 in Fuzz 2 with Gain 10, Bass 9; Big Muff stacked behind it; a long dark analog delay. Tune down, play slow.',
      song: 'Dopethrone — Electric Wizard', note: 'The low end is the song. Cut nothing, boost everything, and let the chords ring.' },
    { id: 'swedish-death', name: 'Swedish death metal (chainsaw)', amp: 'jcm800-2203', cabs: 'g12t75-412', pedals: ['boss-hm-2', 'noise-gate'],
      settings: 'HM-2 with Level 7, Low 10, High 10, Dist 10 into a dirty channel; the gate just keeps the hiss down between riffs.',
      song: 'Left Hand Path — Entombed', note: 'One pedal, four knobs, all the way up. Tune to B and use the bridge pickup.' },
    { id: 'groove-metal', name: 'Groove metal / Pantera', amp: '6505', cabs: 'v30-412', pedals: ['mxr-dime-distortion', 'wah-535q', 'eq-pedal', 'noise-gate'],
      settings: 'Dime Distortion with Gain 8, Mid 3, Treble 7; wah parked mid-sweep for squeals; a graphic EQ scooping 500 Hz and gating the hiss.',
      song: 'Walk — Pantera', note: 'Solid-state attack and scooped mids. Dig in hard — this tone rewards aggression.' },
    { id: 'dream-pop', name: 'Dream pop / post-rock', amp: 'twin-reverb-65', cabs: 'twin-212', pedals: ['op-amp-muff', 'dd-7', 'bigsky', 'tremolo'],
      settings: 'Big Muff low on the sustain knob for bloom, a long modulated delay plus a shimmer reverb, tremolo slow and shallow underneath.',
      song: 'Post-rock crescendo', note: 'Start clean and add layers: the build comes from effects being switched in one at a time.' },
    { id: 'rockabilly', name: 'Rockabilly / rock & roll', amp: 'bassman-59', cabs: 'jensen-c12k', pedals: ['boss-dm-2', 'tremolo'],
      settings: 'DM-2 at ~100 ms with one repeat (slapback), amp tremolo on the slow ballads, Bassman bright channel 6.',
      song: 'Stray Cat Strut — Stray Cats', note: 'Clean amp, slapback echo, and a bigsby. The echo does the work — keep it short.' },
    { id: 'garage', name: 'Garage / psych', amp: 'supro-thunderbolt', cabs: 'jensen-c12k', pedals: ['mosrite-fuzzrite', 'wah-crybaby', 'tremolo'],
      settings: 'Fuzzrite Depth 8 into a small amp at 9, wah swept for the psych parts, tremolo deep and slow for the moody sections.',
      song: 'In-A-Gadda-Da-Vida — Iron Butterfly', note: 'Primitive fuzz, small amp, no fidelity. The wrongness is the sound.' },
    { id: 'funk-rock', name: 'Funk rock', amp: 'silver-jubilee-2555', cabs: 'g12h-412', pedals: ['ibanez-wh10', 'dyna-comp', 'boss-ce-1'],
      settings: 'WH10 cocked halfway with the compressor evening out the dynamics, CE-1 chorus light, amp clean-ish and mid-forward.',
      song: 'Funk rock rhythm', note: 'Play short, muted notes and let the wah + compressor do the percussive work.' }
  ];

  A.GENRES = GENRES;
  A.CABS = CABS;
  A.MICS = MICS;
  A.MIKING = MIKING;
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
})();
