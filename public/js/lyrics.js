/* My Guitar — Lyrics search (via our server proxy → lrclib.net / lyrics.ovh),
 * with favorites + recent history saved locally. */
(function () {
  'use strict';

  const L = {};
  let els = {};
  let current = null;

  const SUGGESTIONS = [
    ['Fleetwood Mac', 'Dreams'],
    ['Oasis', 'Wonderwall'],
    ['Leonard Cohen', 'Hallelujah'],
    ['Pink Floyd', 'Wish You Were Here'],
    ['Eagles', 'Hotel California'],
    ['Metallica', 'Nothing Else Matters'],
    ['Johnny Cash', 'Hurt'],
    ['The Beatles', 'Let It Be']
  ];

  function setStatus(txt, cls) {
    els.status.textContent = txt || '';
    els.status.className = 'lyr-status' + (cls ? ' ' + cls : '');
  }

  L.search = async function (artist, title) {
    artist = (artist || '').trim();
    title = (title || '').trim();
    if (!artist || !title) { setStatus('Enter both an artist and a song title.', 'err'); return; }
    setStatus('Searching…');
    els.result.hidden = true;
    try {
      const r = await fetch('/api/lyrics?artist=' + encodeURIComponent(artist) + '&title=' + encodeURIComponent(title));
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Not found');
      render(j.result);
      addHistory(j.result.artist, j.result.title);
      setStatus('');
    } catch (e) {
      setStatus(e.message || 'Search failed — check your connection and try again.', 'err');
    }
  };

  function render(res) {
    current = res;
    els.rTitle.textContent = res.title;
    els.rArtist.textContent = res.artist + (res.album ? ' · ' + res.album : '');
    els.body.textContent = res.lyrics;
    els.src.textContent = 'via ' + res.source;
    els.result.hidden = false;
    updateFavBtn();
  }

  function favs() { return MG.store.get('lyricsFavs', []); }
  function isFav() {
    return !!current && favs().some(f => f.title === current.title && f.artist === current.artist);
  }
  function updateFavBtn() {
    els.btnFav.textContent = isFav() ? '★ Favorited' : '☆ Favorite';
  }
  function toggleFav() {
    if (!current) return;
    let f = favs();
    if (isFav()) {
      f = f.filter(x => !(x.title === current.title && x.artist === current.artist));
    } else {
      f.unshift({ artist: current.artist, title: current.title, lyrics: current.lyrics, source: current.source, at: Date.now() });
      f = f.slice(0, 30);
    }
    MG.store.set('lyricsFavs', f);
    renderFavs();
    updateFavBtn();
  }

  function addHistory(artist, title) {
    let h = MG.store.get('lyricsHistory', []).filter(x => !(x.artist === artist && x.title === title));
    h.unshift({ artist: artist, title: title, at: Date.now() });
    MG.store.set('lyricsHistory', h.slice(0, 10));
    renderHistory();
  }

  function chip(label, onclick) {
    const b = document.createElement('button');
    b.className = 'chip-s';
    b.textContent = label;
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
    const h = MG.store.get('lyricsHistory', []);
    if (!h.length) { wrap.innerHTML = '<span class="dim">No searches yet.</span>'; return; }
    h.forEach(x => wrap.appendChild(chip(x.title + ' — ' + x.artist, () => {
      els.artist.value = x.artist;
      els.title.value = x.title;
      L.search(x.artist, x.title);
    })));
  }

  L.init = function () {
    els = {
      form: document.getElementById('lyr-form'),
      artist: document.getElementById('lyr-artist'),
      title: document.getElementById('lyr-title'),
      status: document.getElementById('lyr-status'),
      result: document.getElementById('lyr-result'),
      rTitle: document.getElementById('lyr-r-title'),
      rArtist: document.getElementById('lyr-r-artist'),
      btnCopy: document.getElementById('btn-lyr-copy'),
      btnFav: document.getElementById('btn-lyr-fav'),
      body: document.getElementById('lyr-body'),
      src: document.getElementById('lyr-src'),
      favs: document.getElementById('lyr-favs'),
      history: document.getElementById('lyr-history'),
      suggest: document.getElementById('lyr-suggest')
    };
    els.form.addEventListener('submit', e => {
      e.preventDefault();
      L.search(els.artist.value, els.title.value);
    });
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
    const sug = document.getElementById('lyr-suggest');
    SUGGESTIONS.forEach(pair => {
      sug.appendChild(chip(pair[1] + ' — ' + pair[0], () => {
        els.artist.value = pair[0];
        els.title.value = pair[1];
        L.search(pair[0], pair[1]);
      }));
    });
    renderFavs();
    renderHistory();
  };

  window.MG = window.MG || {};
  window.MG.lyrics = L;
})();
