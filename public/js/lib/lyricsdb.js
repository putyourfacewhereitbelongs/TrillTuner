/* Trill Tuner — built-in lyric & play-along library.
 *
 * Public-domain and traditional lyrics live here so the Lyrics tab always has
 * something to show, with no network. Popular copyrighted songs are *not*
 * dumped as full lyrics: chartFromSong() builds a play-along sheet (chords,
 * key, tempo, how to play it) from the catalog instead.
 *
 * Same object in the browser and in node so the server can search it too.
 */
(function () {
  'use strict';

  const G = (typeof window !== 'undefined') ? window : globalThis;

  function idOf(title) {
    return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function Ly(title, artist, year, tags, lyrics) {
    const text = String(lyrics || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    return {
      id: idOf(title),
      title: title,
      artist: artist,
      year: year || 0,
      tags: tags || [],
      lyrics: text,
      fullLyrics: true,
      search: (title + ' ' + artist + ' ' + (tags || []).join(' ') + ' ' + text).toLowerCase()
    };
  }

  /* Traditional, folk, hymn, shanty, carol, spiritual — public domain. */
  const LYRICS = [
    Ly('Amazing Grace', 'Traditional', 1779, ['hymn', 'folk', 'gospel', 'campfire'],
`Amazing grace! How sweet the sound
That saved a wretch like me.
I once was lost, but now am found,
Was blind, but now I see.

'Twas grace that taught my heart to fear,
And grace my fears relieved.
How precious did that grace appear
The hour I first believed.

Through many dangers, toils and snares
I have already come.
'Tis grace hath brought me safe thus far,
And grace will lead me home.

When we've been there ten thousand years,
Bright shining as the sun,
We've no less days to sing God's praise
Than when we'd first begun.`),

    Ly('House of the Rising Sun', 'Traditional', 0, ['folk', 'blues', 'ballad'],
`There is a house in New Orleans
They call the Rising Sun.
And it's been the ruin of many a poor boy,
And God, I know I'm one.

My mother was a tailor,
She sewed my new blue jeans.
My father was a gamblin' man
Down in New Orleans.

Now the only thing a gambler needs
Is a suitcase and trunk,
And the only time he's satisfied
Is when he's on a drunk.

Oh mother, tell your children
Not to do what I have done:
Spend your lives in sin and misery
In the House of the Rising Sun.

Well, I got one foot on the platform,
The other foot on the train.
I'm goin' back to New Orleans
To wear that ball and chain.

There is a house in New Orleans
They call the Rising Sun.
And it's been the ruin of many a poor boy,
And God, I know I'm one.`),

    Ly('Scarborough Fair', 'Traditional', 0, ['folk', 'english', 'ballad'],
`Are you going to Scarborough Fair?
Parsley, sage, rosemary and thyme.
Remember me to one who lives there,
She once was a true love of mine.

Tell her to make me a cambric shirt,
Parsley, sage, rosemary and thyme,
Without no seams nor needle work,
Then she'll be a true love of mine.

Tell her to find me an acre of land,
Parsley, sage, rosemary and thyme,
Between the salt water and the sea strands,
Then she'll be a true love of mine.

Tell her to reap it with a sickle of leather,
Parsley, sage, rosemary and thyme,
And gather it all in a bunch of heather,
Then she'll be a true love of mine.`),

    Ly('Greensleeves', 'Traditional', 1580, ['folk', 'english', 'renaissance'],
`Alas, my love, you do me wrong
To cast me off discourteously,
For I have loved you well and long,
Delighting in your company.

Greensleeves was all my joy,
Greensleeves was my delight,
Greensleeves was my heart of gold,
And who but my Lady Greensleeves.

I have been ready at your hand
To grant whatever you would crave,
I have both waged life and land,
Your love and good-will for to have.

Greensleeves, now farewell, adieu,
God I pray to prosper thee,
For I am still thy lover true,
Come once again and love me.`),

    Ly('Oh! Susanna', 'Stephen Foster', 1848, ['folk', 'american', 'campfire'],
`I come from Alabama with a banjo on my knee,
I'm going to Louisiana, my true love for to see.
It rained all night the day I left, the weather it was dry,
The sun so hot I froze to death, Susanna, don't you cry.

Oh! Susanna, oh don't you cry for me,
For I come from Alabama with a banjo on my knee.

I had a dream the other night when everything was still,
I thought I saw Susanna coming up the hill.
The buckwheat cake was in her mouth, a tear was in her eye,
Says I, I'm coming from the South, Susanna, don't you cry.`),

    Ly('Yankee Doodle', 'Traditional', 1755, ['folk', 'american', 'children'],
`Yankee Doodle went to town
A-riding on a pony,
Stuck a feather in his cap
And called it macaroni.

Yankee Doodle, keep it up,
Yankee Doodle dandy,
Mind the music and the step
And with the girls be handy.

Father and I went down to camp
Along with Captain Gooding,
And there we saw the men and boys
As thick as hasty pudding.`),

    Ly('When the Saints Go Marching In', 'Traditional', 0, ['spiritual', 'jazz', 'new orleans', 'gospel'],
`Oh, when the saints go marching in,
Oh, when the saints go marching in,
Lord, I want to be in that number
When the saints go marching in.

Oh, when the sun refuse to shine,
Oh, when the sun refuse to shine,
Lord, I want to be in that number
When the sun refuse to shine.

Oh, when they crown Him Lord of all,
Oh, when they crown Him Lord of all,
Lord, I want to be in that number
When they crown Him Lord of all.

Oh, when the stars begin to fall,
Oh, when the stars begin to fall,
Lord, I want to be in that number
When the stars begin to fall.`),

    Ly('Swing Low, Sweet Chariot', 'Spiritual', 0, ['spiritual', 'gospel', 'folk'],
`Swing low, sweet chariot,
Coming for to carry me home.
Swing low, sweet chariot,
Coming for to carry me home.

I looked over Jordan, and what did I see,
Coming for to carry me home?
A band of angels coming after me,
Coming for to carry me home.

If you get there before I do,
Coming for to carry me home,
Tell all my friends I'm coming too,
Coming for to carry me home.`),

    Ly('Michael Row the Boat Ashore', 'Traditional', 0, ['spiritual', 'folk', 'campfire'],
`Michael, row the boat ashore, hallelujah.
Michael, row the boat ashore, hallelujah.

Sister, help to trim the sail, hallelujah.
Sister, help to trim the sail, hallelujah.

Jordan's river is deep and wide, hallelujah.
Meet my mother on the other side, hallelujah.

Michael's boat is a music boat, hallelujah.
Michael's boat is a music boat, hallelujah.`),

    Ly('She’ll Be Coming ’Round the Mountain', 'Traditional', 0, ['folk', 'children', 'campfire'],
`She'll be coming 'round the mountain when she comes,
She'll be coming 'round the mountain when she comes,
She'll be coming 'round the mountain,
She'll be coming 'round the mountain,
She'll be coming 'round the mountain when she comes.

She'll be driving six white horses when she comes,
She'll be driving six white horses when she comes,
She'll be driving six white horses,
She'll be driving six white horses,
She'll be driving six white horses when she comes.

Oh, we'll all go out to meet her when she comes,
Oh, we'll all go out to meet her when she comes,
Oh, we'll all go out to meet her,
We'll all go out to meet her,
We'll all go out to meet her when she comes.`),

    Ly('Skip to My Lou', 'Traditional', 0, ['folk', 'children', 'play-party'],
`Skip, skip, skip to my Lou,
Skip, skip, skip to my Lou,
Skip, skip, skip to my Lou,
Skip to my Lou, my darling.

Lost my partner, what'll I do?
Lost my partner, what'll I do?
Lost my partner, what'll I do?
Skip to my Lou, my darling.

I'll get another one, prettier than you,
I'll get another one, prettier than you,
I'll get another one, prettier than you,
Skip to my Lou, my darling.`),

    Ly('Twinkle, Twinkle, Little Star', 'Traditional', 1806, ['children', 'lullaby'],
`Twinkle, twinkle, little star,
How I wonder what you are.
Up above the world so high,
Like a diamond in the sky.
Twinkle, twinkle, little star,
How I wonder what you are.

When the blazing sun is gone,
When he nothing shines upon,
Then you show your little light,
Twinkle, twinkle, all the night.

Then the traveller in the dark
Thanks you for your tiny spark;
He could not see which way to go,
If you did not twinkle so.`),

    Ly('Auld Lang Syne', 'Traditional', 1788, ['folk', 'scottish', 'new year'],
`Should auld acquaintance be forgot,
And never brought to mind?
Should auld acquaintance be forgot,
And auld lang syne?

For auld lang syne, my dear,
For auld lang syne,
We'll take a cup of kindness yet
For auld lang syne.

And here's a hand, my trusty friend,
And gie's a hand o' thine,
And we'll take a right good-willie waught
For auld lang syne.`),

    Ly('The Water Is Wide', 'Traditional', 0, ['folk', 'scottish', 'ballad'],
`The water is wide, I cannot get o'er,
And neither have I wings to fly.
Give me a boat that can carry two,
And both shall row, my love and I.

A ship there is, and she sails the sea,
She's loaded deep as deep can be,
But not so deep as the love I'm in,
I know not if I sink or swim.

I leaned my back up against an oak,
Thinking it was a trusty tree.
But first it bent and then it broke,
So did my love prove false to me.`),

    Ly('Simple Gifts', 'Traditional', 1848, ['shaker', 'hymn', 'folk'],
`'Tis the gift to be simple, 'tis the gift to be free,
'Tis the gift to come down where we ought to be,
And when we find ourselves in the place just right,
'Twill be in the valley of love and delight.

When true simplicity is gained,
To bow and to bend we shan't be ashamed,
To turn, turn will be our delight,
Till by turning, turning we come 'round right.`),

    Ly('Drunken Sailor', 'Traditional', 0, ['shanty', 'sea', 'folk'],
`What shall we do with a drunken sailor,
What shall we do with a drunken sailor,
What shall we do with a drunken sailor,
Early in the morning?

Way hay and up she rises,
Way hay and up she rises,
Way hay and up she rises,
Early in the morning.

Put him in the long-boat till he's sober,
Put him in the long-boat till he's sober,
Put him in the long-boat till he's sober,
Early in the morning.

Pull out the plug and wet him all over,
Pull out the plug and wet him all over,
Pull out the plug and wet him all over,
Early in the morning.`),

    Ly('Blow the Man Down', 'Traditional', 0, ['shanty', 'sea', 'folk'],
`Come all ye young fellows that follow the sea,
To me way, hay, blow the man down,
And pray pay attention and listen to me,
Give me some time to blow the man down.

I'm a deep water sailor just come from Hong Kong,
To me way, hay, blow the man down,
If you give me some whiskey I'll sing you a song,
Give me some time to blow the man down.

There was an old skipper, I don't know his name,
To me way, hay, blow the man down,
He sailed to the westward from Glasgow he came,
Give me some time to blow the man down.`),

    Ly('Spanish Ladies', 'Traditional', 0, ['shanty', 'sea', 'english'],
`Farewell and adieu to you, Spanish ladies,
Farewell and adieu to you, ladies of Spain,
For we've received orders for to sail for old England,
And we may never see you fair ladies again.

We will rant and we'll roar like true British sailors,
We'll rant and we'll roar all on the salt sea,
Until we strike soundings in the channel of old England:
From Ushant to Scilly is thirty-five leagues.

The first land we sighted was called the Dodman,
Next Rame Head off Plymouth, Start, Portland and Wight;
We sailed by Beachy, by Fairlight and Dover,
And then we bore up for the South Foreland light.`),

    Ly('The Parting Glass', 'Traditional', 0, ['folk', 'irish', 'scottish'],
`Of all the money that e'er I had,
I spent it in good company.
And all the harm that e'er I've done,
Alas, it was to none but me.

And all I've done for want of wit
To memory now I can't recall,
So fill to me the parting glass,
Good night and joy be with you all.

Of all the comrades that e'er I had,
They are sorry for my going away.
And all the sweethearts that e'er I had,
They would wish me one more day to stay.

But since it falls unto my lot
That I should rise and you should not,
I'll gently rise and I'll softly call,
Good night and joy be with you all.`),

    Ly('Wild Mountain Thyme', 'Traditional', 0, ['folk', 'scottish', 'irish'],
`Oh, the summer time is coming,
And the trees are sweetly blooming,
And the wild mountain thyme
Grows around the blooming heather.
Will you go, lassie, go?

And we'll all go together
To pull wild mountain thyme
All around the blooming heather.
Will you go, lassie, go?

I will build my love a bower
By yon clear and crystal fountain,
And on it I will pile
All the flowers of the mountain.
Will you go, lassie, go?`),

    Ly('Molly Malone', 'Traditional', 0, ['folk', 'irish', 'dublin'],
`In Dublin's fair city,
Where the girls are so pretty,
I first set my eyes on sweet Molly Malone,
As she wheeled her wheelbarrow
Through streets broad and narrow,
Crying, "Cockles and mussels, alive, alive-o!"

Alive, alive-o, alive, alive-o,
Crying, "Cockles and mussels, alive, alive-o!"

She was a fishmonger,
And sure 'twas no wonder,
For so were her father and mother before,
And they each wheeled their barrow
Through streets broad and narrow,
Crying, "Cockles and mussels, alive, alive-o!"

She died of a fever,
And no one could save her,
And that was the end of sweet Molly Malone.
But her ghost wheels her barrow
Through streets broad and narrow,
Crying, "Cockles and mussels, alive, alive-o!"`),

    Ly('Down by the Salley Gardens', 'Traditional', 0, ['folk', 'irish', 'yeats'],
`Down by the salley gardens
My love and I did meet.
She passed the salley gardens
With little snow-white feet.

She bid me take love easy,
As the leaves grow on the tree,
But I, being young and foolish,
With her would not agree.

In a field by the river
My love and I did stand,
And on my leaning shoulder
She laid her snow-white hand.

She bid me take life easy,
As the grass grows on the weirs,
But I was young and foolish,
And now am full of tears.`),

    Ly('Barbara Allen', 'Traditional', 0, ['folk', 'ballad', 'english'],
`In Scarlet Town, where I was born,
There was a fair maid dwellin',
Made every youth cry well-a-day,
Her name was Barbara Allen.

'Twas in the merry month of May
When green buds they were swellin',
Sweet William on his deathbed lay
For love of Barbara Allen.

He sent his servant to the town
To the place where she was dwellin',
Saying, "Haste and come to my master dear,
If your name be Barbara Allen."

So slowly, slowly she came up,
And slowly she came nigh him,
And all she said when there she came,
"Young man, I think you're dying."`),

    Ly('The Streets of Laredo', 'Traditional', 0, ['folk', 'cowboy', 'american'],
`As I walked out in the streets of Laredo,
As I walked out in Laredo one day,
I spied a young cowboy wrapped up in white linen,
Wrapped up in white linen as cold as the clay.

"I see by your outfit that you are a cowboy,"
These words he did say as I boldly stepped by,
"Come sit down beside me and hear my sad story,
I'm shot in the breast and I know I must die.

"It was once in the saddle I used to go dashing,
Once in the saddle I used to go gay,
First down to the dram-house and then to the card house,
Got shot in the breast, I am dying today."`),

    Ly('Red River Valley', 'Traditional', 0, ['folk', 'cowboy', 'american'],
`From this valley they say you are going,
We will miss your bright eyes and sweet smile,
For they say you are taking the sunshine
That has brightened our pathways awhile.

Come and sit by my side if you love me,
Do not hasten to bid me adieu,
But remember the Red River Valley
And the cowboy who loved you so true.

Won't you think of the valley you're leaving,
Oh, how lonely, how sad it will be?
Oh, think of the fond heart you're breaking,
And the grief you are causing to me.`),

    Ly('Home on the Range', 'Traditional', 1873, ['folk', 'cowboy', 'american'],
`Oh, give me a home where the buffalo roam,
Where the deer and the antelope play,
Where seldom is heard a discouraging word,
And the skies are not cloudy all day.

Home, home on the range,
Where the deer and the antelope play,
Where seldom is heard a discouraging word,
And the skies are not cloudy all day.

Where the air is so pure, the zephyrs so free,
The breezes so balmy and light,
That I would not exchange my home on the range
For all of the cities so bright.`),

    Ly('Oh My Darling, Clementine', 'Traditional', 1884, ['folk', 'american', 'campfire'],
`In a cavern, in a canyon,
Excavating for a mine,
Dwelt a miner, forty-niner,
And his daughter, Clementine.

Oh my darling, oh my darling,
Oh my darling, Clementine,
You are lost and gone forever,
Dreadful sorry, Clementine.

Light she was and like a fairy,
And her shoes were number nine,
Herring boxes, without topses,
Sandals were for Clementine.

Drove she ducklings to the water
Every morning just at nine,
Hit her foot against a splinter,
Fell into the foaming brine.`),

    Ly('My Bonnie Lies over the Ocean', 'Traditional', 0, ['folk', 'scottish', 'campfire'],
`My Bonnie lies over the ocean,
My Bonnie lies over the sea,
My Bonnie lies over the ocean,
Oh, bring back my Bonnie to me.

Bring back, bring back,
Bring back my Bonnie to me, to me.
Bring back, bring back,
Bring back my Bonnie to me.

Last night as I lay on my pillow,
Last night as I lay on my bed,
Last night as I lay on my pillow,
I dreamed that my Bonnie was dead.`),

    Ly('Jingle Bells', 'James Lord Pierpont', 1857, ['christmas', 'carol', 'children'],
`Dashing through the snow
In a one-horse open sleigh,
O'er the fields we go,
Laughing all the way.
Bells on bobtail ring,
Making spirits bright,
What fun it is to ride and sing
A sleighing song tonight.

Jingle bells, jingle bells,
Jingle all the way.
Oh, what fun it is to ride
In a one-horse open sleigh.
Jingle bells, jingle bells,
Jingle all the way.
Oh, what fun it is to ride
In a one-horse open sleigh.

A day or two ago
I thought I'd take a ride,
And soon Miss Fanny Bright
Was seated by my side.
The horse was lean and lank,
Misfortune seemed his lot,
He got into a drifted bank
And we, we got upsot.`),

    Ly('Silent Night', 'Franz Xaver Gruber', 1818, ['christmas', 'carol', 'hymn'],
`Silent night, holy night,
All is calm, all is bright
Round yon virgin mother and child.
Holy infant, so tender and mild,
Sleep in heavenly peace,
Sleep in heavenly peace.

Silent night, holy night,
Shepherds quake at the sight,
Glories stream from heaven afar,
Heavenly hosts sing alleluia;
Christ the Saviour is born,
Christ the Saviour is born.

Silent night, holy night,
Son of God, love's pure light
Radiant beams from thy holy face
With the dawn of redeeming grace,
Jesus, Lord, at thy birth,
Jesus, Lord, at thy birth.`),

    Ly('Joy to the World', 'Traditional', 1719, ['christmas', 'carol', 'hymn'],
`Joy to the world, the Lord is come!
Let earth receive her King;
Let every heart prepare Him room,
And heaven and nature sing,
And heaven and nature sing,
And heaven, and heaven and nature sing.

Joy to the earth, the Saviour reigns!
Let men their songs employ,
While fields and floods, rocks, hills and plains
Repeat the sounding joy,
Repeat the sounding joy,
Repeat, repeat the sounding joy.

He rules the world with truth and grace,
And makes the nations prove
The glories of His righteousness
And wonders of His love,
And wonders of His love,
And wonders, wonders of His love.`),

    Ly('Deck the Halls', 'Traditional', 0, ['christmas', 'carol', 'welsh'],
`Deck the halls with boughs of holly,
Fa la la la la, la la la la.
'Tis the season to be jolly,
Fa la la la la, la la la la.
Don we now our gay apparel,
Fa la la, la la la, la la la.
Troll the ancient Yuletide carol,
Fa la la la la, la la la la.

See the blazing Yule before us,
Fa la la la la, la la la la.
Strike the harp and join the chorus,
Fa la la la la, la la la la.
Follow me in merry measure,
Fa la la, la la la, la la la.
While I tell of Yuletide treasure,
Fa la la la la, la la la la.`),

    Ly('We Wish You a Merry Christmas', 'Traditional', 0, ['christmas', 'carol', 'english'],
`We wish you a merry Christmas,
We wish you a merry Christmas,
We wish you a merry Christmas
And a happy New Year.

Good tidings we bring
To you and your kin;
Good tidings for Christmas
And a happy New Year.

Oh, bring us some figgy pudding,
Oh, bring us some figgy pudding,
Oh, bring us some figgy pudding
And a cup of good cheer.

We won't go until we get some,
We won't go until we get some,
We won't go until we get some,
So bring some out here.`),

    Ly('The First Noel', 'Traditional', 0, ['christmas', 'carol', 'english'],
`The first Noel the angel did say
Was to certain poor shepherds in fields as they lay;
In fields where they lay keeping their sheep,
On a cold winter's night that was so deep.

Noel, Noel, Noel, Noel,
Born is the King of Israel.

They looked up and saw a star
Shining in the east beyond them far,
And to the earth it gave great light,
And so it continued both day and night.

And by the light of that same star
Three wise men came from country far;
To seek for a king was their intent,
And to follow the star wherever it went.`),

    Ly('God Rest Ye Merry, Gentlemen', 'Traditional', 0, ['christmas', 'carol', 'english'],
`God rest ye merry, gentlemen,
Let nothing you dismay,
Remember Christ our Saviour
Was born on Christmas Day,
To save us all from Satan's power
When we were gone astray.
O tidings of comfort and joy,
Comfort and joy,
O tidings of comfort and joy.

From God our heavenly Father
A blessed angel came,
And unto certain shepherds
Brought tidings of the same:
How that in Bethlehem was born
The Son of God by name.
O tidings of comfort and joy.`),

    Ly('O Come, All Ye Faithful', 'Traditional', 0, ['christmas', 'carol', 'hymn'],
`O come, all ye faithful,
Joyful and triumphant,
O come ye, O come ye to Bethlehem.
Come and behold Him,
Born the King of angels.

O come, let us adore Him,
O come, let us adore Him,
O come, let us adore Him,
Christ the Lord.

Sing, choirs of angels,
Sing in exultation,
Sing, all ye citizens of heaven above.
Glory to God,
Glory in the highest.`),

    Ly('O Christmas Tree', 'Traditional', 0, ['christmas', 'carol', 'german'],
`O Christmas tree, O Christmas tree,
How lovely are your branches.
O Christmas tree, O Christmas tree,
How lovely are your branches.
In beauty green will always grow
Through summer sun and winter snow.
O Christmas tree, O Christmas tree,
How lovely are your branches.

O Christmas tree, O Christmas tree,
You fill my heart with music.
O Christmas tree, O Christmas tree,
You fill my heart with music.
Reminding me on Christmas Day
To think of you and then be gay.
O Christmas tree, O Christmas tree,
You fill my heart with music.`),

    Ly('What Child Is This', 'Traditional', 1865, ['christmas', 'carol', 'greensleeves'],
`What child is this, who, laid to rest,
On Mary's lap is sleeping?
Whom angels greet with anthems sweet,
While shepherds watch are keeping?

This, this is Christ the King,
Whom shepherds guard and angels sing;
Haste, haste to bring Him laud,
The babe, the son of Mary.

Why lies He in such mean estate
Where ox and ass are feeding?
Good Christian, fear: for sinners here
The silent Word is pleading.`),

    Ly('The Twelve Days of Christmas', 'Traditional', 0, ['christmas', 'carol', 'english'],
`On the first day of Christmas
My true love sent to me
A partridge in a pear tree.

On the second day of Christmas
My true love sent to me
Two turtle doves
And a partridge in a pear tree.

On the third day of Christmas
My true love sent to me
Three French hens,
Two turtle doves
And a partridge in a pear tree.

On the fifth day of Christmas
My true love sent to me
Five gold rings,
Four calling birds,
Three French hens,
Two turtle doves
And a partridge in a pear tree.`),

    Ly('Good King Wenceslas', 'Traditional', 1853, ['christmas', 'carol'],
`Good King Wenceslas looked out
On the feast of Stephen,
When the snow lay round about,
Deep, and crisp, and even.
Brightly shone the moon that night,
Though the frost was cruel,
When a poor man came in sight,
Gathering winter fuel.

"Hither, page, and stand by me,
If thou know'st it, telling,
Yonder peasant, who is he?
Where and what his dwelling?"
"Sire, he lives a good league hence,
Underneath the mountain,
Right against the forest fence,
By Saint Agnes' fountain."`),

    Ly('The Battle Hymn of the Republic', 'Julia Ward Howe', 1862, ['hymn', 'american', 'civil war'],
`Mine eyes have seen the glory of the coming of the Lord;
He is trampling out the vintage where the grapes of wrath are stored;
He hath loosed the fateful lightning of His terrible swift sword:
His truth is marching on.

Glory, glory, hallelujah!
Glory, glory, hallelujah!
Glory, glory, hallelujah!
His truth is marching on.

I have seen Him in the watch-fires of a hundred circling camps,
They have builded Him an altar in the evening dews and damps;
I can read His righteous sentence by the dim and flaring lamps:
His day is marching on.`),

    Ly('America the Beautiful', 'Katharine Lee Bates', 1895, ['american', 'patriotic', 'hymn'],
`O beautiful for spacious skies,
For amber waves of grain,
For purple mountain majesties
Above the fruited plain.
America! America!
God shed His grace on thee,
And crown thy good with brotherhood
From sea to shining sea.

O beautiful for pilgrim feet,
Whose stern, impassioned stress
A thoroughfare for freedom beat
Across the wilderness.
America! America!
God mend thine every flaw,
Confirm thy soul in self-control,
Thy liberty in law.`),

    Ly('My Country, ’Tis of Thee', 'Samuel Francis Smith', 1831, ['american', 'patriotic'],
`My country, 'tis of thee,
Sweet land of liberty,
Of thee I sing;
Land where my fathers died,
Land of the pilgrims' pride,
From every mountainside
Let freedom ring.

My native country, thee,
Land of the noble free,
Thy name I love;
I love thy rocks and rills,
Thy woods and templed hills;
My heart with rapture thrills
Like that above.`),

    Ly('The Star-Spangled Banner', 'Francis Scott Key', 1814, ['american', 'patriotic', 'anthem'],
`O say can you see, by the dawn's early light,
What so proudly we hailed at the twilight's last gleaming,
Whose broad stripes and bright stars through the perilous fight,
O'er the ramparts we watched, were so gallantly streaming?
And the rockets' red glare, the bombs bursting in air,
Gave proof through the night that our flag was still there;
O say does that star-spangled banner yet wave
O'er the land of the free and the home of the brave?`),

    Ly('Go Tell It on the Mountain', 'Spiritual', 0, ['spiritual', 'christmas', 'gospel'],
`Go tell it on the mountain,
Over the hills and everywhere.
Go tell it on the mountain
That Jesus Christ is born.

While shepherds kept their watching
O'er silent flocks by night,
Behold throughout the heavens
There shone a holy light.

The shepherds feared and trembled
When lo! above the earth
Rang out the angel chorus
That hailed our Saviour's birth.`),

    Ly('Nobody Knows the Trouble I’ve Seen', 'Spiritual', 0, ['spiritual', 'gospel', 'blues'],
`Nobody knows the trouble I've seen,
Nobody knows but Jesus.
Nobody knows the trouble I've seen,
Glory, hallelujah.

Sometimes I'm up, sometimes I'm down,
Oh, yes, Lord.
Sometimes I'm almost to the ground,
Oh, yes, Lord.

Although you see me going along so,
Oh, yes, Lord,
I have my trials here below,
Oh, yes, Lord.`),

    Ly('Wade in the Water', 'Spiritual', 0, ['spiritual', 'gospel', 'folk'],
`Wade in the water,
Wade in the water, children,
Wade in the water,
God's gonna trouble the water.

See that band all dressed in white,
God's gonna trouble the water.
The leader looks like the Israelite,
God's gonna trouble the water.

See that band all dressed in red,
God's gonna trouble the water.
It looks like the band that Moses led,
God's gonna trouble the water.`),

    Ly('Joshua Fit the Battle of Jericho', 'Spiritual', 0, ['spiritual', 'gospel', 'folk'],
`Joshua fit the battle of Jericho, Jericho, Jericho,
Joshua fit the battle of Jericho,
And the walls came tumbling down.

You may talk about your kings of Gideon,
You may talk about your men of Saul,
But there's none like good old Joshua
At the battle of Jericho.

Up to the walls of Jericho
He marched with spear in hand.
"Go blow them ram horns," Joshua cried,
"'Cause the battle is in my hand."`),

    Ly('Kumbaya', 'Traditional', 0, ['folk', 'spiritual', 'campfire'],
`Kumbaya, my Lord, kumbaya.
Kumbaya, my Lord, kumbaya.
Kumbaya, my Lord, kumbaya.
Oh, Lord, kumbaya.

Someone's singing, Lord, kumbaya.
Someone's singing, Lord, kumbaya.
Someone's singing, Lord, kumbaya.
Oh, Lord, kumbaya.

Someone's praying, Lord, kumbaya.
Someone's praying, Lord, kumbaya.
Someone's praying, Lord, kumbaya.
Oh, Lord, kumbaya.`),

    Ly('He’s Got the Whole World in His Hands', 'Spiritual', 0, ['spiritual', 'gospel', 'children'],
`He's got the whole world in His hands,
He's got the whole world in His hands,
He's got the whole world in His hands,
He's got the whole world in His hands.

He's got the little bitty baby in His hands,
He's got the little bitty baby in His hands,
He's got the little bitty baby in His hands,
He's got the whole world in His hands.

He's got you and me, brother, in His hands,
He's got you and me, sister, in His hands,
He's got you and me, brother, in His hands,
He's got the whole world in His hands.`),

    Ly('Down in the Valley', 'Traditional', 0, ['folk', 'american', 'ballad'],
`Down in the valley, the valley so low,
Hang your head over, hear the wind blow.
Hear the wind blow, dear, hear the wind blow,
Hang your head over, hear the wind blow.

Roses love sunshine, violets love dew,
Angels in heaven know I love you.
Know I love you, dear, know I love you,
Angels in heaven know I love you.

Build me a castle forty feet high,
So I can see her as she goes by.
As she goes by, dear, as she goes by,
So I can see her as she goes by.`),

    Ly('On Top of Old Smoky', 'Traditional', 0, ['folk', 'appalachian', 'campfire'],
`On top of Old Smoky,
All covered with snow,
I lost my true lover
From courting too slow.

For courting's a pleasure,
And parting is grief,
And a false-hearted lover
Is worse than a thief.

A thief will just rob you
And take what you have,
But a false-hearted lover
Will lead you to the grave.`),

    Ly('Tom Dooley', 'Traditional', 0, ['folk', 'appalachian', 'ballad'],
`Hang down your head, Tom Dooley,
Hang down your head and cry.
Hang down your head, Tom Dooley,
Poor boy, you're bound to die.

I met her on the mountain,
There I took her life.
Met her on the mountain,
Stabbed her with my knife.

This time tomorrow,
Reckon where I'll be?
Hadn't been for Grayson,
I'd have been in Tennessee.`),

    Ly('Man of Constant Sorrow', 'Traditional', 0, ['folk', 'appalachian', 'bluegrass'],
`I am a man of constant sorrow,
I've seen trouble all my days.
I bid farewell to old Kentucky,
The place where I was born and raised.

For six long years I've been in trouble,
No pleasures here on earth I find.
For in this world I'm bound to ramble,
I have no friends to help me now.

It's fare thee well my own true lover,
I never expect to see you again,
For I'm bound to ride that northern railroad,
Perhaps I'll die upon this train.`),

    Ly('Wayfaring Stranger', 'Traditional', 0, ['folk', 'spiritual', 'appalachian'],
`I am a poor wayfaring stranger,
Traveling through this world of woe.
There is no sickness, toil or danger
In that bright land to which I go.

I'm going there to see my Father,
I'm going there no more to roam.
I'm only going over Jordan,
I'm only going over home.

I know dark clouds will gather 'round me,
I know my way is rough and steep,
Yet beauteous fields lie just before me
Where God's redeemed their vigils keep.`),

    Ly('Cotton-Eyed Joe', 'Traditional', 0, ['folk', 'american', 'fiddle'],
`Where did you come from, where did you go?
Where did you come from, Cotton-Eyed Joe?

I'd been married 'fore long ago
If it hadn't been for Cotton-Eyed Joe.
Where did you come from, where did you go?
Where did you come from, Cotton-Eyed Joe?

He came to town like a midwinter wind,
He got my girl and away he went.
Where did you come from, where did you go?
Where did you come from, Cotton-Eyed Joe?`),

    Ly('Turkey in the Straw', 'Traditional', 0, ['folk', 'fiddle', 'american'],
`As I was a-gwine down the road,
With a tired team and a heavy load,
I cracked my whip and the leader sprung,
I says day-day to the wagon tongue.

Turkey in the straw, turkey in the hay,
Roll 'em up and twist 'em up a high tuckahaw,
And hit 'em up a tune called Turkey in the Straw.

Went out to milk and I didn't know how,
I milked the goat instead of the cow.
A monkey sittin' on a pile of straw
A-winkin' at his mother-in-law.`),

    Ly('Buffalo Gals', 'Traditional', 1844, ['folk', 'american', 'play-party'],
`As I was walking down the street,
Down the street, down the street,
A pretty little gal I chanced to meet,
Oh, she was fair to view.

Buffalo gals, won't you come out tonight,
Come out tonight, come out tonight?
Buffalo gals, won't you come out tonight
And dance by the light of the moon.

I asked her if she'd stop and talk,
Stop and talk, stop and talk,
Her feet took up the whole sidewalk
And left no room for me.`),

    Ly('Wildwood Flower', 'Traditional', 0, ['folk', 'country', 'appalachian'],
`Oh, I'll twine with my mingles and waving black hair,
With the roses so red and the lilies so fair,
And the myrtles so bright with emerald dew,
The pale and the leader and eyes look like blue.

Oh, he promised to love me, he promised to love,
And to cherish me over all others above.
I woke from my dream and my idol was clay,
My passion for loving had vanished away.

Oh, he taught me to love him, he called me his flower,
That was blooming to cheer him through life's dreary hour.
Oh, I long to see him and regret the dark hour
He's gone and neglected this pale wildwood flower.`),

    Ly('Will the Circle Be Unbroken', 'Ada R. Habershon', 1907, ['gospel', 'hymn', 'folk'],
`There are loved ones in the glory
Whose dear forms you often miss.
When you close your earthly story,
Will you join them in their bliss?

Will the circle be unbroken
By and by, by and by?
Is a better home awaiting
In the sky, in the sky?

In the joyous days of childhood,
Oft they told of wondrous love,
Pointed to the dying Saviour;
Now they dwell with Him above.`),

    Ly('In the Sweet By and By', 'Sanford Fillmore Bennett', 1868, ['hymn', 'gospel'],
`There's a land that is fairer than day,
And by faith we can see it afar,
For the Father waits over the way
To prepare us a dwelling place there.

In the sweet by and by,
We shall meet on that beautiful shore.
In the sweet by and by,
We shall meet on that beautiful shore.

We shall sing on that beautiful shore
The melodious songs of the blest,
And our spirits shall sorrow no more,
Not a sigh for the blessing of rest.`),

    Ly('What a Friend We Have in Jesus', 'Joseph M. Scriven', 1855, ['hymn', 'gospel'],
`What a friend we have in Jesus,
All our sins and griefs to bear.
What a privilege to carry
Everything to God in prayer.
Oh, what peace we often forfeit,
Oh, what needless pain we bear,
All because we do not carry
Everything to God in prayer.

Have we trials and temptations?
Is there trouble anywhere?
We should never be discouraged:
Take it to the Lord in prayer.`),

    Ly('Rock of Ages', 'Augustus Toplady', 1763, ['hymn', 'gospel'],
`Rock of Ages, cleft for me,
Let me hide myself in Thee;
Let the water and the blood,
From Thy wounded side which flowed,
Be of sin the double cure,
Save from wrath and make me pure.

Not the labors of my hands
Can fulfill Thy law's demands;
Could my zeal no respite know,
Could my tears forever flow,
All for sin could not atone;
Thou must save, and Thou alone.`),

    Ly('Nearer, My God, to Thee', 'Sarah Flower Adams', 1841, ['hymn', 'gospel'],
`Nearer, my God, to Thee,
Nearer to Thee.
E'en though it be a cross
That raiseth me,
Still all my song shall be,
Nearer, my God, to Thee,
Nearer, my God, to Thee,
Nearer to Thee.

Though like the wanderer,
The sun gone down,
Darkness be over me,
My rest a stone,
Yet in my dreams I'd be
Nearer, my God, to Thee.`),

    Ly('Be Thou My Vision', 'Traditional', 0, ['hymn', 'irish', 'folk'],
`Be Thou my vision, O Lord of my heart;
Naught be all else to me, save that Thou art.
Thou my best thought, by day or by night,
Waking or sleeping, Thy presence my light.

Be Thou my wisdom, and Thou my true word;
I ever with Thee and Thou with me, Lord.
Thou my great Father, I Thy true son,
Thou in me dwelling, and I with Thee one.

Riches I heed not, nor man's empty praise,
Thou mine inheritance, now and always;
Thou and Thou only, first in my heart,
High King of Heaven, my treasure Thou art.`),

    Ly('The Wild Rover', 'Traditional', 0, ['folk', 'irish', 'pub'],
`I've been a wild rover for many's the year,
And I spent all me money on whiskey and beer.
But now I'm returning with gold in great store,
And I never will play the wild rover no more.

And it's no, nay, never,
No, nay, never, no more,
Will I play the wild rover,
No, never, no more.

I went to an alehouse I used to frequent,
And I told the landlady me money was spent.
I asked her for credit, she answered me nay,
Such a custom as yours I can have any day.`),

    Ly('Whiskey in the Jar', 'Traditional', 0, ['folk', 'irish', 'ballad'],
`As I was a-goin' over the far famed Kerry mountains,
I met with Captain Farrell, and his money he was counting.
I first produced me pistol and I then produced me rapier,
Saying, "Stand and deliver, for I am a bold deceiver."

Musha ring dum a doo dum a da,
Whack for my daddy-o,
Whack for my daddy-o,
There's whiskey in the jar.

I counted out his money and it made a pretty penny,
I put it in me pocket and I took it home to Jenny.
She sighed and she swore that she never would deceive me,
But the devil take the women, for they never can be easy.`),

    Ly('Black Velvet Band', 'Traditional', 0, ['folk', 'irish'],
`In a neat little town they call Belfast,
Apprenticed to trade I was bound,
And many an hour's sweet happiness
Have I spent in that neat little town.
A sad misfortune came over me
Which caused me to stray from the land,
Far away from me friends and relations
Betrayed by the black velvet band.

Her eyes they shone like diamonds,
I thought her the queen of the land,
And her hair, it hung over her shoulder
Tied up with a black velvet band.`),

    Ly('The Foggy Dew', 'Traditional', 0, ['folk', 'irish'],
`As down the glen one Easter morn
To a city fair rode I,
There armed lines of marching men
In squadrons passed me by.
No pipe did hum, no battle drum
Did sound its dread tattoo,
But the Angelus bell o'er the Liffey swell
Rang out in the foggy dew.

Right proudly high over Dublin town
They hung out the flag of war.
'Twas better to die 'neath an Irish sky
Than at Suvla or Sud el Bar.`),

    Ly('Carrickfergus', 'Traditional', 0, ['folk', 'irish'],
`I wish I was in Carrickfergus,
Only for nights in Ballygrand.
I would swim over the deepest ocean,
The deepest ocean for my love to find.
But the sea is wide, and I cannot swim over,
And neither have I wings to fly.
If I could find me a handsome boatsman
To ferry me over, my love and I.

My childhood days bring back sad reflections
Of happy times I spent so long ago.
My boyhood friends and my own relations
Have all passed on now like melting snow.`),

    Ly('The Leaving of Liverpool', 'Traditional', 0, ['folk', 'sea', 'english'],
`Farewell to Prince's Landing Stage,
River Mersey, fare thee well.
I am bound for California,
A place I know right well.

So fare thee well, my own true love,
When I return, united we will be.
It's not the leaving of Liverpool that grieves me,
But my darling when I think of thee.

I have shipped on a Yankee clipper ship,
Davy Crockett is her name,
And Burgess is the captain of her,
And they say she's a floating shame.`),

    Ly('South Australia', 'Traditional', 0, ['shanty', 'sea', 'australian'],
`In South Australia I was born,
Heave away, haul away.
In South Australia 'round Cape Horn,
We're bound for South Australia.

Haul away, you rolling kings,
Heave away, haul away.
Haul away, you'll hear me sing,
We're bound for South Australia.

As I walked out one morning fair,
Heave away, haul away,
'Twas there I met Miss Nancy Blair,
We're bound for South Australia.`),

    Ly('Haul Away Joe', 'Traditional', 0, ['shanty', 'sea'],
`When I was a little lad
And so my mother told me,
Way, haul away, we'll haul away Joe,
That if I did not kiss the girls
My lips would all grow mouldy,
Way, haul away, we'll haul away Joe.

Way, haul away, we'll haul for better weather,
Way, haul away, we'll haul away Joe.

King Louis was the King of France
Before the revolution,
Way, haul away, we'll haul away Joe,
And then he got his head cut off
Which spoiled his constitution,
Way, haul away, we'll haul away Joe.`),

    Ly('St. James Infirmary', 'Traditional', 0, ['blues', 'jazz', 'folk'],
`I went down to St. James Infirmary,
I saw my baby there,
Stretched out on a long white table,
So sweet, so cold, so fair.

Let her go, let her go, God bless her,
Wherever she may be.
She may search this whole wide world over,
She'll never find a sweet man like me.

When I die, want you to dress me in straight-lace shoes,
Box-back coat and a Stetson hat.
Put a twenty-dollar gold piece on my watch chain,
So the boys'll know I died standing pat.`),

    Ly('Frankie and Johnny', 'Traditional', 0, ['folk', 'blues', 'ballad'],
`Frankie and Johnny were lovers,
Oh, Lordy, how they could love.
Swore to be true to each other,
True as the stars above.
He was her man, but he done her wrong.

Frankie went down to the corner
Just for a bucket of beer.
She said to the fat bartender,
"Has my lovin' Johnny been here?
He was my man, but he's doing me wrong."

"Ain't going to tell you no story,
Ain't going to tell you no lie.
Johnny went by 'bout an hour ago
With a girl named Nellie Bly.
He was your man, but he's doing you wrong."`),

    Ly('Stagger Lee', 'Traditional', 0, ['blues', 'folk', 'ballad'],
`Stagger Lee and Billy Lyons
Were gambling one dark night.
Billy Lyons shot six and Stagger Lee shot the eight,
Stagger Lee told Billy Lyons, "I can't let you go with that."

Stagger Lee, Stagger Lee, oh, what a man,
Stagger Lee, Stagger Lee, do the best you can.

"What you gambling here, boy,
You must not know who I am."
Billy Lyons told Stagger Lee, "I don't even care.
You can take my whole fortune, just please don't take my life."`),

    Ly('John Henry', 'Traditional', 0, ['folk', 'blues', 'american'],
`John Henry was a little baby,
Sitting on his mammy's knee,
Picked up a hammer and a little piece of steel,
Said, "Hammer's gonna be the death of me, Lord, Lord,
Hammer's gonna be the death of me."

The captain said to John Henry,
"Gonna bring that steam drill 'round,
Gonna bring that steam drill out on the job,
Gonna whop that steel on down, Lord, Lord,
Gonna whop that steel on down."

John Henry told his captain,
"A man ain't nothing but a man,
But before I let your steam drill beat me down,
I'd die with a hammer in my hand, Lord, Lord,
I'd die with a hammer in my hand."`),

    Ly('Careless Love', 'Traditional', 0, ['blues', 'folk', 'jazz'],
`Love, oh love, oh careless love,
Love, oh love, oh careless love,
Love, oh love, oh careless love,
See what careless love has done.

Once I wore my apron low,
Once I wore my apron low,
Once I wore my apron low,
I couldn't keep you from my door.

Now I wear my apron high,
Now I wear my apron high,
Now I wear my apron high,
Scarce can you see to pass me by.`),

    Ly('Make Me a Pallet on Your Floor', 'Traditional', 0, ['blues', 'folk'],
`Make me a pallet on your floor,
Make me a pallet on your floor,
Make me a pallet, honey, a pallet on your floor,
So when your good man comes, he can't kick me out the door.

I'm going up the country where they say the water tastes like wine,
I'm going up the country where they say the water tastes like wine,
If I don't get better in a week or two, I'll be back in a month or nine.

Don't you let my good girl catch you here,
Don't you let my good girl catch you here,
She might shoot you, she might cut you, she might kill you, daddy dear.`),

    Ly('Bella Ciao', 'Traditional', 0, ['folk', 'italian'],
`Una mattina mi son svegliato,
O bella ciao, bella ciao, bella ciao, ciao, ciao.
Una mattina mi son svegliato,
E ho trovato l'invasor.

O partigiano, portami via,
O bella ciao, bella ciao, bella ciao, ciao, ciao.
O partigiano, portami via,
Che mi sento di morir.

E se io muoio da partigiano,
O bella ciao, bella ciao, bella ciao, ciao, ciao.
E se io muoio da partigiano,
Tu mi devi seppellir.`),

    Ly('La Bamba', 'Traditional', 0, ['folk', 'mexican', 'son jarocho'],
`Para bailar la bamba,
Para bailar la bamba se necesita una poca de gracia.
Una poca de gracia pa' mí, pa' ti, ay arriba, ay arriba.
Ay, arriba, arriba, por ti seré, por ti seré, por ti seré.

Yo no soy marinero,
Yo no soy marinero, soy capitán,
Soy capitán, soy capitán.
Bamba, bamba.
Bamba, bamba.`),

    Ly('Cielito Lindo', 'Quirino Mendoza y Cortés', 1882, ['folk', 'mexican'],
`De la Sierra Morena, cielito lindo, vienen bajando
Un par de ojitos negros, cielito lindo, de contrabando.

Ay, ay, ay, ay,
Canta y no llores,
Porque cantando se alegran, cielito lindo, los corazones.

Ese lunar que tienes, cielito lindo, junto a la boca
No se lo des a nadie, cielito lindo, que a mí me toca.`),

    Ly('La Cucaracha', 'Traditional', 0, ['folk', 'mexican'],
`La cucaracha, la cucaracha,
Ya no puede caminar,
Porque no tiene, porque le falta
Marijuana que fumar.

La cucaracha, la cucaracha,
Ya no puede caminar,
Porque no tiene, porque le falta
Las patitas de atrás.

Cuando uno quiere a una
Y esta una no lo quiere,
Es lo mismo que si un calvo
En la calle encuentra un peine.`),

    Ly('Waltzing Matilda', 'Banjo Paterson', 1895, ['folk', 'australian'],
`Once a jolly swagman camped by a billabong
Under the shade of a coolibah tree,
And he sang as he watched and waited till his billy boiled,
"You'll come a-waltzing Matilda with me."

Waltzing Matilda, waltzing Matilda,
You'll come a-waltzing Matilda with me,
And he sang as he watched and waited till his billy boiled,
"You'll come a-waltzing Matilda with me."

Down came a jumbuck to drink at that billabong,
Up jumped the swagman and grabbed him with glee,
And he sang as he shoved that jumbuck in his tucker bag,
"You'll come a-waltzing Matilda with me."`),

    Ly('Botany Bay', 'Traditional', 0, ['folk', 'australian', 'sea'],
`Farewell to old England forever,
Farewell to my rum coes as well,
Farewell to the well-known Old Bailey
Where I used for to cut such a swell.

Singing too-ral li-ooral li-addity,
Singing too-ral li-ooral li-ay,
Singing too-ral li-ooral li-addity,
And we're bound for Botany Bay.

There's the captain as is our commander,
There's the bo'sun and all the ship's crew,
There's the first and the second class passengers,
Knows what we poor convicts go through.`),

    Ly('Sakura Sakura', 'Traditional', 0, ['folk', 'japanese'],
`Sakura, sakura,
Noyama mo sato mo
Miwatasu kagiri
Kasumi ka kumo ka
Asahi ni niou
Sakura, sakura,
Hana zakari.

Sakura, sakura,
Yayoi no sora wa
Miwatasu kagiri
Kasumi ka kumo ka
Nioi zo izuru
Izaya, izaya,
Mini yukan.`),

    Ly('Arirang', 'Traditional', 0, ['folk', 'korean'],
`Arirang, arirang, arariyo,
Arirang gogaero neomeoganda.
Nareul beorigo gasineun nimeun
Simnido mot gaseo balbyeongnanda.

Arirang, arirang, arariyo,
Arirang gogaero neomeoganda.
Cheongcheonghaneure nareuni saeya
Jinjjaemeon nareul deullyeodao.`),

    Ly('Korobeiniki', 'Traditional', 0, ['folk', 'russian'],
`Ei, polnym-polna korobushka,
Est' sitets i parcha.
Pozhalei, moya zasmarushka,
Molodetskogo plecha.

Vyn'du, vyn'du v rozh' vysokuyu,
Tam do nochi postoyu.
Kak zavizhu chernookuyu,
Vse tovary razderu.

Tseny sam platil nemalye,
Ne torguisya, ne skupis',
Podstavlyai-ka guby alye,
Blizhe k molodtsu sadis'.`),

    Ly('Kalinka', 'Ivan Larionov', 1860, ['folk', 'russian'],
`Kalinka, kalinka, kalinka moya,
V sadu yagoda malinka, malinka moya.

Akh, pod sosnoyu, pod zelenoyu,
Spat' polozhite vy menya.
Ai-lyuli, lyuli, ai-lyuli, lyuli,
Spat' polozhite vy menya.

Kalinka, kalinka, kalinka moya,
V sadu yagoda malinka, malinka moya.`),

    Ly('Funiculì, Funiculà', 'Peppino Turco', 1880, ['folk', 'italian', 'naples'],
`Aissera, oje Nà, te ne furaste,
Je, jammo, ja, je, jammo, ja.
Ncoppa ja funiculì, funiculà,
Funiculì, funiculà.
Ncoppa ja funiculì, funiculà.

Jammo, jammo, 'ncoppa, jammo ja,
Funiculì, funiculà.
Jammo, jammo, 'ncoppa, jammo ja,
Funiculì, funiculà.

Nè, jammo da la terra a la montagna,
Aje, jammo, ja.
Se vede Francia, Proceta e la Spagna,
Aje, jammo, ja.`),

    Ly('Santa Lucia', 'Traditional', 1849, ['folk', 'italian', 'naples'],
`Sul mare luccica l'astro d'argento,
Placida è l'onda, prospero è il vento.
Venite all'agile barchetta mia,
Santa Lucia, Santa Lucia.

O dolce Napoli, o suol beato,
Ove sorridere volse il creato,
Tu sei l'impero dell'armonia,
Santa Lucia, Santa Lucia.`),

    Ly('The Holly and the Ivy', 'Traditional', 0, ['christmas', 'carol', 'english'],
`The holly and the ivy,
When they are both full grown,
Of all the trees that are in the wood,
The holly bears the crown.

The rising of the sun
And the running of the deer,
The playing of the merry organ,
Sweet singing in the choir.

The holly bears a blossom
As white as the lily flower,
And Mary bore sweet Jesus Christ
To be our sweet Saviour.`),

    Ly('I Saw Three Ships', 'Traditional', 0, ['christmas', 'carol', 'english'],
`I saw three ships come sailing in
On Christmas Day, on Christmas Day.
I saw three ships come sailing in
On Christmas Day in the morning.

And what was in those ships all three,
On Christmas Day, on Christmas Day?
And what was in those ships all three,
On Christmas Day in the morning?

Our Saviour Christ and His lady,
On Christmas Day, on Christmas Day.
Our Saviour Christ and His lady,
On Christmas Day in the morning.`),

    Ly('Here We Come A-Wassailing', 'Traditional', 0, ['christmas', 'carol', 'english'],
`Here we come a-wassailing
Among the leaves so green,
Here we come a-wandering,
So fair to be seen.

Love and joy come to you,
And to you your wassail too,
And God bless you and send you
A happy New Year.

We are not daily beggars
That beg from door to door,
But we are neighbours' children
Whom you have seen before.`),

    Ly('Danny Boy', 'Frederic Weatherly', 1913, ['folk', 'irish', 'ballad'],
`Oh, Danny boy, the pipes, the pipes are calling
From glen to glen, and down the mountain side.
The summer's gone, and all the roses falling,
It's you, it's you must go and I must bide.

But come ye back when summer's in the meadow,
Or when the valley's hushed and white with snow,
It's I'll be here in sunshine or in shadow,
Oh, Danny boy, oh Danny boy, I love you so.

But when ye come, and all the flowers are dying,
If I am dead, as dead I well may be,
Ye'll come and find the place where I am lying,
And kneel and say an Ave there for me.`),

    Ly('Aura Lee', 'W. W. Fosdick', 1861, ['folk', 'american', 'civil war'],
`As the blackbird in the spring,
'Neath the willow tree,
Sat and piped, I heard him sing,
Singing Aura Lee.
Aura Lee, Aura Lee,
Maid of golden hair,
Sunshine came along with thee,
And swallows in the air.

In thy blush the rose was born,
Music when you spake,
Through thine azure eye the morn
Sparkling seemed to break.`),

    Ly('Beautiful Dreamer', 'Stephen Foster', 1864, ['folk', 'american', 'parlor'],
`Beautiful dreamer, wake unto me,
Starlight and dewdrops are waiting for thee.
Sounds of the rude world heard in the day,
Lulled by the moonlight have all passed away.

Beautiful dreamer, queen of my song,
List while I woo thee with soft melody.
Gone are the cares of life's busy throng,
Beautiful dreamer, awake unto me.

Beautiful dreamer, out on the sea,
Mermaids are chanting the wild lorelie.
Over the streamlet vapors are borne,
Waiting to fade at the bright coming morn.`),

    Ly('Jeanie with the Light Brown Hair', 'Stephen Foster', 1854, ['folk', 'american', 'parlor'],
`I dream of Jeanie with the light brown hair,
Borne, like a vapor, on the summer air.
I see her tripping where the bright streams play,
Happy as the daisies that dance on her way.
Many were the wild notes her merry voice would pour,
Many were the blithe birds that warbled them o'er.
Oh, I dream of Jeanie with the light brown hair,
Floating, like a vapor, on the soft summer air.`),

    Ly('This Train', 'Traditional', 0, ['spiritual', 'gospel', 'folk'],
`This train is bound for glory, this train.
This train is bound for glory, this train.
This train is bound for glory,
Don't carry nothing but the righteous and the holy.
This train is bound for glory, this train.

This train don't carry no gamblers, this train.
This train don't carry no gamblers, this train.
This train don't carry no gamblers,
No hypocrites, no midnight ramblers.
This train is bound for glory, this train.`),

    Ly('Midnight Special', 'Traditional', 0, ['folk', 'blues', 'american'],
`Yonder come Miss Rosie,
How in the world do you know?
By the way she wears her apron,
And the clothes she wore.
Umbrella on her shoulder,
Piece of paper in her hand,
She's gonna tell the captain,
"Turn a-loose my man."

Let the Midnight Special
Shine her light on me.
Let the Midnight Special
Shine her ever-loving light on me.`),

    Ly('Rock Island Line', 'Traditional', 0, ['folk', 'blues', 'american'],
`I got a train, it's called the Rock Island Line,
I got a train, it's called the Rock Island Line.
Jesus died to save our sins,
Glory to God, we're gonna meet Him again.
The Rock Island Line, she's a mighty good road,
The Rock Island Line, she's the road to ride,
The Rock Island Line, she's a mighty good road,
If you want to ride, you gotta ride it like you find it,
Get your ticket at the station on the Rock Island Line.`),

    Ly('Shady Grove', 'Traditional', 0, ['folk', 'appalachian', 'old-time'],
`Shady Grove, my little love,
Shady Grove, I say,
Shady Grove, my little love,
I'm bound to go away.

Cheeks as red as a blooming rose,
Eyes of the deepest brown,
You are the darling of my heart,
Stay till the sun goes down.

Went to see my Shady Grove,
She was standing in the door,
Shoes and stockings in her hand,
Little bare feet on the floor.`),

    Ly('Cripple Creek', 'Traditional', 0, ['folk', 'appalachian', 'banjo'],
`I got a girl and she loves me,
She's as sweet as she can be.
She's got eyes of baby blue,
Makes my gun shoot straight and true.

Goin' up Cripple Creek, goin' in a run,
Goin' up Cripple Creek to have a little fun.
Goin' up Cripple Creek, goin' in a whirl,
Goin' up Cripple Creek to see my girl.

Cripple Creek's wide and Cripple Creek's deep,
I'll wade old Cripple Creek before I sleep.
Roll my britches to my knees,
I'll wade old Cripple Creek when I please.`),

    Ly('Old Joe Clark', 'Traditional', 0, ['folk', 'appalachian', 'fiddle'],
`Old Joe Clark, the preacher's son,
Preached all over the plain.
The only text he ever knew
Was "high-low jack and the game."

Fare thee well, Old Joe Clark,
Fare thee well, I say,
Fare thee well, Old Joe Clark,
Goodbye, Betty Brown.

Old Joe Clark he had a mule,
His name was Morgan Brown,
And every tooth in that mule's head
Was sixteen inches 'round.`),

    Ly('Soldier’s Joy', 'Traditional', 0, ['folk', 'fiddle', 'old-time'],
`Grasshopper sitting on a sweet potato vine,
Grasshopper sitting on a sweet potato vine,
Grasshopper sitting on a sweet potato vine,
Along come a chicken and says "you're mine."

Twenty-five cents for the pigeon wing,
Fifteen cents for the hoe-down,
Ten cents for the round and round,
And a dollar for the walk-around.

Chicken in the bread tray kicking up dough,
Granny, will your dog bite? No, child, no.`),

    Ly('Arkansas Traveler', 'Traditional', 0, ['folk', 'fiddle', 'american'],
`Oh, once upon a time in Arkansas,
An old man sat in his little cabin door,
And fiddled at a tune that he liked to hear,
A jolly old tune that he played by ear.

It was raining hard, but the fiddler didn't care,
He sawed away at the popular air,
Though his roof tree leaked like a waterfall,
That didn't seem to bother the man at all.

A traveler was riding by that day,
And stopped to hear him a-practicing away.
The cabin was afloat and his feet were wet,
But still the old man didn't seem to fret.`),

    Ly('Daisy Bell', 'Harry Dacre', 1892, ['parlor', 'american', 'bicycle'],
`There is a flower within my heart, Daisy, Daisy,
Planted one day by a glancing dart,
Planted by Daisy Bell.
Whether she loves me or loves me not,
Sometimes it's hard to tell,
Yet I am longing to share the lot
Of beautiful Daisy Bell.

Daisy, Daisy, give me your answer, do,
I'm half crazy all for the love of you.
It won't be a stylish marriage,
I can't afford a carriage,
But you'll look sweet upon the seat
Of a bicycle built for two.`),

    Ly('Take Me Out to the Ball Game', 'Jack Norworth', 1908, ['american', 'baseball', 'parlor'],
`Take me out to the ball game,
Take me out with the crowd.
Buy me some peanuts and Cracker Jack,
I don't care if I never get back.
Let me root, root, root for the home team,
If they don't win, it's a shame.
For it's one, two, three strikes, you're out,
At the old ball game.`),

    Ly('In the Good Old Summertime', 'Ren Shields', 1902, ['parlor', 'american'],
`In the good old summertime, in the good old summertime,
Strolling through the shady lanes with your baby mine.
You hold her hand and she holds yours, and that's a very good sign
That she's your tootsie-wootsie in the good old summertime.

There's a time in each year that we always hold dear,
Good old summer time.
With the birds and the trees and the sweet-scented breeze,
Good old summer time.`),

    Ly('Pack Up Your Troubles', 'George Asaf', 1915, ['folk', 'wwi', 'english'],
`Pack up your troubles in your old kit-bag
And smile, smile, smile.
While you've a lucifer to light your fag,
Smile, boys, that's the style.
What's the use of worrying?
It never was worthwhile, so
Pack up your troubles in your old kit-bag
And smile, smile, smile.`),

    Ly('It’s a Long Way to Tipperary', 'Jack Judge', 1912, ['folk', 'wwi', 'english'],
`It's a long way to Tipperary,
It's a long way to go.
It's a long way to Tipperary
To the sweetest girl I know.
Goodbye, Piccadilly,
Farewell, Leicester Square,
It's a long, long way to Tipperary,
But my heart's right there.

Up to mighty London came an Irishman one day,
As the streets are paved with gold, sure everyone was gay.`),

    Ly('Keep the Home Fires Burning', 'Lena Guilbert Ford', 1914, ['folk', 'wwi'],
`Keep the home fires burning,
While your hearts are yearning,
Though your lads are far away
They dream of home.
There's a silver lining
Through the dark clouds shining,
Turn the dark cloud inside out
Till the boys come home.

They were summoned from the hillside,
They were called in from the glen,
And the country found them ready
At the stirring call for men.`),

    Ly('Over There', 'George M. Cohan', 1917, ['american', 'wwi', 'patriotic'],
`Over there, over there,
Send the word, send the word over there,
That the Yanks are coming, the Yanks are coming,
The drums rum-tumming everywhere.
So prepare, say a prayer,
Send the word, send the word to beware.
We'll be over, we're coming over,
And we won't come back till it's over, over there.`),

    Ly('Give My Regards to Broadway', 'George M. Cohan', 1904, ['american', 'broadway'],
`Give my regards to Broadway,
Remember me to Herald Square.
Tell all the gang at Forty-Second Street
That I will soon be there.
Whisper of how I'm yearning
To mingle with the old time throng,
Give my regards to old Broadway
And say that I'll be there e'er long.`),

    Ly('You’re a Grand Old Flag', 'George M. Cohan', 1906, ['american', 'patriotic'],
`You're a grand old flag,
You're a high flying flag,
And forever in peace may you wave.
You're the emblem of the land I love,
The home of the free and the brave.
Every heart beats true
Under red, white and blue,
Where there's never a boast or brag.
But should auld acquaintance be forgot,
Keep your eye on the grand old flag.`),

    Ly('Shenandoah', 'Traditional', 0, ['folk', 'american', 'shanty', 'river'],
`Oh, Shenandoah, I long to hear you,
Away, you rolling river.
Oh, Shenandoah, I long to hear you,
Away, I'm bound away,
'Cross the wide Missouri.

Oh, Shenandoah, I love your daughter,
Away, you rolling river.
Oh, Shenandoah, I love your daughter,
Away, I'm bound away,
'Cross the wide Missouri.

Missouri, she's a mighty river,
Away, you rolling river.
The Indians camp along her border,
Away, I'm bound away,
'Cross the wide Missouri.`),

    Ly('Mary Had a Little Lamb', 'Sarah Josepha Hale', 1830, ['children', 'nursery'],
`Mary had a little lamb,
Little lamb, little lamb,
Mary had a little lamb
Whose fleece was white as snow.

And everywhere that Mary went,
Mary went, Mary went,
Everywhere that Mary went
The lamb was sure to go.

It followed her to school one day,
School one day, school one day,
It followed her to school one day,
Which was against the rule.`),

    Ly('The Coventry Carol', 'Traditional', 0, ['christmas', 'carol', 'english'],
`Lully, lulla, thou little tiny child,
By by, lully, lullay.
Lully, lulla, thou little tiny child,
By by, lully, lullay.

O sisters too, how may we do
For to preserve this day
This poor youngling for whom we do sing
By by, lully, lullay.

Herod the king, in his raging,
Charged he hath this day
His men of might in his own sight
All young children to slay.`),

    Ly('All Through the Night', 'Traditional', 0, ['folk', 'welsh', 'lullaby'],
`Sleep, my child, and peace attend thee
All through the night.
Guardian angels God will send thee
All through the night.
Soft the drowsy hours are creeping,
Hill and vale in slumber sleeping,
I my loving vigil keeping
All through the night.

While the moon her watch is keeping
All through the night,
While the weary world is sleeping
All through the night.`),

    Ly('The Minstrel Boy', 'Thomas Moore', 1813, ['folk', 'irish'],
`The minstrel boy to the war is gone,
In the ranks of death you'll find him.
His father's sword he has girded on,
And his wild harp slung behind him.
"Land of song!" said the warrior bard,
"Though all the world betrays thee,
One sword, at least, thy rights shall guard,
One faithful harp shall praise thee."`),

    Ly('The Last Rose of Summer', 'Thomas Moore', 1805, ['folk', 'irish'],
`'Tis the last rose of summer,
Left blooming alone;
All her lovely companions
Are faded and gone.
No flower of her kindred,
No rosebud is nigh,
To reflect back her blushes,
Or give sigh for sigh.

I'll not leave thee, thou lone one,
To pine on the stem;
Since the lovely are sleeping,
Go sleep thou with them.`),

    Ly('Drink to Me Only with Thine Eyes', 'Ben Jonson', 1616, ['folk', 'english', 'parlor'],
`Drink to me only with thine eyes,
And I will pledge with mine.
Or leave a kiss within the cup
And I'll not look for wine.
The thirst that from the soul doth rise
Doth ask a drink divine;
But might I of Jove's nectar sup,
I would not change for thine.`),

    Ly('Early One Morning', 'Traditional', 0, ['folk', 'english'],
`Early one morning, just as the sun was rising,
I heard a maid sing in the valley below:
"Oh, don't deceive me, oh, never leave me,
How could you use a poor maiden so?"

"Oh, gay is the garland and fresh are the roses
I've gathered from the brightest of morn.
Oh, don't deceive me, oh, never leave me,
How could you use a poor maiden so?"`),

    Ly('Greensleeves (What Child Is This melody)', 'Traditional', 1580, ['folk', 'english'],
`Alas, my love, you do me wrong
To cast me off discourteously.
I have loved you all so long,
Delighting in your company.
Greensleeves was all my joy,
Greensleeves was my delight.`),

    Ly('The Ash Grove', 'Traditional', 0, ['folk', 'welsh'],
`The ash grove, how graceful, how plainly 'tis speaking,
The harp through it playing when twilight is near.
Yet feelings in friendship's fond memory awaking
Call gentle reflections to each passing year.

Down yonder green valley where streamlets meander,
When twilight is fading I pensively rove,
Or at the bright noontide in solitude wander
Amid the dark shades of the lonely ash grove.`),

    Ly('All the Pretty Little Horses', 'Traditional', 0, ['lullaby', 'american', 'folk'],
`Hush-a-bye, don't you cry,
Go to sleepy, little baby.
When you wake, you shall have
All the pretty little horses.

Blacks and bays, dapples and grays,
Coach and six little horses.
Hush-a-bye, don't you cry,
Go to sleepy, little baby.`),

    Ly('Hush, Little Baby', 'Traditional', 0, ['lullaby', 'american', 'children'],
`Hush, little baby, don't say a word,
Papa's going to buy you a mockingbird.
And if that mockingbird won't sing,
Papa's going to buy you a diamond ring.

And if that diamond ring turns brass,
Papa's going to buy you a looking glass.
And if that looking glass gets broke,
Papa's going to buy you a billy goat.`),

    Ly('Oh Dear, What Can the Matter Be', 'Traditional', 0, ['folk', 'english', 'children'],
`Oh dear, what can the matter be?
Dear, dear, what can the matter be?
Oh dear, what can the matter be?
Johnny's so long at the fair.

He promised to buy me a trinket to please me,
And then for a kiss, oh, he vowed he would tease me.
He promised to buy me a bunch of blue ribbons
To tie up my bonnie brown hair.`),

    Ly('The Riddle Song', 'Traditional', 0, ['folk', 'english', 'appalachian'],
`I gave my love a cherry that had no stone,
I gave my love a chicken that had no bone,
I gave my love a story that had no end,
I gave my love a baby with no crying.

How can there be a cherry that has no stone?
How can there be a chicken that has no bone?
How can there be a story that has no end?
How can there be a baby with no crying?`),

    Ly('Froggie Went a-Courtin’', 'Traditional', 0, ['folk', 'children', 'english'],
`Froggie went a-courtin' and he did ride, uh-huh,
Froggie went a-courtin' and he did ride, uh-huh,
Froggie went a-courtin' and he did ride
With a sword and a pistol by his side, uh-huh.

He rode up to Miss Mousey's door, uh-huh,
He rode up to Miss Mousey's door, uh-huh,
He rode up to Miss Mousey's door
Where he had often been before, uh-huh.`),

    Ly('Billy Boy', 'Traditional', 0, ['folk', 'english', 'children'],
`Oh, where have you been, Billy Boy, Billy Boy,
Oh, where have you been, charming Billy?
I have been to seek a wife,
She's the joy of my life,
She's a young thing and cannot leave her mother.

Did she bid you to come in, Billy Boy, Billy Boy,
Did she bid you to come in, charming Billy?
Yes, she bade me to come in,
There's a dimple in her chin,
She's a young thing and cannot leave her mother.`),

    Ly('The Erie Canal', 'Traditional', 0, ['folk', 'american'],
`I've got a mule, her name is Sal,
Fifteen miles on the Erie Canal.
She's a good old worker and a good old pal,
Fifteen miles on the Erie Canal.

Low bridge, everybody down,
Low bridge, for we're coming to a town.
And you'll always know your neighbor,
You'll always know your pal,
If you ever navigated on the Erie Canal.`),

    Ly('I’ve Been Working on the Railroad', 'Traditional', 0, ['folk', 'american', 'campfire'],
`I've been working on the railroad
All the live-long day.
I've been working on the railroad
Just to pass the time away.
Don't you hear the whistle blowing,
Rise up so early in the morn?
Don't you hear the captain shouting,
"Dinah, blow your horn"?

Dinah, won't you blow,
Dinah, won't you blow,
Dinah, won't you blow your horn?`),

    Ly('She’ll Be Driving Six White Horses', 'Traditional', 0, ['folk', 'children'],
`She'll be driving six white horses when she comes,
She'll be driving six white horses when she comes,
She'll be driving six white horses,
She'll be driving six white horses,
She'll be driving six white horses when she comes.`),

    Ly('Goodnight, Ladies', 'Traditional', 0, ['folk', 'parlor'],
`Goodnight, ladies, goodnight, ladies,
Goodnight, ladies, we're going to leave you now.

Merrily we roll along, roll along, roll along,
Merrily we roll along, o'er the dark blue sea.

Farewell, ladies, farewell, ladies,
Farewell, ladies, we're going to leave you now.`),

    Ly('The Blue Tail Fly', 'Traditional', 1846, ['folk', 'american'],
`When I was young I used to wait
On master and give him his plate,
And pass the bottle when he got dry,
And brush away the blue-tail fly.

Jimmy crack corn, and I don't care,
Jimmy crack corn, and I don't care,
Jimmy crack corn, and I don't care,
My master's gone away.`),

    Ly('Cindy', 'Traditional', 0, ['folk', 'appalachian'],
`You ought to see my Cindy,
She lives away down south,
And she's so sweet the honey bees
Swarm around her mouth.

Get along home, Cindy, Cindy,
Get along home, Cindy, Cindy,
Get along home, Cindy, Cindy,
I'll marry you some day.`),

    Ly('Ida Red', 'Traditional', 0, ['folk', 'old-time', 'fiddle'],
`Ida Red, Ida Blue, I got stuck on Ida too.
Down the road and across the creek,
Can't get a letter but once a week.

Ida Red, she's a vixen, Ida Red, she likes her chicken.
Ida Red, Ida Green, ain't no gal like Ida seen.`),

    Ly('Sally Goodin', 'Traditional', 0, ['folk', 'fiddle', 'old-time'],
`Had a piece of pie and I had a piece of puddin',
And I gave it all away just to see my Sally Goodin.
Had a piece of pie and I had a piece of puddin',
And I gave it all away just to see my Sally Goodin.

Love my Sal, I love my Sal, I love my Sally Goodin,
Love my Sal, love my gal, I love my Sally Goodin.`),

    Ly('The Girl I Left Behind Me', 'Traditional', 0, ['folk', 'irish', 'military'],
`I'm lonesome since I crossed the hill
And o'er the moor and valley.
Such heavy thoughts my heart do fill
Since parting with my Sally.
I seek no more the fine and gay,
For each does but remind me
How swift the hours did pass away
With the girl I left behind me.`),

    Ly('Annie Laurie', 'Traditional', 0, ['folk', 'scottish'],
`Maxwelton's braes are bonnie
Where early fa's the dew,
And it's there that Annie Laurie
Gie'd me her promise true.
Gie'd me her promise true,
Which ne'er forgot will be,
And for bonnie Annie Laurie
I'd lay me doun and dee.`),

    Ly('Loch Lomond', 'Traditional', 0, ['folk', 'scottish'],
`By yon bonnie banks and by yon bonnie braes,
Where the sun shines bright on Loch Lomond,
Where me and my true love were ever wont to gae,
On the bonnie, bonnie banks of Loch Lomond.

Oh, ye'll take the high road and I'll take the low road,
And I'll be in Scotland afore ye,
But me and my true love will never meet again
On the bonnie, bonnie banks of Loch Lomond.`),

    Ly('My Love Is Like a Red, Red Rose', 'Robert Burns', 1794, ['folk', 'scottish'],
`O my Luve is like a red, red rose
That's newly sprung in June;
O my Luve is like the melody
That's sweetly played in tune.

As fair art thou, my bonnie lass,
So deep in luve am I;
And I will luve thee still, my dear,
Till a' the seas gang dry.`),

    Ly('Flow Gently, Sweet Afton', 'Robert Burns', 1791, ['folk', 'scottish'],
`Flow gently, sweet Afton, among thy green braes,
Flow gently, I'll sing thee a song in thy praise.
My Mary's asleep by thy murmuring stream,
Flow gently, sweet Afton, disturb not her dream.

Thou stock-dove whose echo resounds from the hill,
Ye wild whistling blackbirds in yon thorny dell,
Thou green-crested lapwing, thy screaming forbear,
I charge you disturb not my slumbering fair.`),

    Ly('The Bonnie Banks o’ Fordie', 'Traditional', 0, ['folk', 'scottish', 'ballad'],
`There were three ladies lived in a bower,
Eh wow bonnie,
And they went out to pull a flower
On the bonnie banks o' Fordie.

They had not pulled a flower but one
When up there started a banished man.`),

    Ly('Skye Boat Song', 'Traditional', 0, ['folk', 'scottish'],
`Speed, bonnie boat, like a bird on the wing,
Onward, the sailors cry.
Carry the lad that's born to be king
Over the sea to Skye.

Loud the winds howl, loud the waves roar,
Thunderclaps rend the air.
Baffled, our foes stand by the shore,
Follow they will not dare.`),

    Ly('The Unquiet Grave', 'Traditional', 0, ['folk', 'english', 'ballad'],
`The wind doth blow today, my love,
And a few small drops of rain.
I never had but one true-love,
In cold grave she was lain.

I'll do as much for my true-love
As any young man may;
I'll sit and mourn all at her grave
For a twelvemonth and a day.`),

    Ly('The Demon Lover', 'Traditional', 0, ['folk', 'english', 'ballad'],
`"Well met, well met, my own true love,
Well met, well met," cried he.
"I've just returned from the salt, salt sea,
And it's all for the love of thee."

"I could have married a king's daughter there,
You know she would have married me,
But I refused the crown of gold,
And it's all for the love of thee."`),

    Ly('Lord Randall', 'Traditional', 0, ['folk', 'ballad', 'english'],
`"O where hae ye been, Lord Randall, my son?
O where hae ye been, my handsome young man?"
"I hae been to the wild wood; mother, make my bed soon,
For I'm weary wi' hunting, and fain wald lie down."

"Where gat ye your dinner, Lord Randall, my son?
Where gat ye your dinner, my handsome young man?"
"I dined wi' my true-love; mother, make my bed soon,
For I'm weary wi' hunting, and fain wald lie down."`),

    Ly('The Twa Corbies', 'Traditional', 0, ['folk', 'scottish', 'ballad'],
`As I was walking all alane,
I heard twa corbies making a mane;
The tane unto the t'other say,
"Where sall we gang and dine today?"

"In behint yon auld fail dyke,
I wot there lies a new slain knight;
And naebody kens that he lies there,
But his hawk, his hound, and lady fair."`),

    Ly('Matty Groves', 'Traditional', 0, ['folk', 'english', 'ballad'],
`A holiday, a holiday, and the first one of the year,
Lord Donald's wife came into the church, the gospel for to hear.
And when the meeting it was done, she cast her eyes about,
And there she spied little Matty Groves, walking in the crowd.

"Come home with me, little Matty Groves, come home with me tonight.
Come home with me, little Matty Groves, and sleep with me till light."`),

    Ly('The House Carpenter', 'Traditional', 0, ['folk', 'american', 'ballad'],
`"Well met, well met, my own true love,
Well met, well met," cried he.
"I've just returned from the salt, salt sea,
And it's all for the sake of thee."

"I could have married a king's daughter there,
She would have married me,
But I have forsaken her crowns of gold,
And it's all for the sake of thee."`),

    Ly('Pretty Saro', 'Traditional', 0, ['folk', 'appalachian'],
`When I first come to this country in eighteen and forty-nine,
I saw many fair lovers, but I never saw mine.
I looked all around me, and I found I was quite alone,
And me a poor stranger, and a long way from home.

Pretty Saro, pretty Saro, I love you, I know,
I love you, pretty Saro, wherever I go.`),

    Ly('Shallow Brown', 'Traditional', 0, ['shanty', 'sea'],
`Get all hands on deck for to man the capstan,
Shallow, o shallow brown.
We're bound away at the break of day,
Shallow, o shallow brown.

She's a fast clipper ship and a bully good captain,
Shallow, o shallow brown.
We're bound away at the break of day,
Shallow, o shallow brown.`),

    Ly('Rio Grande', 'Traditional', 0, ['shanty', 'sea'],
`Oh, say, were you ever in Rio Grande?
Away, Rio!
It's there that the river runs down golden sand,
For we're bound for the Rio Grande.

And away, Rio, away, Rio,
So fare you well, my bonny young girl,
For we're bound for the Rio Grande.`),

    Ly('Leave Her, Johnny', 'Traditional', 0, ['shanty', 'sea'],
`Oh, the times are hard and the wages low,
Leave her, Johnny, leave her.
I guess it's time for us to go,
It's time for us to leave her.

Leave her, Johnny, leave her,
Oh, leave her, Johnny, leave her.
For the voyage is done and the winds don't blow,
And it's time for us to leave her.`),

    Ly('Randy Dandy-O', 'Traditional', 0, ['shanty', 'sea'],
`Now we are ready to sail for the Horn,
Way, ay, roll and go.
Our boots and our clothes, boys, are all in the pawn,
Around the Bay of Mexico.

So heave her up and away we'll go,
Way, ay, roll and go.
Heave her up and away we'll go,
Around the Bay of Mexico.`),

    Ly('What Shall We Do with the Drunken Sailor', 'Traditional', 0, ['shanty', 'sea'],
`What shall we do with a drunken sailor,
What shall we do with a drunken sailor,
What shall we do with a drunken sailor,
Earl-aye in the morning?

Hoo-ray and up she rises,
Hoo-ray and up she rises,
Hoo-ray and up she rises,
Earl-aye in the morning.`),

    Ly('The Wellerman', 'Traditional', 0, ['shanty', 'sea', 'new zealand'],
`There once was a ship that put to sea,
The name of the ship was the Billy of Tea.
The winds blew up, her bow dipped down,
Oh blow, my bully boys, blow.

Soon may the Wellerman come
To bring us sugar and tea and rum.
One day, when the tonguin' is done,
We'll take our leave and go.`),

    Ly('Lowlands Away', 'Traditional', 0, ['shanty', 'sea'],
`I dreamed a dream the other night,
Lowlands, lowlands, away, my John.
I dreamed a dream the other night,
My lowlands away.

I dreamed I saw my own true love,
Lowlands, lowlands, away, my John.
I dreamed I saw my own true love,
My lowlands away.`),

    Ly('A-Roving', 'Traditional', 0, ['shanty', 'sea'],
`In Amsterdam there lived a maid,
Mark well what I do say,
In Amsterdam there lived a maid,
And she was mistress of her trade.
I'll go no more a-roving with you, fair maid.

A-roving, a-roving, since roving's been my ru-i-n,
I'll go no more a-roving with you, fair maid.`),

    Ly('The Mermaid', 'Traditional', 0, ['folk', 'sea', 'english'],
`One Friday morn when we set sail,
And our ship not far from land,
We there did espy a fair pretty maid
With a comb and a glass in her hand, her hand, her hand,
With a comb and a glass in her hand.

While the raging seas did roar,
And the stormy winds did blow,
And we jolly sailor boys were up, up aloft,
And the landlubbers lying down below, below, below,
And the landlubbers lying down below.`),

    Ly('Sloop John B', 'Traditional', 0, ['folk', 'bahamian', 'sea'],
`We come on the sloop John B,
My grandfather and me.
Around Nassau town we did roam.
Drinking all night, got into a fight,
Well, I feel so broke up, I want to go home.

So hoist up the John B's sail,
See how the mainsail sets,
Call for the captain ashore, let me go home.
Let me go home, I want to go home,
I feel so broke up, I want to go home.`),

    Ly('Pay Me My Money Down', 'Traditional', 0, ['folk', 'sea', 'georgia sea islands'],
`I thought I heard the captain say,
Pay me my money down,
Tomorrow is our sailing day,
Pay me my money down.

Pay me, oh pay me,
Pay me my money down.
Pay me or go to jail,
Pay me my money down.`),

    Ly('Goodnight Irene', 'Traditional', 0, ['folk', 'blues', 'american'],
`Irene, goodnight, Irene, goodnight,
Goodnight, Irene, goodnight, Irene,
I'll see you in my dreams.

Last Saturday night I got married,
Me and my wife settled down.
Now me and my wife are parted,
I'm gonna take another stroll downtown.

Sometimes I live in the country,
Sometimes I live in town,
Sometimes I take a great notion
To jump into the river and drown.`),

    Ly('Good Night, Irene (chorus)', 'Traditional', 0, ['folk', 'american'],
`Irene, goodnight, Irene, goodnight,
Goodnight, Irene, goodnight, Irene,
I'll see you in my dreams.`),

    Ly('C.C. Rider', 'Traditional', 0, ['blues', 'folk'],
`C.C. Rider, see what you have done,
C.C. Rider, see what you have done.
You made me love you, now your friend has come.

You caused me, Rider, to hang my head and cry,
You caused me, Rider, to hang my head and cry.
Now you ridin', Rider, and I wish I could die.`),

    Ly('See See Rider', 'Traditional', 0, ['blues', 'folk'],
`See See Rider, see what you have done,
See See Rider, see what you have done.
Made me love you, now your friend has come.

I'm goin' away, baby, and I won't be back till fall,
I'm goin' away, baby, and I won't be back till fall.
If I find me a good man, I won't be back at all.`),

    Ly('Corinna, Corinna', 'Traditional', 0, ['blues', 'folk'],
`Corinna, Corinna, where you been so long?
Corinna, Corinna, where you been so long?
I ain't had no lovin' since you've been gone.

I ain't had no lovin' in a long, long time,
I ain't had no lovin' in a long, long time.
That's the reason why you stay on my mind.`),

    Ly('Salty Dog Blues', 'Traditional', 0, ['blues', 'folk'],
`Let me be your salty dog,
Or I won't be your man at all.
Honey, let me be your salty dog.

God don't like a thief and a liar,
God don't like a thief and a liar.
Honey, let me be your salty dog.`),

    Ly('Sitting on Top of the World', 'Traditional', 0, ['blues', 'folk'],
`Was in the spring, one sunny day,
My good gal left me, she went away.
But now she's gone, and I don't worry,
Lord, I'm sitting on top of the world.

Worked all the summer and worked all the fall,
Had to take Christmas in my overalls.
But now she's gone, and I don't worry,
Lord, I'm sitting on top of the world.`),

    Ly('You Are My Sunshine', 'Traditional', 0, ['folk', 'american', 'campfire'],
`You are my sunshine, my only sunshine.
You make me happy when skies are gray.
You'll never know, dear, how much I love you.
Please don't take my sunshine away.

The other night, dear, as I lay sleeping,
I dreamed I held you in my arms.
When I awoke, dear, I was mistaken,
So I hung my head and I cried.`)
  ];

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function search(q, opts) {
    q = norm(q);
    opts = opts || {};
    const out = [];
    if (!q) return out;
    const words = q.split(/\s+/).filter(Boolean);
    LYRICS.forEach(s => {
      const title = norm(s.title);
      const artist = norm(s.artist);
      const blob = s.search;
      const inTitleArtist = words.every(w => (title + ' ' + artist).indexOf(w) >= 0);
      const inLyrics = words.every(w => blob.indexOf(w) >= 0);
      if (!inTitleArtist && !inLyrics) return;
      /* a single short word in a verse is not a title search — “Dreams”
       * should not surface a hymn that happens to say “dreams”. */
      if (!inTitleArtist && (words.length < 2 && q.length < 10)) return;
      let score = 1;
      if (title === q || (title + ' ' + artist) === q || (artist + ' ' + title) === q) score += 12;
      if (title.startsWith(words[0])) score += 4;
      if (words.every(w => title.indexOf(w) >= 0)) score += 6;
      if (words.every(w => artist.indexOf(w) >= 0)) score += 3;
      if (artist === q) score += 5;
      if (!inTitleArtist) score -= 2;
      const first = norm((s.lyrics.split('\n').find(l => l.trim()) || ''));
      if (first && (first.indexOf(q) === 0 || (q.length >= 8 && first.indexOf(q) >= 0))) score += 7;
      out.push(Object.assign({ kind: 'lyrics', match: score }, s));
    });
    out.sort((a, b) => b.match - a.match);
    return out.slice(0, opts.cap || 40);
  }

  function chartFromSong(s) {
    if (!s) return null;
    const lines = [
      s.title,
      s.artist,
      '',
      'Play-along chart from the Trill Tuner library',
      '',
      'Key ' + s.key + (s.capo ? ' · capo ' + s.capo : '') + ' · ' + s.bpm + ' BPM · level ' + s.level + '/5',
      '',
      'Progression',
      s.progression || (s.chords || []).join('  '),
      '',
      'Chords',
      (s.chords || []).join('   '),
      '',
      'How to play it',
      s.notes || 'Keep the pulse even and change chords on the beat.',
      '',
      'Open the play-along chart to set the metronome and see the shapes.',
      (s.tags && s.tags.length) ? ('Tags: ' + s.tags.join(', ')) : ''
    ];
    return {
      title: s.title,
      artist: s.artist,
      album: '',
      lyrics: lines.join('\n').trim(),
      source: 'Trill Tuner library',
      chart: true,
      fullLyrics: false,
      songId: s.id || ''
    };
  }

  function titleScore(query, title, artist) {
    const nq = norm(query);
    const words = nq.split(/\s+/).filter(Boolean);
    const t = norm(title), a = norm(artist);
    let s = 0;
    if (!nq) return 0;
    if (t === nq) s += 20;
    if ((t + ' ' + a) === nq || (a + ' ' + t) === nq) s += 22;
    if (t.length > 2 && nq.indexOf(t) >= 0) s += 8;
    if (words.length && words.every(w => (t + ' ' + a).indexOf(w) >= 0)) s += 5;
    if (a === nq) s += 4;
    return s;
  }

  function bestMatch(query, catalogSongs) {
    const lyricHits = search(query, { cap: 16 });
    const songs = catalogSongs || [];
    let best = null, bestS = 0;
    lyricHits.forEach(h => {
      const s = titleScore(query, h.title, h.artist) + 3 + (h.match || 0) * 0.05;
      if (s > bestS) { bestS = s; best = { kind: 'lyrics', hit: h, score: s }; }
    });
    songs.forEach(h => {
      const s = titleScore(query, h.title, h.artist);
      if (s > bestS) { bestS = s; best = { kind: 'song', hit: h, score: s }; }
    });
    if (!best) return null;
    if (best.kind === 'lyrics') return toResult(best.hit);
    return chartFromSong(best.hit);
  }

  function toResult(hit) {
    return {
      title: hit.title,
      artist: hit.artist,
      album: hit.year ? String(hit.year) : '',
      lyrics: hit.lyrics,
      source: hit.source || 'Trill Tuner library',
      chart: !!hit.chart,
      fullLyrics: hit.fullLyrics !== false,
      songId: hit.songId || hit.id || ''
    };
  }

  const api = {
    LYRICS, search, chartFromSong, toResult, bestMatch, titleScore,
    counts: { lyrics: LYRICS.length },
    byId: id => LYRICS.find(s => s.id === id) || null
  };
  G.TT = G.TT || {};
  G.TT.lyricsdb = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
