/* Trill Tuner — pedal & effect library, part 1: dirt and tone shaping.
 *
 * fuzz · distortion · overdrive · boost · EQ · compressor · wah · filter
 *
 * Every pedal carries its real name, the real knob names and ranges, and
 * dialed-in settings for the records that made it famous — plus a note on where
 * it belongs in the signal chain and what it stacks well with.
 *
 * part 2 (lib/pedals2.js) adds modulation, delay, reverb, pitch and utility and
 * registers itself into the same list, so load this file first.
 */
(function () {
  'use strict';

  function ctl(name, min, max, def, tip) { return { name: name, min: min, max: max, def: def, tip: tip || '' }; }
  function ic(song, artist, settings, note) { return { song: song, artist: artist, settings: settings, note: note || '' }; }

  function Pd(id, brand, name, cat, year, desc, controls, iconic, meta) {
    const m = meta || {};
    return {
      id: id, brand: brand, name: name, cat: cat, year: year, desc: desc,
      controls: controls, iconic: iconic,
      power: m.power || '9 V DC centre-negative',
      bypass: m.bypass || 'true bypass',
      slot: m.slot || 'dirt',
      stack: m.stack || '',
      price: m.price || '',
      kind: m.kind || 'analog'
    };
  }

  /* slot guide: guitar = first in chain · dirt = drive section ·
   * comp · eq · mod = modulation · time = delay/reverb · utility = end/loop */
  const P = [];

  /* =================================================================== */
  /* Overdrive                                                            */
  /* =================================================================== */
  P.push(Pd('ts808', 'Ibanez', 'Tube Screamer TS808', 'overdrive', 1979,
    'The most-used overdrive in history. Mid-hump, soft clipping and that famous low-cut that tightens a dirty amp into a riff machine.',
    [ctl('Drive', 0, 10, 4, '4 is a push, 7 is a real overdrive. Keep it low if you are using it as a boost.'),
     ctl('Tone', 0, 10, 5, 'The classic setting is 5. Past 7 it gets brittle; below 3 it is warm and syrupy.'),
     ctl('Level', 0, 10, 6, 'Where the magic happens: level up, drive down, and your amp does the distorting.')],
    [ic('Pride and Joy — Stevie Ray Vaughan', 'Stevie Ray Vaughan', { Drive: 3, Tone: 4, Level: 8 }, 'SRV stacked two of these with a DS-1 into a cranked Fender.'),
     ic('Master of Puppets — Metallica', 'Kirk Hammett', { Drive: 0.5, Tone: 5, Level: 10 }, 'Used as a clean-ish boost into a cranked JCM800 — drive nearly off, level maxed.'),
     ic('Every blues gig since 1979', '—', { Drive: 4, Tone: 5, Level: 6 }, 'The universal “more” button.')],
    { slot: 'dirt', price: '£180', stack: 'Loves a Strat into a mid-forward amp. Stack two for a solo boost.', power: '9 V DC, ~7 mA (or a 9 V battery)' }));

  P.push(Pd('ts9', 'Ibanez', 'Tube Screamer TS9', 'overdrive', 1982,
    'The reissue-standard Tube Screamer: slightly brighter and less compressed than the 808, with the same mid push.',
    [ctl('Drive', 0, 10, 4, 'Same recipe as the 808 — drive low, level high for amp pushing.'),
     ctl('Tone', 0, 10, 5, 'A touch brighter than the 808; try 4.5–5.5.'),
     ctl('Level', 0, 10, 6, 'Your amp’s best friend.'),
     ctl('Switch', 0, 1, 0, 'Some models add a mode switch — classic TS9 or a hotter modified voice.')],
    [ic('Whatever the radio was playing in 1985', '—', { Drive: 4, Tone: 5, Level: 6 }, 'The go-to with a Les Paul into a JCM800.'),
     ic('Blues rock rhythm', '—', { Drive: 5, Tone: 5, Level: 5 }, 'Into an already-crunching amp for a fat rhythm tone.')],
    { slot: 'dirt', price: '£110' }));

  P.push(Pd('maxon-od808', 'Maxon', 'OD808 Overdrive', 'overdrive', 1979,
    'The original manufacturer’s take on the 808 — the same circuit Maxon built for Ibanez, now the modern metal boost of choice.',
    [ctl('Drive', 0, 10, 3, 'Set near zero for the metal boost trick.'),
     ctl('Balance', 0, 10, 7, 'Level. Max it to slam the amp’s input.'),
     ctl('Tone', 0, 10, 5, 'Neutral; 4–6 covers everything.')],
    [ic('Modern metal rhythm', '—', { Drive: 0, Balance: 10, Tone: 5 }, 'Drive at zero, level at 10 — tightens a high-gain amp without adding fizz.'),
     ic('Blues lead', '—', { Drive: 5, Balance: 6, Tone: 5 }, 'A warmer, rounder overdrive when you push the drive.')],
    { slot: 'dirt', price: '£150' }));

  P.push(Pd('sd-1', 'Boss', 'SD-1 Super OverDrive', 'overdrive', 1981,
    'Boss’s asymmetrical-clipping overdrive: smoother and more compressed than a Tube Screamer, with a slightly darker voice. £70 of gigging insurance.',
    [ctl('Level', 0, 10, 6, 'Output. Turning this up pushes the amp harder.'),
     ctl('Tone', 0, 10, 5, '5 is neutral; back it off for humbuckers.'),
     ctl('Drive', 0, 10, 4, '4 is a nice crunch, 7+ is a fuzzy saturation.')],
    [ic('Hard rock crunch', '—', { Level: 7, Tone: 5, Drive: 2 }, 'A classic JCM800 boost: drive low, level high.'),
     ic('Van Halen-era rhythm', '—', { Level: 6, Tone: 4, Drive: 5 }, 'The pedal widely credited with the “brown sound” push.')],
    { slot: 'dirt', price: '£75', power: '9 V DC, ~6 mA (Boss ACA/PSA won’t matter on a modern board)' }));

  P.push(Pd('bd-2', 'Boss', 'BD-2 Blues Driver', 'overdrive', 1995,
    'Transparent, dynamic and amp-like: it sounds like your amp turned up, not like a pedal. A cult favourite of blues and indie players.',
    [ctl('Level', 0, 10, 5, 'Output level.'),
     ctl('Tone', 0, 10, 5, 'Wide range — 3 for warm jazz, 7 for bite.'),
     ctl('Gain', 0, 10, 4, '1–3 is a clean boost, 4–6 crunch, 7+ a fuzzy roar.')],
    [ic('Indie/blues crush', '—', { Level: 5, Tone: 5, Gain: 5 }, 'Into a clean amp for that “amp about to explode” tone.'),
     ic('Clean boost', '—', { Level: 7, Tone: 4, Gain: 1 }, 'On 1 it is a superb transparent boost.')],
    { slot: 'dirt', price: '£95' }));

  P.push(Pd('od-3', 'Boss', 'OD-3 OverDrive', 'overdrive', 1997,
    'Bigger, warmer and more open than an SD-1 — the “grown-up” Boss overdrive with a natural, amp-like response.',
    [ctl('Level', 0, 10, 5, 'Output.'), ctl('Tone', 0, 10, 5, 'Neutral at 5.'),
     ctl('Drive', 0, 10, 5, '5 is a solid rock crunch; 8 gets thick.')],
    [ic('Rock rhythm', '—', { Level: 5, Tone: 5, Drive: 5 }, 'Into a clean-ish British amp for classic rock rhythm.')],
    { slot: 'dirt', price: '£95' }));

  P.push(Pd('klon-centaur', 'Klon', 'Centaur (and its many clones)', 'overdrive', 1994,
    'The mythical transparent overdrive/boost with a germanium-blend clean path. Originals cost five figures; clones like the Tumnus, Archer and Soul Food get you there.',
    [ctl('Gain', 0, 10, 3, 'Low gain by design: 0–4 is the whole point. It adds harmonics rather than distortion.'),
     ctl('Treble', 0, 10, 5, '5 is flat; a small push brightens a dark rig.'),
     ctl('Output', 0, 10, 6, 'Use it to shove a clean amp into breakup.')],
    [ic('Studio-clean lead tone', '—', { Gain: 2, Treble: 5, Output: 7 }, 'Into a blackface Fender at volume — the sound of a thousand session records.'),
     ic('Always-on boost', '—', { Gain: 1, Treble: 5.5, Output: 6 }, 'Left on, nearly transparent, makes everything sound better.')],
    { slot: 'dirt', price: '£5,000+ (original) / £100–200 (clones)', stack: 'Great after a fuzz to tame and focus it.' }));

  P.push(Pd('timmy', 'MXR', 'Timmy Overdrive', 'overdrive', 2016,
    'The transparent overdrive with a bass and treble cut rather than a tone knob — dial tone to suit any amp without adding colour.',
    [ctl('Gain', 0, 10, 4, 'Low-gain magic; 1–5 is the sweet range.'),
     ctl('Bass', 0, 10, 5, 'It cuts as your amp gets dirty — the secret to its transparency.'),
     ctl('Treble', 0, 10, 5, 'Cut only, from flat at 5.'),
     ctl('Volume', 0, 10, 6, 'Output.'),
     ctl('Mode', 0, 1, 0, 'Switch between two clipping voices — some versions add a “sym/asym” switch.')],
    [ic('Ambient indie lead', '—', { Gain: 4, Bass: 4, Treble: 5, Volume: 6 }, 'With a delay and reverb — a huge, dynamic lead with no colour added.'),
     ic('Session player’s always-on', '—', { Gain: 2, Bass: 4, Treble: 5, Volume: 6 }, 'Used to make pedals and amps play nicely together.')],
    { slot: 'dirt', price: '£180' }));

  P.push(Pd('ocd', 'Fulltone', 'OCD', 'overdrive', 1999,
    'Half overdrive, half distortion: a huge, dynamic pedal that goes from clean boost to fat amp-like roar with a smooth high-gain voice.',
    [ctl('Volume', 0, 10, 5, 'Output — there is a lot of it.'),
     ctl('Tone', 0, 10, 5, 'Wide: 3 is dark and thick, 7 is bright.'),
     ctl('Drive', 0, 10, 5, '5 is crunchy; 8 is a wall.'),
     ctl('HP/LP switch', 0, 1, 0, 'High peak (brighter, more aggressive) or low peak (warmer, more compressed).')],
    [ic('Modern rock rhythm', '—', { Volume: 5, Tone: 5, Drive: 5, 'HP/LP switch': 0 }, 'A gain pedal that cleans up beautifully with the guitar volume.'),
     ic('Fat lead', '—', { Volume: 6, Tone: 4, Drive: 7, 'HP/LP switch': 1 }, 'Low peak, drive up — thick and saturated.')],
    { slot: 'dirt', price: '£160' }));

  P.push(Pd('plumes', 'EarthQuaker', 'Plumes', 'overdrive', 2018,
    'Three voices of Tube Screamer in one box: classic, a cleaner brighter mode, and a full-range mode without the low-cut.',
    [ctl('Level', 0, 10, 6, 'Output.'), ctl('Tone', 0, 10, 5, 'Neutral at 5.'),
     ctl('Gain', 0, 10, 4, '4 is the TS-ish crunch.'),
     ctl('Voice', 0, 2, 0, 'Mode 1: stock with mid hump · Mode 2: more gain and low end · Mode 3: no clipping, transparent boost.')],
    [ic('Metal boost', '—', { Level: 8, Tone: 5, Gain: 1, Voice: 0 }, 'Mode 1 with gain nearly off is the perfect amp tightener.'),
     ic('Transparent boost', '—', { Level: 7, Tone: 5, Gain: 3, Voice: 2 }, 'Mode 3 for a flat, clean boost.')],
    { slot: 'dirt', price: '£100' }));

  P.push(Pd('odr-1', 'Nobels', 'ODR-1', 'overdrive', 1985,
    'The Nashville player’s secret: transparent, sweet and fat, with a bass cut control so it never gets muddy. The sound of modern country and indie.',
    [ctl('Drive', 0, 10, 4, 'Low to medium; it is a personality pedal, not a gain monster.'),
     ctl('Spectrum', 0, 10, 5, 'The “tone” — it shifts the whole mids balance. 5.5 is the sweet spot.'),
     ctl('Level', 0, 10, 6, 'Plenty of output available.'),
     ctl('Bass Cut', 0, 10, 5, 'The magic control for taming boom. 5–7 with humbuckers.')],
    [ic('Nashville session crunch', '—', { Drive: 4, Spectrum: 5.5, Level: 6, 'Bass Cut': 6 }, 'Always-on with a Telecaster into a clean Deluxe.'),
     ic('Indie jangle', '—', { Drive: 3, Spectrum: 6, Level: 6, 'Bass Cut': 5 }, 'Adds sweetness without hiding the amp.')],
    { slot: 'dirt', price: '£90' }));

  P.push(Pd('morning-glory', 'JHS', 'Morning Glory', 'overdrive', 2012,
    'A transparent, low-gain overdrive and booster that made JHS famous: it adds a warm, open crunch without flattening your tone.',
    [ctl('Volume', 0, 10, 6, 'Output.'), ctl('Drive', 0, 10, 4, 'Low gain — think “amp breaking up”, not “distortion”.'),
     ctl('Tone', 0, 10, 5, 'Neutral-ish at 5.'), ctl('Bright', 0, 1, 0, 'Adds a touch of top end for dark amps or neck pickups.')],
    [ic('Always-on low gain', '—', { Volume: 6, Drive: 3, Tone: 5, Bright: 0 }, 'The pedal that stays on all night.'),
     ic('Blues rock lead', '—', { Volume: 7, Drive: 5, Tone: 5, Bright: 1 }, 'Push it with a second drive for solos.')],
    { slot: 'dirt', price: '£180' }));

  P.push(Pd('bb-preamp', 'Xotic', 'BB Preamp', 'overdrive', 2004,
    'A boutique overdrive with a 2-band EQ so you can fix your rig’s balance while adding gain — hugely popular with session players.',
    [ctl('Gain', 0, 10, 5, 'Enough to push a clean amp right to the edge.'),
     ctl('Volume', 0, 10, 5, 'Output.'),
     ctl('Bass', 0, 10, 5, 'Active EQ: 0–10, 5 is flat.'),
     ctl('Treble', 0, 10, 5, 'Active EQ: 5 is flat.')],
    [ic('Corrective overdrive', '—', { Gain: 4, Volume: 5, Bass: 6, Treble: 6 }, 'Use the EQ to balance a dark room or a boomy venue.')],
    { slot: 'dirt', price: '£160', stack: 'One of the best pedals to put in front of a fuzz for a focused, mid-forward stack.' }));

  P.push(Pd('full-drive-2', 'Fulltone', 'Full-Drive 2', 'overdrive', 1996,
    'A Tube Screamer with a boost channel built in: two switches, two sounds, and a “comp-cut” mode for clean-tone fans.',
    [ctl('Volume', 0, 10, 5, 'Output of the overdrive channel.'),
     ctl('Tone', 0, 10, 5, 'Treble.'),
     ctl('Drive', 0, 10, 5, 'Overdrive amount.'),
     ctl('Boost', 0, 10, 5, 'The second channel’s volume — set it above the main volume for solos.'),
     ctl('Mode', 0, 2, 0, 'Comp-cut (flat, no compression), FM (flat mids), Vintage (TS-style mid hump).')],
    [ic('Solo boost', '—', { Volume: 5, Tone: 5, Drive: 4, Boost: 7, Mode: 2 }, 'Rhythm on, boost off; flick the switch for the solo.'),
     ic('Blues crunch', '—', { Volume: 6, Tone: 4, Drive: 6, Boost: 5, Mode: 0 }, 'Comp-cut mode with a Strat — a lovely, uncompressed blues grit.')],
    { slot: 'dirt', price: '£190' }));

  P.push(Pd('ocd-clone-joyo', 'Joyo', 'Ultimate Drive', 'overdrive', 2012,
    'Famously good budget clone of the OCD — same fat, dynamic drive for a tenth of the price. The beginner’s secret weapon.',
    [ctl('Volume', 0, 10, 5, 'Output.'), ctl('Tone', 0, 10, 5, 'Treble.'),
     ctl('Drive', 0, 10, 5, 'Gain.'), ctl('Hi/Lo', 0, 1, 1, 'High peak (brighter) or low peak (fatter).')],
    [ic('Budget rock rig', '—', { Volume: 5, Tone: 5, Drive: 6, 'Hi/Lo': 0 }, 'Sounds startlingly close to its inspiration.')],
    { slot: 'dirt', price: '£35' }));

  /* =================================================================== */
  /* Distortion                                                           */
  /* =================================================================== */
  P.push(Pd('rat', 'ProCo', 'RAT 2', 'distortion', 1979,
    'The most versatile distortion pedal ever made: from a gritty boost to a fuzzy wall, with a filter control instead of a tone knob.',
    [ctl('Distortion', 0, 10, 5, '3 is a crunchy boost, 5 is classic rock, 8 is 80s metal territory.'),
     ctl('Filter', 0, 10, 5, 'Works backwards: 10 is darkest, 0 is brightest. 5 is the balanced start.'),
     ctl('Volume', 0, 10, 6, 'Output.')],
    [ic('Hair metal lead', '—', { Distortion: 6, Filter: 4, Volume: 6 }, 'Into a Marshall with a touch of delay — the 80s lead tone.'),
     ic('Nirvana dirt', '—', { Distortion: 8, Filter: 5.5, Volume: 6 }, 'Driven hard, fuzz-adjacent and spluttery — the grunge sound.', 'Smells Like Teen Spirit — Nirvana', 'Kurt Cobain'),
     ic('Blues crunch', '—', { Distortion: 3, Filter: 5, Volume: 6 }, 'Low distortion, filter mid — a great blues/rock crunch into a clean amp.')],
    { slot: 'dirt', price: '£90', kind: 'analog' }));

  P.push(Pd('ds-1', 'Boss', 'DS-1 Distortion', 'distortion', 1978,
    'The orange pedal on every pedalboard since 1978. Bright, cutting and famously good stacked after a Tube Screamer.',
    [ctl('Level', 0, 10, 5, 'Output.'), ctl('Tone', 0, 10, 5, 'Bright; 4 keeps humbuckers civilised.'),
     ctl('Dist', 0, 10, 6, '6 is a solid rock distortion, 8+ is 90s alternative.')],
    [ic('Alternative rock rhythm', '—', { Level: 5, Tone: 4, Dist: 6 }, 'With the amp crunching, distortion lowish — the 90s sound.'),
     ic('Pride and Joy — Stevie Ray Vaughan', 'Stevie Ray Vaughan', { Level: 8, Tone: 4, Dist: 2 }, 'Used the way SRV used it: as a dirty boost into a Tube Screamer.')],
    { slot: 'dirt', price: '£70' }));

  P.push(Pd('ds-2', 'Boss', 'DS-2 Turbo Distortion', 'distortion', 1987,
    'The DS-1’s wilder sibling: two modes, one of which is the piercing, harmonically rich Voice of grunge.',
    [ctl('Level', 0, 10, 6, 'Output.'), ctl('Tone', 0, 10, 5, 'Bright.'),
     ctl('Dist', 0, 10, 7, 'Mode 1 is classic; mode 2 saturates further.'),
     ctl('Mode', 0, 1, 0, 'Mode I: tighter and more classic. Mode II: mid-heavy and screaming.')],
    [ic('Grunge lead', '—', { Level: 6, Tone: 5, Dist: 8, Mode: 1 }, 'Mode II, distortion up — that “Teen Spirit” style wall.', 'Smells Like Teen Spirit — Nirvana', 'Kurt Cobain')],
    { slot: 'dirt', price: '£95' }));

  P.push(Pd('mt-2', 'Boss', 'MT-2 Metal Zone', 'distortion', 1991,
    'The most divisive pedal in history — and, set up right, a mid-sweeping monster. The 4-band EQ is what most people ignore.',
    [ctl('Level', 0, 10, 5, 'Output.'),
     ctl('Low', 0, 10, 6, 'Scoop it to 3 for a tight modern sound.'),
     ctl('High', 0, 10, 5, '5 is neutral.'),
     ctl('Mid', 0, 10, 3, 'This is the trick: keep mids low unless you play leads.'),
     ctl('Mid Freq', 0, 10, 5, 'Sweeps the mid band — 3 for a low-mid scoop, 7 for upper-mid cut-through.'),
     ctl('Dist', 0, 10, 6, '6–8 for metal.')],
    [ic('Melodic death metal', '—', { Level: 5, Low: 6, High: 5, Mid: 3, 'Mid Freq': 3, Dist: 7 }, 'The classic “scooped mids” metal tone — follow it with a delay for leads.'),
     ic('Thrash rhythm', '—', { Level: 6, Low: 5, High: 6, Mid: 4, 'Mid Freq': 6, Dist: 6 }, 'Mid freq up at 6 keeps you audible in a thrash mix.')],
    { slot: 'dirt', price: '£95', stack: 'Surprisingly good as a preamp into a clean amp, or with the distortion low as a tube-like boost.' }));

  P.push(Pd('distortion-plus', 'MXR', 'Distortion+ (Script / M104)', 'distortion', 1973,
    'A 70s classic: two knobs, huge output, smooth germanium-ish clipping. Randy Rhoads used one into a cranked Marshall — instant 1980 metal.',
    [ctl('Output', 0, 10, 6, 'Massive output — this is what makes it sing into a hot amp.'),
     ctl('Distortion', 0, 10, 5, '5 is a warm roar; 8+ is fuzzy and thick.')],
    [ic('Blizzard of Ozz lead', '—', { Output: 7, Distortion: 5 }, 'Into a cranked Marshall with a wah — the tone of the first Ozzy records.', 'Crazy Train — Ozzy Osbourne', 'Randy Rhoads'),
     ic('Classic rock crunch', '—', { Output: 6, Distortion: 4 }, 'Lower distortion, high output — the original 70s boost.')],
    { slot: 'dirt', price: '£100' }));

  P.push(Pd('big-muff', 'Electro-Harmonix', 'Big Muff Pi (NYC reissue)', 'fuzz', 1969,
    'The violin-like fuzz that defined Pink Floyd, Smashing Pumpkins and shoegaze: endless sustain, thick mids scoop and a tone control that sweeps from mud to razor.',
    [ctl('Volume', 0, 10, 7, 'There is a lot of it — start at 5.'),
     ctl('Tone', 0, 10, 4, 'Left is dark and creamy, right is bright and buzzy. 3–5 is the classic Floyd zone.'),
     ctl('Sustain', 0, 10, 8, 'The famous knob. 8–10 gives that endless, singing sustain.')],
    [ic('Comfortably Numb solo', 'David Gilmour', { Volume: 7, Tone: 4, Sustain: 8 }, 'Into a Hiwatt or a Twin — the definitive Muff sound.', 'Comfortably Numb — Pink Floyd', 'David Gilmour'),
     ic('Cherub Rock — The Smashing Pumpkins', 'Billy Corgan', { Volume: 6, Tone: 3, Sustain: 9 }, 'Stacked with a clean amp and lots of reverb — the pumpkin wall.')],
    { slot: 'dirt', price: '£90', stack: 'Loves a Tube Screamer after it to restore mids, and a mid-forward amp to sit behind it.' }));

  P.push(Pd('fuzz-face', 'Dunlop', 'Fuzz Face (Fuzz Face Mini)', 'fuzz', 1966,
    'Two germanium transistors, one of the most interactive pedals ever built: it cleans up when you roll the guitar volume back and howls when you do not.',
    [ctl('Fuzz', 0, 10, 8, 'Roll it back for a gritty overdrive — the Fuzz Face is a volume-knob pedal.'),
     ctl('Volume', 0, 10, 6, 'Output — and it matters, because the Fuzz Face wants to be first in the chain.')],
    [ic('Are You Experienced lead', 'Jimi Hendrix', { Fuzz: 9, Volume: 7 }, 'Guitar volume at 10 with a Strat — the definitive fuzz tone. Roll back to 6 and it becomes a beautiful overdrive.', 'Purple Haze — Jimi Hendrix', 'Jimi Hendrix'),
     ic('Rhythm crunch', '—', { Fuzz: 7, Volume: 6 }, 'Guitar volume at 7 — a warm, dynamic rhythm crunch with amazing touch response.')],
    { slot: 'guitar', price: '£150', power: 'Carbon-zinc battery preferred: it will not work with a modern power supply on many germanium models', bypass: 'true bypass (some models are vintage-buffer)', stack: 'First in the chain, before wahs and before buffers. Put a wah after a Fuzz Face for the classic Hendrix effect.' }));

  P.push(Pd('fuzz-factory', 'ZVEX', 'Fuzz Factory', 'fuzz', 1995,
    'Five knobs and infinite chaos: the Germanium Fuzz Face with the bias starved, the gain boosted and the self-oscillation left on purpose. Guitars, and theremins.',
    [ctl('Volume', 0, 10, 6, 'Output — and the instrument that can be heard across town.'),
     ctl('Gate', 0, 10, 6, 'Controls the starved-transistor sputter: high gate = gated, staccato fuzz.'),
     ctl('Comp', 0, 10, 5, 'Compression and sustain of the fuzz voice.'),
     ctl('Drive', 0, 10, 5, 'Clean blend of the input — adds definition back into the muck.'),
     ctl('Stab', 0, 10, 5, 'The self-oscillation pitch control. Silence it at 0, scream at 10.'),
     ctl('Gate / Comp / Drive / Stab', 0, 10, 5, 'Wildly interactive — the settings depend on each other.')],
    [ic('Muse lead', 'Matt Bellamy', { Volume: 6, Gate: 3, Comp: 8, Drive: 5, Stab: 7 }, 'The Muse sound: unpredictable, siren-like and utterly huge.', 'Plug In Baby — Muse', 'Matt Bellamy'),
     ic('Velcro rhythm', '—', { Volume: 6, Gate: 8, Comp: 4, Drive: 4, Stab: 0 }, 'Gated and sputtery — perfect for weird indie riffs.')],
    { slot: 'guitar', price: '£250', stack: 'Deserves to be first in the chain and after nothing. Expect everything else in your rig to react differently.' }));

  P.push(Pd('woolly-mammoth', 'ZVEX', 'Woolly Mammoth', 'fuzz', 1999,
    'A bass-friendly fuzz with a “pinch” control that scoops and squeezes — fat, woolly and percussive, used by Muse and Queens of the Stone Age.',
    [ctl('P, the Knob', 0, 10, 6, 'Pinches the fuzz into a tighter, spitting texture.'),
     ctl('Wool', 0, 10, 7, 'The fatness — bass response.'),
     ctl('Bass', 0, 10, 5, 'Low-end contour.'),
     ctl('Tone', 0, 10, 6, 'Top-end definition.'),
     ctl('Level', 0, 10, 6, 'Output.')],
    [ic('Stoner riff', 'Josh Homme', { 'P, the Knob': 5, Wool: 8, Bass: 6, Tone: 5, Level: 6 }, 'Fat and spitting, with the low end intact on a downtuned guitar.', 'Songs for the Deaf — Queens of the Stone Age', 'Josh Homme')],
    { slot: 'guitar', price: '£250' }));

  P.push(Pd('fz-1w', 'Boss', 'FZ-1W Fuzz', 'fuzz', 2021,
    'Boss’s modern germanium-flavoured fuzz: vintage silicon/germanium modes with a buffer-friendly design, so it works anywhere in the chain.',
    [ctl('Level', 0, 10, 6, 'Output.'), ctl('Tone', 0, 10, 5, 'From dark and thick to bright and spitting.'),
     ctl('Fuzz', 0, 10, 7, 'Fuzz amount.'), ctl('Mode', 0, 1, 0, 'Vintage: warm germanium-style. Modern: more gain and a tighter low end.')],
    [ic('Modern fuzz rock', '—', { Level: 6, Tone: 5, Fuzz: 7, Mode: 1 }, 'A tight, modern fuzz that works with any pedalboard.')],
    { slot: 'guitar', price: '£150', bypass: 'buffered' }));

  P.push(Pd('fuzz-war', 'Death by Audio', 'Fuzz War', 'fuzz', 2008,
    'A wall-of-sound fuzz with a tone control that sweeps into massive, blown-out low end. Loud, dirty, and beloved by garage and psych bands.',
    [ctl('Fuzz', 0, 10, 8, 'Eight is the setting. Nine is more.'),
     ctl('Tone', 0, 10, 5, 'Wide range — it becomes a low-end monster towards 0.'),
     ctl('Level', 0, 10, 7, 'Very, very loud.')],
    [ic('Psych wall', '—', { Fuzz: 8, Tone: 4, Level: 6 }, 'A giant, ragged fuzz — the sound of a very small room.')],
    { slot: 'guitar', price: '£180' }));

  P.push(Pd('super-fuzz', 'Behringer', 'SF300 Super Fuzz', 'fuzz', 2015,
    'A £30 clone of the Shin-ei/Univox Super Fuzz — the octave-up, scooped, speaker-tearing fuzz of the 60s garage scene.',
    [ctl('Level', 0, 10, 6, 'Output.'), ctl('Gain', 0, 10, 7, 'Fuzz amount. The Super Fuzz is gated and spluttery at low settings.'),
     ctl('Tone', 0, 10, 5, 'Scoops and boosts the octave.'),
     ctl('Mode', 0, 2, 0, 'Fuzz 1 (scooped and octave-y) · Fuzz 2 (fatter) · Boost.')],
    [ic('Garage rock freakout', '—', { Level: 6, Gain: 8, Tone: 5, Mode: 0 }, 'Octave-up leads and a nasty, spluttering rhythm tone.')],
    { slot: 'guitar', price: '£30' }));

  /* =================================================================== */
  /* Boost / EQ                                                           */
  /* =================================================================== */
  P.push(Pd('treble-boost', 'Dallas Arbiter', 'Rangemaster Treble Booster', 'boost', 1965,
    'The secret weapon of Brian May, Tony Iommi and Rory Gallagher: a germanium single-transistor boost that pushes only the upper mids, driving a valve amp into singing, cutting distortion.',
    [ctl('Boost', 0, 10, 6, 'There is only one control — and it does a lot. 5 is a lift, 8 is a different amp.'),
     ctl('Battery condition', 0, 10, 8, 'Germanium boosters sound best on a part-used carbon battery — a fresh one makes them harsh.')],
    [ic('Bohemian Rhapsody solo — Queen', 'Brian May', { Boost: 7, 'Battery condition': 7 }, 'Treble booster into three cranked AC30s — the most famous booster sound in rock.', 'Bohemian Rhapsody — Queen', 'Brian May'),
     ic('Black Sabbath — Paranoid', 'Tony Iommi', { Boost: 6, 'Battery condition': 6 }, 'Into a Laney or a Plexi for the original metal crunch.', 'Paranoid — Black Sabbath', 'Tony Iommi'),
     ic('Rory Gallagher slide', 'Rory Gallagher', { Boost: 8, 'Battery condition': 7 }, 'Dimed into a small combo, played with the guitar volume to clean up.', 'Bullfrog Blues — Rory Gallagher', 'Rory Gallagher')],
    { slot: 'guitar', price: '£150–250 (originals) / £60 (clones)', power: '9 V battery recommended: a fresh supply sounds brighter and harsher', stack: 'First in the chain, straight into a valve amp that is already at 7+. Into a clean amp it can sound thin and scratchy.' }));

  P.push(Pd('micro-amp', 'MXR', 'Micro Amp (M133)', 'boost', 1977,
    'One knob: gain. A clean, transparent +26 dB boost that pushes an amp into natural compression. The original “more” pedal.',
    [ctl('Gain', 0, 10, 5, 'A little goes a long way: 3 is a small lift, 6+ slams the input stage.')],
    [ic('Solo boost', '—', { Gain: 6 }, 'Set above your rhythm level and click it on for leads.'),
     ic('Amp pusher', '—', { Gain: 8 }, 'Into a non-master amp to get power-amp overdrive.')],
    { slot: 'dirt', price: '£90', bypass: 'buffered' }));

  P.push(Pd('ep-booster', 'Xotic', 'EP Booster', 'boost', 2009,
    'A tiny Echoplex-preamp-style boost with internal dip switches for +3 or +6 dB and a bright/normal voicing. The stealth pedal on a thousand pro boards.',
    [ctl('Volume', 0, 10, 4, 'Even at 4 there is a real lift; the EP adds a warm, slightly compressed colour.'),
     ctl('Dip switches (internal)', 0, 3, 0, '+3/+6 dB and a bright/normal voicing — you will need a screwdriver.')],
    [ic('Make everything better', '—', { Volume: 4 }, 'Always on. Fat and warm with no obvious EQ change.'),
     ic('Solo lift', '—', { Volume: 6 }, 'A subtle, musical solo boost.')],
    { slot: 'dirt', price: '£130', bypass: 'true bypass' }));

  P.push(Pd('spark-booster', 'TC Electronic', 'Spark Booster', 'boost', 2012,
    'A boost with a real 2-band EQ and three modes — clean, mid-boosted and fat — so it can fix and shape as well as lift.',
    [ctl('Gain', 0, 10, 5, 'Up to +26 dB — go easy.'), ctl('Level', 0, 10, 5, 'Output trim.'),
     ctl('Bass', 0, 10, 5, 'Active: neutral at 5.'), ctl('Treble', 0, 10, 5, 'Active: neutral at 5.'),
     ctl('Mode', 0, 2, 0, 'Clean · Mid · Fat — choose your flavour of boost.')],
    [ic('Mid-boost lead', '—', { Gain: 5, Level: 5, Bass: 5, Treble: 5, Mode: 1 }, 'Mid mode cuts through a dense mix for solos.'),
     ic('Fat clean', '—', { Gain: 3, Level: 5, Bass: 6, Treble: 5, Mode: 2 }, 'Fat mode adds low-end girth to a thin-sounding guitar.')],
    { slot: 'dirt', price: '£110' }));

  P.push(Pd('ge-7', 'Boss', 'GE-7 Equalizer', 'eq', 1981,
    'Seven bands and a level slider — the pedal that fixes problem venues, scoops mids for metal, and turns one guitar into two.',
    [ctl('Level', 0, 10, 5, 'Overall output — often used as a boost.'),
     ctl('100 Hz', -15, 15, 0, 'Add chest-punch, or cut boom in a small room.'),
     ctl('200 Hz', -15, 15, 0, 'Boxiness lives here in a small room — a small cut works wonders.'),
     ctl('400 Hz', -15, 15, 0, 'The muddy zone.'),
     ctl('800 Hz', -15, 15, 0, 'Midrange honk.'),
     ctl('1.6 kHz', -15, 15, 0, 'Definition and attack.'),
     ctl('3.2 kHz', -15, 15, 0, 'String detail.'),
     ctl('6.4 kHz', -15, 15, 0, 'Air and shimmer — or hiss.')],
    [ic('Metal mid scoop', '—', { Level: 5, '100 Hz': 3, '200 Hz': -4, '400 Hz': -10, '800 Hz': -6, '1.6 kHz': 4, '3.2 kHz': 6, '6.4 kHz': 3 }, 'In the effects loop, this is the classic scoop-and-slide EQ shape.'),
     ic('Solo boost', '—', { Level: 7, '800 Hz': 4, '1.6 kHz': 3 }, 'Level up, mids up — cut through without getting louder in the harsh range.')],
    { slot: 'eq', price: '£110', bypass: 'buffered' }));

  P.push(Pd('eq-pedal', 'MXR', '10-Band Graphic EQ (M108)', 'eq', 1980,
    'A precision instrument: ten sliders, ±12 dB, and a level fader. The studio secret for shaping a guitar without changing pickups.',
    [ctl('Level', 0, 10, 5, 'Output.'),
     ctl('31 Hz', -12, 12, 0, 'Sub lows — usually cut.'),
     ctl('62 Hz', -12, 12, 0, 'Thump.'), ctl('125 Hz', -12, 12, 0, 'Low body.'),
     ctl('250 Hz', -12, 12, 0, 'Warmth/boom.'), ctl('500 Hz', -12, 12, 0, 'Body/congestion.'),
     ctl('1 kHz', -12, 12, 0, 'Presence.'), ctl('2 kHz', -12, 12, 0, 'Attack.'),
     ctl('4 kHz', -12, 12, 0, 'Bite.'), ctl('8 kHz', -12, 12, 0, 'Shimmer.'),
     ctl('16 kHz', -12, 12, 0, 'Air — or hiss on a noisy rig.')],
    [ic('Hard rock mid scoop', '—', { Level: 5, '250 Hz': -4, '500 Hz': -8, '1 kHz': -4, '2 kHz': 4, '4 kHz': 6 }, 'A tasteful scoop with presence kept intact.'),
     ic('Blanket remover', '—', { Level: 5, '500 Hz': -2, '2 kHz': 5, '4 kHz': 5, '8 kHz': 4 }, 'Makes a dark guitar suddenly sound alive.')],
    { slot: 'eq', price: '£110', power: '18 V DC (two 9 V batteries or an 18 V outlet)' }));

  /* =================================================================== */
  /* Compressor                                                           */
  /* =================================================================== */
  P.push(Pd('dyna-comp', 'MXR', 'Dyna Comp (M102)', 'compressor', 1972,
    'The chicken-head knob and the sound of every country, funk and slide record: squash it and it sustains for days.',
    [ctl('Output', 0, 10, 6, 'Make-up gain: set it so on/off are the same loudness.'),
     ctl('Sensitivity', 0, 10, 6, 'How hard it squashes. 6–8 is the classic Dyna squash.')],
    [ic('Country slide', '—', { Output: 6, Sensitivity: 7 }, 'Into a clean Fender with a slide and a Telecaster.', 'Country session', 'Country players'),
     ic('Funk snap', '—', { Output: 5, Sensitivity: 8 }, 'Heavy squash with the guitar volume rolled back for clean pop.', 'Funk rhythm', 'Funk players')],
    { slot: 'comp', price: '£100', bypass: 'buffered (script logo versions are true bypass)' }));

  P.push(Pd('compressor', 'MXR', 'M76 Studio Compressor', 'compressor', 2012,
    'A studio-style compressor in a pedal: threshold, ratio, attack, release and a meter. The control you never knew you wanted.',
    [ctl('Threshold', 0, 10, 5, 'Where the compression starts — lower it until the meter shows 3–6 dB of gain reduction.'),
     ctl('Ratio', 0, 10, 4, '2:1 is gentle, 4:1 is classic pedal, 10:1 is limiting.'),
     ctl('Attack', 0, 10, 5, 'Fast = pluck control; slow = lets the initial attack through.'),
     ctl('Release', 0, 10, 5, 'How quickly it lets go — longer for sustain, shorter for snap.'),
     ctl('Level', 0, 10, 6, 'Make-up gain.')],
    [ic('Always-on studio comp', '—', { Threshold: 4, Ratio: 3, Attack: 5, Release: 5, Level: 6 }, 'Set for 3–5 dB of gain reduction with the meter; everything sounds tighter and more expensive.')],
    { slot: 'comp', price: '£180', power: '9 V DC, ~15 mA', bypass: 'buffered' }));

  P.push(Pd('cali76-cd', 'Origin Effects', 'Cali76 Compact Deluxe', 'compressor', 2015,
    'A pedal-sized 1176: FET compression with real control and a huge, warm sound. The boutique standard for "my guitar sounds like a record".',
    [ctl('In', 0, 10, 5, 'Input level — drives the FET.'),
     ctl('Out', 0, 10, 5, 'Output.'),
     ctl('Ratio', 0, 10, 4, '4:1 is the classic 1176 rock ratio.'),
     ctl('Attack', 0, 10, 4, 'Fast attack can be very aggressive — try slow for punch.'),
     ctl('Release', 0, 10, 5, 'Medium for a natural feel.'),
     ctl('Mix', 0, 10, 10, 'Parallel compression: back it to 6 for a blend of dry punch and squashed sustain.'),
     ctl('Dry/Level', 0, 10, 5, 'Blend control on Deluxe models.')],
    [ic('Record-ready guitar', '—', { In: 5, Out: 5, Ratio: 4, Attack: 4, Release: 5, Mix: 8 }, 'Blend in the dry signal and it becomes punchy instead of flat.')],
    { slot: 'comp', price: '£300', power: '9 V DC, ~26 mA' }));

  P.push(Pd('cs-3', 'Boss', 'CS-3 Compression Sustainer', 'compressor', 1986,
    'The affordable workhorse: level, tone, attack, sustain. It does the 80s “sustainer” thing beautifully and adds real sparkle.',
    [ctl('Level', 0, 10, 6, 'Output.'), ctl('Tone', 0, 10, 5, 'Treble — the CS-3 can add a nice top-end lift.'),
     ctl('Attack', 0, 10, 4, 'Slower attack keeps the pick attack, faster smooths it.'),
     ctl('Sustain', 0, 10, 6, 'The squash amount.')],
    [ic('80s sustain', '—', { Level: 6, Tone: 6, Attack: 5, Sustain: 7 }, 'Sustain up, tone up — the 80s session clean.')],
    { slot: 'comp', price: '£95' }));

  P.push(Pd('philosophers-tone', 'Pigtronix', 'Philosopher’s Tone', 'compressor', 2008,
    'Optical compression plus a germanium-based “Grit” and a treble control — the crunchy, warm comp for rock rhythm.',
    [ctl('Compression', 0, 10, 5, 'Optical squash — smooth and musical.'),
     ctl('Sustain', 0, 10, 5, 'Sustain length.'),
     ctl('Grit', 0, 10, 3, 'A germanium-driven crunch — one of a kind.'),
     ctl('Treble', 0, 10, 5, 'Top-end.'),
     ctl('Volume', 0, 10, 5, 'Output.')],
    [ic('Crunchy comp', '—', { Compression: 5, Sustain: 4, Grit: 5, Treble: 6, Volume: 6 }, 'Compression and grit together — a rock rhythm sound that stays bouncy.')],
    { slot: 'comp', price: '£150', power: '18 V DC' }));

  /* =================================================================== */
  /* Wah & expression                                                     */
  /* =================================================================== */
  P.push(Pd('wah-crybaby', 'Dunlop', 'Cry Baby GCB95', 'wah', 1986,
    'The standard wah: a throaty sweep that has been on every rock record since 1967. Learn the heel-down "voodoo" chatter and you never need another one.',
    [ctl('Treadle position', 0, 10, 5, 'Heel down = bass, toe down = treble. Half-cocked (around 4–5) gives a vowel tone.'),
     ctl('Sweep', 0, 10, 5, 'Fixed on the GCB95: the classic 1967 sweep. Mods add a Q knob and a wider range.'),
     ctl('On/off', 0, 1, 0, 'Push the toe down to switch. It stays where you leave it.')],
    [ic('Voodoo Child (Slight Return)', 'Jimi Hendrix', { 'Treadle position': 4.5 }, 'Cocked half-open for the main riff, then full sweeps for the freakout.', 'Voodoo Child (Slight Return) — Jimi Hendrix', 'Jimi Hendrix'),
     ic('Lead wah', '—', { 'Treadle position': 6 }, 'Leave it half-toe-down and let it ride — the classic solo vowel.', 'Metallica solos', 'Kirk Hammett'),
     ic('Voodoo chatter', '—', { 'Treadle position': 1.5 }, 'The rhythm scratch: heel down and rock the pedal at the foot of every phrase.', 'Shaft — Isaac Hayes', 'Charles Pitts')],
    { slot: 'guitar', price: '£100', bypass: 'buffered', stack: 'Put a Fuzz Face before the wah, or use a wah with a fuzz buffer. Order matters: wah first is the classic, fuzz first is the Hendrix way.' }));

  P.push(Pd('wah-535q', 'Dunlop', 'Cry Baby 535Q', 'wah', 1998,
    'A wah with a tuning kit: variable Q, a 6-position range selector and a boost knob. From subtle vocal sweeps to a thin, screaming filter.',
    [ctl('Volume Boost', 0, 10, 5, 'Adds up to +20 dB — great for solos, dangerous with clean amps.'),
     ctl('Q', 0, 10, 5, 'Low Q = wide, subtle vowel. High Q = narrow, vocal, aggressive.'),
     ctl('Range selector', 0, 5, 2, 'Six sweep ranges: 1 is deep and bass-friendly, 6 is bright and narrow.'),
     ctl('Treadle position', 0, 10, 5, 'The sweep itself.')],
    [ic('Screaming lead', '—', { 'Volume Boost': 7, Q: 7, 'Range selector': 4, 'Treadle position': 6 }, 'High Q and a boost — the “toe-down” solo setting.', 'Hard rock leads', '80s/90s lead players'),
     ic('Funk rhythm', '—', { 'Volume Boost': 4, Q: 4, 'Range selector': 2, 'Treadle position': 3 }, 'A subtler, deeper vowel for funk and clean rhythm.')],
    { slot: 'guitar', price: '£160', bypass: 'buffered' }));

  P.push(Pd('wah-v847', 'Vox', 'V847-A Wah', 'wah', 1967,
    'The original Clyde McCoy-flavoured Vox wah: brighter, more vocal and less throaty than a Cry Baby. The sound of late-60s psychedelia.',
    [ctl('Treadle position', 0, 10, 5, 'The classic Vox sweep — higher and more vocal than a Cry Baby.'),
     ctl('Switch', 0, 1, 0, 'Toe-down switching.')],
    [ic('60s psychedelic lead', '—', { 'Treadle position': 5.5 }, 'Park it half-open and ride it through a long solo.', 'Cream & Hendrix-era leads', '60s psychedelia')],
    { slot: 'guitar', price: '£130', bypass: 'true bypass (V847-A)' }));

  P.push(Pd('wah-bad-horsie', 'Morley', 'Bad Horsie 2', 'wah', 1999,
    'A switchless, optical wah: it turns on when you move your foot and off when you stop. Steve Vai’s signature — no click, no noise.',
    [ctl('Treadle position', 0, 10, 5, 'Spring-loaded: heel down is the resting position.'),
     ctl('Contour', 0, 10, 5, 'Shapes the sweep’s midrange bite.'),
     ctl('Level', 0, 10, 5, 'Output boost.')],
    [ic('Vai lead', 'Steve Vai', { 'Treadle position': 5, Contour: 6, Level: 6 }, 'Spring-loaded so the wah is always where you left it — perfect for legato lines.', 'The Audience Is Listening — Steve Vai', 'Steve Vai')],
    { slot: 'guitar', price: '£150', bypass: 'buffered (always on, optical bypass)' }));

  P.push(Pd('auto-wah', 'Boss', 'AW-3 Dynamic Wah', 'filter', 2003,
    'Envelope filter + auto-wah + humanizer: the pedal that answers your pick attack with a vowel. Funk in a box.',
    [ctl('Mode', 0, 4, 0, 'Auto Wah · Manual (a fixed filter – cocked wah without the pedal) · Envelope · Touch/Expression.'),
     ctl('Sensitivity', 0, 10, 6, 'How strongly it reacts to your touch — higher and a light strum opens the filter.'),
     ctl('Decay', 0, 10, 5, 'How long the “wah” takes to close after each note.'),
     ctl('Manual/Rate', 0, 10, 5, 'Fixed filter position (manual mode) or LFO rate.')],
    [ic('Funk strum', '—', { Mode: 1, Sensitivity: 7, Decay: 5, 'Manual/Rate': 6 }, 'Envelope mode with a light, choppy strum — the classic funk quack.', 'Funk rhythm', 'Funk players'),
     ic('Cocked wah rock', '—', { Mode: 2, Sensitivity: 3, Decay: 3, 'Manual/Rate': 4 }, 'Manual mode gives you a fixed, half-cocked wah without a pedal.')],
    { slot: 'guitar', price: '£140' }));

  P.push(Pd('mu-tron-iii', 'Mu-Tron', 'Mu-Tron III (and clones)', 'filter', 1972,
    'The original envelope filter — a 70s funk legend reborn by the Micro-Tron IV and countless clones. Fat, dripping, unmistakable.',
    [ctl('Gain', 0, 10, 5, 'Input gain — drives the filter’s response.'),
     ctl('Peak', 0, 10, 5, 'Resonance/Q — how vocal the filter is.'),
     ctl('Mode', 0, 2, 0, 'Low pass · Band pass · High pass — the three vowel shapes.'),
     ctl('Range', 0, 10, 5, 'Center frequency of the sweep.')],
    [ic('70s funk clavinets', 'Stevie Wonder', { Gain: 6, Peak: 6, Mode: 1, Range: 5 }, 'Band pass with resonance up — the sound of a clavinet through a Mutron.', 'Superstition — Stevie Wonder', 'Stevie Wonder'),
     ic('Dead-head jam', 'Jerry Garcia', { Gain: 5, Peak: 5, Mode: 1, Range: 6 }, 'Subtle, rolling, and always on for a while.', 'Grateful Dead live', 'Jerry Garcia')],
    { slot: 'guitar', price: '£300 (original) / £200 (clones)', power: '9 V DC centre-negative (positive-ground original needs a special supply)' }));

  P.push(Pd('qtron-plus', 'Electro-Harmonix', 'Q-Tron+', 'filter', 1998,
    'EHX’s take on the Mu-Tron: the same funky vowel with an effects loop and a little more attitude.',
    [ctl('Drive', 0, 10, 5, 'Input sensitivity — this is your “wah amount” knob.'),
     ctl('Q', 0, 10, 5, 'Resonance.'),
     ctl('Mode', 0, 2, 0, 'Low pass / band pass / high pass.'),
     ctl('Boost', 0, 10, 3, 'Output boost.'),
     ctl('Attack', 0, 10, 5, 'How fast the filter opens.')],
    [ic('Funk rhythm', '—', { Drive: 6, Q: 6, Mode: 1, Boost: 3, Attack: 4 }, 'Band pass with sensitivity up — strum lightly for that duck-talk quack.')],
    { slot: 'guitar', price: '£200', power: '24 V DC (EHX supply)' }));

  /* =================================================================== */
  /* Volume / expression / utility pedals that live first                  */
  /* =================================================================== */
  P.push(Pd('volume-pedal', 'Ernie Ball', 'VP Jr Volume Pedal (250k)', 'utility', 1970,
    'The industry-standard passive volume pedal: a string-driven pot, 250k for passive guitars. Your “set and forget the loudness” pedal.',
    [ctl('Treadle position', 0, 10, 8, 'Set it lower than your max and leave headroom for the choruses.')],
    [ic('Ride the swells', '—', { 'Treadle position': 3 }, 'Pedal-steel style volume swells with the tone rolled back.')],
    { slot: 'guitar', price: '£110', bypass: 'passive' }));

  P.push(Pd('noise-gate', 'Boss', 'NS-2 Noise Suppressor', 'utility', 1987,
    'The pedalboard de-hisser: kills hum, sizzle and single-coil buzz without destroying your tone. Essential with high gain.',
    [ctl('Threshold', 0, 10, 5, 'Set it just above your guitar’s noise floor — too high and it chokes your notes.'),
     ctl('Decay', 0, 10, 4, 'How fast the gate closes; 4 is natural, 8 is abrupt chug territory.')],
    [ic('High-gain rig', '—', { Threshold: 5, Decay: 5 }, 'With a 5150 or a Recto it turns a hissing monster into a usable amp.', 'Modern metal rigs', 'High-gain players')],
    { slot: 'utility', price: '£110', bypass: 'buffered' }));

  P.push(Pd('tuner-pedal', 'Boss', 'TU-3 Chromatic Tuner', 'utility', 2009,
    'The pedal everyone owns: true-bypass-ish buffered accuracy, a bright display, and it can power the rest of your board from its DC out.',
    [ctl('Mode', 0, 1, 0, 'Chromatic or Guitar mode — Guitar mode shows string numbers.'),
     ctl('Reference', 435, 445, 440, 'Set A4. Some bands tune to 432 or 443 — the TU-3 has you covered.')],
    [ic('On stage', '—', { Mode: 1, Reference: 440 }, 'Guitar mode with A=440. Hit the switch and the output mutes — tune silently.')],
    { slot: 'utility', price: '£90', bypass: 'buffered' }));

  const api = {
    LB: P, ctl: ctl, ic: ic, Pd: Pd,
    byId: function (id) { for (let i = 0; i < P.length; i++) if (P[i].id === id) return P[i]; return null; },
    all: function () { return P.slice(); },
    cats: function () { const out = []; P.forEach(p => { if (out.indexOf(p.cat) === -1) out.push(p.cat); }); return out.sort(); },
    part: 1
  };
  const root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.TT = root.TT || {};
  root.TT.pedals = root.TT.pedals || {};
  root.TT.pedals.P1 = api;
  /* part 2 will register its own loaders; rig.js reads TT.pedals.all() */
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
