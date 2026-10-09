/* Trill Tuner — Lyrics search.
 *
 * One field, because that is how people remember songs: type the song, or the
 * artist, or a first line, and it works. The built-in library (public-domain
 * lyrics + play-along charts) answers immediately. Online lyric databases are
 * a bonus when they respond — they never make the tab look broken.
 *
 * Favorites and recent searches are kept locally.
 */
(function () {
  'use strict';

  const L = {};
  let els = {};
  let current = null;

  function setStatus(txt, cls) {
    if (!els.status) return;
    els.status.textContent = txt || '';
    els.status.className = 'lyr-status' + (cls ? ' ' + cls : '');
  }

  function queryOf(a, b) {
    if (b != null && String(b).trim()) return (a + ' ' + b).trim();
    return String(a == null ? '' : a).trim();
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function chartOf(song) {
    if (TT.lyricsdb && TT.lyricsdb.chartFromSong) return TT.lyricsdb.chartFromSong(song);
    return {
      title: song.title, artist: song.artist, album: '',
      lyrics: [song.title, song.artist, '', song.progression, (song.chords || []).join('  '), '', song.notes].join('\n'),
      source: 'Trill Tuner library', chart: true, songId: song.id
    };
  }

  function pickBest(q, lyricHits, songs) {
    const nq = norm(q);
    const words = nq.split(/\s+/).filter(Boolean);
    function titleScore(title, artist) {
      const t = norm(title), a = norm(artist);
      let s = 0;
      if (t === nq) s += 20;
      if ((t + ' ' + a) === nq || (a + ' ' + t) === nq) s += 22;
      if (t.length > 2 && nq.indexOf(t) >= 0) s += 8;
      if (words.every(w => (t + ' ' + a).indexOf(w) >= 0)) s += 5;
      if (a === nq) s += 4;
      return s;
    }
    let best = null, bestS = 0;
    lyricHits.forEach(h => {
      const s = titleScore(h.title, h.artist) + 3;
      if (s > bestS) { bestS = s; best = { kind: 'lyrics', hit: h }; }
    });
    songs.forEach(h => {
      const s = titleScore(h.title, h.artist);
      if (s > bestS) { bestS = s; best = { kind: 'song', hit: h }; }
    });
    return bestS > 0 ? best : null;
  }

  L.search = async function (a, b) {
    const q = queryOf(a, b);
    if (b != null && String(b).trim() && els && els.q) els.q.value = q;
    if (!q) { setStatus('Type a song title, an artist, or both — either one is enough.', 'err'); return; }
    setStatus('Searching the library for “' + q + '”…');
    if (els.result) els.result.hidden = true;
    const local = renderLibrary(q);
    if (local && local.result) {
      render(local.result);
      addHistory(q, local.result);
      setStatus(local.count + (local.count === 1 ? ' match' : ' matches') + ' in the library.');
    } else {
      setStatus('Not in the built-in library — checking lyric databases…');
    }
    try {
      const r = await fetch('/api/lyrics?q=' + encodeURIComponent(q));
      const j = await r.json();
      if (j && j.ok && j.result && j.result.lyrics) {
        /* prefer a full lyric hit from the network; keep a library chart if
         * the network only repeated what we already showed */
        const incoming = j.result;
        const alreadyFull = current && current.fullLyrics && !current.chart;
        if (!alreadyFull || (incoming.fullLyrics !== false && !incoming.chart && incoming.lyrics.length > (current.lyrics || '').length)) {
          render(incoming);
          addHistory(q, incoming);
        }
        setStatus('');
      } else if (local && local.result) {
        setStatus('Showing the built-in library.');
      } else {
        setStatus((j && j.error) || 'No match for that search. Try a title, an artist, or a first line.', 'err');
      }
    } catch (e) {
      if (local && local.result) {
        setStatus('Showing the built-in library.');
      } else {
        setStatus('No match in the library for that search. Try a title, an artist, or a first line.', 'err');
      }
    }
  };

  /* what the app already knows about this search, before any network call */
  function renderLibrary(q) {
    const lyricHits = (TT.lyricsdb && TT.lyricsdb.search) ? TT.lyricsdb.search(q, { cap: 12 }) : [];
    const res = TT.catalog.search(q, { cap: 12 });
    const songs = res.songs.slice(0, 8);
    if (!els.offline) return { count: 0, result: null };
    els.offline.innerHTML = '';
    const n = lyricHits.length + songs.length + res.artists.length;
    if (!n) {
      els.offline.innerHTML = '<div class="dim">Not in the built-in library — checking lyric databases…</div>';
      return { count: 0, result: null };
    }
    els.offline.appendChild(Object.assign(document.createElement('div'), {
      className: 'card-h small',
      textContent: 'In the library'
    }));
    const seen = {};
    lyricHits.forEach(h => {
      seen[norm(h.title) + '|' + norm(h.artist)] = true;
      const row = document.createElement('div');
      row.className = 'lyr-offline-row lyr-hit';
      row.innerHTML = '<b>' + h.title + '</b> <span class="dim">' + h.artist + (h.year ? ' · ' + h.year : '') + ' · lyrics</span>';
      row.tabIndex = 0;
      const open = () => { render(TT.lyricsdb.toResult(h)); setStatus('Lyrics from the built-in library.'); };
      row.addEventListener('click', open);
      row.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
      els.offline.appendChild(row);
    });
    songs.forEach(s => {
      const k = norm(s.title) + '|' + norm(s.artist);
      const row = document.createElement('div');
      row.className = 'lyr-offline-row lyr-hit';
      row.innerHTML = '<b>' + s.title + '</b> <span class="dim">' + s.artist + ' · ' + s.key + ' · ' + s.chords.join(' ') + '</span>';
      const b = document.createElement('button');
      b.className = 'btn btn-ghost tiny';
      b.textContent = '🎸 Play-along chart';
      b.type = 'button';
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        if (TT.tablab) TT.tablab.openSong(s);
        TT.app.showView('maker');
      });
      row.appendChild(b);
      if (!seen[k]) {
        row.classList.add('lyr-hit');
        row.tabIndex = 0;
        const open = () => { render(chartOf(s)); setStatus('Play-along chart from the library.'); };
        row.addEventListener('click', e => { if (e.target === b) return; open(); });
      }
      els.offline.appendChild(row);
    });
    res.artists.slice(0, 3).forEach(a => {
      const row = document.createElement('div');
      row.className = 'lyr-offline-row';
      row.innerHTML = '<b>' + a.name + '</b> <span class="dim">' + a.genres.join(' · ') + ' — ' + (a.songs || []).slice(0, 4).join(', ') + '</span>';
      els.offline.appendChild(row);
    });
    const best = pickBest(q, lyricHits, songs);
    let result = null;
    if (best && best.kind === 'lyrics') result = TT.lyricsdb.toResult(best.hit);
    else if (best && best.kind === 'song') result = chartOf(best.hit);
    return { count: n, result: result };
  }

  function render(res) {
    current = res;
    els.rTitle.textContent = res.title;
    els.rArtist.textContent = res.artist + (res.album ? ' · ' + res.album : '');
    els.body.textContent = res.lyrics;
    els.src.textContent = (res.chart ? 'Play-along chart · ' : 'Lyrics · ') + (res.source || 'library');
    els.result.hidden = false;
    updateFavBtn();
  }

  function favs() { return TT.store.get('lyricsFavs', []); }
  function isFav() {
    return !!current && favs().some(f => f.title === current.title && f.artist === current.artist);
  }
  function updateFavBtn() { els.btnFav.textContent = isFav() ? '★ Favorited' : '☆ Favorite'; }
  function toggleFav() {
    if (!current) return;
    let f = favs();
    if (isFav()) f = f.filter(x => !(x.title === current.title && x.artist === current.artist));
    else {
      f.unshift({ artist: current.artist, title: current.title, lyrics: current.lyrics, source: current.source, at: Date.now() });
      f = f.slice(0, 30);
    }
    TT.store.set('lyricsFavs', f);
    renderFavs();
    updateFavBtn();
  }

  function addHistory(q, result) {
    let h = TT.store.get('lyricsHistory', []).filter(x => x.q !== q);
    h.unshift({ q: q, title: (result && result.title) || q, artist: (result && result.artist) || '', at: Date.now() });
    TT.store.set('lyricsHistory', h.slice(0, 12));
    renderHistory();
  }

  function chip(label, onclick, title) {
    const b = document.createElement('button');
    b.className = 'chip-s';
    b.textContent = label;
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', onclick);
    return b;
  }
  function renderFavs() {
    const wrap = els.favs;
    wrap.innerHTML = '';
    const f = favs();
    if (!f.length) { wrap.innerHTML = '<span class="dim">No favorites yet.</span>'; return; }
    f.forEach(x => wrap.appendChild(chip('★ ' + x.title + ' — ' + x.artist, () => {
      render({ title: x.title, artist: x.artist, lyrics: x.lyrics, source: x.source, album: '' });
      setStatus('');
    })));
  }
  function renderHistory() {
    const wrap = els.history;
    wrap.innerHTML = '';
    const h = TT.store.get('lyricsHistory', []);
    if (!h.length) { wrap.innerHTML = '<span class="dim">No searches yet.</span>'; return; }
    h.forEach(x => wrap.appendChild(chip(x.q, () => {
      if (els.q) els.q.value = x.q;
      L.search(x.q);
    }, x.title)));
  }

  L.init = function () {
    if (L._ready) return;            /* re-initialising must not wipe a search */
    L._ready = true;
    els = {
      form: document.getElementById('lyr-form'),
      q: document.getElementById('lyr-q'),
      status: document.getElementById('lyr-status'),
      result: document.getElementById('lyr-result'),
      rTitle: document.getElementById('lyr-r-title'),
      rArtist: document.getElementById('lyr-r-artist'),
      btnCopy: document.getElementById('btn-lyr-copy'),
      btnFav: document.getElementById('btn-lyr-fav'),
      btnTab: document.getElementById('btn-lyr-tab'),
      body: document.getElementById('lyr-body'),
      src: document.getElementById('lyr-src'),
      favs: document.getElementById('lyr-favs'),
      history: document.getElementById('lyr-history'),
      suggest: document.getElementById('lyr-suggest'),
      offline: document.getElementById('lyr-offline')
    };
    els.form.addEventListener('submit', e => { e.preventDefault(); L.search(els.q.value); });
    els.btnCopy.addEventListener('click', () => {
      if (!current) return;
      const txt = current.title + ' — ' + current.artist + '\n\n' + current.lyrics;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => setStatus('Copied to clipboard ✓', 'ok'));
      } else {
        const ta = document.createElement('textarea');
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); setStatus('Copied to clipboard ✓', 'ok'); } catch (e) {}
        ta.remove();
      }
    });
    els.btnFav.addEventListener('click', toggleFav);
    if (els.btnTab) els.btnTab.addEventListener('click', () => {
      const q = current ? (current.title + ' ' + current.artist) : (els.q ? els.q.value : '');
      const res = TT.catalog.search(q, { cap: 1 });
      if (res.songs.length) { if (TT.tablab) TT.tablab.openSong(res.songs[0]); }
      else if (TT.tablab) TT.tablab.openSong({ title: current ? current.title : q, artist: current ? current.artist : '', key: 'C', bpm: 100, chords: [], level: 2, notes: 'Load the audio into the Tab maker and it will read the chords straight off the recording.' });
      TT.app.showView('maker');
      TT.app.toast('Drop the song file into the Tab maker and it will work out the chords, key and tempo itself.');
    });

    const picks = ['Amazing Grace', 'House of the Rising Sun', 'Drunken Sailor', 'Wonderwall', 'Dreams', 'Hallelujah', 'Wish You Were Here', 'Let It Be'];
    picks.forEach(title => {
      const fromLy = TT.lyricsdb && TT.lyricsdb.LYRICS ? TT.lyricsdb.LYRICS.find(s => s.title === title) : null;
      const song = TT.catalog.SONGS.find(s => s.title === title) || TT.catalog.SONGS[0];
      const label = fromLy ? fromLy.title + ' — ' + fromLy.artist : song.title + ' — ' + song.artist;
      const q = fromLy ? fromLy.title : (song.title + ' ' + song.artist);
      els.suggest.appendChild(chip(label, () => {
        els.q.value = q;
        L.search(q);
      }));
    });
    ['Fleetwood Mac', 'Jimi Hendrix', 'Oasis', 'The Beatles', 'Traditional'].forEach(name => {
      els.suggest.appendChild(chip('by ' + name, () => {
        els.q.value = name;
        L.search(name);
      }, 'Search by artist name alone'));
    });
    renderFavs();
    renderHistory();
    const nSongs = (TT.catalog && TT.catalog.counts && TT.catalog.counts.songs) || 0;
    const nLy = (TT.lyricsdb && TT.lyricsdb.counts && TT.lyricsdb.counts.lyrics) || 0;
    if (els.offline) els.offline.innerHTML = '<div class="dim">Type a title, an artist, or both — either one is enough. ' + nLy + ' lyrics and ' + nSongs + ' play-along charts are in the library on this device.</div>';
  };

  window.TT = window.TT || {};
  window.TT.lyrics = L;
})();
