/* Trill Tuner — the play-along catalog.
 *
 * Everything here is steerable data, no network: chord charts for songs you can
 * strum today, technique lessons with the songs that teach them, artist profiles
 * and the harmony engine that turns a detected key + chords into practice advice
 * (voicings, capo, transposition, order, similar songs).
 *
 * The song search view reads all of it offline and cross-checks it against the
 * lyrics/tab sources on the server when you have a connection.
 */
(function () {
  'use strict';

  /* the same object in a browser and in node (so the catalog is testable) */
  const G = (typeof window !== 'undefined') ? window : globalThis;

  /* level 1 = few chords / slow, 5 = advanced */
  function S(title, artist, key, bpm, level, capo, chords, progression, tags, notes) {
    return {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      title: title, artist: artist, key: key, bpm: bpm, level: level, capo: capo || 0,
      chords: chords, progression: progression || chords.join('  '), tags: tags || [], notes: notes || '',
      search: artist + ' ' + title
    };
  }

  const SONGS = [
    /* ---------------- starter songs: three or four chords ---------------- */
    S('Knockin’ on Heaven’s Door', 'Bob Dylan', 'G', 72, 1, 0, ['G', 'D', 'Am', 'C'],
      'Verse: G  D  Am │ G  D  C', ['4 chords', 'strumming', 'classic', 'campfire'],
      'Two bars of G, two of D, two of Am, two of C. The whole song is one loop — perfect first strum.'),
    S('Three Little Birds', 'Bob Marley', 'A', 76, 1, 0, ['A', 'D', 'E'],
      'A  D  A │ A  D  E', ['3 chords', 'reggae', 'off-beat'],
      'Play the chords on the off-beats (up-strokes between the beats) and you have the reggae feel instantly.'),
    S('A Horse With No Name', 'America', 'Em', 122, 1, 0, ['Em', 'D6add9/F#'],
      'Em  D6add9/F# (repeat)', ['2 chords', 'one loop', 'fingerstyle'],
      'Two chords for the whole song. The second one is a D with an added 6th — or just play D and it still works.'),
    S('Bad Moon Rising', 'Creedence Clearwater Revival', 'D', 178, 1, 0, ['D', 'A', 'G'],
      'D  A  G  D │ D  A  G  D', ['3 chords', 'fast', 'rock'],
      'Fast and loud: D A G, D A G, forever. Good practice for switching without looking.'),
    S('Sweet Home Alabama', 'Lynyrd Skynyrd', 'D', 196, 1, 0, ['D', 'C', 'G'],
      'D  C  G (repeat)', ['3 chords', 'riff', 'classic rock'],
      'The same three chords over and over — the fun is the riff on top. Try the riff on the D and C changes.'),
    S('Love Me Do', 'The Beatles', 'G', 148, 1, 0, ['G', 'C', 'D'],
      'G  C │ G  C │ G  C  D  D', ['3 chords', 'harmonica', 'early Beatles'],
      'Chug the chords in straight eighths to get the harmonica-style rhythm.'),
    S('Margaritaville', 'Jimmy Buffett', 'D', 118, 1, 0, ['D', 'A', 'G', 'A7'],
      'D  A  G  A (repeat)', ['4 chords', 'island', 'easy strum'],
      'A gentle down-up strum, and let the chords ring between changes.'),
    S('Let It Be', 'The Beatles', 'C', 74, 1, 0, ['C', 'G', 'Am', 'F'],
      'C  G  Am  F │ C  G  F  C', ['4 chords', 'ballad', 'piano song'],
      'The classic four. Play the F gently — partial barre is fine while you learn.'),
    S('I’m Yours', 'Jason Mraz', 'C', 152, 1, 0, ['C', 'G', 'Am', 'F'],
      'C  G  Am  F (repeat)', ['4 chords', 'ukulele', 'pop'],
      'The most recognisable I–V–vi–IV loop in modern pop. Straight down-strokes work.'),
    S('Riptide', 'Vance Joy', 'Am', 102, 2, 1, ['Am', 'G', 'C'],
      'Am  G  C (repeat)', ['3 chords', 'capo', 'pop'],
      'Capo 1 and the shapes Am G C. The verse and chorus are the same three chords, so it is easy to sing over.'),
    S('Ho Hey', 'The Lumineers', 'C', 158, 1, 0, ['C', 'F', 'Am', 'G'],
      'C  F  Am  G (repeat)', ['4 chords', 'stomp', 'folk-pop'],
      'Big, simple strums. The song is about rhythm and voices, not fancy chords.'),
    S('Take Me Home, Country Roads', 'John Denver', 'G', 82, 1, 2, ['G', 'Em', 'D', 'C'],
      'G  Em  D │ G  Em  C  D', ['4 chords', 'capo', 'folk'],
      'Capo 2 to play with G shapes — sounding in A. The Em needs only two fingers, so it is a great first change.'),
    S('Brown Eyed Girl', 'Van Morrison', 'G', 148, 1, 0, ['G', 'C', 'D', 'Em'],
      'G  C  G  D │ Em  C  D', ['4 chords', 'classic', 'campfire'],
      'The little riff on the G and C is the hook — strum a G, then walk down the top string.'),
    S('Stand By Me', 'Ben E. King', 'G', 118, 1, 0, ['G', 'Em', 'C', 'D'],
      'G  Em  C  D (repeat)', ['4 chords', 'soul', 'bass line'],
      'Use the classic descending bass line on the A string: G → F# → E → D.'),
    S('Blowin’ in the Wind', 'Bob Dylan', 'G', 90, 1, 0, ['G', 'C', 'D', 'Em'],
      'G  C  D  G │ G  C  D  D', ['4 chords', 'fingerpicking', 'folk'],
      'Try it fingerpicked: thumb on the bass strings, three fingers picking.'),
    S('Sixteen Saltines', 'Jack White', 'A', 132, 2, 0, ['A', 'D', 'E'],
      'A  D  E', ['3 chords', 'garage', 'riff'],
      'Distortion in the rig, one riff, one attitude. Great for practising palm muting.'),
    S('Twist and Shout', 'The Isley Brothers', 'D', 124, 1, 0, ['D', 'G', 'A'],
      'Chorus: D  G  A │ Verse: D  G  A', ['3 chords', 'party', 'chorus'],
      'You will be loud and out of breath before the second chorus. That is the point.'),

    /* ---------------- intermediate ---------------- */
    S('Wish You Were Here', 'Pink Floyd', 'G', 60, 3, 0, ['Em7', 'G', 'A7sus4', 'C', 'D', 'Am'],
      'Intro: Em7  G │ Em7  G │ Em7  A7sus4  Em7  A7sus4  G  (twice)\nVerse: C  D  Am  G', ['intro riff', 'acoustic', 'fingerpicking'],
      'The intro is a fingerpicked riff with hammer-ons over Em7 and A7sus4 — learn it slowly, it is mostly one shape moving.'),
    S('Comfortably Numb', 'Pink Floyd', 'Bm', 63, 4, 0, ['Bm', 'A', 'G', 'Em', 'D', 'C'],
      'Verse: Bm  A │ G  Em  Bm │ Bm  A', ['solo', 'epic', 'chorus'],
      'The chords are simple; the glory is the solo, which is all bends. Practise bends against the tuner first.'),
    S('Hotel California', 'Eagles', 'Bm', 75, 4, 7, ['Bm', 'F#', 'A', 'E', 'G', 'D', 'Em'],
      'Bm  F#  A  E │ G  D  Em  F#', ['fingerpicking', 'solo', 'capo'],
      'Capo 7 turns the whole thing into Em shapes — much friendlier. The intro is a fingerpicked melody over the chords.'),
    S('Stairway to Heaven', 'Led Zeppelin', 'Am', 82, 4, 0, ['Am', 'C', 'D', 'F', 'G', 'Am7'],
      'Am  Am7/G#  C  D  F  G  Am │ C  D  Fmaj7  Am', ['fingerpicking', 'arpeggios', 'solo'],
      'Play the opening as arpeggios rather than strums — the bass note walks down under the Am shape.'),
    S('Blackbird', 'The Beatles', 'G', 96, 4, 0, ['G', 'Am', 'G/B', 'C', 'D'],
      'G  Am  G/B  C │ G  F  C  D', ['fingerstyle', 'thumb independence', 'solo guitar'],
      'A thumb-and-fingers study: keep the thumb on the two bass strings and pick the melody with your index finger.'),
    S('Here Comes the Sun', 'The Beatles', 'A', 124, 3, 0, ['A', 'D', 'E', 'F#m', 'B7'],
      'A  D  E  A │ F#m  B7  D  E', ['bright', 'classic', 'arpeggio'],
      'All the chords ring in open position and the rhythm is a smooth arpeggio. A great example of a major-key lift.'),
    S('Tears in Heaven', 'Eric Clapton', 'A', 78, 4, 0, ['A', 'E', 'F#m', 'D', 'Bm', 'C#m'],
      'A  E  F#m  D │ Bm  E  A', ['fingerpicking', 'ballad', 'chord melody'],
      'The intro is a chord-melody arrangement: your thumb plays the bass, your fingers play the tune inside the chord.'),
    S('Landslide', 'Fleetwood Mac', 'G', 138, 3, 3, ['G', 'D', 'Em', 'C', 'Am'],
      'Verse: G  D  Em │ G  D  C │ G  D  Em  G  C  am7  G', ['fingerpicking', 'capo', 'classic'],
      'Capo 3 with G shapes. The picking pattern is the same throughout — let the low string ring as a drone.'),
    S('Dreams', 'Fleetwood Mac', 'F', 120, 2, 0, ['F', 'G'],
      'F  G (repeat through the whole song)', ['2 chords', 'groove', 'simple'],
      'Two chords for four minutes. The whole song is feel — keep the strum relaxed and steady.'),
    S('The Chain', 'Fleetwood Mac', 'Em', 76, 3, 0, ['Em', 'D', 'C', 'A', 'Bm'],
      'Em  D  Em  D │ C  D  Em', ['bass line', 'rock', 'dynamics'],
      'The famous bass line is played on the low strings while the chords sustain. Practise it with the drum part loose.'),
    S('Every Rose Has Its Thorn', 'Poison', 'G', 70, 2, 0, ['G', 'Cadd9', 'D', 'Em', 'C'],
      'G  Cadd9  G │ Em  D  Cadd9', ['power ballad', 'arpeggio', 'acoustic'],
      'Clean arpeggios, a slow tempo, and a Chet-style hammer-on before each change.'),
    S('Patience', 'Guns N’ Roses', 'G', 88, 3, 0, ['G', 'C', 'Em', 'D', 'Am'],
      'G  C  G  D │ Em  D  C', ['acoustic', 'strumming', 'classic'],
      'Three chords for the verse, and the chorus lifts with the C and D. Watch the whistle solo.'),
    S('Sweet Child O’ Mine', 'Guns N’ Roses', 'D', 125, 3, 0, ['D', 'C', 'G', 'A', 'Em'],
      'D  C  G  D  (verse) │ A  C  D (chorus)', ['riff', 'rock', 'iconic intro'],
      'The intro riff is a string-skipping pattern over D — learn it slowly, then with the drums.'),
    S('Times Like These', 'Foo Fighters', 'D', 140, 3, 0, ['D', 'Am', 'C', 'Em'],
      'Verse: D  Am │ C  Em', ['dynamics', 'rock', 'verse-chorus'],
      'Quiet verse, huge chorus — the chords are identical, only the energy changes.'),
    S('Everlong', 'Foo Fighters', 'D', 158, 4, 0, ['D', 'Bm', 'G', 'A', 'Bm7'],
      'D  Bm  D  G (repeat)', ['drive', 'riffs', 'solo'],
      'Keep the right hand relentless; the chord changes are simple but the tempo is not.'),
    S('Creep', 'Radiohead', 'G', 92, 3, 0, ['G', 'B', 'C', 'Cm'],
      'G  G  B  B │ C  C  Cm  Cm', ['dynamics', 'mute', 'classic'],
      'The famous “chunk” is a fully muted strum before each chord. Dynamics are everything here.'),
    S('Karma Police', 'Radiohead', 'Am', 76, 3, 0, ['Am', 'D', 'G', 'C', 'F', 'Em'],
      'Am  D/F#  Em  G │ C  D  G  F', ['piano song', 'chord melody', 'dynamics'],
      'Use open-string bass notes under the moving chords — the piano part translates well to fingerstyle.'),
    S('No Woman No Cry', 'Bob Marley', 'C', 76, 2, 0, ['C', 'G', 'Am', 'F'],
      'C  G  Am  F (repeat)', ['reggae', 'skank', '4 chords'],
      'Short “skank” stabs on the off-beats: let go of the strings between hits.'),
    S('Redemption Song', 'Bob Marley', 'G', 96, 3, 0, ['G', 'Em', 'C', 'D', 'Am'],
      'Verse: G  Em  C  D │ Chorus: C  D  G  Em', ['fingerpicking', 'acoustic', 'solo'],
      'Fingerpicked acoustic with a moving bass line — a great study for thumb independence.'),
    S('Zombie', 'The Cranberries', 'Em', 84, 2, 0, ['Em', 'C', 'G', 'D'],
      'Em  C  G  D  (verse + chorus)', ['4 chords', 'dynamics', '90s'],
      'Verse is palm-muted and quiet, chorus is wide open and loud. Same four chords.'),
    S('Boulevard of Broken Dreams', 'Green Day', 'Em', 86, 2, 1, ['Em', 'G', 'D', 'C'],
      'Em  G  D  C (repeat)', ['capo', 'easy', 'punk ballad'],
      'Capo 1 with Em G D C shapes — the recording sounds in F minor. Straight down-strokes, and let the last chord of each bar ring.'),
    S('Basket Case', 'Green Day', 'E', 178, 3, 0, ['E', 'B', 'C#m', 'A', 'G#'],
      'E  B  C#m  A │ G#  A  E  B', ['punk', 'fast', 'power chords'],
      'Play it with power chords and a heavy right hand — that is the entire genre in one song.'),
    S('Seven Nation Army', 'The White Stripes', 'Em', 124, 1, 0, ['Em', 'G', 'C', 'B'],
      'Em  G  C  B (repeat)', ['riff', 'power chord', 'beginner riff'],
      'One riff, four chords, played on the low strings. Good first riff that everyone recognises.'),
    S('Smells Like Teen Spirit', 'Nirvana', 'Fm', 117, 3, 0, ['F5', 'B♭5', 'A♭5', 'D♭5'],
      'F5  B♭5  A♭5  D♭5 (repeat)', ['power chords', 'dynamics', 'grunge'],
      'Four power chords, one of the great dynamics lessons: muted verse, roaring chorus.'),
    S('Come As You Are', 'Nirvana', 'Em', 120, 2, 0, ['Em', 'A5', 'D', 'B5'],
      'Em  A5  D  B5 (repeat)', ['chorus pedal', 'riff', 'easy'],
      'The riff is the chorus pedal with a small clone — try it in the Rig with a Small Clone added.'),
    S('Should I Stay or Should I Go', 'The Clash', 'D', 142, 2, 0, ['D', 'G', 'A'],
      'D  G  D  A (repeat)', ['3 chords', 'punk', 'energy'],
      'Three chords, maximum attitude, and one of the best “get the crowd going” strums there is.'),

    /* ---------------- fingerstyle, blues and slide ---------------- */
    S('Little Wing', 'Jimi Hendrix', 'Em', 76, 5, 0, ['Em', 'G', 'Am', 'Em7', 'Bm', 'B♭'],
      'Em  Em7  G  Am  Em  Bm  B♭  Am', ['hendrix', 'chord melody', 'thumb', 'gliss'],
      'Thumb on the bass, fingers rolling the chord tones. Learn two bars at a time — the whole point is the glide.'),
    S('Sultans of Swing', 'Dire Straits', 'Dm', 148, 5, 0, ['Dm', 'C', 'B♭', 'A', 'F', 'G'],
      'Verse: Dm  C  B♭  A │ Chorus: F  C  B♭  C', ['filigree', 'fingerstyle', 'lead'],
      'Fingerpicked chords with a lead line woven between them — one of the best “play it alone” arrangements.'),
    S('Black Magic Woman', 'Santana', 'Dm', 114, 4, 0, ['Dm', 'Am', 'Gm', 'Dm7', 'Em7'],
      'Dm  Am  Gm  Am  Dm  (rumba feel)', ['latin', 'rumba', 'lead'],
      'A latin rumba strum on the low strings with lead fills in between. Add a wah for the solo.'),
    S('Pride and Joy', 'Stevie Ray Vaughan', 'E', 128, 4, 0, ['E', 'A', 'B7', 'E7'],
      'E  A  B7  (shuffle in E)', ['shuffle', 'blues', 'srv'],
      'A Texas shuffle: play the bass strings and let the top strings snap on the off-beats. Tune down half a step to match SRV.'),
    S('Sweet Home Chicago', 'Robert Johnson / Blues standard', 'A', 130, 3, 0, ['A7', 'D7', 'E7'],
      'A  A  A  A │ D  D  A  A │ E  D  A  E', ['12-bar blues', 'shuffle', 'improvisation'],
      'The mother of all 12-bar blues. Learn the form once and you can jam with anyone on earth.'),
    S('Stormy Monday', 'T-Bone Walker', 'G', 66, 4, 0, ['G7', 'C7', 'D7', 'Am7', 'Bm7', 'G#7'],
      'G7  C7 │ G7  G#7  Am7  Bm7  B♭7  A7 │ ...', ['slow blues', 'jazz blues', 'tension'],
      'The chord movement in bars 8–10 (the chromatic walk-down) is the whole flavour of the song.'),
    S('Autumn Leaves', 'Jazz standard', 'Gm', 112, 5, 0, ['Am', 'Dm', 'G7', 'C', 'F', 'Bm7♭5', 'E7'],
      'Am  Dm  G  C │ F  Bm7♭5  E7  Am', ['jazz', 'ii-V-I', 'standards'],
      'The most useful jazz progression there is: ii–V–I in two keys, then a turnaround. Learn it in every key.'),
    S('Fly Me to the Moon', 'Jazz standard', 'C', 120, 5, 0, ['Am', 'Dm', 'G7', 'C', 'F', 'Bm7♭5', 'E7'],
      'Am  Dm  G7  C │ F  Bm7♭5  E7  Am  F  G7  C', ['jazz', 'swing', 'standards'],
      'Play the chords as four-to-the-bar comping with the root on beat 1 and the chord stabs on 2 and 4.'),
    S('Layla (acoustic)', 'Derek and the Dominos', 'Dm', 92, 4, 0, ['Dm', 'B♭', 'C', 'F', 'G', 'Am'],
      'Dm  B♭  C  Dm │ B♭  C  Dm  Dm', ['blues rock', 'riffs', 'solo'],
      'The acoustic version is a gorgeous fingerpicked arrangement of the same riff — great for one guitar.'),
    S('Signe', 'Eric Clapton', 'G', 120, 4, 0, ['G', 'C', 'D', 'Em', 'Am7'],
      'Instrumental over G  C  D with a walking melody', ['instrumental', 'fingerstyle', 'unplugged'],
      'A fingerstyle instrumental — the melody sits inside the chords, so practise it as a chord-melody.'),
    S('Dust in the Wind', 'Kansas', 'Am', 94, 5, 0, ['Am', 'G', 'C', 'Dm', 'Am7', 'Cadd9'],
      'Am  Am7  C  D  F  C  Am  G  (travis picking)', ['travis picking', 'fingerstyle', 'classic'],
      'Travis picking at its best: a steady alternating thumb with a rolling melody above it.'),
    S('Classical Gas', 'Mason Williams', 'Am', 132, 5, 0, ['Am', 'G', 'F', 'E7', 'C', 'B7'],
      'Am  G  F  E7 (with a moving bass line)', ['instrumental', 'technique', 'fingerstyle'],
      'A workout: fast runs, bass walks, and a melody that has to sing over both.'),

    /* ---------------- modern and singer-songwriter ---------------- */
    S('Someone Like You', 'Adele', 'A', 67, 3, 0, ['A', 'E', 'F#m', 'D'],
      'Verse: A  E  F#m  D │ Chorus: A  E  F#m  D', ['ballad', 'piano song', 'big chorus'],
      'A piano ballad that maps onto four guitar chords. Keep the picking gentle in the verse and let it open up later.'),
    S('Perfect', 'Ed Sheeran', 'G', 94, 2, 1, ['G', 'Em', 'C', 'D'],
      'Verse: G  Em  C  D', ['6/8', 'ballad', 'capo'],
      'Capo 1 with G shapes (sounding in A♭), played in 6/8 — count “one two three, four five six” and strum on 1 and 4.'),
    S('Photograph', 'Ed Sheeran', 'E', 108, 3, 0, ['E', 'B', 'C#m', 'A', 'B7'],
      'E  B  C#m  A (repeat)', ['looping', 'strumming', 'pop'],
      'A loop-pedal song: three chords, one rhythm, endless layering. Perfect material for the Rig’s looper.'),
    S('Rivers and Roads', 'The Head and the Heart', 'G', 100, 3, 0, ['G', 'C', 'Em', 'D', 'Am'],
      'G  C  Em  D', ['harmonies', 'folk', 'dynamics'],
      'Big dynamics and lots of space — an easy song to sing and play at the same time.'),
    S('Slow Dancing in a Burning Room', 'John Mayer', 'C', 70, 5, 0, ['C', 'Am', 'F', 'G', 'Em', 'Dm', 'G/B'],
      'Verse: C  Am  F  G │ Pre: Em  Dm  C  G/B', ['blues pop', 'touch', 'dynamics'],
      'The feel is everything: play it loud-soft-loud with your fingers and let the low strings carry it.'),
    S('Neon', 'John Mayer', 'E', 130, 5, 0, ['E', 'B7', 'A', 'F♯m7', 'B7sus4', 'E7'],
      'E  B7  A  F#m7  B7sus4 (thumb and fingers)', ['thumb independence', 'groove', 'hard'],
      'A modern Travis-picking masterclass. Learn the thumb part alone for a week before adding any fingers.'),
    S('Fast Car', 'Tracy Chapman', 'A', 104, 3, 0, ['A', 'D', 'F#m', 'E', 'Esus4'],
      'A  D  F#m  E (repeat)', ['fingerpicking', 'story', 'acoustic'],
      'One picking pattern for the whole song, with the changes falling underneath it. Great for building stamina.'),
    S('Heart of Gold', 'Neil Young', 'Em', 84, 2, 0, ['Em', 'C', 'D', 'Am', 'G'],
      'Intro: Em  C  D  G │ Em  C  D  Em', ['harmonica', 'acoustic', 'classic'],
      'Play the intro riff with hammer-ons — then the same two chords carry the whole song.'),
    S('Harvest Moon', 'Neil Young', 'D', 110, 3, 0, ['D', 'A', 'Em', 'G', 'Bm'],
      'D  D  A  A │ Em  Em  G  A  D', ['gentle', 'fingerpicking', 'waltz'],
      'A 3/4 waltz — count one-two-three and let the bass note land on beat one.'),
    S('The Needle and the Damage Done', 'Neil Young', 'Em', 86, 3, 0, ['Em', 'C', 'D', 'G', 'Am'],
      'Em7  Em7  C  D', ['one guitar', 'dynamics', 'classic'],
      'Written to be played alone. Two chords, huge feeling, lots of space.'),
    S('Big Yellow Taxi', 'Joni Mitchell', 'E', 160, 4, 0, ['E', 'A', 'B7', 'E7', 'A6', 'F#m'],
      'E  E7  A  A6  F#m  B7', ['open tuning style', 'joni', 'fingerstyle'],
      'Joni played this in an open E tuning (E B E G# B E). Try open E in the tuner, then slide the shapes around.'),
    S('Both Sides Now', 'Joni Mitchell', 'E', 92, 4, 0, ['E', 'A', 'F#m', 'B7', 'G#m', 'C#m'],
      'E  A  F#m  B7 │ G#m  C#m  A  B7', ['jazz chords', 'fingerstyle', 'songwriting'],
      'The chord movement is the song: a descending bass line under shifting major and minor shapes.'),
    S('Hallelujah', 'Leonard Cohen', 'C', 58, 3, 0, ['C', 'Am', 'F', 'G', 'E7'],
      'C  Am  C  Am │ F  G  C  G', ['ballad', 'fingerpicking', 'slow'],
      'A 6/8 ballad in C. Roll the chords instead of strumming them and it sounds like the recording.'),

    /* ---------------- songs that teach parts ---------------- */
    S('Sultans of Swing (rhythm part)', 'Dire Straits', 'Dm', 148, 4, 0, ['Dm', 'C', 'B♭', 'A'],
      'Dm  C  B♭  A', ['rhythm', 'fill', 'fingerstyle'],
      'Play only the rhythm guitar and you will hear how the fills work around it.'),
    S('Sunshine of Your Love', 'Cream', 'D', 116, 2, 0, ['D', 'C', 'G', 'A'],
      'Riff over D with D  C  G  A changes', ['riff', 'blues rock', 'famous riff'],
      'The riff is a chord shape played as single notes. A perfect first “real” riff.'),
    S('Back in Black', 'AC/DC', 'E', 94, 3, 0, ['E', 'D', 'A', 'B7'],
      'E  D  A  E (with the famous turnaround)', ['riff', 'band', 'classic rock'],
      'Less gain than you think, a lot of volume, and the guitar volume knob doing the work.'),
    S('Highway to Hell', 'AC/DC', 'A', 116, 2, 0, ['A', 'D', 'G'],
      'A  D  G (riff on the low strings)', ['3 chords', 'riff', 'rock'],
      'Three chords and one of the greatest riffs ever written on the low strings.'),
    S('Whole Lotta Love', 'Led Zeppelin', 'E', 89, 3, 0, ['E', 'D', 'A', 'G'],
      'Main riff on E (blues scale) and the D  A  change', ['riff', 'blues', 'timing'],
      'The riff hangs on the timing of the rests — practise it with the metronome on the backbeat.'),
    S('Under the Bridge', 'Red Hot Chili Peppers', 'E', 85, 4, 0, ['E', 'B', 'C#m', 'A', 'F#m', 'E7'],
      'Intro: C#m  A  E7  F#m  B │ B  C#m  E  F#m  A  E  B  C#m  A  C#m', ['fingerstyle', 'arpeggio', 'frusciante'],
      'Played with fingers and open strings ringing: the whole intro is one arpeggio pattern moving down the neck.'),
    S('Wind Cries Mary', 'Jimi Hendrix', 'F', 82, 5, 0, ['F', 'E♭', 'D♭', 'C', 'B♭', 'Am'],
      'F  E♭  D♭  C  B♭ (descending)', ['chord melody', 'hendrix', 'thumb'],
      'Chords sliding down the neck with the thumb holding the bass — the sweetest intro in the Hendrix catalogue.'),
    S('Purple Haze', 'Jimi Hendrix', 'E', 108, 4, 0, ['E7♯9', 'G', 'A'],
      'E7♯9 riff, then G  A', ['riff', 'fuzz', 'hendrix'],
      'That opening chord is a 7♯9 — a dominant chord with both a major and minor 3rd, and the oldest trick in rock.'),
    S('Voodoo Child (Slight Return)', 'Jimi Hendrix', 'E', 178, 4, 0, ['E7♯9', 'E7', 'A', 'G'],
      'E7♯9 riff with a wah, then A  G  E', ['wah', 'riff', 'funk rock'],
      'A wah pedal parked and swept slowly over a single chord — the Rig has the Fuzz Face + V847 preset.'),
    S('Machine Gun', 'Jimi Hendrix', 'Em', 66, 5, 0, ['Em', 'G', 'A', 'D'],
      'Em  G  A (freely, with feedback)', ['expression', 'slow', 'mastery'],
      'Almost no chords — this one is about what you do between the notes. Practise long bends into the tuner.'),
    S('Cortez the Killer', 'Neil Young', 'Em', 92, 4, 0, ['Em', 'D', 'Am', 'G', 'C'],
      'Em  D  Am  G (long, slow)', ['solos', 'feel', 'slow'],
      'Seven minutes, three chords, and a whole philosophy of soloing. Play it with the amp on the edge of break-up.'),
    S('Yellow Ledbetter', 'Pearl Jam', 'E', 78, 5, 0, ['E', 'B', 'A', 'C#m', 'F#m', 'G#m'],
      'E  B  A  E  (with Hendrix-style fills)', ['hendrix style', 'fills', 'pearl jam'],
      'Written as a tribute to Hendrix — learn the chord shapes, then let the fills wander around them.')
  ];


  /* songs referenced by the artist profiles — so an artist always leads
   * somewhere you can actually play */
  const MORE = [
    S('Wonderwall', 'Oasis', 'F♯m', 87, 2, 2, ['Em7', 'G', 'Dsus4', 'A7sus4', 'Cadd9'],
      'Verse: Em7  G  Dsus4  A7sus4 │ Chorus: Cadd9  Dsus4  Em7  G', ['capo', 'sus chords', 'stadium'],
      'Capo 2 and all four fingers stay down the whole song — the changes are just which bass note you add.'),
    S('Don’t Look Back in Anger', 'Oasis', 'C', 82, 3, 0, ['C', 'G', 'Am', 'F', 'E7', 'D', 'Fm'],
      'C  G  Am  E7 │ F  Fm  C', ['piano song', 'anthem', 'borrowed chords'],
      'The magic is the F to Fm slide under “so Sally can wait” — one finger moving the whole mood.'),
    S('Champagne Supernova', 'Oasis', 'A', 76, 3, 0, ['A', 'G', 'F', 'D', 'E'],
      'A  G  F  G (with a D  E lift)', ['anthem', 'layers', 'long'],
      'Three chords over seven minutes — the song is about the build, so hold the strum back until the second verse.'),
    S('Paranoid Android', 'Radiohead', 'Am', 84, 5, 0, ['Am', 'C', 'D', 'G', 'Bm', 'F', 'Em'],
      'Sectional: Am  C  D  G in the opening, then it changes completely', ['epic', 'odd time', 'sections'],
      'Four songs in one. Learn the sections separately — that is how the band wrote it too.'),
    S('Master of Puppets', 'Metallica', 'Em', 212, 5, 0, ['Em', 'E5', 'C5', 'B5', 'A5', 'G5'],
      'Em  E5  C5  B5  A5  G5 (downpicked)', ['thrash', 'downpicking', 'palm mute'],
      'Every note is a downstroke. Start at half speed with the metronome — precision first, speed later.'),
    S('Enter Sandman', 'Metallica', 'Em', 123, 3, 0, ['Em', 'G5', 'A5', 'E5', 'F♯5', 'B5'],
      'Em  G5  A5  E5  F♯5  (verse riff in Em)', ['riff', 'metal', 'signature'],
      'The riff is two notes on the low E with the open string as a hinge. Palm mute everything.'),
    S('One', 'Metallica', 'Am', 110, 4, 0, ['Am', 'C', 'G', 'Em', 'F', 'D', 'Bm'],
      'Intro: Am  C  G  Em (arpeggiated) │ Later: F  G  Am', ['dynamics', 'clean to distorted', 'epic'],
      'The whole song is one dynamic journey: delicate arpeggios, then the heaviest riff of the decade.'),
    S('Walk', 'Pantera', 'Em', 124, 4, 0, ['Em', 'G', 'A', 'C', 'D'],
      'Em  G  A  Em (groove riff in 4/4 over a 3/4 feel)', ['groove metal', 'riff', 'timing'],
      'The riff is simple but behind the beat — count it as 4/4 and let it swing.'),
    S('Cowboys from Hell', 'Pantera', 'E', 156, 5, 0, ['E5', 'G5', 'A5', 'D5'],
      'E5  G5  A5 (riff with pinch harmonics)', ['pinch harmonics', 'groove metal', 'squeals'],
      'Pinch harmonics: touch the pick and your thumb together near the bridge and dig in.'),
    S('Cemetery Gates', 'Pantera', 'Cm', 106, 5, 0, ['Cm', 'E♭', 'A♭', 'B♭', 'Fm'],
      'Cm  E♭  A♭  B♭ (clean verses, heavy choruses)', ['ballad', 'dynamics', 'harmony'],
      'Clean arpeggios in the verse, a huge chorus, and a solo with long sustained bends.'),
    S('Johnny B. Goode', 'Chuck Berry', 'B♭', 168, 3, 0, ['B♭', 'E♭', 'F7'],
      '12-bar in B♭: B♭  E♭  F7 (with double-stop intro)', ['rock and roll', 'double stops', '12-bar'],
      'Play the intro with double stops (two strings at once) and you have got the whole vocabulary of rock.'),
    S('Maybellene', 'Chuck Berry', 'A', 168, 3, 0, ['A', 'D', 'E'],
      '12-bar in A at a gallop', ['rock and roll', '12-bar', 'groove'],
      'The rhythm is a shuffle played with the right hand driving — a great stamina exercise.'),
    S('Start Me Up', 'The Rolling Stones', 'G', 138, 3, 0, ['G', 'C', 'F', 'B♭'],
      'Open G: G  C  G  F  B♭', ['open G', 'riff', 'keef'],
      'The riff is played in open G with the low string removed — the same shape everywhere, just moved.'),
    S('Honky Tonk Women', 'The Rolling Stones', 'G', 116, 3, 0, ['G', 'C', 'D'],
      'Open G riff over G  C  D', ['open G', 'riff', 'country rock'],
      'The riff is two strings a fifth apart, moved up and down. Try D G D G B D tuning.'),
    S('Brown Sugar', 'The Rolling Stones', 'C', 128, 3, 0, ['C', 'F', 'B♭', 'G'],
      'C  F  C  B♭  G (open G riff)', ['riff', 'open G', 'rock'],
      'A perfect demonstration of how one shape in open G becomes four chords.'),
    S('Pinball Wizard', 'The Who', 'B', 130, 4, 0, ['B', 'A', 'E', 'F♯', 'Bm', 'G'],
      'B  A  E  F♯ (arpeggiated), then the chorus, B...', ['arpeggio', 'power chords', 'dynamics'],
      'The verse is a fingerpicked arpeggio; the chorus is full power chords. Great dynamic contrast.'),
    S('Baba O’Riley', 'The Who', 'A', 132, 4, 0, ['A', 'D', 'E', 'C♯m'],
      'A  D  A  E (repeating over the synth)', ['anthem', 'power chords', 'energy'],
      'The chords are primitive; the arrangement is not. Play it loud and let the amp do the work.'),
    S('My Generation', 'The Who', 'G', 110, 3, 0, ['G', 'F', 'C', 'D'],
      'G  F  G  C  D', ['mod', 'power chords', 'stutter'],
      'The famous stutter comes from the bass solo — as a guitarist you play around it.'),
    S('Free Fallin’', 'Tom Petty', 'F', 168, 2, 0, ['F', 'B♭', 'C', 'Dm'],
      'F  B♭  C  Dm — but really the same three chords the whole way', ['3 chords', 'capo shapes', 'singer-songwriter'],
      'The original uses capo 1 with E A B shapes — try both and notice how different the voicings sound.'),
    S('American Girl', 'Tom Petty', 'D', 116, 2, 0, ['D', 'A', 'G', 'Em', 'Bm'],
      'D  A  G  Em  (chorus: D  G  A)', ['jangle', 'classic', 'riff'],
      'A bright jangle with one of the best intro strums in rock — and a 12-string helps.'),
    S('Runnin’ Down a Dream', 'Tom Petty', 'A', 172, 2, 0, ['A', 'D', 'E', 'F♯m'],
      'A  D  E  (repeat)', ['fast', 'anthem', 'easy'],
      'Three chords at a sprint. Perfect for practising pick accuracy when you are tired.'),
    S('Never Going Back Again', 'Fleetwood Mac', 'D', 176, 5, 1, ['D', 'G', 'A', 'Em', 'F♯m', 'Bm'],
      'Capo 3 (or dropped D): fingerpicked patterns over D  G  A', ['fingerstyle', 'travis picking', 'hard'],
      'A fingerstyle masterclass — the thumb plays a bass line, two fingers cover the melody.'),
    S('Big Love', 'Fleetwood Mac', 'B', 152, 5, 0, ['B', 'A', 'E', 'F♯', 'G♯m'],
      'Fingerpicked and rhythmic, almost percussive', ['fingerstyle', 'percussive', 'hard'],
      'Played live as a solo fingerstyle piece — the right hand is a drum kit.'),
    S('Albatross', 'Fleetwood Mac', 'E', 70, 3, 0, ['E', 'A', 'B', 'C♯m', 'G♯m', 'F♯m'],
      'E  A  B  E (dreamy, slow)', ['instrumental', 'clean tone', 'slow'],
      'An instrumental with a slow, floating lead — perfect for practising tasteful playing with a clean tone.'),
    S('Asturias', 'Isaac Albéniz', 'Am', 132, 5, 0, ['Am', 'E7', 'G', 'F'],
      'Am  E7  Am (with continuous tremolo and a bass line)', ['classical', 'tremolo', 'nylon'],
      'A tremolo study: the thumb plays a bass line while the fingers play rapid repeated notes.'),
    S('Windy and Warm', 'Chet Atkins', 'E', 116, 4, 0, ['E', 'A', 'B7', 'E7', 'F♯m', 'A♭m'],
      'A  E  B7  E (travis picking instrumental)', ['fingerstyle', 'travis', 'instrumental'],
      'Chet’s classic: a train-like alternating thumb under a bouncy melody.'),
    S('Mr. Sandman', 'Chet Atkins', 'G', 130, 4, 0, ['G', 'C', 'D7', 'E7', 'A7', 'B7'],
      'G  C  D7  G (chord melody arrangement)', ['chord melody', 'arrangement', 'fingerstyle'],
      'Play it as a chord-melody: the melody on the top two strings with the chord underneath.'),
    S('Four on Six', 'Wes Montgomery', 'Gm', 176, 5, 0, ['Gm', 'Cm', 'D7', 'E♭', 'F7', 'B♭'],
      'Gm  Cm  D7  Gm (jazz rhythm changes feel)', ['jazz', 'octaves', 'thumb'],
      'Play the head in octaves with your thumb — that single trick is Wes Montgomery’s whole flavour.'),
    S('West Coast Blues', 'Wes Montgomery', 'B♭', 168, 5, 0, ['B♭', 'E♭', 'F7', 'Gm', 'Cm'],
      'B♭  E♭  F7  B♭ (a 12-bar with a twist)', ['jazz blues', 'octaves', 'comping'],
      'A jazz blues — the chords move faster than a rock 12-bar, so learn it as a pattern of numbers.'),
    S('Angelina', 'Tommy Emmanuel', 'A', 92, 5, 0, ['A', 'E', 'F♯m', 'D', 'Bm', 'C♯7'],
      'A  E  F♯m  D (fingerstyle ballad)', ['fingerstyle', 'harmonics', 'arrangement'],
      'A solo fingerstyle piece where the guitar plays bass, chords and melody at once. Learn two bars at a time.'),
    S('Mas Que Nada', 'Jorge Ben', 'Fm', 96, 5, 0, ['Fm', 'B♭m', 'E♭', 'C7', 'Fm7', 'B♭7'],
      'Fm  B♭m  E♭  C7 (samba)', ['samba', 'nylon', 'right hand'],
      'The right hand plays a samba batida pattern while the left holds jazz chords — a real workout.'),
    S('I’ll Take You There', 'The Staple Singers', 'C', 100, 3, 0, ['C', 'F', 'G', 'Am'],
      'C  F  C  G (groove)', ['soul', 'groove', 'funk'],
      'One groove, one key, endless pocket. Play it with the metronome on the backbeat.'),
    S('Get Lucky', 'Daft Punk', 'Fm', 116, 3, 0, ['Fm', 'B♭m', 'E♭', 'C7', 'Am7', 'Dm7'],
      'Fm  B♭m  E♭  C7  Am7  Dm7  (a moving bass line)', ['disco', 'chicken scratch', 'funk'],
      'Nile Rodgers style: play six-note funk chords as short stabs and let the low end move.'),
    S('Good Times', 'Chic', 'E', 112, 4, 0, ['E', 'A', 'B', 'F♯m', 'C♯m', 'G♯m'],
      'E  A  B (with the classic chicken-scratch right hand)', ['disco', 'funk', 'rhythm'],
      'The scratch: mute everything, then snap the chord shape on the off-beats.'),
    S('Le Freak', 'Chic', 'Am', 122, 4, 0, ['Am', 'D', 'G', 'C', 'F', 'B♭'],
      'Am  D  G  C  F  B♭ (ninth-chord funk)', ['disco', 'funk', 'ninth chords'],
      'Ninth chords everywhere and a right hand that never stops. Count sixteenths out loud.'),
    S('This Charming Man', 'The Smiths', 'F♯', 108, 4, 0, ['F♯', 'B', 'A', 'E', 'C♯m', 'G♯m'],
      'A  B  F♯ (arpeggios that move up the neck)', ['jangle', 'arpeggio', 'capo'],
      'One guitar, two lines: a ringing arpeggio pattern with an open string droning through it.'),
    S('There Is a Light That Never Goes Out', 'The Smiths', 'D', 138, 2, 4, ['D', 'A', 'G', 'Bm', 'F♯m'],
      'D  A  G  A with a rising bass line', ['capo', 'jangle', 'indie'],
      'Capo 4 with D A G shapes — the whole song is the same four bars with a string section on top.'),
    S('Purple Rain', 'Prince', 'B♭', 66, 4, 0, ['B♭', 'E♭', 'F', 'Gm', 'Dm', 'E♭maj7'],
      'B♭  E♭  B♭ │ F  Gm  F  B♭', ['epic', 'slow', 'solo'],
      'Slow, huge and mostly space. The main rhythm part is a gentle arpeggio — the solo is where the song lives.'),
    S('Kiss', 'Prince', 'Am', 112, 3, 0, ['Am', 'G', 'F', 'Em', 'D'],
      'Am  G  F  Em (funk stabs)', ['funk', 'muted', 'rhythm'],
      'Everything is muted and short — the funk is in the staccato, not in the notes.'),
    S('Let’s Go Crazy', 'Prince', 'C', 178, 3, 0, ['C', 'F', 'G', 'Am', 'E'],
      'C  F  C  G (with a huge chorus lift)', ['party', 'energy', 'solo'],
      'Fast and joyful, with a keyboard line the guitar doubles. Practise it as straight eighths.'),
    S('Gravity', 'John Mayer', 'G', 66, 4, 0, ['G', 'C', 'D', 'Em', 'Bm', 'Am'],
      'G  C  G  D │ G  D  Em (very slow)', ['ballad', 'space', 'feel'],
      'Almost nothing to play, which is the point: sit behind the beat and let the notes breathe.'),
    S('Where the Streets Have No Name', 'U2', 'D', 126, 3, 0, ['D', 'A', 'Bm', 'G', 'Em7'],
      'D  A  Bm  G (open strings over everything)', ['delay', 'drones', 'anthem'],
      'Set a dotted-eighth delay in the Rig and let the repeats do half the playing.'),
    S('With or Without You', 'U2', 'D', 110, 2, 0, ['D', 'A', 'Bm', 'G'],
      'D  A  Bm  G — one loop for the whole song', ['4 chords', 'drone', 'anthem'],
      'The same four chords for five minutes, with the guitar slowly becoming a texture.'),
    S('Pride (In the Name of Love)', 'U2', 'B', 106, 3, 0, ['B', 'E', 'F♯', 'G♯m', 'G♯m7'],
      'B  E  F♯  G♯m (chiming arpeggios)', ['delay', 'arpeggio', 'anthem'],
      'The arpeggio pattern is constant — the song changes underneath it.'),
    S('November Rain', 'Guns N’ Roses', 'B', 80, 4, 0, ['B', 'G♯m', 'F♯', 'E', 'C♯m', 'D♯m'],
      'B  G♯m  F♯  E (verse) │ E  F♯  B (chorus)', ['epic', 'piano ballad', 'solo'],
      'A ballad with three big sections — learn the verse chords, then the lift into the chorus.'),
    S('Welcome to the Jungle', 'Guns N’ Roses', 'E', 124, 4, 0, ['E', 'B', 'A', 'G', 'C♯5'],
      'E5  B5  A5  G5 (single-note intro riff)', ['riff', 'groove', 'hard rock'],
      'The intro riff is one string and a lot of attitude. Then the verse chords are just E and B.'),
    S('Lithium', 'Nirvana', 'E', 123, 2, 0, ['E', 'G♯', 'A', 'C', 'D', 'B'],
      'E  G♯  A  C  D  B — verse is quiet, chorus is huge', ['dynamics', 'grunge', 'power chords'],
      'Play the verse with barre chords and the chorus with power chords and it sounds exactly right.'),
    S('Californication', 'Red Hot Chili Peppers', 'Am', 96, 3, 0, ['Am', 'F', 'C', 'G', 'Em', 'Dm'],
      'Am  F  Am  F │ C  G  F  (arpeggiated)', ['arpeggio', 'clean', 'melodic'],
      'A fingerpicked arpeggio pattern carrying a melody — the most melodic thing in the RHCP catalogue.'),
    S('Dani California', 'Red Hot Chili Peppers', 'Am', 96, 4, 0, ['Am', 'F', 'C', 'G', 'Dm', 'Em'],
      'Am  F  C  G (verse riff in Em shapes)', ['riff', 'funk', 'dynamics'],
      'Frusciante’s rhythm part is a shuffle of muted sixteenths — the wah is doing the colour.'),
    S('Mary Had a Little Lamb', 'Stevie Ray Vaughan', 'E', 152, 4, 0, ['E', 'A', 'B7', 'E7', 'A7', 'C♯7'],
      'E7  A7  B7 (a shuffle, with the melody on top)', ['shuffle', 'blues', 'srv'],
      'A nursery rhyme turned into a Texas shuffle — learn the bass line first, the melody comes easily after.'),
    S('Soothsayer', 'Buckethead', 'Em', 96, 5, 0, ['Em', 'G', 'A', 'Bm', 'D', 'Am'],
      'Em  G  A  Bm (long, expressive lead over it)', ['instrumental', 'emotion', 'lead'],
      'A wordless ballad — the whole thing is phrasing and bends. Practise it with the amp on the edge of breakup.'),
    S('Scuttle Buttin’', 'Stevie Ray Vaughan', 'E', 190, 5, 0, ['E7', 'A7', 'B7'],
      'E7  A7  B7 (instrumental shuffle at full tilt)', ['shuffle', 'speed', 'instrumental'],
      'One of the great electric instrumentals — start at half tempo and only then let the fingers off the leash.'),
    S('Freight Train', 'Elizabeth Cotten', 'C', 120, 2, 0, ['C', 'G7', 'F', 'Am', 'Em'],
      'C  G7  C │ C  F  C  G7', ['fingerstyle', 'travis', 'songbook'],
      'The song that taught the world to Travis pick — written by a left-handed player on an upside-down guitar.'),
    S('A Case of You', 'Joni Mitchell', 'A', 108, 3, 0, ['A', 'Bm', 'D', 'E', 'F♯m', 'C♯m'],
      'Open tuning: A  Bm  D  A (dulcimer-like)', ['open tuning', 'fingerstyle', 'songwriting'],
      'Joni played it in open G with a capo high up — try a capo at 5 and let the top strings ring.'),
    S('Oye Como Va', 'Santana', 'Am', 122, 3, 0, ['Am7', 'D9', 'Am7', 'D'],
      'Am7  D9 (two chords, forever)', ['2 chords', 'latin', 'groove'],
      'Two chords for the whole song — everything is the rhythm and the organ, so make the groove the point.'),
    S('Smooth', 'Santana', 'Am', 116, 3, 0, ['Am', 'F', 'C', 'G', 'Dm', 'E7'],
      'Am  F  C  G (chorus: Am  Dm  E7)', ['latin rock', 'lead', 'vocals'],
      'Santana’s part is mostly single-note lines that answer the vocal, with the chords holding the groove.'),
    S('Money for Nothing', 'Dire Straits', 'Gm', 134, 4, 0, ['Gm', 'B♭', 'C', 'F', 'Dm'],
      'Gm  B♭  C  Gm (the famous riff)', ['riff', 'tone', 'fingerstyle'],
      'A one-finger riff with a huge delay and a wah parked — the tone lesson is the whole song.'),
    S('Brothers in Arms', 'Dire Straits', 'Gm', 84, 4, 0, ['Gm', 'E♭', 'Dm', 'B♭', 'F', 'Cm'],
      'Gm  E♭  Dm  B♭ (slow, atmospheric)', ['fingerstyle', 'clean', 'atmospheric'],
      'A clean, atmospheric ballad — the guitar is more of a choir than a band instrument.'),
    S('Bohemian Rhapsody', 'Queen', 'B♭', 72, 4, 0, ['B♭', 'Gm', 'E♭', 'F', 'E♭maj7', 'D'],
      'B♭  Gm  E♭  F (intro), then it changes completely', ['sections', 'arrangement', 'epic'],
      'Learn it as three songs. The guitar parts in the middle section are the best harmony-guitar writing in rock.'),
    S('Tie Your Mother Down', 'Queen', 'A', 134, 4, 0, ['A', 'D', 'E', 'F♯m', 'C♯m', 'B'],
      'A  D  E (with the big riff at the open A)', ['riff', 'harmonies', 'hard rock'],
      'The riff is a two-string figure around the open A string — big, simple and unstoppable.'),
    S('Time', 'Pink Floyd', 'Bm', 68, 4, 0, ['Bm', 'A', 'G', 'E', 'Em7', 'C'],
      'Bm  A  G  E (with the famous clocks at the start)', ['solo', 'delay', 'prog'],
      'The solo works because of the space around it — play fewer notes and mean them.'),
    S('The Thrill Is Gone', 'B.B. King', 'Bm', 96, 4, 0, ['Bm7', 'Em7', 'A7', 'F♯7', 'G'],
      'Bm7  Em7  Bm7  F♯7 (slow minor blues)', ['slow blues', 'bending', 'vibrato'],
      'Every phrase is a sentence: play, answer, rest. The minor blues is the most useful form you can learn.'),
    S('Born Under a Bad Sign', 'Albert King', 'C♯m', 92, 4, 0, ['C♯m7', 'F♯m7', 'G♯7', 'C♯7'],
      'C♯m7  F♯m7  G♯7 (a slow blues in a swampy key)', ['slow blues', 'bending', 'feel'],
      'Play it in C♯ minor and enjoy how much bigger the bends feel in a horn-friendly key.'),
    S('Crossroads', 'Cream', 'A', 126, 4, 0, ['A7', 'D7', 'E7', 'G', 'F♯', 'B'],
      'A  A  A  A │ D  D  A  A │ E  D  A  E (with the G–F♯ turnaround)', ['blues rock', '12-bar', 'solo'],
      'Learn the 12-bar form, then the turnaround (E  D  A  G  F♯) and you have the whole song.'),
    S('Layla', 'Derek and the Dominos', 'Dm', 116, 5, 0, ['Dm', 'B♭', 'C', 'F', 'G', 'Am', 'Dm7'],
      'Dm  B♭  C  Dm (with the descending melody)', ['riff', 'blues rock', 'iconic'],
      'The main riff is five notes that repeat while the chords shift — the definition of a hook.'),
    S('While My Guitar Gently Weeps', 'The Beatles', 'Am', 116, 4, 0, ['Am', 'G', 'D', 'E7', 'F', 'C'],
      'Am  Am/G  D  F  (descending bass line)', ['chord melody', 'beatles', 'solo'],
      'The descending bass line under the Am shape is the whole trick. Clapton’s solo is all vibrato.'),
    S('Something', 'The Beatles', 'C', 66, 4, 0, ['C', 'Cmaj7', 'C7', 'F', 'D7', 'G', 'Am'],
      'C  Cmaj7  C7 │ F  D7  G │ Am  Am/G  F♯m7  F  E7', ['chord melody', 'romantic', 'beatles'],
      'The most beautiful chord movement in the Beatles catalogue — three chords that only shift one note at a time.'),
    S('Little Martha', 'Duane Allman', 'E', 96, 3, 0, ['E', 'A', 'B', 'F♯m', 'C♯m'],
      'E  A  B  E (instrumental, open tuning)', ['instrumental', 'open tuning', 'fingerstyle'],
      'An acoustic instrumental in open E — the slide floats over a rolling fingerpicked pattern.'),
    S('Kashmir', 'Led Zeppelin', 'D', 78, 4, 0, ['D', 'D6', 'G', 'A', 'Em', 'F'],
      'D  D6  D  D6 — a three-note riff that never stops', ['riff', 'odd feel', 'epic'],
      'The riff is a repeated three-note figure in D with the drums playing a completely different feel.'),
    S('Roxanne', 'The Police', 'G', 128, 3, 0, ['Gm', 'D', 'E♭', 'F', 'B♭', 'Cm'],
      'Gm  D  E♭  Gm (with lots of space)', ['reggae rock', 'trio', 'space'],
      'The guitar plays one or two chords per bar — the song is about the silence in between.'),
    S('Every Breath You Take', 'The Police', 'G', 117, 3, 0, ['G', 'Em', 'C', 'D', 'Bm'],
      'G  Em  C  D (one repeating loop)', ['arpeggio', 'loop', 'iconic'],
      'A simple loop played as a rolling arpeggio — the same four chords the whole way through.'),
    S('Message in a Bottle', 'The Police', 'C♯m', 150, 4, 0, ['C♯m', 'A', 'B', 'E', 'F♯m'],
      'C♯m  A  B  C♯m (with open-string arpeggios)', ['arpeggio', 'new wave', 'energy'],
      'The riff is an arpeggio with the high strings ringing open — a great example of economy.'),
    S('Barracuda', 'Heart', 'E', 136, 4, 0, ['E', 'G', 'A', 'B', 'D'],
      'E  G  A  E (galloping riff)', ['riff', 'hard rock', 'timing'],
      'A galloping syncopated riff — count sixteenths and keep the right hand even.'),
    S('Yellow', 'Coldplay', 'B', 88, 3, 0, ['B', 'F♯', 'E', 'G♯m', 'E♭m'],
      'B  F♯  E  B (capo shapes are easier: A  E  D  A)', ['capo', 'anthem', 'acoustic'],
      'Capo 2 with G  D  C  G shapes — a bright, simple acoustic part with the chords ringing.'),
    S('The Scientist', 'Coldplay', 'D', 74, 3, 5, ['D', 'A', 'F♯m', 'E', 'Bm'],
      'D  A  F♯m  E (with a rolling bass line)', ['piano ballad', 'capo', 'fingerpicking'],
      'Capo 5 with D A F♯m E shapes (sounding in F), played as a slow fingerpicked pattern that keeps moving.'),
    S('Fix You', 'Coldplay', 'C', 138, 3, 3, ['C', 'Em', 'Am', 'F', 'G'],
      'C  Em  Am  F (building)', ['build', 'anthem', 'capo'],
      'Capo 3 with C Em Am F shapes (sounding in E♭). The whole song is a build: the same four chords quiet, then loud, then enormous.'),
    S('Skinny Love', 'Bon Iver', 'C', 76, 3, 0, ['C', 'Am', 'F', 'G', 'Em'],
      'C  Am  F  G (fingerpicked)', ['fingerstyle', 'emotional', 'indie'],
      'Fingerpicked with an aggressive attack — the dynamics are the song.'),
    S('Buddy Holly', 'Weezer', 'F♯', 122, 3, 0, ['F♯', 'E', 'B', 'G♯m'],
      'F♯  E  C♯m  B (power chords and a happy riff)', ['power chords', '90s', 'bright'],
      'A power-chord song with a bright, simple riff — good practice for chord changes at speed.'),
    S('Say It Ain’t So', 'Weezer', 'F', 122, 3, 0, ['F', 'G', 'E', 'A', 'C', 'D'],
      'F  G  E  A  (chorus lifts to A and C)', ['alternative', 'dynamics', '90s'],
      'The verse is quiet and the chorus is loud — perfectly suited to practising dynamic control.')
  ];
  SONGS.push.apply(SONGS, MORE);

  /* ---------------- the last few artist pages: advanced / jazz / modern ------- */
  SONGS.push.apply(SONGS, [
    S('Ain’t Talkin’ ’bout Love', 'Eddie Van Halen', 'Am', 140, 2, 0, ['Am', 'G', 'F', 'E'],
      'Am  G  F  E (descending, over and over)', ['riff', 'classic rock', 'power chords'],
      'Four chords walking down the A minor scale with open strings ringing. The riff is the point: learn it, then let everything ring.'),
    S('Cosmic Sans', 'Cory Wong', 'E', 118, 4, 0, ['E9', 'A13', 'B12', 'F♯m7'],
      'E9  A13 │ B12  F♯m7 (16th-note funk)', ['funk', '16ths', 'rhythm'],
      'A funk workout: tight 16th-note scratches with a choked right hand. Play it completely muted first, then add the sound.'),
    S('Shenandoah', 'Bill Frisell', 'C', 66, 3, 0, ['C', 'Am', 'F', 'G', 'Em'],
      'C  Am  F  G (slow, rubato)', ['ambient', 'melody', 'touch'],
      'Treat it as a chord melody: hold each chord and let the melody note sit on top. Nothing here is rushed.'),
    S('All the Things You Are', 'Joe Pass', 'Fm', 120, 5, 0, ['Fm', 'B♭m', 'E♭', 'A♭', 'D♭', 'G7', 'C'],
      'Fm  B♭m  E♭  A♭ │ D♭  G7  C (the famous turnaround)', ['jazz', 'turnaround', 'standards'],
      'A chain of ii–V–I movements through four keys. Learn the shapes in order and a large part of the neck opens up.'),
    S('CAFO', 'Tosin Abasi', 'F♯m', 98, 5, 0, ['F♯m', 'A', 'E', 'B'],
      'F♯m  A  E  B in 7/8 (count 1-2-3 · 1-2-3 · 1-2)', ['djent', '7/8', 'tapping'],
      'A 7/8 tapping study: the accent pattern is everything. Tap it slowly with a metronome on 7 before you touch the distortion.'),
    S('Marigold', 'Periphery', 'Dm', 132, 5, 0, ['Dm', 'B♭', 'F', 'C', 'Gm'],
      'Dm  B♭  F  C (odd grouping: 7 + 5 sixteenths)', ['djent', 'odd meter', 'muting'],
      'The riff is an odd grouping of sixteenths — count 1-2-3-4-5-6-7 against the kick instead of playing to the beat.')
  ]);

  /* ------------------------------------------------------------------ */
  /* technique lessons: what to learn and which songs teach it           */
  /* ------------------------------------------------------------------ */
  function L(title, level, skill, description, how, songs, tags) {
    return { id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), title: title, level: level, skill: skill, description: description, how: how || [], songs: songs || [], tags: tags || [], search: title + ' ' + skill + ' ' + (tags || []).join(' ') };
  }
  const LESSONS = [
    L('Open chords shape by shape', 1, 'Chords', 'Eight shapes cover hundreds of songs. Learn them one at a time and change between them without stopping.',
      ['C, A, G, E, D minors and majors — one lesson per shape', 'Practise the change, not the chord: hold the shape for one second, move, repeat', 'Play the pair you find hardest for 60 seconds a day'],
      ['Knockin’ on Heaven’s Door', 'Let It Be', 'Stand By Me'], ['beginner', 'chords', 'essentials']),
    L('Silent change drill', 1, 'Chords', 'The gap between chords is where beginners lose the beat — train the change itself.',
      ['Strum a chord four times, then move your fingers in silence for four beats', 'Repeat, and keep the strumming hand moving the whole time', 'Speed up only when no note buzzes'],
      ['Love Me Do', 'Bad Moon Rising', 'Twist and Shout'], ['chords', 'timing', 'drill']),
    L('Spider walk (finger independence)', 1, 'Technique', 'Walk the chromatic scale across the strings one finger per fret — the classic warm-up for independent fingers.',
      ['Frets 1-2-3-4 on one string, then move up a string', 'Keep each finger curled and close to the fret', 'Do not lift any finger higher than needed'],
      ['Basket Case', 'Highway to Hell'], ['warm-up', 'technique', 'finger independence']),
    L('Alternate picking', 2, 'Technique', 'Down-up-down-up with the pick, so the hand never stops — the foundation of playing fast.',
      ['Start with a single note at 60 BPM, down up down up', 'Count out loud: 1 and 2 and 3 and 4 and', 'Add a metronome and only speed up when the notes are even'],
      ['Seven Nation Army', 'Back in Black', 'Basket Case'], ['picking', 'speed', 'technique']),
    L('Power chords and palm muting', 2, 'Technique', 'The engine room of rock guitar: two-note chords with a choked low end.',
      ['Play a 5th with the root on the E string, then on the A string', 'Rest the edge of your picking hand on the bridge for palm mute', 'Alternate muted and open bars to hear the difference'],
      ['Smells Like Teen Spirit', 'Highway to Hell', 'Sixteen Saltines'], ['rock', 'power chords', 'muting']),
    L('Barre chords, F first', 2, 'Chords', 'The F chord is a wall every player hits. Climb it slowly and the rest of the neck opens up.',
      ['Roll the index finger slightly onto its side — the bony edge presses cleaner', 'Start with the full F at fret 1, then slide the same shape to fret 3 (G) and 5 (A)', 'Try a partial (top four strings) when you need it fast'],
      ['Boulevard of Broken Dreams', 'I’m Yours', 'Zombie'], ['barre', 'chords', 'milestone']),
    L('Sus, add and slash chords', 2, 'Harmony', 'Small finger moves that turn plain chords into the ones you actually hear on records.',
      ['Sus4: lift a finger to make the 4th, drop it back', 'Add9: keep the third, add the second an octave up', 'Slash chords: change the bass note while the chord stays'],
      ['Every Rose Has Its Thorn', 'Landslide', 'Wish You Were Here'], ['harmony', 'colour', 'intermediate']),
    L('Thumb independence (Travis picking)', 3, 'Fingerstyle', 'The thumb keeps a steady bass while the fingers melody over the top — the sound of acoustic guitar.',
      ['Thumb plays the root on beat 1 and the 5th string note on beat 3', 'Add the fingers on the off-beats, one finger at a time', 'Practise the thumb alone for five minutes before you add anything'],
      ['Dust in the Wind', 'Neon', 'Landslide'], ['fingerstyle', 'travis', 'independence']),
    L('Hammer-ons, pull-offs and slides', 3, 'Technique', 'Legato: getting two notes from one pick stroke, so lines flow instead of clattering.',
      ['Hammer on: sound a note with the finger, not the pick', 'Pull off: flick the finger sideways as you lift', 'Slide: keep the pressure on as you move'],
      ['Wish You Were Here', 'Blackbird', 'Heart of Gold'], ['legato', 'expression', 'technique']),
    L('Bending in tune', 3, 'Expression', 'A bend is only musical if it reaches the right pitch — this is the fastest way to sound like a player.',
      ['Fret the target note, play it, then bend the starting note to match', 'Check every bend against the tuner in Trill Tuner', 'Practise half bends, whole bends and pre-bends'],
      ['Comfortably Numb', 'Machine Gun', 'Purple Haze'], ['bending', 'pitch', 'expression']),
    L('Vibrato: the singer’s voice', 3, 'Expression', 'Vibrato is the difference between a note played and a note sung. Width and rate both matter.',
      ['Bend the string around its axis, not the finger sideways', 'Aim for roughly five to six wobbles a second', 'Practise on a long note with the metronome at 60'],
      ['Machine Gun', 'Back in Black', 'Cortez the Killer'], ['vibrato', 'tone', 'expression']),
    L('Pentatonic boxes and solos', 3, 'Lead', 'Five notes, five shapes, and most of the solos you love.',
      ['Learn box 1 in A at fret 5, then move it', 'Play it in one position first — do not run the whole neck', 'Improvise with only three notes of the box over a jam track'],
      ['Pride and Joy', 'Sunshine of Your Love', 'Sweet Home Chicago'], ['scales', 'lead', 'improv']),
    L('The 12-bar blues', 3, 'Harmony', 'The most used chord progression in popular music — learn the form and you can jam with anyone.',
      ['I  I  I  I │ IV  IV  I  I │ V  IV  I  V (turnaround)', 'Practise it in A, then E, then G', 'Use a shuffle: long-short, long-short in each beat'],
      ['Sweet Home Chicago', 'Pride and Joy', 'Stormy Monday'], ['blues', 'jam', 'form']),
    L('Triads on strings 1-3', 4, 'Harmony', 'Three-note chords up the neck — the key to rhythm parts that fit the song instead of fighting it.',
      ['Learn the major triad shape on the top three strings', 'Move it to the minor shape (one note down a semitone)', 'Play the same progression with triads only'],
      ['Sultans of Swing', 'Little Wing', 'Karma Police'], ['triads', 'harmony', 'arrangement']),
    L('CAGED system', 4, 'Harmony', 'The five open shapes repeat up the neck — knowing where lets you play any chord anywhere.',
      ['Play C at frets 0, 3, 5, 8, 10 using the C-A-G-E-D shapes', 'Name the root of each shape out loud', 'Improvise over a backing track staying inside one shape'],
      ['Little Wing', 'Sultans of Swing', 'Neon'], ['caged', 'fretboard', 'harmony']),
    L('Chord melody (play the song alone)', 4, 'Arrangement', 'Melody in the top voice, harmony underneath, bass with the thumb — a whole arrangement from one guitar.',
      ['Start with the melody alone on the top two strings', 'Add one chord tone under each melody note', 'Keep a bass note on beats 1 and 3'],
      ['Blackbird', 'Tears in Heaven', 'Both Sides Now'], ['arrangement', 'solo guitar', 'fingerstyle']),
    L('Open tunings and slide', 4, 'Slide', 'Tune to open G or D, lay the guitar flat, and the whole neck becomes one chord.',
      ['Open G: D G D G B D. Open D: D A D F# A D', 'Slide ON the fret, never behind it', 'Train your ear: slide to the chord, check with the tuner'],
      ['Big Yellow Taxi', 'Cortez the Killer', 'Voodoo Child (Slight Return)'], ['slide', 'open tuning', 'blues']),
    L('Raking, ghost notes and strum dynamics', 4, 'Rhythm', 'Rhythm guitar is a drum kit: accents, ghost notes and space make the groove.',
      ['Mute all strings and strum the rhythm (ghost notes) with no chord', 'Then add the chord on beat 1 only and keep the muted strums', 'Move the accent from beat 1 to the “and” of 2'],
      ['Come As You Are', 'Seven Nation Army', 'No Woman No Cry'], ['rhythm', 'funk', 'feel']),
    L('Improvising over a ii–V–I', 5, 'Jazz', 'The most useful jazz move in the world: two chords that resolve home, in every key.',
      ['Learn the ii–V–I in C: Dm7, G7, Cmaj7', 'Target the 3rd of each chord and let everything else decorate', 'Practise in all twelve keys, one a day'],
      ['Autumn Leaves', 'Fly Me to the Moon', 'Stormy Monday'], ['jazz', 'harmony', 'improv']),
    L('Odd time signatures', 5, 'Rhythm', '7/8, 5/4 and 6/8 change the accent pattern — count in groups, not to the bar.',
      ['Count 7/8 as 3+2+2 or 2+2+3', 'Clap the accents before you play them', 'Keep the metronome on the downbeat only'],
      ['Signe', 'Hallelujah', 'Perfect'], ['time', 'rhythm', 'advanced']),
    L('Setup: action, relief and intonation', 4, 'Guitar care', 'A well-set-up cheap guitar plays better than a badly set-up expensive one.',
      ['Check relief with a capo and feeler gap at the 7th fret', 'Set action at the 12th fret (see the Tools tab numbers)', 'Adjust intonation: harmonic vs fretted note at the 12th'],
      ['Any song, played in tune'], ['setup', 'care', 'advanced']),
    L('Recording yourself properly', 4, 'Studio', 'The fastest way to improve: record, listen back, fix the one worst thing.',
      ['Record a 30-second take in Trill Tuner’s Recorder', 'Listen for timing first, notes second, tone third', 'Record again with one specific fix'],
      ['Knockin’ on Heaven’s Door', 'Stand By Me'], ['practice', 'recording', 'studio']),
    L('Playing through the rig', 3, 'Amplifier', 'Get the amp doing the work: gain staging, EQ, and pointing the speaker where you want it.',
      ['Set the amp clean, then add drive from the pedals', 'Roll the guitar volume back to clean up instead of switching', 'Aim the amp at your knees or face — it sounds different both ways'],
      ['Voodoo Child (Slight Return)', 'Back in Black', 'Whole Lotta Love'], ['amp', 'tone', 'rig']),
    L('Reading tab and chart symbols', 2, 'Theory', 'Tabs, capo markings, chord grids and rhythm slashes — how to read any chart you find.',
      ['Numbers = frets, lines = strings (thinnest string on top)', 'h = hammer-on, p = pull-off, / = slide, b = bend', 'A grid with dots = a chord shape; an X above a string means do not play it'],
      ['Any song'], ['reading', 'tab', 'theory']),
    L('Transposing and using a capo', 2, 'Theory', 'Play any song in a singable key without relearning the shapes.',
      ['Capo 2 + G shapes = A. Capo 3 + G shapes = B♭', 'Use the Capo & transpose tool in Trill Tuner', 'Write the shapes down, not the chord names'],
      ['Someone Like You', 'Landslide', 'Perfect'], ['capo', 'theory', 'practical']),
    L('Intervals by ear', 2, 'Ear training', 'Recognising distances between notes — the foundation of playing what you hear.',
      ['Start with the octave, the 5th and the 4th', 'Sing the interval, then play it', 'Use the Interval trainer in Learn → Intervals'],
      ['Anything you can hum'], ['ear', 'interval', 'training']),
    L('Chord progressions: the numbers game', 3, 'Theory', 'I–V–vi–IV, ii–V–I, I–vi–IV–V — most songs are four numbers in a rotating order.',
      ['Learn the numbers of a song you already play', 'Move that progression to another key', 'Sing the bass note of each number'],
      ['I’m Yours', 'Let It Be', 'Zombie'], ['theory', 'numbers', 'harmony']),
    L('Two-handed tapping', 5, 'Technique', 'Both hands on the fretboard — the technique that gave the guitar a keyboard range.',
      ['Tap a note with the right hand and pull off to the fretting hand', 'Start with a two-note pattern on one string', 'Amplify cleanly with a compressor in the Rig'],
      ['Animals as Leaders style'], ['advanced', 'tapping', 'technique']),
    L('Sweep picking arpeggios', 5, 'Technique', 'One pick stroke per string across three or four strings — a chord becomes a line.',
      ['Start with a three-string minor arpeggio, slow', 'Keep the pick angle the same on every string', 'Practise with a metronome at 50 BPM before anything fast'],
      ['Classical Gas', 'Neon'], ['advanced', 'sweep', 'technique']),
    L('Slide guitar: open tuning riffs', 4, 'Slide', 'The sound of the Delta — a slide in an open tuning turns the guitar into a voice.',
      ['Open G, slide on the 12th fret for the octave', 'Mute behind the slide with your other hand', 'Play a 12-bar blues entirely with the slide'],
      ['Cortez the Killer', 'Sweet Home Chicago', 'Voodoo Child (Slight Return)'], ['slide', 'blues', 'open tuning'])
  ];

  /* ------------------------------------------------------------------ */
  /* artist profiles                                                     */
  /* ------------------------------------------------------------------ */
  function A(name, genres, knownFor, signature, techniques, songs) {
    return { name: name, genres: genres, knownFor: knownFor, signature: signature, techniques: techniques || [], songs: songs || [], search: name + ' ' + genres.join(' ') + ' ' + signature };
  }
  const ARTISTS = [
    A('Jimi Hendrix', ['psychedelic rock', 'blues rock'], 'Rewriting what an electric guitar could do between 1967 and 1970',
      'A Stratocaster, a germanium Fuzz Face, a wah, a Uni-Vibe and a great deal of thumbed bass notes',
      ['thumb-over bass', 'controlled feedback', 'wah as a voice', 'E7♯9 chords'], ['Little Wing', 'Wind Cries Mary', 'Voodoo Child (Slight Return)', 'Purple Haze', 'Machine Gun']),
    A('Stevie Ray Vaughan', ['Texas blues'], 'The loudest, fattest Strat tone of the 80s',
      'Heavy strings tuned to E♭, a Tube Screamer into a cooking Fender, and machine-gun shuffles',
      ['Texas shuffle', 'heavy vibrato', 'string bending', 'lightning pull-offs'], ['Pride and Joy', 'Mary Had a Little Lamb', 'Scuttle Buttin’']),
    A('David Gilmour', ['progressive rock'], 'Solos that sing — every note placed like a word in a sentence',
      'A Stratocaster into a Hiwatt with a Big Muff, a compressor and buckets of delay',
      ['big bends', 'slow vibrato', 'delay for space', 'less-is-more solos'], ['Comfortably Numb', 'Wish You Were Here', 'Time']),
    A('Jimmy Page', ['hard rock', 'blues'], 'Building the template for every rock riff after 1969',
      'A Les Paul or Telecaster into a cranked Plexi, with a violin bow in one hand',
      ['riffs built from blues scales', 'alternate tunings', 'light and shade dynamics', 'sliding chords'], ['Stairway to Heaven', 'Whole Lotta Love', 'Kashmir']),
    A('Brian May', ['classic rock'], 'A homemade guitar and a stack of Voxes',
      'The Red Special, a sixpence for a pick, a treble booster into three cranked AC30s',
      ['layered harmonies', 'vocal-like bends', 'out-of-phase pickups', 'long sustaining notes'], ['Bohemian Rhapsody', 'Brighton Rock', 'Tie Your Mother Down']),
    A('Eric Clapton', ['blues', 'rock'], 'From the Bluesbreakers to “Tears in Heaven” — five decades of taste',
      'A Strat (or a Les Paul in the Beano era) into a clean-ish amp, and the fingers doing the rest',
      ['economy of notes', 'fingerstyle blues', 'slow blues phrasing'], ['Crossroads', 'Tears in Heaven', 'Layla', 'Signe']),
    A('Kurt Cobain', ['grunge'], 'Making distortion, feedback and a broken chorus pedal sound like truth',
      'A beaten-up Mustang or Jaguar through a DS-1 or DS-2 into a loud clean amp',
      ['loud-quiet dynamics', 'power chords', 'out-of-tune charm', 'simple, strong riffs'], ['Smells Like Teen Spirit', 'Come As You Are', 'Lithium']),
    A('John Frusciante', ['funk rock', 'alternative'], 'Rhythm playing so melodic it works as a lead',
      'A vintage Strat with an always-on wah, a DS-2, a CE-1 chorus and a mid-forward Marshall',
      ['funk strumming', 'wah as a filter', 'open-string chord melody'], ['Under the Bridge', 'Californication', 'Dani California']),
    A('The Edge', ['post-punk', 'alternative rock'], 'Turning delay units into an instrument',
      'A dotted-eighth delay, a Memory Man, a Herdim pick on the strings upside down',
      ['dotted-eighth delay', 'open-string drones', 'ambient layers', 'no attitude, all texture'], ['Where the Streets Have No Name', 'Pride (In the Name of Love)', 'With or Without You']),
    A('Slash', ['hard rock'], 'The last great Les Paul hero',
      'A Les Paul into a modded Marshall — mid-heavy, vocal and always leaving space',
      ['blues-based solos', 'wide vibrato', 'wah for colour'], ['Sweet Child O’ Mine', 'November Rain', 'Welcome to the Jungle']),
    A('James Hetfield', ['thrash metal'], 'The most precise right hand in metal',
      'Downpicked riffs, scooped mids and a Tube Screamer used as a clean boost',
      ['downpicking', 'palm-muted gallops', 'tight rhythm', 'accents on the 3rd of the beat'], ['Master of Puppets', 'Enter Sandman', 'Battery']),
    A('Eddie Van Halen', ['hard rock'], 'Two-handed tapping, divebombs and a grin',
      'A “brown sound” Plexi cranked with a variac, a Phase 90 and a Floyd Rose',
      ['tapping', 'divebombs', 'harmonic squeals', 'rhythm playing as texture'], ['Eruption', 'Ain’t Talkin’ ’bout Love', 'Panama']),
    A('Carlos Santana', ['latin rock', 'blues'], 'Sustain, Latin rhythm and a single singing note',
      'A PRS through a Boogie Mark with the mids pushed and the 3rd of each chord always in reach',
      ['long sustained notes', 'Latin rumba rhythm', 'wah as a filter'], ['Black Magic Woman', 'Oye Como Va', 'Smooth']),
    A('Mark Knopfler', ['roots rock'], 'Fingerstyle electric playing with a Strat and no pick',
      'A Strat on the out-of-phase positions (2 and 4) into a Twin, plus a thumb and three fingers',
      ['fingerstyle electric', 'hybrid picking', 'out-of-phase tones', 'storytelling fills'], ['Sultans of Swing', 'Money for Nothing', 'Brothers in Arms']),
    A('Peter Green', ['blues'], 'Blues playing with the touch of a piano player',
      'A ’59 Les Paul with the neck pickup out of phase, played very quietly in the loud band',
      ['dynamic control', 'out-of-phase tone', 'sparse, singing lines'], ['Albatross', 'Oh Well', 'Black Magic Woman']),
    A('B.B. King', ['blues'], 'One note bent harder than anyone else’s twelve',
      'A semi-hollow through a small amp at low volume, turned up loud enough to sing',
      ['vibrato', 'call and response', 'bending to pitch'], ['The Thrill Is Gone', 'Lucille']),
    A('Albert King', ['blues'], 'Bending the high E string a step and a half with the left hand sideways',
      'A Flying V strung upside down, tuned to C♯, through a modeler-free wall of tone',
      ['huge bends', 'left-handed technique', 'one-string solos'], ['Born Under a Bad Sign', 'Blues Power']),
    A('Chuck Berry', ['rock and roll'], 'Inventing the guitar solo, and the showman who went with it',
      'A Gibson semi-hollow with a bright tone, double stops and a walk across the stage',
      ['double stops', 'the duck walk', 'rhythmic riffs', 'intros that are songs'], ['Johnny B. Goode', 'Maybellene']),
    A('Keith Richards', ['rock'], 'Open-G tuning and a right hand that never rushes',
      'A Telecaster in open G with the low string removed, riffs from five notes and back beats',
      ['open G riffs', 'mixolydian rhythm', 'twin-guitar weaving'], ['Start Me Up', 'Honky Tonk Women', 'Brown Sugar']),
    A('Pete Townshend', ['rock'], 'The windmill and the power chord',
      'A Les Paul Deluxe or SG into Hiwatt stacks, played like the strings owe him money',
      ['power chords', 'windmill strumming', 'rhythm as a lead instrument'], ['Pinball Wizard', 'Baba O’Riley', 'My Generation']),
    A('Tom Petty & Mike Campbell', ['roots rock', 'heartland'], 'Simple songs played perfectly, for four decades',
      'Rickenbackers and Telecasters into Fender combos with a slapback delay and a compressor',
      ['jangle', 'restraint', 'slapback echo', 'songs built on three chords'], ['Free Fallin’', 'American Girl', 'Runnin’ Down a Dream']),
    A('Lindsey Buckingham', ['folk rock', 'pop'], 'Fingerpicked arrangements that sound like two guitars',
      'A Turner Model 1 or a Les Paul into a clean rig, with a right hand like a drum machine',
      ['travis picking', 'percussive right hand', 'fingerstyle lead'], ['Big Love', 'Never Going Back Again', 'Landslide']),
    A('Joni Mitchell', ['folk', 'jazz'], 'Tunings nobody else had, and songs that use them',
      'Open tunings, a Wurlitzer-like tone and chord voicings borrowed from jazz piano',
      ['open tunings', 'jazz voicings', 'bass independently played'], ['Big Yellow Taxi', 'Both Sides Now', 'A Case of You']),
    A('Neil Young', ['folk rock', 'grunge'], 'One note, held for a very long time, in tune because he means it',
      'Old Black (a Les Paul with a Bigsby) into a tweed Deluxe turned all the way up',
      ['one-note solos', 'whammy vibrato', 'tweed amp breakup'], ['Cortez the Killer', 'Heart of Gold', 'Harvest Moon']),
    A('Jorge Ben / Brazilian guitar', ['samba', 'MPB'], 'Brazilian rhythm guitar as a percussion section',
      'Nylon strings, tricky right-hand patterns and chords with sevenths and ninths everywhere',
      ['samba batida', 'right-hand independence', 'extended chords'], ['Mas Que Nada', 'Chove Chuva']),
    A('Tosin Abasi', ['progressive metal', 'djent'], 'Eight strings, thumb independence and one-handed playing',
      'An 8-string with active pickups into a tightly filtered high-gain tone',
      ['tapping', 'thumb slapping', 'odd time', 'clean-to-brutal dynamics'], ['CAFO', 'The Woven Web', 'Animals as Leaders material']),
    A('Buckethead', ['instrumental rock'], 'A bucket, a Les Paul and a thousand released records',
      'A custom Les Paul with a kill switch and a huge clean delay rig',
      ['kill switch stutter', 'tapping', 'chromatic runs', 'wide dynamics'], ['Soothsayer', 'Jordan']),
    A('Jack White', ['garage rock'], 'Making cheap equipment sound like the end of the world',
      'Plastic guitars into tiny vintage amps, all of it at the edge of falling apart',
      ['raw tone', 'riffs over noise', 'rhythm as texture'], ['Seven Nation Army', 'Sixteen Saltines', 'Ball and Biscuit']),
    A('John Mayer', ['blues pop', 'singer-songwriter'], 'A modern player with a vintage vocabulary',
      'A Strat into a Dumble-style amp with a Klon and a King of Tone in front',
      ['thumb-independent fingerpicking', 'dynamic touch', 'blues phrasing'], ['Slow Dancing in a Burning Room', 'Neon', 'Gravity']),
    A('Oasis / Noel Gallagher', ['britpop'], 'Big choruses, borrowed chords and a wall of guitars',
      'A Les Paul or a semi-hollow into a cranked British amp with a delay for the choruses',
      ['loud-soft dynamics', 'capo shapes', 'simple lead lines'], ['Wonderwall', 'Don’t Look Back in Anger', 'Champagne Supernova']),
    A('Radiohead / Jonny Greenwood', ['alternative', 'art rock'], 'Guitars used as texture rather than riffs',
      'Effects-driven parts, retuned guitars and a refusal to play the obvious chord',
      ['odd chords', 'effects as texture', 'muted dynamics'], ['Creep', 'Karma Police', 'Paranoid Android']),
    A('Fleetwood Mac / Lindsey & Peter', ['rock', 'pop'], 'Two eras of a band with two very different guitar voices',
      'Peter Green’s out-of-phase Les Paul, later Lindsey Buckingham’s fingerstyle arrangements',
      ['restraint (Green)', 'fingerstyle arrangements (Buckingham)', 'harmonies'], ['Dreams', 'Landslide', 'The Chain', 'Albatross']),
    A('The Beatles', ['pop', 'rock'], 'Whatever the song needed, invented on the spot',
      'Gretsches, Epiphones, Casinos, a Rickenbacker and later a lot of studio invention',
      ['chord melody', 'jangle', 'arpeggios', 'song-first arrangement'], ['Blackbird', 'Here Comes the Sun', 'While My Guitar Gently Weeps']),
    A('Nirvana / grunge', ['grunge'], 'Dynamics, distortion and honesty',
      'Cheap guitars, chorus pedals and a loud clean amp pushed by a distortion pedal',
      ['loud-quiet dynamics', 'power chords', 'chorus pedal'], ['Smells Like Teen Spirit', 'Come As You Are']),
    A('Metallica / thrash', ['thrash metal'], 'Rhythm guitar as a weapon',
      'Downpicked palm-muted riffs, scooped mids, and solos that start with a wah',
      ['downpicking', 'palm muting', 'tremolo picking', 'wah solos'], ['Master of Puppets', 'Enter Sandman', 'One']),
    A('Pantera / Dimebag', ['groove metal'], 'Riffs built to make you move, solos built to make you flinch',
      'Solid-state amps, extreme EQ scoops, divebombs and pinch harmonics everywhere',
      ['pinch harmonics', 'divebombs', 'tight groove riffs'], ['Walk', 'Cowboys from Hell', 'Cemetery Gates']),
    A('The Smiths / Johnny Marr', ['indie'], 'Rhythm parts that sound like an orchestra of guitars',
      'Rickenbackers, open-string drones, capos high up the neck and arpeggios everywhere',
      ['capo chords', 'arpeggios', 'open strings', 'jingle-jangle'], ['This Charming Man', 'There Is a Light That Never Goes Out']),
    A('Prince', ['funk', 'pop'], 'A one-man funk band with a guitar solo whenever he felt like it',
      'A Hohner telecaster copy named Hohner Madcat, a Boss compressor and a wah',
      ['funk rhythm', 'chicken-scratch muting', 'screaming solos'], ['Purple Rain', 'Kiss', 'Let’s Go Crazy']),
    A('Nile Rodgers', ['disco', 'funk'], 'The right hand that defined disco',
      'A “Hitmaker” Strat through a clean amp with a compressor, playing ninth chords in a tight pocket',
      ['chicken scratch', 'ninth chords', 'sixteenth-note strumming', 'compression'], ['Le Freak', 'Good Times', 'Get Lucky']),
    A('Cory Wong', ['funk'], 'Modern rhythm guitar with a metronome for a heart',
      'A Strat-sized guitar with a compressor at every stage and a very precise right hand',
      ['sixteenth-note funk', 'silence as rhythm', 'compression stacking'], ['Cosmic Sans', 'Dean Town', 'Funk workouts']),
    A('Bill Frisell', ['jazz', 'Americana'], 'Ambient, folk and jazz guitar in one voice',
      'A Telecaster and a lot of delay and reverb, with chords used as weather',
      ['swelling chords', 'volume pedal', 'folk melody in a jazz setting'], ['Shenandoah', 'Throughout', 'Ambient jazz work']),
    A('Wes Montgomery', ['jazz'], 'Octaves and thumbed chords that changed jazz guitar',
      'A Gibson L-5 played with the thumb, and octave melodies that sing',
      ['octaves', 'thumb picking', 'chord solos'], ['Four on Six', 'West Coast Blues']),
    A('Joe Pass', ['jazz'], 'Walking bass, chords and melody at the same time',
      'One archtop guitar, no effects, all arrangement',
      ['chord melody', 'walking bass', 'bebop lines'], ['All the Things You Are', 'Autumn Leaves', 'Virtuoso material']),
    A('Chet Atkins', ['country', 'fingerstyle'], 'Inventing the modern acoustic guitar style',
      'A Gretsch or a nylon-string guitar with a thumbpick and three fingers',
      ['travis picking', 'chord melody', 'thumb independence'], ['Mr. Sandman', 'Windy and Warm']),
    A('Tommy Emmanuel', ['fingerstyle'], 'One guitar that sounds like a band',
      'A Maton with a thumbpick and every finger doing a different job',
      ['percussive fingerstyle', 'simultaneous bass and melody', 'harmonics'], ['Classical Gas arrangement', 'Angelina']),
    A('B.B. King to Clapton lineage', ['blues'], 'The line of players who taught rock to feel',
      'Small amps, big bends and note choices that say more than the whole scale',
      ['bending', 'vibrato', 'space between notes'], ['The Thrill Is Gone', 'Crossroads', 'Layla']),
    A('Slash to modern rock', ['hard rock'], 'The sound of the big chorus',
      'Les Paul into a Marshall, with the amp doing the singing and the pedal only pushing it',
      ['vibrato', 'bend control', 'melodic solos'], ['Sweet Child O’ Mine', 'November Rain']),
    A('Periphery', ['progressive metal', 'djent'], 'Riffs where the rhythm is the melody',
      'Multi-scale 7 and 8-string guitars, tight low-end filtering and precise muting',
      ['odd meters', 'palm-muted chugs', 'syncopation'], ['Marigold', 'Animals as Leaders', 'Periphery', 'Plini']),
    A('Flamenco / classical players', ['classical', 'flamenco'], 'Right-hand techniques that turn the guitar into a drum',
      'Nylon strings and a right hand with five distinct attacks',
      ['rasgueado', 'tremolo', 'picado', 'alzapúa'], ['Asturias', 'Entre Dos Aguas']),
    A('Songwriters who play solo guitar', ['singer-songwriter'], 'Songs that work with one voice and one instrument',
      'Tunings, capos and a right hand that supports the voice instead of competing with it',
      ['capo transposition', 'open tunings', 'dynamics under a vocal'], ['Fast Car', 'Hallelujah', 'Both Sides Now']),
    A('Slide & Delta players', ['blues', 'slide'], 'Bottleneck guitar, from the Delta to the present',
      'Open tunings, a glass or metal slide and the vocal quality of a single sliding note',
      ['open tuning', 'slide vibrato', 'muting behind the slide'], ['Sweet Home Chicago', 'Cortez the Killer'])
  ];

  /* ------------------------------------------------------------------ */
  /* search + the harmony engine                                          */
  /* ------------------------------------------------------------------ */
  const NOTE_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const FLAT_OF = { 'C♯': 'D♭', 'D♯': 'E♭', 'F♯': 'G♭', 'G♯': 'A♭', 'A♯': 'B♭' };
  const SHARP_OF = { 'D♭': 'C♯', 'E♭': 'D♯', 'G♭': 'F♯', 'A♭': 'G♯', 'B♭': 'A♯', 'C♭': 'B', 'F♭': 'E', 'E♯': 'F', 'B♯': 'C' };
  const isFlat = n => /♭|b$/.test(n);
  /* pitch class of a note name, flats and sharps both welcome */
  function pcOf(name) {
    if (!name) return -1;
    const n = String(name).replace('b', '♭').replace('#', '♯');
    if (NOTE_SHARP.indexOf(n) >= 0) return NOTE_SHARP.indexOf(n);
    if (SHARP_OF[n]) return NOTE_SHARP.indexOf(SHARP_OF[n]);
    return -1;
  }

  function norm(s) { return String(s || '').toLowerCase().replace(/[’']/g, "'").trim(); }

  function search(q, opts) {
    q = norm(q);
    opts = opts || {};
    const out = { songs: [], lessons: [], artists: [], query: q };
    if (!q) return out;
    const words = q.split(/\s+/).filter(Boolean);
    const score = text => {
      const t = norm(text);
      if (!words.every(w => t.includes(w))) return 0;
      let s = 1;
      if (t.startsWith(words[0])) s += 2;
      if (t === q) s += 3;
      return s;
    };
    SONGS.forEach(s => {
      const v = score(s.title + ' ' + s.artist + ' ' + s.tags.join(' ') + ' ' + s.chords.join(' '));
      if (v) { out.songs.push(Object.assign({ kind: 'song', match: v }, s)); }
    });
    LESSONS.forEach(l => {
      const v = score(l.title + ' ' + l.skill + ' ' + l.tags.join(' ') + ' ' + l.songs.join(' '));
      if (v) out.lessons.push(Object.assign({ kind: 'lesson', match: v }, l));
    });
    ARTISTS.forEach(a => {
      const v = score(a.name + ' ' + a.genres.join(' ') + ' ' + a.signature + ' ' + a.techniques.join(' '));
      if (v) out.artists.push(Object.assign({ kind: 'artist', match: v }, a));
    });
    /* chord-led searches: "songs with Am F C G" */
    const chordQuery = words.filter(w => /^[a-g][#♯b♭]?(m|maj|min|7|9|sus|dim|add|5)?$/.test(norm(w)));
    if (chordQuery.length) {
      const extra = [];
      SONGS.forEach(s => {
        const have = chordQuery.filter(c => s.chords.some(sc => norm(sc).startsWith(c)));
        if (have.length >= Math.min(2, chordQuery.length) && !out.songs.some(x => x.id === s.id)) {
          extra.push(Object.assign({ kind: 'song', match: 2 + have.length, chordMatch: have }, s));
        }
      });
      out.songs = out.songs.concat(extra);
    }
    out.songs.sort((a, b) => b.match - a.match);
    out.lessons.sort((a, b) => b.match - a.match);
    out.artists.sort((a, b) => b.match - a.match);
    const cap = opts.cap || 80;
    out.songs = out.songs.slice(0, cap);
    out.lessons = out.lessons.slice(0, cap);
    out.artists = out.artists.slice(0, cap);
    out.count = out.songs.length + out.lessons.length + out.artists.length;
    return out;
  }

  /* What should you play over this? Give it a key and a set of chords (from the
   * tab maker's analysis, or straight from a song) and it returns an order, a
   * capo suggestion, a transposition, voicings and similar songs.              */
  function suggest(input) {
    input = input || {};
    const chords = (input.chords || []).filter(Boolean);
    const keyName = input.key || '';
    const mode = input.mode || 'major';
    const tempo = input.tempo || 0;
    const tonicPc = Math.max(0, pcOf(keyName));
    const out = { chords: chords.slice(), order: [], voicings: [], capo: 0, transpose: 0, similar: [], tips: [] };

    /* 1. play order: the order the song actually uses wins, otherwise the
     *    "circle" order that keeps the changes small on the neck */
    const firstSeen = [];
    (input.timeline || chords).forEach(c => { if (firstSeen.indexOf(c) === -1) firstSeen.push(c); });
    out.order = firstSeen.length ? firstSeen : chords;
    out.practiceOrder = chords.slice().sort((a, b) => chordCost(a) - chordCost(b));

    /* 2. voicings from the toolkit so you can see the shapes */
    if (G.TT && G.TT.tools && G.TT.tools.voicingsFor) {
      chords.slice(0, 8).forEach(name => {
        const parsed = parseChord(name);
        if (!parsed) return;
        const type = (G.TT.tools.CHORD_TYPES || []).find(t => t.sym === parsed.sym) || (G.TT.tools.CHORD_TYPES || [])[0];
        if (!type) return;
        const v = G.TT.tools.voicingsFor(NOTE_SHARP.indexOf(parsed.root), type.steps);
        if (v.length) out.voicings.push({ name: name, root: parsed.root, type: type, voicing: v[0], options: v.length });
      });
    }

    /* 3. capo + transpose: pick the position that lets you use open shapes.
     *    If the song already sits in open position, do not move it. */
    /* chords that can be played at the nut without a barre */
    const OPEN = ['C', 'A', 'G', 'E', 'D', 'Am', 'Em', 'Dm', 'A7', 'E7', 'D7', 'G7', 'C7', 'B7',
                  'Am7', 'Em7', 'Dm7', 'Cadd9', 'G6', 'Cmaj7', 'Amaj7', 'Dmaj7', 'Fmaj7', 'E6', 'Am6',
                  'Asus2', 'Asus4', 'Dsus2', 'Dsus4', 'Esus4', 'Gsus4', 'Em7add11'];
    const nonOpen = chords.filter(c => OPEN.indexOf(c) === -1).length;
    /* every chord open, or all but one (that one is the F/B barre everyone plays
     * anyway) → leave the song where it is */
    const alreadyOpen = chords.length > 0 && nonOpen <= 1;
    if (alreadyOpen) {
      out.capo = 0;
      out.capoNote = 'No capo needed — every chord is already in open position.';
    } else {
    let bestCapo = 0, bestScore = -1;
    for (let c = 0; c <= 10; c++) {
      let score = 0;
      chords.forEach(name => {
        const parsed = parseChord(name);
        if (!parsed) return;
        const pc = pcOf(parsed.root) - c;
        const shape = NOTE_SHARP[((pc % 12) + 12) % 12];
        if (['C', 'A', 'G', 'E', 'D', 'Am', 'Em', 'Dm'].indexOf(shape) >= 0) score += 2;
        else score += parsed.sym === 'm' && ['C', 'A', 'G', 'E', 'D'].some(x => x + 'm' === shape) ? 2 : 0;
        if (['F', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯'].indexOf(shape) >= 0) score -= 1;
      });
      if (c === 0) score += 1;                      /* no capo unless it clearly helps */
      score -= Math.max(0, c - 5) * 0.35;           /* high capos sound thin */
      if (score > bestScore) { bestScore = score; bestCapo = c; }
    }
      out.capo = bestCapo;
      out.capoNote = bestCapo ? `Capo ${bestCapo} and the song is played with ${chords.map(c => transposeChord(c, -bestCapo)).join(' ')} shapes.`
                              : 'No capo needed — the chords sit in open position.';
    }
    out.transpose = tonicPc >= 0 && input.targetKey ? (NOTE_SHARP.indexOf(input.targetKey) - tonicPc + 12) % 12 : 0;
    out.key = keyName + (mode === 'minor' ? ' minor' : ' major');

    /* 4. same-song suggestions from the catalog: the same progression, the same
     *    key, or the same four-chord loop */
    const wanted = chords.map(c => norm(c));
    const scored = SONGS.map(s => {
      let sc = 0;
      if (s.key === keyName) sc += 1.5;
      const overlap = s.chords.filter(c => wanted.includes(norm(c))).length;
      sc += overlap;
      if (overlap >= 3) sc += 2;
      if (Math.abs((s.bpm || 0) - tempo) <= 12 && tempo) sc += 0.5;
      return { song: s, sc: sc };
    }).filter(x => x.sc > 1.6).sort((a, b) => b.sc - a.sc).slice(0, 6);
    out.similar = scored.map(x => x.song);

    /* 5. practice advice */
    if (tempo) out.tips.push(`Detected tempo ${tempo} BPM — set the metronome there and loop the first four bars.`);
    if (chords.length) out.tips.push(`${chords.length} chord${chords.length > 1 ? 's' : ''} in the whole song: ${chords.join(' ')}. Learn the changes as pairs before you play the full loop.`);
    if (chords.some(c => /m/.test(c))) out.tips.push('There is a minor chord in there — that is where the song turns. Practise the change into it.');
    out.tips.push('Record yourself in the Recorder view, then listen back with the headphones on — timing first, then notes.');
    return out;
  }

  function chordCost(name) {
    const p = parseChord(name);
    if (!p || !G.TT || !G.TT.tools || !G.TT.tools.voicingsFor) return 99;
    const type = (G.TT.tools.CHORD_TYPES || []).find(t => t.sym === p.sym);
    if (!type) return 99;
    const v = G.TT.tools.voicingsFor(NOTE_SHARP.indexOf(p.root), type.steps);
    if (!v.length) return 99;
    return v[0].sum + v[0].span;
  }
  function parseChord(name) {
    const m = /^([A-G][#♯b♭]?)(.*)$/.exec(String(name).trim());
    if (!m) return null;
    const root = m[1].replace('#', '♯').replace('b', '♭');
    return { root: root, sym: m[2] || '', flat: isFlat(root), pc: pcOf(root) };
  }
  /* move a chord by a number of semitones, keeping its accidental spelling */
  function transposeChord(name, semis) {
    const p = parseChord(name);
    if (!p || p.pc < 0) return name;
    const sharpName = NOTE_SHARP[((p.pc + semis) % 12 + 12) % 12];
    const out = p.flat && FLAT_OF[sharpName] ? FLAT_OF[sharpName] : sharpName;
    return out + p.sym;
  }

  const api = {
    SONGS, LESSONS, ARTISTS, search, suggest,
    parseChord, transposeChord, PITCH: NOTE_SHARP, FLAT_OF: FLAT_OF,
    counts: { songs: SONGS.length, lessons: LESSONS.length, artists: ARTISTS.length },
    songById: id => SONGS.find(s => s.id === id) || null,
    /* Which songs in the book belong to an artist page? Songs filed under the
     * artist's own name, plus any of the signature titles we do have — so a
     * “David Gilmour” page can still hand you the Pink Floyd songs we carry. */
    artistSongs: (name) => {
      const a = ARTISTS.filter(x => x.name === name)[0];
      if (!a) return [];
      const norm = t => String(t).toLowerCase().replace(/[’'`.,!?()\[\]]/g, '').replace(/\s+/g, ' ').trim();
      const sig = (a.songs || []).map(norm);
      return SONGS.filter(s => s.artist === name || sig.indexOf(norm(s.title)) >= 0);
    },

    chordsInLibrary: (() => { const set = {}; SONGS.forEach(s => s.chords.forEach(c => { set[c] = (set[c] || 0) + 1; })); return set; })()
  };
  G.TT = G.TT || {};
  G.TT.catalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  /* extra play-along songs live in catalog-more.js (browser script tag, or
   * require here so node tests see the full library) */
  if (typeof require === 'function' && typeof module !== 'undefined') {
    try { require('./catalog-more.js'); } catch (e) { /* browser has no require */ }
  }
})();
