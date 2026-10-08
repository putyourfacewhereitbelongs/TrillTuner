/* My Guitar — tuning presets. String order is thickest/lowest first (string N … string 1). */
(function () {
  'use strict';
  const N = window.MG.notes;

  function mk(names) {
    return names.map(n => ({ name: n, midi: N.nameToMidi(n) }));
  }

  const PRESETS = [
    // Common
    { id: 'standard', name: 'Standard', cat: 'Common', strings: mk(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']) },
    { id: 'dropd', name: 'Drop D', cat: 'Common', strings: mk(['D2', 'A2', 'D3', 'G3', 'B3', 'E4']) },
    { id: 'halfstep', name: 'Half Step Down (E♭ Standard)', cat: 'Common', strings: mk(['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4']) },
    { id: 'fullstep', name: 'Full Step Down (D Standard)', cat: 'Common', strings: mk(['D2', 'G2', 'C3', 'F3', 'A3', 'D4']) },
    // Rock & Metal
    { id: 'dropdb', name: 'Drop D♭ (Drop D + ½ step)', cat: 'Rock & Metal', strings: mk(['Db2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4']) },
    { id: 'dropc', name: 'Drop C', cat: 'Rock & Metal', strings: mk(['C2', 'G2', 'C3', 'F3', 'A3', 'D4']) },
    { id: 'dropb', name: 'Drop B', cat: 'Rock & Metal', strings: mk(['B1', 'Gb2', 'B2', 'E3', 'Ab3', 'Db4']) },
    { id: 'dropa', name: 'Drop A', cat: 'Rock & Metal', strings: mk(['A1', 'E2', 'A2', 'D3', 'Gb3', 'B3']) },
    { id: 'seven', name: '7-String Standard', cat: 'Rock & Metal', strings: mk(['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4']) },
    // Open tunings
    { id: 'openg', name: 'Open G', cat: 'Open Tunings', strings: mk(['D2', 'G2', 'D3', 'G3', 'B3', 'D4']) },
    { id: 'opend', name: 'Open D', cat: 'Open Tunings', strings: mk(['D2', 'A2', 'D3', 'Gb3', 'A3', 'D4']) },
    { id: 'opene', name: 'Open E', cat: 'Open Tunings', strings: mk(['E2', 'B2', 'E3', 'Ab3', 'B3', 'E4']) },
    { id: 'openc', name: 'Open C', cat: 'Open Tunings', strings: mk(['C2', 'G2', 'C3', 'G3', 'C4', 'E4']) },
    { id: 'dadgad', name: 'DADGAD', cat: 'Open Tunings', strings: mk(['D2', 'A2', 'D3', 'G3', 'A3', 'D4']) },
    { id: 'dbldropd', name: 'Double Drop D', cat: 'Open Tunings', strings: mk(['D2', 'A2', 'D3', 'G3', 'B3', 'D4']) },
    // Other instruments
    { id: 'bass', name: 'Bass — Standard (4-string)', cat: 'Other Instruments', strings: mk(['E1', 'A1', 'D2', 'G2']) },
    { id: 'bassdropd', name: 'Bass — Drop D', cat: 'Other Instruments', strings: mk(['D1', 'A1', 'D2', 'G2']) },
    { id: 'uke', name: 'Ukulele — Standard', cat: 'Other Instruments', strings: mk(['G4', 'C4', 'E4', 'A4']) },
    { id: 'mando', name: 'Mandolin — Standard', cat: 'Other Instruments', strings: mk(['G3', 'D4', 'A4', 'E5']) }
  ];

  /* Alternate-tuning guide: what each tuning sounds like + famous examples,
   * so you know the target before you tune to it. */
  const GUIDE = {
    standard: {
      desc: 'The tuning virtually all songs, tabs and lessons assume. Learn everything here first.',
      songs: ['Stairway to Heaven — Led Zeppelin', 'Wonderwall — Oasis', '…and most of recorded music']
    },
    dropd: {
      desc: 'Only the low E drops a whole step to D. Power chords become one finger on the bottom three strings, and D chords ring huge.',
      songs: ['Dear Prudence — The Beatles', 'Killing in the Name — Rage Against the Machine', 'Everlong — Foo Fighters']
    },
    halfstep: {
      desc: 'Everything down one semitone (E♭ standard). Easier on the voice, grittier tone — the blues and hard-rock classic.',
      songs: ['Sweet Child O\u2019 Mine — Guns N\u2019 Roses', 'Little Wing — Jimi Hendrix', 'Pride and Joy — Stevie Ray Vaughan']
    },
    fullstep: {
      desc: 'A whole step down (D standard). Heavy but still familiar shapes; lighter string tension for big bends.',
      songs: ['Walk — Pantera', 'Du Hast — Rammstein (live sets)']
    },
    dropdb: {
      desc: 'Drop D, then everything down another half step. Drop-D shapes with a darker, sludgier voice.',
      songs: ['Sludge & alt-metal staples — Alice in Chains territory']
    },
    dropc: {
      desc: 'Drop D a whole step further down. The workhorse of modern metal — chuggy lows, easy one-finger power chords.',
      songs: ['Chop Suey! — System of a Down', 'Modern metalcore staples']
    },
    dropb: {
      desc: 'Very low Drop B. Thick strings recommended; riffs sit in bass-baritone territory.',
      songs: ['Duality — Slipknot', 'Bring Me the Horizon-style downtuned riffs']
    },
    dropa: {
      desc: 'Drop A is 7-string/baritone land on a 6-string. Extra-thick strings are a must.',
      songs: ['Djent & progressive metal — Periphery-style rhythms']
    },
    seven: {
      desc: 'Standard tuning plus a low B string: shred highs AND sub-low rhythms on one neck.',
      songs: ['Korn', 'Dream Theater', 'Steve Vai (Universe)']
    },
    openg: {
      desc: 'Strum all open strings and you get a G major chord. Keith Richards\u2019 weapon of choice (he often removes the 6th string entirely).',
      songs: ['Honky Tonk Women — The Rolling Stones', 'Start Me Up — The Rolling Stones']
    },
    opend: {
      desc: 'Open strings ring a D major chord. Beloved by slide players and singer-songwriters for its ringing, open voice.',
      songs: ['Big Yellow Taxi — Joni Mitchell', 'Classic Delta & bottleneck slide repertoire']
    },
    opene: {
      desc: 'Open strings ring an E major chord — slide guitar heaven with standard-tension top strings.',
      songs: ['Little Martha — The Allman Brothers', 'Derek Trucks slide catalog']
    },
    openc: {
      desc: 'Open strings ring a C major chord. Deep, warm and cinematic — a fingerstyle composer\u2019s tuning.',
      songs: ['Cello Song — Nick Drake', 'Modern fingerstyle arrangements']
    },
    dadgad: {
      desc: 'The “DADGAD” drone tuning: neither major nor minor, ideal for Celtic, folk and modal riffing. One shape covers endless songs.',
      songs: ['Kashmir — Led Zeppelin', 'Black Mountain Side — Led Zeppelin', 'Pierre Bensusan\u2019s catalog']
    },
    dbldropd: {
      desc: 'Both E strings drop to D. Open strings shimmer G-ish and droney — folk and acoustic mysticism.',
      songs: ['Going to California — Led Zeppelin', 'Folk fingerstyle tradition']
    },
    bass: { desc: 'Four strings, one octave below guitar strings 6–3. Lock in with the kick drum.', songs: ['Every great bassline you know'] },
    bassdropd: { desc: 'Drop the low E to D for nu-metal and grunge bass riffs.', songs: ['Nu-metal bass anchors'] },
    uke: { desc: 'G C E A — re-entrant “my dog has fleas” tuning.', songs: ['Somewhere Over the Rainbow — Israel Kamakawiwo\u2019ole'] },
    mando: { desc: 'G D A E in fifths, like a tiny violin. Chop chords and tremolo.', songs: ['Bluegrass — Bill Monroe tradition'] }
  };

  function byId(id) {
    return PRESETS.find(p => p.id === id) || PRESETS[0];
  }
  function guideFor(id) {
    return GUIDE[id] || { desc: '', songs: [] };
  }
  function categories() {
    const out = [];
    PRESETS.forEach(p => { if (!out.includes(p.cat)) out.push(p.cat); });
    return out;
  }
  function label(p) {
    return p.name + ' · ' + p.strings.map(s => s.name).join(' ');
  }

  window.MG.tunings = { PRESETS: PRESETS, byId: byId, categories: categories, label: label, guideFor: guideFor };
})();
