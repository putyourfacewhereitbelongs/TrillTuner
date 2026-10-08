#!/usr/bin/env node
'use strict';
/* Trill Tuner — tiny zero-dependency server: static files + lyrics search proxy */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';   /* 0.0.0.0 so sandbox/preview proxies can reach it */
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webm': 'video/webm'
};

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

async function fetchJSON(url, timeoutMs, headers) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: Object.assign({ 'User-Agent': 'TrillTuner/1.0 (guitar tuner web app)' }, headers || {})
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function desync(synced) {
  // "[mm:ss.xx] line" -> plain text
  return String(synced || '').split('\n').map(l => l.replace(/^\[[^\]]*\]\s*/, '')).join('\n');
}

function clean(s) {
  return String(s || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

/* One search box, one query. "artist", "title", "title artist" and "artist -
 * title" are all handled: we work out which half is which, then try to find
 * lyrics for every plausible reading. Returns {result} or throws. */
function splitQuery(q) {
  const clean = String(q || '').replace(/\s+/g, ' ').trim();
  const pairs = [];
  const dash = clean.split(/\s+[–—-]\s+/);
  if (dash.length >= 2) {
    pairs.push({ artist: dash[0].trim(), title: dash.slice(1).join(' ').trim() });
    pairs.push({ artist: dash.slice(1).join(' ').trim(), title: dash[0].trim() });
  }
  pairs.push({ artist: '', title: clean });
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    pairs.push({ artist: parts[0], title: parts.slice(1).join(' ') });
    pairs.push({ artist: parts.slice(0, -1).join(' '), title: parts[parts.length - 1] });
    pairs.push({ artist: clean, title: '' });
  }
  pairs.push({ artist: '', title: parts[0] });
  /* de-duplicate and keep the most specific first */
  const seen = new Set();
  return pairs.filter(p => (p.artist || p.title) && p.artist !== p.title)
    .filter(p => { const k = (p.artist + '|' + p.title).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (b.artist && b.title ? 1 : 0) - (a.artist && a.title ? 1 : 0));
}

async function searchLyrics(query) {
  const errs = [];
  const pairs = splitQuery(query);
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  /* 1) lrclib exact lookup for the most specific reading */
  for (const p of pairs) {
    if (!p.artist || !p.title) continue;
    try {
      const q = new URLSearchParams({ artist_name: p.artist, track_name: p.title });
      const j = await fetchJSON('https://lrclib.net/api/get?' + q, 8000);
      if (j && (j.plainLyrics || j.syncedLyrics)) {
        const ly = clean(j.plainLyrics || desync(j.syncedLyrics));
        if (ly) return { source: 'lrclib.net', artist: j.artistName || p.artist, title: j.trackName || p.title, album: j.albumName || '', lyrics: ly };
      }
    } catch (e) { errs.push('lrclib/get: ' + e.message); }
  }
  /* 2) lrclib fuzzy search — this is the one that makes an artist-only or
   *    title-only query work */
  try {
    const q = new URLSearchParams({ q: String(query).trim() });
    const arr = await fetchJSON('https://lrclib.net/api/search?' + q, 9000);
    if (Array.isArray(arr) && arr.length) {
      const withLyrics = arr.filter(r => r.plainLyrics || r.syncedLyrics);
      /* prefer a hit whose artist AND title both look like the query */
      const wanted = pairs[0] || { artist: '', title: query };
      const na = norm(wanted.artist), nt = norm(wanted.title);
      let hit = withLyrics.find(r => (!na || norm(r.artistName).includes(na)) && (!nt || norm(r.trackName).includes(nt)));
      if (!hit && na) hit = withLyrics.find(r => norm(r.artistName).includes(na));
      if (!hit && nt) hit = withLyrics.find(r => norm(r.trackName).includes(nt));
      if (!hit) hit = withLyrics[0];
      if (hit) {
        const ly = clean(hit.plainLyrics || desync(hit.syncedLyrics));
        if (ly) return { source: 'lrclib.net', artist: hit.artistName, title: hit.trackName, album: hit.albumName || '', lyrics: ly };
      }
    }
  } catch (e) { errs.push('lrclib/search: ' + e.message); }
  /* 3) lyrics.ovh, both readings */
  for (const p of pairs) {
    if (!p.artist || !p.title) continue;
    try {
      const j = await fetchJSON(`https://api.lyrics.ovh/v1/${encodeURIComponent(p.artist)}/${encodeURIComponent(p.title)}`, 9000);
      if (j && j.lyrics) {
        const ly = clean(j.lyrics);
        if (ly) return { source: 'lyrics.ovh', artist: p.artist, title: p.title, album: '', lyrics: ly };
      }
    } catch (e) { errs.push('lyrics.ovh: ' + e.message); }
  }
  const err = new Error(`No lyrics found for "${query}". Check the spelling, or try just the artist name or just the title — either one on its own is enough.`);
  err.detail = errs.join(' | ');
  throw err;
}

/* Song search: the app's own library lives in the browser, so this exists to
 * cast a wider net when there is a connection — lrclib knows far more songs
 * than any bundled list can. It never blocks the offline search. */
async function searchSongs(q) {
  const out = [];
  try {
    const params = new URLSearchParams({ q: String(q).trim() });
    const arr = await fetchJSON('https://lrclib.net/api/search?' + params, 9000);
    if (Array.isArray(arr)) {
      const seen = new Set();
      arr.forEach(r => {
        const key = (r.trackName + '|' + r.artistName).toLowerCase();
        if (!r.trackName || seen.has(key)) return;
        seen.add(key);
        out.push({ title: r.trackName, artist: r.artistName || '', album: r.albumName || '', hasLyrics: !!(r.plainLyrics || r.syncedLyrics), instrumental: !!r.instrumental });
      });
    }
  } catch (e) { /* offline is fine — the client keeps its own results */ }
  return out.slice(0, 24);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');

  if (u.pathname === '/api/health') { send(res, 200, { ok: true, app: 'Trill Tuner' }); return; }

  if (u.pathname === '/api/lyrics') {
    /* one field is enough: ?q=… — artist, title, or both. The old ?artist=&title=
     * form still works for anything that already calls it that way. */
    const artist = (u.searchParams.get('artist') || '').trim();
    const title = (u.searchParams.get('title') || '').trim();
    const q = (u.searchParams.get('q') || '').trim() || (artist && title ? artist + ' ' + title : (artist || title));
    if (!q) { send(res, 400, { ok: false, error: 'Add a search term — "q", or "artist"/"title". Either an artist or a song title on its own is enough.' }); return; }
    try {
      const result = await searchLyrics(q);
      send(res, 200, { ok: true, result });
    } catch (e) {
      console.error('[lyrics]', e.message, '|', e.detail || '');
      send(res, 404, { ok: false, error: e.message });
    }
    return;
  }

  if (u.pathname === '/api/songs') {
    const q = (u.searchParams.get('q') || '').trim();
    if (!q) { send(res, 400, { ok: false, error: 'Add ?q= to search.' }); return; }
    try {
      const results = await searchSongs(q);
      send(res, 200, { ok: true, results, count: results.length });
    } catch (e) {
      send(res, 200, { ok: false, error: e.message, results: [] });
    }
    return;
  }

  // static files
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  let fp = path.normalize(path.join(PUBLIC, p));
  if (!fp.startsWith(PUBLIC)) { send(res, 403, { ok: false, error: 'forbidden' }); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { send(res, 404, { ok: false, error: 'not found: ' + p }); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  const shown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`🎸 Trill Tuner is running → http://${shown}:${PORT}`);
});
