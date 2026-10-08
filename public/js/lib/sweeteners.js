/* My Guitar — sweetened tunings: per-string cent offsets applied on top of any
 * preset to compensate for real-world intonation quirks. Pure data, node-testable. */
(function () {
  'use strict';

  /* Offsets are listed string 6 → string 1 (thickest → thinnest), in cents.
   * Negative = tune that string slightly flat. */
  const SWEETENERS = [
    {
      id: 'equal', name: 'Equal temperament', hint: 'Pure 12-tone equal temperament — no offsets.',
      offsets: [0, 0, 0, 0, 0, 0]
    },
    {
      id: 'jt', name: 'James Taylor', hint: 'The famous JT acoustic recipe: strings tuned slightly flat so open-position chords ring sweeter (E −12 · A −10 · D −8 · G −4 · B −6 · E −12).',
      offsets: [-12, -10, -8, -4, -6, -12]
    },
    {
      id: 'acoustic', name: 'Acoustic compensation', hint: 'Gentle flat bias on the wound strings — helps first-position chords on an acoustic.',
      offsets: [-5, -3, -2, 0, -2, -4]
    },
    {
      id: 'electric', name: 'Electric compensation', hint: 'Small offsets that keep power and barre chords even on an electric.',
      offsets: [-2, -1, -1, 0, -1, -2]
    },
    {
      id: 'custom', name: 'Custom', hint: 'Your own offsets — edit the cent boxes below.',
      offsets: [0, 0, 0, 0, 0, 0]
    }
  ];

  function byId(id) {
    return SWEETENERS.find(s => s.id === id) || SWEETENERS[0];
  }

  /* Offset (cents) for string index i under sweetener `id` with the user's
   * custom offsets as fallback. Strings past the offset list get 0. */
  function offsetFor(id, custom, i) {
    const s = byId(id);
    const list = (id === 'custom' && Array.isArray(custom)) ? custom : s.offsets;
    return list && list[i] != null ? +list[i] : 0;
  }

  const api = { SWEETENERS: SWEETENERS, byId: byId, offsetFor: offsetFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.MG = window.MG || {}; window.MG.sweeteners = api; }
})();
