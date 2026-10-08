/* Trill Tuner — Lyrics search.
 *
 * One field, because that is how people remember songs: type the song, or the
 * artist, or both, and it works. The server proxy asks the lyric databases and
 * the offline catalog is searched at the same time, so you always get something
 * back even with no connection.
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

  L.search = async function (a, b) {
    const q = queryOf(a, b);
    if (b != null && String(b).trim() && els && els.q) els.q.value = q;
    if (!q) { setStatus('Type a song title, an artist, or both — either one is enough.', 'err'); return; }
    setStatus('Searching for “' + q + '”…');
    if (els.result) els.result.hidden = true;
    renderOffline(q);
    try {
      const r = await fetch('/api/lyrics?q=' + encodeURIComponent(q));
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Not found');
      render(j.result);
      addHistory(q, j.result);
      setStatus('');
    } catch (e) {
      setStatus(e.message || 'No connection to the lyric database — the offline library below still works.', 'err');
    }
  };

  /* what the app already knows about this search, before any network call */
  function renderOffline(q) {
    const res = TT.catalog.search(q, { cap: 8 });
    const songs = res.songs.slice(0, 6);
    if (!els.offline) return;
    els.offline.innerHTML = '';
    if (!songs.length && !res.artists.length) {
      els.offline.innerHTML = '<div class="dim">Not in the offline songbook — searching the lyric databases…</div>';
      return;
    }
    els.offline.appendChild(Object.assign(document.createElement('div'), { className: 'card-h small', textContent: 'In the offline songbook' }));
    songs.forEach(s => {
      const row = document.createElement('div');
      row.className = 'lyr-offline-row';
      row.innerHTML = `<b>${s.title}</b> <span class="dim">${s.artist} · ${s.key} · ${s.chords.join(' ')}</span>`;
      const b = document.createElement('button');
      b.className = 'btn btn-ghost tiny';
      b.textContent = '🎸 Play-along chart';
      b.type = 'button';
      b.addEventListener('click', () => {
        if (TT.tablab) TT.tablab.openSong(s);
        TT.app.showView('maker');
      });
      row.appendChild(b);
      els.offline.appendChild(row);
    });
    res.artists.slice(0, 2).forEach(a => {
      const row = document.createElement('div');
      row.className = 'lyr-offline-row';
      row.innerHTML = `<b>${a.name}</b> <span class="dim">${a.genres.join(' · ')} — ${(a.songs || []).slice(0, 4).join(', ')}</span>`;
      els.offline.appendChild(row);
    });
  }

  function render(res) {
    current = res;
    els.rTitle.textContent = res.title;
    els.rArtist.textContent = res.artist + (res.album ? ' · ' + res.album : '');
    els.body.textContent = res.lyrics;
    els.src.textContent = 'via ' + res.source;
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

    /* suggestions come from the app's own songbook, mixed by hand */
    const picks = ['Wonderwall', 'Dreams', 'Hallelujah', 'Wish You Were Here', 'Hotel California', 'Knockin’ on Heaven’s Door', 'Let It Be', 'Landslide'];
    picks.forEach(title => {
      const song = TT.catalog.SONGS.find(s => s.title === title) || TT.catalog.SONGS[0];
      els.suggest.appendChild(chip(song.title + ' — ' + song.artist, () => {
        els.q.value = song.title + ' ' + song.artist;
        L.search(song.title + ' ' + song.artist);
      }));
    });
    /* a few artists, to show that one name alone is enough */
    ['Fleetwood Mac', 'Jimi Hendrix', 'Oasis', 'The Beatles'].forEach(name => {
      els.suggest.appendChild(chip('by ' + name, () => {
        els.q.value = name;
        L.search(name);
      }, 'Search by artist name alone'));
    });
    renderFavs();
    renderHistory();
    if (els.offline) els.offline.innerHTML = '<div class="dim">Type a title, an artist, or both — either one is enough. The songbook is searched first, then the lyric databases.</div>';
  };

  window.TT = window.TT || {};
  window.TT.lyrics = L;
})();
