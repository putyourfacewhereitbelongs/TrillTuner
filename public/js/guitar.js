/* Trill Tuner — SVG guitar neck renderer (headstock + tuning pegs + fretboard +
 * strings). Neck-only view: no body, so the tuner stays focused on the string
 * you're playing. Left-most string = thickest / lowest (string N). */
(function () {
  'use strict';
  const N = window.TT.notes;

  function build(container, opts) {
    const names = opts.strings;               // e.g. ['E2','A2',...]
    const kind = opts.kind;                   // 'acoustic' | 'electric' (neck finish)
    const n = names.length;
    const W = 300, H = 648, cx = 150;
    const gap = n >= 6 ? 23 : 28;
    const span = gap * (n - 1);
    const xs = Array.from({ length: n }, (_, i) => cx - span / 2 + gap * i);
    const nutY = 132;                         // nut line
    const boardEnd = 552;                     // end of the fretboard
    const strEnd = boardEnd;                  // strings run to the fretboard end
    const scale = 620;                        // virtual scale length (fret spacing)
    const fretY = f => nutY + scale * (1 - Math.pow(2, -f / 12));
    const neckX = cx - span / 2 - 13, neckW = span + 26;
    const leftCount = Math.ceil(n / 2);
    const pegY = i => 32 + i * 30;

    // peg mapping: left column (top→bottom) = lowest strings; right column = highest
    const pegs = []; // {stringIdx, x, y}
    for (let i = 0; i < leftCount; i++) pegs.push({ stringIdx: i, x: 62, y: pegY(i) });
    for (let i = 0; i < n - leftCount; i++) pegs.push({ stringIdx: n - 1 - i, x: 238, y: pegY(i) });

    let s = `<svg viewBox="0 0 ${W} ${H}" class="guitar-svg" role="img" aria-label="Guitar neck with ${n} strings">
      <defs>
        <linearGradient id="gNeckA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#4c3527"/><stop offset="1" stop-color="#38251a"/>
        </linearGradient>
        <linearGradient id="gNeckE" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d9bb8d"/><stop offset="1" stop-color="#c2a173"/>
        </linearGradient>
      </defs>`;

    // ---- fretboard (neck) ----
    s += `<rect class="g-neck" x="${neckX}" y="${nutY - 2}" width="${neckW}" height="${boardEnd - nutY + 8}" rx="12" fill="url(${kind === 'acoustic' ? '#gNeckA' : '#gNeckE'})"/>`;

    for (let f = 1; f <= 18; f++) {
      const y = fretY(f);
      if (y > boardEnd) break;
      s += `<line class="g-fret" x1="${neckX + 2}" y1="${y}" x2="${neckX + neckW - 2}" y2="${y}"/>`;
    }
    [3, 5, 7, 9, 15, 17].forEach(f => {
      if (fretY(f) > boardEnd - 8) return;
      const y = (fretY(f) + fretY(f - 1)) / 2;
      s += `<circle class="g-dot" cx="${cx}" cy="${y}" r="4.5"/>`;
    });
    if (fretY(12) < boardEnd) {
      const y12 = (fretY(12) + fretY(11)) / 2;
      s += `<circle class="g-dot" cx="${cx - 20}" cy="${y12}" r="4.5"/><circle class="g-dot" cx="${cx + 20}" cy="${y12}" r="4.5"/>`;
    }

    // ---- nut ----
    s += `<rect class="g-nut" x="${neckX - 3}" y="${nutY - 7}" width="${neckW + 6}" height="8" rx="2"/>`;

    // ---- capo (optional) ----
    const capo = +opts.capo || 0;
    if (capo >= 1 && capo <= 7) {
      const cy = fretY(capo) - 11;
      s += `<g class="g-capo-wrap">` +
        `<rect class="g-capo" x="${neckX - 9}" y="${cy}" width="${neckW + 18}" height="15" rx="7"/>` +
        `<rect class="g-capo-pad" x="${neckX + 1}" y="${cy + 3}" width="${neckW - 2}" height="9" rx="4"/>` +
        `<text class="g-capo-txt" x="${cx}" y="${cy + 30}" text-anchor="middle">capo ${capo}</text></g>`;
    }

    // ---- headstock + pegs ----
    s += `<path class="g-head" d="M${cx - 56} 14 L${cx + 56} 14 L${cx + 42} 122 Q${cx} ${nutY + 2} ${cx - 42} 122 Z"/>`;
    pegs.forEach(p => {
      const x = xs[p.stringIdx];
      s += `<line class="g-link" x1="${p.x}" y1="${p.y}" x2="${x}" y2="${nutY}"/>`;
    });
    pegs.forEach(p => {
      s += `<g class="g-peg" data-i="${p.stringIdx}" transform="translate(${p.x},${p.y})"><circle class="peg-btn" r="10"/><circle class="peg-cap" r="3.5"/></g>`;
    });

    // ---- strings + labels ----
    for (let i = 0; i < n; i++) {
      const w = n === 4 ? (2.6 - i * 0.4) : Math.max(1.1, 3.6 - i * 0.46);
      s += `<line class="g-str" data-i="${i}" x1="${xs[i]}" y1="${nutY}" x2="${xs[i]}" y2="${strEnd}" stroke-width="${w.toFixed(2)}"/>`;
      s += `<circle class="g-ball" cx="${xs[i]}" cy="${strEnd}" r="${Math.max(1.8, w * 0.55).toFixed(1)}"/>`;
      const p = N.prettyName(names[i]);
      s += `<text class="g-arrow" data-i="${i}" x="${xs[i]}" y="${strEnd + 30}" text-anchor="middle"></text>`;
      s += `<text class="g-label" data-i="${i}" x="${xs[i]}" y="${strEnd + 58}" text-anchor="middle">${p.letter}</text>`;
      s += `<text class="g-oct" data-i="${i}" x="${xs[i]}" y="${strEnd + 74}" text-anchor="middle">${p.octave}</text>`;
    }
    s += '</svg>';

    container.innerHTML = s;

    const strEls = Array.from(container.querySelectorAll('.g-str'));
    const labelEls = Array.from(container.querySelectorAll('.g-label'));
    const octEls = Array.from(container.querySelectorAll('.g-oct'));
    const arrowEls = Array.from(container.querySelectorAll('.g-arrow'));
    const pegEls = Array.from(container.querySelectorAll('.g-peg'));

    function update(state) {
      // state: { active, tuned[], cents (number|null), signal, poly? }
      // poly: per-string strum-check result {found, cents, inTune} — when
      // present it drives per-string colors (green/red/amber/dim).
      const poly = state.poly || null;
      for (let i = 0; i < n; i++) {
        const isActive = !poly && i === state.active;
        const isTuned = !!state.tuned[i];
        const el = strEls[i];
        el.classList.toggle('active', isActive);
        el.classList.toggle('tuned', !poly && isTuned && !isActive);
        el.classList.toggle('ringing', isActive && state.signal);
        el.classList.toggle('p-ok', false);
        el.classList.toggle('p-flat', false);
        el.classList.toggle('p-sharp', false);
        el.classList.toggle('p-miss', false);
        if (poly) {
          const p = poly[i] || {};
          if (p.found && p.inTune) el.classList.add('p-ok');
          else if (p.found && p.cents < 0) el.classList.add('p-flat');
          else if (p.found) el.classList.add('p-sharp');
          else el.classList.add('p-miss');
          labelEls[i].classList.toggle('tuned', !!(p.found && p.inTune));
        } else {
          labelEls[i].classList.toggle('tuned', isTuned);
        }
        labelEls[i].classList.toggle('active', isActive);
        octEls[i].classList.toggle('active', isActive);
        pegEls.forEach(pe => { if (+pe.dataset.i === i) pe.classList.toggle('active', isActive); });
        const arr = arrowEls[i];
        if (isActive && state.signal && state.cents != null && Math.abs(state.cents) > 5) {
          arr.textContent = state.cents < 0 ? '▲' : '▼';
          arr.classList.add('show'); arr.classList.remove('up');
          if (state.cents < 0) arr.classList.add('up');
        } else {
          arr.classList.remove('show');
        }
      }
    }
    return { update: update };
  }

  window.TT = window.TT || {};
  window.TT.guitar = { build: build };
})();
