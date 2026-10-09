/* Trill Tuner — SVG guitar neck renderer (headstock + tuning machines + fretboard +
 * frets + strings). Neck-only view: no body, so the tuner stays focused on the string
 * you're playing. Left-most string = thickest / lowest (string N).
 *
 * Proportions follow a real neck: the fretboard flares slightly toward the body,
 * frets get closer toward the body (equal-temperament spacing), wound strings are
 * copper-coloured with a visible wrap, plain strings are bright steel with a
 * specular highlight, strings cast a soft shadow onto the board, and the headstock
 * carries six-in-line tuning machines with the strings running from the posts over
 * the nut. */
(function () {
  'use strict';
  const N = window.TT.notes;
  let buildId = 0;

  function build(container, opts) {
    const names = opts.strings;               // e.g. ['E2','A2',...]
    const kind = opts.kind;                   // 'acoustic' | 'electric' (neck finish)
    const n = names.length;
    const uid = 'gt' + (++buildId);
    const W = 300, H = 648, cx = 150;
    const gap = n >= 6 ? 23 : 28;
    const span = gap * (n - 1);
    const xs = Array.from({ length: n }, (_, i) => cx - span / 2 + gap * i);
    const nutY = 132;                         // nut line
    const boardEnd = 552;                     // end of the fretboard (body join)
    const strEnd = boardEnd;                  // strings run to the fretboard end
    const scale = 620;                        // virtual scale length (fret spacing)
    const fretY = f => nutY + scale * (1 - Math.pow(2, -f / 12));
    // half-width of the fretboard at height y: narrow at the nut, flaring toward the body
    const baseHalf = span / 2 + 12, flare = 9;
    const hw = y => baseHalf + flare * (y - nutY) / (boardEnd - nutY);
    const leftCount = Math.ceil(n / 2);
    const pegY = i => 34 + i * 30;
    const pegX = { left: 74, right: 226 };
    // wound strings: every string below the top three (all of them on a 4-string bass)
    const wound = i => n === 4 || i < n - 3;
    // string gauge: thickest low string → thinnest high string
    const strW = i => n === 4 ? 2.6 - i * 0.4 : Math.max(0.8, 3.4 - i * 0.46);

    // peg mapping: left column (top→bottom) = lowest strings; right column = highest
    const pegs = []; // {stringIdx, x, y}
    for (let i = 0; i < leftCount; i++) pegs.push({ stringIdx: i, x: pegX.left, y: pegY(i) });
    for (let i = 0; i < n - leftCount; i++) pegs.push({ stringIdx: n - 1 - i, x: pegX.right, y: pegY(i) });

    const woodA = kind === 'acoustic';        // dark rosewood vs light maple
    const woodTop = woodA ? '#4c3527' : '#d9bb8d', woodBot = woodA ? '#38251a' : '#c2a173';
    const grainCol = woodA ? 'rgba(20,10,4,.35)' : 'rgba(95,62,28,.22)';
    const bind = woodA ? '#e9e1cc' : '#f3ecdc';

    // neck outline (trapezoid) used for fill, grain clip, and shadow
    const neckD = `M${cx - hw(nutY)} ${nutY - 2} L${cx + hw(nutY)} ${nutY - 2} L${cx + hw(boardEnd)} ${boardEnd} L${cx - hw(boardEnd)} ${boardEnd} Z`;
    const headD = `M${cx - 100} 40 Q${cx - 102} 14 ${cx - 78} 14 L${cx + 78} 14 Q${cx + 102} 14 ${cx + 100} 40 L${cx + 42} 122 Q${cx} ${nutY + 2} ${cx - 42} 122 Z`;

    let s = `<svg viewBox="0 0 ${W} ${H}" class="guitar-svg" role="img" aria-label="Guitar neck with ${n} strings">
      <defs>
        <linearGradient id="${uid}-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${woodTop}"/><stop offset="1" stop-color="${woodBot}"/>
        </linearGradient>
        <linearGradient id="${uid}-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/>
          <stop offset="0.35" stop-color="#fff" stop-opacity="0.06"/>
          <stop offset="0.5" stop-color="#fff" stop-opacity="0.12"/>
          <stop offset="0.65" stop-color="#fff" stop-opacity="0.06"/>
          <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="${uid}-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/>
        </linearGradient>
        <linearGradient id="${uid}-post" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#e9edf5"/><stop offset="0.5" stop-color="#8d96a8"/><stop offset="1" stop-color="#3d4456"/>
        </linearGradient>
        <clipPath id="${uid}-neckclip"><path d="${neckD}"/></clipPath>
        <clipPath id="${uid}-headclip"><path d="${headD}"/></clipPath>
        <filter id="${uid}-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>`;

    // ---- neck shadow (sits on whatever is behind the guitar) ----
    s += `<path d="${neckD}" transform="translate(4 6)" fill="#000" opacity="0.35" filter="url(#${uid}-blur)"/>`;
    s += `<path d="${headD}" transform="translate(3 5)" fill="#000" opacity="0.3" filter="url(#${uid}-blur)"/>`;

    // ---- headstock ----
    s += `<path class="g-head" d="${headD}" fill="url(#${uid}-wood)"/>`;
    s += `<g clip-path="url(#${uid}-headclip)">`;
    s += `<rect x="${cx - 110}" y="10" width="220" height="140" fill="url(#${uid}-head)"/>`;
    [-30, -14, 2, 18, 34].forEach((dx, k) => {
      s += `<path class="g-grain" d="M${cx + dx} 10 C${cx + dx + (k % 2 ? 6 : -6)} 60 ${cx + dx - (k % 2 ? 5 : -5)} 100 ${cx + dx + 2} 150"/>`;
    });
    s += `</g>`;

    // ---- fretboard ----
    s += `<path class="g-neck" d="${neckD}" fill="url(#${uid}-wood)" stroke="${bind}" stroke-width="2.4" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${uid}-neckclip)">`;
    for (let k = 0; k < 9; k++) {
      const t = -0.9 + (k + 0.5) * (1.8 / 9);          // lateral position of this grain line
      const w = Math.sin(k * 1.7) * 7;
      const x0 = cx + t * hw(nutY), x1 = cx + t * hw(boardEnd);
      s += `<path class="g-grain" d="M${x0.toFixed(1)} ${nutY} C${(x0 + w).toFixed(1)} ${(nutY + boardEnd) / 3} ${(x1 - w).toFixed(1)} ${(2 * boardEnd + nutY) / 3} ${x1.toFixed(1)} ${boardEnd}"/>`;
    }
    s += `<rect x="${cx - 80}" y="${nutY}" width="160" height="${boardEnd - nutY}" fill="url(#${uid}-sheen)"/>`;
    s += `</g>`;

    // ---- frets (wire with a dark shadow line under each) ----
    for (let f = 1; f <= 18; f++) {
      const y = fretY(f);
      if (y > boardEnd) break;
      const x1 = cx - hw(y) - 3, x2 = cx + hw(y) + 3;
      const fw = (2.3 - f * 0.05).toFixed(2);
      s += `<line class="g-fret-sh" x1="${x1}" y1="${y + 1.2}" x2="${x2}" y2="${y + 1.2}" stroke-width="${fw}"/>`;
      s += `<line class="g-fret" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke-width="${fw}"/>`;
    }

    // ---- position inlays (pearl) + side markers on the binding ----
    const dotAt = (f, dx) => {
      const y = (fretY(f) + fretY(f - 1)) / 2;
      s += `<circle class="g-dot" cx="${cx + dx}" cy="${y}" r="4.2"/>`;
    };
    [3, 5, 7, 9, 15, 17].forEach(f => {
      if (fretY(f) > boardEnd - 8) return;
      dotAt(f, 0);
      const y = (fretY(f) + fretY(f - 1)) / 2;
      s += `<circle class="g-side" cx="${cx - hw(y) + 0.5}" cy="${y}" r="1.3"/><circle class="g-side" cx="${cx + hw(y) - 0.5}" cy="${y}" r="1.3"/>`;
    });
    if (fretY(12) < boardEnd) {
      dotAt(12, -20); dotAt(12, 20);
    }

    // ---- nut (bone) with a slot for every string ----
    s += `<rect class="g-nut" x="${cx - hw(nutY) - 3}" y="${nutY - 7}" width="${2 * hw(nutY) + 6}" height="8" rx="2"/>`;
    xs.forEach(x => {
      s += `<line x1="${x}" y1="${nutY - 5}" x2="${x}" y2="${nutY}" stroke="#6b5f48" stroke-width="1.2"/>`;
    });

    // ---- capo (optional) ----
    const capo = +opts.capo || 0;
    if (capo >= 1 && capo <= 7) {
      const cyf = fretY(capo);
      const cy = cyf - 11;
      const cw = hw(cyf) * 2;
      s += `<g class="g-capo-wrap">` +
        `<rect class="g-capo" x="${cx - cw / 2 - 9}" y="${cy}" width="${cw + 18}" height="15" rx="7"/>` +
        `<rect class="g-capo-pad" x="${cx - cw / 2 + 1}" y="${cy + 3}" width="${cw - 2}" height="9" rx="4"/>` +
        `<text class="g-capo-txt" x="${cx}" y="${cy + 30}" text-anchor="middle">capo ${capo}</text></g>`;
    }

    // ---- strings run from the tuning posts over the nut ----
    pegs.forEach(p => {
      const i = p.stringIdx, x = xs[i];
      s += `<line class="g-link" x1="${p.x}" y1="${p.y}" x2="${x}" y2="${nutY - 6}" stroke-width="${(strW(i) * 0.6).toFixed(2)}"/>`;
    });

    // ---- tuning machines (posts + buttons) ----
    pegs.forEach(p => {
      s += `<g class="g-peg" data-i="${p.stringIdx}" transform="translate(${p.x},${p.y})">` +
        `<rect class="g-machine" x="-8" y="-5" width="16" height="10" rx="2"/>` +
        `<circle class="peg-btn" r="10"/><circle class="peg-cap" r="3.5"/></g>`;
    });

    // ---- strings: shadow, steel/wound body, wrap, highlight ----
    for (let i = 0; i < n; i++) {
      const w = strW(i), x = xs[i];
      s += `<line class="g-str-sh" x1="${x + 1.3}" y1="${nutY}" x2="${x + 1.3}" y2="${strEnd}" stroke-width="${(w * 1.25).toFixed(2)}"/>`;
      s += `<line class="g-str" data-i="${i}" data-w="${wound(i) ? 1 : 0}" x1="${x}" y1="${nutY}" x2="${x}" y2="${strEnd}" stroke-width="${w.toFixed(2)}"/>`;
      if (wound(i)) {
        s += `<line class="g-wind" x1="${x}" y1="${nutY}" x2="${x}" y2="${strEnd}" stroke-width="${w.toFixed(2)}" stroke-dasharray="${(w * 0.45).toFixed(2)} ${(w * 0.4).toFixed(2)}"/>`;
      }
      s += `<line class="g-str-hi" x1="${(x - w * 0.22).toFixed(2)}" y1="${nutY}" x2="${(x - w * 0.22).toFixed(2)}" y2="${strEnd}" stroke-width="${Math.max(0.35, w * 0.22).toFixed(2)}"/>`;
    }
    // bridge ends: ball ends sitting on the saddle
    for (let i = 0; i < n; i++) {
      const w = strW(i);
      s += `<circle class="g-ball" cx="${xs[i]}" cy="${strEnd}" r="${Math.max(2, w * 0.7).toFixed(1)}"/>`;
    }
    // labels
    for (let i = 0; i < n; i++) {
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
