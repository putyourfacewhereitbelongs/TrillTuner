/* Trill Tuner — thin wrapper over the vendored qrcode-generator (MIT,
 * Kazuhiko Arase, js/lib/qrcode.js). TT.qr.draw paints a QR code onto a
 * canvas, crisp at any size, with an optional quiet zone. */
(function () {
  'use strict';

  const QR = {};

  QR.draw = function (canvas, text, opts) {
    opts = opts || {};
    const qr = qrcode(opts.typeNumber || 0, opts.ec || 'M');   /* 0 = auto version */
    qr.addData(String(text));
    qr.make();
    const n = qr.getModuleCount();
    const cell = opts.cell || 4;
    const margin = opts.margin != null ? opts.margin : 4;
    const size = (n + margin * 2) * cell;
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext('2d');
    g.fillStyle = opts.bg || '#ffffff';
    g.fillRect(0, 0, size, size);
    g.fillStyle = opts.fg || '#0b0d12';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) g.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
      }
    }
    return canvas;
  };

  QR.dataURL = function (text, opts) {
    const c = document.createElement('canvas');
    QR.draw(c, text, opts);
    return c.toDataURL('image/png');
  };

  window.TT = window.TT || {};
  window.TT.qr = QR;
})();
