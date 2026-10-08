/* Trill Tuner — persistent local store.
 *
 * Everything the app remembers lives here: settings, lesson progress, practice
 * minutes, takes metadata, rig presets, badges, tuner state. Data is written to
 * localStorage under the `tt.` prefix. Keys written by the app's earlier
 * development build (the `mg.` prefix) are migrated automatically on first load
 * so nobody loses their progress.
 *
 * Also provides the machinery behind Settings → Progress & Backup:
 *   - usage()               how many bytes we're using
 *   - exportAll()/importAll()  full JSON backup + restore
 *   - snapshot()/restore()  rolling in-app snapshots (last 3)
 *   - requestPersistence()  ask the browser for persistent storage (survives
 *                           eviction pressure / "clear site data" heuristics)
 */
(function () {
  'use strict';

  const PREFIX = 'tt.';
  const LEGACY = 'mg.';
  const SCHEMA = 3;               // bump when the shape of stored data changes
  const SNAP_KEY = 'tt.__snapshots';

  function ls() {
    try { return window.localStorage; } catch (e) { return null; }
  }

  /* ---------- first-run migration from the old `mg.` namespace ---------- */
  function migrate() {
    const s = ls();
    if (!s) return;
    let moved = 0;
    try {
      if (s.getItem(PREFIX + '__schema') == null) {
        const old = [];
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k && k.indexOf(LEGACY) === 0) old.push(k);
        }
        old.forEach(k => {
          const nu = PREFIX + k.slice(LEGACY.length);
          if (s.getItem(nu) == null) { s.setItem(nu, s.getItem(k)); moved++; }
        });
        s.setItem(PREFIX + '__schema', String(SCHEMA));
        s.setItem(PREFIX + '__migratedFrom', JSON.stringify(moved ? 'mg.' : ''));
        if (moved) s.setItem(PREFIX + '__migratedAt', String(Date.now()));
      }
      const schema = +((s.getItem(PREFIX + '__schema') || '0').replace(/^"|"$/g, '')) || 0;
      if (schema < SCHEMA) s.setItem(PREFIX + '__schema', String(SCHEMA));
    } catch (e) { /* private mode, quota, … */ }
    return moved;
  }

  function get(k, d) {
    const s = ls();
    if (!s) return d;
    try {
      const v = s.getItem(PREFIX + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  }

  function set(k, v) {
    const s = ls();
    if (!s) return false;
    try { s.setItem(PREFIX + k, JSON.stringify(v)); return true; }
    catch (e) { return false; }   // private mode / quota exceeded
  }

  function del(k) {
    const s = ls();
    if (!s) return;
    try { s.removeItem(PREFIX + k); } catch (e) {}
  }

  function update(k, d, fn) { const v = fn(get(k, d)); set(k, v); return v; }

  /* ---------- introspection ---------- */
  function keys(opts) {
    const s = ls();
    if (!s) return [];
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (!k || k.indexOf(PREFIX) !== 0) continue;
      const name = k.slice(PREFIX.length);
      if (!opts || !opts.internal) {
        if (name.charAt(0) === '_' || name.indexOf('__') === 0) continue;
      }
      out.push(name);
    }
    return out.sort();
  }

  function exportAll() {
    const data = {};
    keys({ internal: true }).forEach(k => {
      if (k.indexOf('__') === 0) return;                // never export snapshots
      const v = get(k, undefined);
      if (v !== undefined) data[k] = v;
    });
    return {
      app: 'Trill Tuner',
      schema: SCHEMA,
      version: (window.TT && window.TT.app && window.TT.app.VERSION) || '2.0.0',
      exportedAt: new Date().toISOString(),
      data: data
    };
  }

  /* Merge (default) or replace everything from a backup object. Unknown keys are
   * kept, so a backup from a newer version restores what it can. */
  function importAll(backup, opts) {
    const o = opts || {};
    if (!backup || typeof backup !== 'object' || !backup.data || typeof backup.data !== 'object') {
      throw new Error('That file does not look like a Trill Tuner backup.');
    }
    let n = 0;
    if (o.replace) Object.keys(exportAll().data).forEach(k => del(k));
    Object.keys(backup.data).forEach(k => { set(k, backup.data[k]); n++; });
    return { keys: n, replaced: !!o.replace, exportedAt: backup.exportedAt || null };
  }

  function usage() {
    const s = ls();
    if (!s) return { bytes: 0, items: 0, keys: 0 };
    let bytes = 0, items = 0;
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      bytes += (k.length + (s.getItem(k) || '').length) * 2;   // UTF-16
    }
    items = s.length;
    return { bytes: bytes, items: items, keys: keys({ internal: true }).length };
  }

  /* ---------- rolling snapshots (in-app undo for progress loss) ---------- */
  function snapshots() { return get('__snapshots', []); }

  function snapshot(label) {
    const list = snapshots();
    const snap = { at: Date.now(), label: label || 'auto', data: exportAll().data };
    list.unshift(snap);
    while (list.length > 3) list.pop();
    set('__snapshots', list);
    return snap;
  }

  function restore(i) {
    const list = snapshots();
    const snap = list[i || 0];
    if (!snap) throw new Error('No snapshot to restore.');
    Object.keys(exportAll().data).forEach(k => del(k));
    Object.keys(snap.data).forEach(k => set(k, snap.data[k]));
    return snap;
  }

  /* Snapshot at most once per hour, automatically, in the background. */
  function autoSnapshot() {
    try {
      const list = snapshots();
      const last = list[0];
      if (!last || Date.now() - last.at > 36e5) snapshot('auto');
    } catch (e) {}
  }

  /* ---------- persistent storage request ---------- */
  function storageState() {
    return { persisted: persisted, supported: supported, quota: quota };
  }
  let persisted = false, supported = false, quota = null;

  async function refreshStorage() {
    supported = !!(navigator.storage && navigator.storage.persist);
    try {
      if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted();
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        quota = est && est.quota ? est.quota : null;
        quotaUsed = est && est.usage ? est.usage : null;
      }
    } catch (e) {}
    return storageState();
  }
  let quotaUsed = null;
  function usedBytes() { return quotaUsed; }

  async function requestPersistence() {
    supported = !!(navigator.storage && navigator.storage.persist);
    if (!supported) return false;
    try { persisted = await navigator.storage.persist(); } catch (e) { persisted = false; }
    return persisted;
  }

  /* ---------- tiny helpers used by the share/progress view ---------- */
  function wipe() {
    keys({ internal: true }).forEach(k => { if (k.indexOf('__') !== 0) del(k); });
  }

  migrate();

  const api = {
    SCHEMA: SCHEMA, PREFIX: PREFIX,
    get: get, set: set, del: del, update: update, keys: keys,
    exportAll: exportAll, importAll: importAll, usage: usage,
    snapshot: snapshot, snapshots: snapshots, restore: restore, autoSnapshot: autoSnapshot, wipe: wipe,
    requestPersistence: requestPersistence, refreshStorage: refreshStorage,
    storageState: storageState, usedBytes: usedBytes,
    migrated: (function () { return get('__migratedFrom', '') === 'mg.'; })()
  };

  if (typeof window !== 'undefined') { window.TT = window.TT || {}; window.TT.store = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
