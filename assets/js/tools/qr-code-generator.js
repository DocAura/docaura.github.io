(function () {
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('qr'), status = $('status'), qr = null, lib = null;
  var getType = SK.choices($('type'), function (v) {
    document.querySelectorAll('.qr-f').forEach(function (el) { el.hidden = el.getAttribute('data-t') !== v; });
    update();
  });
  function esc(s) { return String(s).replace(/([\\;,:"])/g, '\\$1'); }
  function payload() {
    var t = getType(), v = function (id) { return $(id).value.trim(); };
    if (t === 'url') return v('q-url');
    if (t === 'upi') {
      if (!v('q-upi')) return '';
      var s = 'upi://pay?pa=' + encodeURIComponent(v('q-upi')) + '&pn=' + encodeURIComponent(v('q-pn') || v('q-upi')) + '&cu=INR';
      if (Number(v('q-am')) > 0) s += '&am=' + Number(v('q-am')).toFixed(2);
      return s;
    }
    if (t === 'wifi') return v('q-ss') ? 'WIFI:T:' + (v('q-wp') ? 'WPA' : 'nopass') + ';S:' + esc(v('q-ss')) + ';P:' + esc(v('q-wp')) + ';;' : '';
    if (t === 'wa') { var n = v('q-wn').replace(/\D/g, ''); return n ? 'https://wa.me/' + n + (v('q-wm') ? '?text=' + encodeURIComponent(v('q-wm')) : '') : ''; }
    if (t === 'tel') { var p = v('q-tel').replace(/[^\d+]/g, ''); return p ? 'tel:' + p : ''; }
    return '';
  }
  function make(text) {
    window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
    var q = window.qrcode(0, 'M'); q.addData(text, 'Byte'); q.make(); return q;
  }
  function draw() {
    var x = cv.getContext('2d'), cap = $('q-cap').value.trim(), S = 600, capH = cap ? 70 : 0;
    cv.height = S + capH;
    x.fillStyle = '#fff'; x.fillRect(0, 0, S, S + capH);
    if (!qr) { x.fillStyle = '#c9c4e0'; x.font = '700 30px Arial'; x.textAlign = 'center'; x.fillText('Type above to make your QR', S / 2, S / 2); return; }
    var n = qr.getModuleCount(), quiet = 4, cell = Math.floor(S / (n + quiet * 2)), off = Math.floor((S - cell * n) / 2);
    x.fillStyle = $('q-col').value;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) x.fillRect(off + c * cell, off + r * cell, cell, cell);
    if (cap) { x.fillStyle = '#1b1340'; x.font = '700 38px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(cap, S / 2, S + capH / 2 - 14); }
  }
  var t;
  function update() {
    clearTimeout(t);
    t = setTimeout(async function () {
      try {
        if (!lib) lib = SK.loadScript(SK.root + 'assets/vendor/qrcode.js');
        await lib;
        var p = payload();
        qr = p ? make(p) : null; SK.status(status); draw();
        if (p) SK.used('qr', { type: getType() });
      } catch (e) { qr = null; draw(); SK.status(status, 'err', 'That is too much text for one QR code. Please make it shorter.'); }
    }, 120);
  }
  document.querySelectorAll('.panel input, .panel textarea').forEach(function (el) { el.addEventListener('input', update); });
  $('png').addEventListener('click', async function () {
    if (!qr) { SK.status(status, 'err', 'Please type something first.'); return; }
    SK.download(await SK.canvasToBlob(cv, 'image/png'), 'qr-code-' + getType() + '.png');
  });
  $('svg').addEventListener('click', function () {
    if (!qr) { SK.status(status, 'err', 'Please type something first.'); return; }
    var n = qr.getModuleCount(), q = 4, sz = n + q * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
    var cap = $('q-cap').value.trim(), h = cap ? sz + 3 : sz;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + sz + ' ' + h + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path fill="' + $('q-col').value + '" d="' + d + '"/>' +
      (cap ? '<text x="' + sz / 2 + '" y="' + (sz + 1) + '" font-family="Arial" font-weight="700" font-size="2" text-anchor="middle" fill="#1b1340">' + cap.replace(/[<>&"]/g, function (m) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m]; }) + '</text>' : '') + '</svg>';
    SK.download(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code-' + getType() + '.svg');
  });
  // Show the right boxes when a page opens with a type already chosen (e.g. the UPI QR page)
  document.querySelectorAll('.qr-f').forEach(function (el) { el.hidden = el.getAttribute('data-t') !== getType(); });
  draw(); update();
})();
