/* Trill Tuner — pedal library, part 4: more dirt, time, pitch and utility.
 * Loads after pedals3.js and merges into TT.pedals.
 */
(function () {
  'use strict';
  const root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  const lib = root.TT.pedals;
  if (!lib || !lib.P1) throw new Error('pedals4.js must load after pedals.js/pedals3.js');
  const P1 = lib.P1;
  const ctl = P1.ctl, ic = P1.ic, Pd = P1.Pd;
  const extra = [];

  extra.push(Pd('ehx-soul-food', 'Electro-Harmonix', 'Soul Food', 'overdrive', 2014,
    'A Klon-inspired transparent overdrive at a sane price: mid-hump, clean blend of character, and the “gain down, volume up” trick.',
    [ctl('Volume', 0, 10, 6, 'Up for the Klon-style amp-wake-up.'),
     ctl('Drive', 0, 10, 2, '2 is the famous setting — barely any grit.'),
     ctl('Tone', 0, 10, 5, '5 is flat.')],
    [ic('Always-on', '—', { Volume: 6, Drive: 2, Tone: 5 }, 'Left on, drive low — the amp sounds like itself, only more.')],
    { slot: 'dirt', price: '£70' }));

  extra.push(Pd('wampler-plexi-drive', 'Wampler', 'Plexi-Drive Deluxe', 'overdrive', 2013,
    'A Marshall-in-a-box with a blend: British crunch without a 100-watt head. Gain for the Plexi, volume for the room.',
    [ctl('Volume', 0, 10, 6, 'Unity around 5–6.'),
     ctl('Gain', 0, 10, 5, '5 is classic-rock crunch, 8 is a small Super Lead.'),
     ctl('Bass', 0, 10, 5, 'Tighten drop tunings by dropping this.'),
     ctl('Treble', 0, 10, 6, 'British bite.')],
    [ic('Club Marshall', '—', { Volume: 6, Gain: 5, Bass: 5, Treble: 6 }, 'Into a clean Fender it is a lunchbox Plexi.')],
    { slot: 'dirt', price: '£180' }));

  extra.push(Pd('boss-sd-2', 'Boss', 'SD-2 Dual Overdrive', 'overdrive', 1993,
    'Two overdrives in one compact: a crunch side and a lead side, each with its own drive. The 90s Boss answer to a channel-switcher.',
    [ctl('Level', 0, 10, 6, 'Output.'),
     ctl('Tone', 0, 10, 5, 'Shared tone.'),
     ctl('Crunch', 0, 10, 4, 'Rhythm drive.'),
     ctl('Lead', 0, 10, 7, 'Lead drive — stomp to jump.')],
    [ic('Rhythm/lead', '—', { Level: 6, Tone: 5, Crunch: 4, Lead: 7 }, 'Crunch for verses, lead for the chorus.')],
    { slot: 'dirt', price: '£90 used' }));

  extra.push(Pd('proco-rat2', 'ProCo', 'RAT 2', 'distortion', 1988,
    'The filter-control RAT in a smaller box. From a dirty boost to a fizzing wall, the RAT 2 is the alternative-rock distortion.',
    [ctl('Distortion', 0, 10, 5, '5 is classic RAT, 8 is a wall.'),
     ctl('Filter', 0, 10, 6, 'Works backwards: clockwise darkens. 6 is the usual.'),
     ctl('Volume', 0, 10, 6, 'RATs get loud.')],
    [ic('Smells Like', 'Kurt Cobain-adjacent', { Distortion: 6, Filter: 6, Volume: 6 }, 'Not his main RAT, but the same family — filter at noon, distortion up.')],
    { slot: 'dirt', price: '£80' }));

  extra.push(Pd('ehx-triangle-muff', 'Electro-Harmonix', 'Triangle Big Muff Pi', 'fuzz', 1969,
    'The original ram’s-head-before-the-ram’s-head: scooped, velcro-y sustain and that violin lead voice. Reissued, finally.',
    [ctl('Volume', 0, 10, 6, 'Muffs are loud.'),
     ctl('Sustain', 0, 10, 7, 'The violin. 7 is singing.'),
     ctl('Tone', 0, 10, 5, 'Noon is the scoop.')],
    [ic('Violin lead', 'David Gilmour-adjacent', { Volume: 6, Sustain: 7, Tone: 5 }, 'Sustain up, tone noon, into a bright amp.')],
    { slot: 'dirt', price: '£90' }));

  extra.push(Pd('boss-ns-2', 'Boss', 'NS-2 Noise Suppressor', 'utility', 1987,
    'The compact gate every high-gain board ends with. Send/return loop lets you gate the dirt and leave the delay tails alone.',
    [ctl('Threshold', 0, 10, 4, 'Rise until the hiss dies, then back off one click.'),
     ctl('Decay', 0, 10, 4, 'Too fast chops the notes; 4 is musical.')],
    [ic('High-gain loop', '—', { Threshold: 4, Decay: 4 }, 'In the send/return around the dirt, not after the delay.')],
    { slot: 'utility', price: '£90' }));

  extra.push(Pd('isp-decimator', 'ISP', 'Decimator II', 'utility', 2008,
    'A fast, transparent noise gate that tracks the guitar rather than a simple threshold. The metal-standard gate.',
    [ctl('Threshold', 0, 10, 4, 'Set so open strings ring and muted strings shut up.')],
    [ic('Drop-tuned silence', '—', { Threshold: 4 }, 'After the dirt, before the delay. Tails live.')],
    { slot: 'utility', price: '£160' }));

  extra.push(Pd('mxr-carbon-copy', 'MXR', 'Carbon Copy Analog Delay', 'delay', 2008,
    'Bucket-brigade analog delay with modulation. 600 ms, dark repeats, the slap and the ambient wash.',
    [ctl('Regen', 0, 10, 3, 'Repeats. 2–3 is slap, 6 is a wash.'),
     ctl('Mix', 0, 10, 4, 'Wet/dry. 4 sits behind the dry.'),
     ctl('Delay', 0, 10, 3, 'Time. Low is slapback, high is 600 ms.'),
     ctl('Mod', 0, 1, 0, 'Modulation on/off.')],
    [ic('Slapback', '—', { Regen: 2, Mix: 4, Delay: 2, Mod: 0 }, 'One or two dark repeats. Rockabilly and Gilmour-adjacent leads.')],
    { slot: 'time', price: '£150' }));

  extra.push(Pd('boss-dd-8', 'Boss', 'DD-8 Digital Delay', 'delay', 2019,
    'The compact digital delay with tap tempo, reverse, warp, and a looper. The DD-3’s grandchild.',
    [ctl('E.Level', 0, 10, 4, 'Effect level.'),
     ctl('Feedback', 0, 10, 3, 'Repeats.'),
     ctl('Time', 0, 10, 4, 'Delay time, or tap it.'),
     ctl('Mode', 0, 10, 1, 'Standard / reverse / analog / warp / +1 oct / looper…')],
    [ic('Dotted eighth', 'The Edge-adjacent', { 'E.Level': 4, Feedback: 3, Time: 5, Mode: 1 }, 'Tap a dotted eighth and hold a chord.')],
    { slot: 'time', price: '£150' }));

  extra.push(Pd('ehx-canyon', 'Electro-Harmonix', 'Canyon', 'delay', 2017,
    'Eleven delay modes including octave, shimmer, tape and a 62-second looper, in a nano box.',
    [ctl('FX Level', 0, 10, 4, 'Wet mix.'),
     ctl('Delay', 0, 10, 4, 'Time.'),
     ctl('Feedback', 0, 10, 3, 'Repeats.'),
     ctl('Mode', 0, 10, 1, 'Echo / mod / multi / reverse / tape / octave / shimmer / sample/hold / loop.')],
    [ic('Shimmer pad', '—', { 'FX Level': 4, Delay: 5, Feedback: 4, Mode: 7 }, 'Shimmer mode, feedback 4 — a cheap magic carpet.')],
    { slot: 'time', price: '£120' }));

  extra.push(Pd('walrus-slo', 'Walrus Audio', 'Slö', 'reverb', 2018,
    'Three ambient algorithms (dark, rise, dream) with a latching sustain. The pad machine.',
    [ctl('Decay', 0, 10, 6, 'How long the cloud hangs.'),
     ctl('Filter', 0, 10, 5, 'Darken or brighten the reverb.'),
     ctl('Depth', 0, 10, 5, 'Modulation inside the verb.'),
     ctl('Mix', 0, 10, 4, 'Wet/dry.'),
     ctl('Mode', 0, 2, 2, 'Dark / Rise / Dream.')],
    [ic('Dream pad', '—', { Decay: 7, Filter: 5, Depth: 5, Mix: 5, Mode: 2 }, 'Dream mode, mix 5, hold a chord and float.')],
    { slot: 'time', price: '£170' }));

  extra.push(Pd('strymon-volante', 'Strymon', 'Volante', 'delay', 2019,
    'Magnetic-echo machine: drum, tape, studio, with spring reverb and a looper. The Echoplex/Space Echo in a box.',
    [ctl('Record Level', 0, 10, 5, 'How hard you hit the “tape”.'),
     ctl('Mechanics', 0, 10, 4, 'Wow, flutter, wear.'),
     ctl('Repeats', 0, 10, 3, 'Feedback.'),
     ctl('Mix', 0, 10, 4, 'Wet/dry.'),
     ctl('Type', 0, 2, 1, 'Drum / Tape / Studio.')],
    [ic('Gilmour tape', 'David Gilmour-adjacent', { 'Record Level': 5, Mechanics: 4, Repeats: 3, Mix: 4, Type: 1 }, 'Tape type, a few dark repeats, mechanics 4.')],
    { slot: 'time', price: '£350' }));

  extra.push(Pd('eventide-h9', 'Eventide', 'H9 Max', 'pitch', 2013,
    'One knob, every Eventide algorithm: pitch, delay, reverb, modulation, fuzz. The studio rack in a stompbox.',
    [ctl('HotKnob', 0, 10, 5, 'The one assignable control — map it to the thing you actually tweak.'),
     ctl('Mix', 0, 10, 4, 'Wet/dry of the current algorithm.'),
     ctl('Algo', 0, 10, 3, 'PitchFactor / TimeFactor / Space / ModFactor / CrushStation…')],
    [ic('Whammy-ish', '—', { HotKnob: 5, Mix: 5, Algo: 0 }, 'A PitchFactor algorithm, mix 5, expression on the HotKnob.')],
    { slot: 'mod', price: '£500' }));

  extra.push(Pd('boss-sy-1', 'Boss', 'SY-1 Synthesizer', 'pitch', 2020,
    'A polyphonic guitar synth in a compact: 121 sounds, from organs to pads to arps, tracking well enough to gig.',
    [ctl('Effect', 0, 10, 6, 'Synth level.'),
     ctl('Direct', 0, 10, 4, 'Dry guitar.'),
     ctl('Tone', 0, 10, 5, 'Synth tone.'),
     ctl('Type', 0, 10, 3, 'Lead / pad / organ / bass / arp…')],
    [ic('Organ pad', '—', { Effect: 6, Direct: 4, Tone: 5, Type: 3 }, 'Organ type under a clean amp — instant 60s.')],
    { slot: 'mod', price: '£170' }));

  extra.push(Pd('ehx-c9', 'Electro-Harmonix', 'C9 Organ Machine', 'pitch', 2011,
    'Turns a guitar into a combo organ. Two organ types, click, and a dry blend. The cheapest church.',
    [ctl('Organ', 0, 10, 6, 'Organ level.'),
     ctl('Dry', 0, 10, 3, 'Guitar underneath.'),
     ctl('Click', 0, 10, 4, 'Key-click. 4 is a Hammond-ish attack.'),
     ctl('Type', 0, 1, 0, 'Two organ voicings.')],
    [ic('Cheap Hammond', '—', { Organ: 6, Dry: 3, Click: 4, Type: 0 }, 'Hold a chord, swell the volume — instant Booker T.')],
    { slot: 'mod', price: '£140' }));

  extra.push(Pd('boss-tu-3', 'Boss', 'TU-3 Chromatic Tuner', 'utility', 2009,
    'The stage tuner. Mute output, needle or stream display, and it survives being stood on.',
    [ctl('Mute', 0, 1, 1, 'Mute on = silent tuning between songs.')],
    [ic('Always first', '—', { Mute: 1 }, 'First in the chain, always. Everything else is downstream.')],
    { slot: 'guitar', price: '£80' }));

  extra.push(Pd('tc-polytune-3', 'TC Electronic', 'PolyTune 3', 'utility', 2016,
    'Polyphonic tuner with a buffer you can leave on. Strum all six, see every string, then it drops to a strobe.',
    [ctl('Buffer', 0, 1, 1, 'Leave the buffer on — it is a very good one.'),
     ctl('Mute', 0, 1, 1, 'Silent tuning.')],
    [ic('Board start', '—', { Buffer: 1, Mute: 1 }, 'First, buffered, muted when you need it.')],
    { slot: 'guitar', price: '£90' }));

  extra.push(Pd('earthquaker-dispatch', 'EarthQuaker Devices', 'Dispatch Master', 'reverb', 2011,
    'Delay and reverb in one, analog dry path, with the repeats that fade into the verb. The ambient two-in-one.',
    [ctl('Mix', 0, 10, 4, 'Wet/dry.'),
     ctl('Time', 0, 10, 4, 'Delay time.'),
     ctl('Repeats', 0, 10, 3, 'Delay feedback.'),
     ctl('Reverb', 0, 10, 4, 'Reverb decay.')],
    [ic('Ambient wash', '—', { Mix: 4, Time: 5, Repeats: 3, Reverb: 5 }, 'A little delay into a longer verb — one box, two jobs.')],
    { slot: 'time', price: '£170' }));

  extra.push(Pd('chase-bliss-mood', 'Chase Bliss', 'MOOD', 'delay', 2019,
    'Two channels of micro-looper / delay that talk to each other. The happy accident machine.',
    [ctl('Time', 0, 10, 5, 'Clock of the loops.'),
     ctl('Modify', 0, 10, 5, 'How the two channels chew on each other.'),
     ctl('Mix', 0, 10, 4, 'Wet/dry.'),
     ctl('Clock', 0, 10, 5, 'Sample-rate / pitch of the loops.')],
    [ic('Happy accidents', '—', { Time: 5, Modify: 6, Mix: 4, Clock: 5 }, 'Hold a chord, turn Modify, and do not try to control it.')],
    { slot: 'time', price: '£350' }));

  extra.push(Pd('boss-ge-7-reissue', 'Boss', 'GE-7 Graphic EQ (always-on)', 'eq', 1981,
    'Seven bands of ±15 dB. In the loop it is a Recto’s missing graphic; in front it is a boost with a shape.',
    [ctl('100 Hz', 0, 10, 5, 'Low. Cut for tightness.'),
     ctl('400 Hz', 0, 10, 5, 'Low-mid. Cut the mud.'),
     ctl('800 Hz', 0, 10, 4, 'The metal scoop lives here.'),
     ctl('1.6 kHz', 0, 10, 6, 'Presence. Boost for cut.'),
     ctl('Level', 0, 10, 6, 'Make-up / boost.')],
    [ic('Metal V', 'James Hetfield-adjacent', { '100 Hz': 6, '400 Hz': 5, '800 Hz': 3, '1.6 kHz': 7, Level: 6 }, 'Boost the ends, cut 800 Hz, level up — the graphic-EQ trick.')],
    { slot: 'eq', price: '£100' }));

  const ALL = lib.LIST.concat(extra);
  const api = {
    LIST: ALL,
    P1: P1, P2: lib.P2, P3: lib.P3, P4: extra,
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
