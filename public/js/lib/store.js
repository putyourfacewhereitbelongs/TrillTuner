/* My Guitar — tiny localStorage wrapper */
(function () {
  'use strict';
  function get(k, d) {
    try {
      const v = localStorage.getItem('mg.' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  }
  function set(k, v) {
    try { localStorage.setItem('mg.' + k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ }
  }
  function update(k, d, fn) { const v = fn(get(k, d)); set(k, v); return v; }
  const api = { get: get, set: set, update: update };
  if (typeof window !== 'undefined') { window.MG = window.MG || {}; window.MG.store = api; }
})();
