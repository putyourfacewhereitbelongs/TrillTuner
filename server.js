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

async function searchLyrics(artist, title) {
  const errs = [];
  // 1) lrclib.net exact lookup
  try {
    const q = new URLSearchParams({ artist_name: artist, track_name: title });
    const j = await fetchJSON('https://lrclib.net/api/get?' + q, 8000);
    if (j && (j.plainLyrics || j.syncedLyrics)) {
      const ly = clean(j.plainLyrics || desync(j.syncedLyrics));
      if (ly) return { source: 'lrclib.net', artist: j.artistName || artist, title: j.trackName || title, album: j.albumName || '', lyrics: ly };
    }
  } catch (e) { errs.push('lrclib/get: ' + e.message); }
  // 2) lrclib.net fuzzy search
  try {
    const q = new URLSearchParams({ q: `${artist} ${title}`.trim() });
    const arr = await fetchJSON('https://lrclib.net/api/search?' + q, 8000);
    if (Array.isArray(arr) && arr.length) {
      const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      const na = norm(artist), nt = norm(title);
      let hit = arr.find(r => (r.plainLyrics || r.syncedLyrics) && (!na || norm(r.artistName).includes(na)) && (!nt || norm(r.trackName).includes(nt)));
      if (!hit) hit = arr.find(r => r.plainLyrics || r.syncedLyrics);
      if (hit) {
        const ly = clean(hit.plainLyrics || desync(hit.syncedLyrics));
        if (ly) return { source: 'lrclib.net', artist: hit.artistName, title: hit.trackName, album: hit.albumName || '', lyrics: ly };
      }
    }
  } catch (e) { errs.push('lrclib/search: ' + e.message); }
  // 3) lyrics.ovh
  try {
    const j = await fetchJSON(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, 9000);
    if (j && j.lyrics) {
      const ly = clean(j.lyrics);
      if (ly) return { source: 'lyrics.ovh', artist, title, album: '', lyrics: ly };
    }
  } catch (e) { errs.push('lyrics.ovh: ' + e.message); }

  const err = new Error(`No lyrics found for "${artist} – ${title}". Double-check the spelling, or try just the artist + a shorter title.`);
  err.detail = errs.join(' | ');
  throw err;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');

  if (u.pathname === '/api/health') { send(res, 200, { ok: true, app: 'Trill Tuner' }); return; }

  if (u.pathname === '/api/lyrics') {
    const artist = (u.searchParams.get('artist') || '').trim();
    const title = (u.searchParams.get('title') || '').trim();
    if (!artist || !title) { send(res, 400, { ok: false, error: 'Both "artist" and "title" query params are required.' }); return; }
    try {
      const result = await searchLyrics(artist, title);
      send(res, 200, { ok: true, result });
    } catch (e) {
      console.error('[lyrics]', e.message, '|', e.detail || '');
      send(res, 404, { ok: false, error: e.message });
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
