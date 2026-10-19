(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result');
  var KEY = 'sk-sign-v1';
  var file = null, buf = null, pdf = null, pageNo = 1, outBlob = null;
  var sig = null;            // {src, aspect}
  var items = [];            // {page, kind, src, aspect, x, y, w}  (x, y, w are fractions of page width/height)
  var selected = -1;
  var fname = SK.nameField($('out-btns'), '.pdf');

  function store(v) { try { if (v === undefined) return localStorage.getItem(KEY); if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) { return null; } }

  // ---------- Trim a canvas to its ink, return {src, aspect} ----------
  function trim(c) {
    var ctx = c.getContext('2d', { willReadFrequently: true }), w = c.width, h = c.height;
    var d = ctx.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    var pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04) + 2;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    var o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return { src: o.toDataURL('image/png'), aspect: o.height / o.width };
  }

  // ---------- Mode tabs ----------
  var getMode = SK.choices($('mode'), function (m) {
    ['draw', 'type', 'upload'].forEach(function (k) { $('pane-' + k).hidden = k !== m; });
    if (m === 'draw') sizePad();
  });

  // ---------- Draw pad ----------
  var pad = $('pad'), pctx = pad.getContext('2d'), drawing = false, last = null, hasInk = false;
  var getInk = SK.choices($('ink'), function () { /* new strokes use new colour */ });
  function sizePad() {
    var r = pad.getBoundingClientRect(); if (!r.width) return;
    var dpr = window.devicePixelRatio || 1;
    var snap = hasInk ? pad.toDataURL() : null;
    pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.lineCap = 'round'; pctx.lineJoin = 'round';
    if (snap) { var im = new Image(); im.onload = function () { pctx.drawImage(im, 0, 0, r.width, r.height); }; im.src = snap; }
  }
  function pt(e) { var r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  pad.addEventListener('pointerdown', function (e) {
    e.preventDefault(); pad.setPointerCapture(e.pointerId); drawing = true; last = pt(e);
    pctx.strokeStyle = getInk(); pctx.fillStyle = getInk();
    pctx.beginPath(); pctx.arc(last.x, last.y, 1.4, 0, Math.PI * 2); pctx.fill(); hasInk = true;
  });
  pad.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pt(e), dist = Math.hypot(p.x - last.x, p.y - last.y);
    pctx.lineWidth = Math.max(1.8, Math.min(3.6, 4.2 - dist * 0.12)); // faster strokes look thinner, like a pen
    pctx.beginPath(); pctx.moveTo(last.x, last.y);
    var mx = (last.x + p.x) / 2, my = (last.y + p.y) / 2;
    pctx.quadraticCurveTo(last.x, last.y, mx, my); pctx.lineTo(p.x, p.y); pctx.stroke();
    last = p; hasInk = true;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { pad.addEventListener(t, function () { drawing = false; }); });
  $('pad-clear').addEventListener('click', function () { pctx.clearRect(0, 0, pad.width, pad.height); hasInk = false; });
  window.addEventListener('resize', function () { if (!$('pane-draw').hidden && !$('make').hidden) sizePad(); });

  // ---------- Type ----------
  var FONTS = [['Dancing Script', 'Flowing'], ['Great Vibes', 'Elegant'], ['Caveat', 'Handwritten'], ['Homemade Apple', 'Pen']];
  var fontsReady = null;
  function loadFonts() {
    if (fontsReady) return fontsReady;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@600&family=Great+Vibes&family=Homemade+Apple&display=swap';
    document.head.appendChild(l);
    fontsReady = new Promise(function (res) { l.onload = res; l.onerror = res; setTimeout(res, 4000); }).then(function () {
      return Promise.all(FONTS.map(function (f) { return document.fonts.load('60px "' + f[0] + '"').catch(function () {}); }));
    });
    return fontsReady;
  }
  var fontBox = $('font');
  FONTS.forEach(function (f, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'choice sig-font';
    b.setAttribute('data-value', f[0]); b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.style.fontFamily = '"' + f[0] + '", cursive';
    b.innerHTML = '<span class="sf-name">Your Name</span><small style="font-family:Poppins,sans-serif">' + f[1] + '</small>';
    fontBox.appendChild(b);
  });
  var getFont = SK.choices(fontBox);
  $('typed').addEventListener('input', function () {
    var v = this.value.trim() || 'Your Name';
    fontBox.querySelectorAll('.sf-name').forEach(function (s) { s.textContent = v; });
  });
  $('mode').addEventListener('click', function () { if (getMode() === 'type') loadFonts(); });

  async function typedSig() {
    var name = $('typed').value.trim();
    if (!name) throw new Error('Please type your name first.');
    await loadFonts();
    var f = getFont(), size = 140;
    var c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = size + 'px "' + f + '", "Segoe Script", "Brush Script MT", cursive';
    var w = Math.ceil(x.measureText(name).width + size);
    c.width = w; c.height = Math.round(size * 2);
    x = c.getContext('2d'); x.font = size + 'px "' + f + '", "Segoe Script", "Brush Script MT", cursive'; x.fillStyle = getInk(); x.textBaseline = 'middle';
    x.fillText(name, size / 2, c.height / 2);
    return trim(c);
  }

  // ---------- Upload ----------
  var uploaded = null;
  $('sig-file').addEventListener('change', async function () {
    var f = this.files[0]; this.value = '';
    if (!f) return;
    try {
      SK.status(status, 'info', 'Cleaning up your signature…');
      var img = await SK.fileToImage(f);
      var c = SK.drawRotated(img, 0, 1400);
      SK.cleanScan(c, 'clear');
      var ctx = c.getContext('2d', { willReadFrequently: true }), im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
      for (var i = 0; i < d.length; i += 4) {
        var l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        var a = l > 215 ? 0 : l < 110 ? 255 : (215 - l) / 105 * 255;
        d[i] = Math.round(d[i] * 0.6); d[i + 1] = Math.round(d[i + 1] * 0.6); d[i + 2] = Math.round(d[i + 2] * 0.6 + 10);
        d[i + 3] = a;
      }
      ctx.putImageData(im, 0, 0);
      uploaded = trim(c);
      if (!uploaded) throw new Error('No signature found in that photo. Use a dark pen on white paper.');
      $('up-prev').src = uploaded.src; $('up-prev').hidden = false;
      SK.status(status);
    } catch (e) { SK.status(status, 'err', e.message || SK.errText(e)); }
  });

  // ---------- Use signature ----------
  $('use').addEventListener('click', async function () {
    try {
      var m = getMode(), s = null;
      if (m === 'draw') {
        if (!hasInk) throw new Error('Please draw your signature in the white box first.');
        s = trim(pad);
      } else if (m === 'type') s = await typedSig();
      else { if (!uploaded) throw new Error('Please choose a photo of your signature first.'); s = uploaded; }
      if (!s) throw new Error('Your signature looks empty. Please try again.');
      sig = s;
      if ($('remember').checked) store(JSON.stringify(sig)); else store(null);
      SK.status(status);
      showPlace();
    } catch (e) { SK.status(status, 'err', e.message || SK.errText(e)); }
  });
  $('change-sig').addEventListener('click', function () { $('place').hidden = true; $('make').hidden = false; SK.step(2); sizePad(); });

  // ---------- Load PDF ----------
  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    try {
      file = f; buf = await f.arrayBuffer();
      var pdfjs = await SK.pdfjs();
      pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      pageNo = 1; items = []; selected = -1;
      $('file-info').innerHTML = ''; $('file-info').appendChild(SK.fileItem(f.name + ' · ' + pdf.numPages + (pdf.numPages === 1 ? ' page' : ' pages'), f.size)); $('file-info').hidden = false;
      fname.set(SK.baseName(f.name) + '-signed');
      $('drop').hidden = true; SK.step(2); SK.status(status);
      var saved = store();
      if (saved) { try { sig = JSON.parse(saved); $('remember').checked = true; } catch (e) { sig = null; } }
      if (sig) showPlace(); else { $('make').hidden = false; sizePad(); }
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  // ---------- Place ----------
  var stage = $('stage'), layer = $('layer'), pcv = $('page-cv'), vpCur = null;
  function showPlace() {
    $('make').hidden = true; $('place').hidden = false; SK.step(3);
    $('sig-chip').src = sig.src;
    drawPage();
  }
  async function drawPage() {
    var page = await pdf.getPage(pageNo);
    var vp1 = page.getViewport({ scale: 1 });
    var cssW = Math.min(stage.parentElement.clientWidth, 760);
    var scale = cssW / vp1.width, dpr = window.devicePixelRatio || 1;
    vpCur = page.getViewport({ scale: scale });
    var vp = page.getViewport({ scale: scale * dpr });
    pcv.width = Math.floor(vp.width); pcv.height = Math.floor(vp.height);
    pcv.style.width = vpCur.width + 'px'; pcv.style.height = vpCur.height + 'px';
    stage.style.width = vpCur.width + 'px'; stage.style.height = vpCur.height + 'px';
    var ctx = pcv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pcv.width, pcv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    $('pno').textContent = 'Page ' + pageNo + ' of ' + pdf.numPages;
    $('pprev').disabled = pageNo <= 1; $('pnext').disabled = pageNo >= pdf.numPages;
    renderItems();
  }
  $('pprev').addEventListener('click', function () { if (pageNo > 1) { pageNo--; selected = -1; drawPage(); } });
  $('pnext').addEventListener('click', function () { if (pageNo < pdf.numPages) { pageNo++; selected = -1; drawPage(); } });
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (!$('place').hidden) drawPage(); }, 200); });

  function renderItems() {
    layer.innerHTML = '';
    var W = vpCur.width, H = vpCur.height;
    items.forEach(function (it, i) {
      if (it.page !== pageNo) return;
      var el = document.createElement('div'); el.className = 'sign-item' + (i === selected ? ' sel' : '');
      el.style.left = it.x * W + 'px'; el.style.top = it.y * H + 'px'; el.style.width = it.w * W + 'px'; el.style.height = it.w * W * it.aspect + 'px';
      el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', (it.kind === 'date' ? 'Date' : 'Signature') + ' on page ' + it.page + '. Drag to move.');
      var im = document.createElement('img'); im.src = it.src; im.alt = ''; im.draggable = false; el.appendChild(im);
      var sx, sy, ox, oy, moved;
      el.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); e.preventDefault(); el.setPointerCapture(e.pointerId);
        sx = e.clientX; sy = e.clientY; ox = it.x; oy = it.y; moved = false;
        if (selected !== i) { selected = i; updateSel(); layer.querySelectorAll('.sign-item').forEach(function (n) { n.classList.remove('sel'); }); el.classList.add('sel'); }
        el.onpointermove = function (ev) {
          var dx = (ev.clientX - sx) / W, dy = (ev.clientY - sy) / H;
          if (Math.abs(dx) + Math.abs(dy) > 0.002) moved = true;
          it.x = clamp(ox + dx, 0, 1 - it.w); it.y = clamp(oy + dy, 0, 1 - it.w * it.aspect * W / H);
          el.style.left = it.x * W + 'px'; el.style.top = it.y * H + 'px';
        };
        el.onpointerup = el.onpointercancel = function () { el.onpointermove = null; };
      });
      el.addEventListener('keydown', function (e) {
        var step = 0.01, m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSel(); return; }
        if (!m) return; e.preventDefault(); selected = i;
        it.x = clamp(it.x + m[0], 0, 1 - it.w); it.y = clamp(it.y + m[1], 0, 1); renderItems();
      });
      layer.appendChild(el);
    });
    updateSel();
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function updateSel() {
    var it = items[selected];
    $('selbar').hidden = !it || it.page !== pageNo;
    if (it) $('sel-name').textContent = 'Selected: ' + (it.kind === 'date' ? 'date' : 'signature');
    var pagesUsed = {}; items.forEach(function (x) { pagesUsed[x.page] = 1; });
    var n = items.length;
    $('placed').textContent = n ? n + (n === 1 ? ' item' : ' items') + ' placed on page' + (Object.keys(pagesUsed).length > 1 ? 's ' : ' ') + Object.keys(pagesUsed).join(', ') : '';
    $('go').disabled = !items.some(function (x) { return x.kind === 'sig'; });
  }

  function addItem(kind, src, aspect, cx, cy) {
    var W = vpCur.width, H = vpCur.height;
    var w = kind === 'date' ? 0.2 : 0.3;
    var h = w * aspect * W / H;
    var x = cx === undefined ? 0.5 - w / 2 : cx - w / 2, y = cy === undefined ? 0.75 - h / 2 : cy - h / 2;
    items.push({ page: pageNo, kind: kind, src: src, aspect: aspect, x: clamp(x, 0, 1 - w), y: clamp(y, 0, 1 - h), w: w });
    selected = items.length - 1; renderItems();
    result.classList.remove('show');
  }
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.sign-item')) return;
    var r = stage.getBoundingClientRect();
    addItem('sig', sig.src, sig.aspect, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  $('add-sig').addEventListener('click', function () { addItem('sig', sig.src, sig.aspect); });
  $('add-date').addEventListener('click', function () {
    var t = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    var c = document.createElement('canvas'), x = c.getContext('2d'); x.font = '600 72px Arial, Helvetica, sans-serif';
    c.width = Math.ceil(x.measureText(t).width) + 20; c.height = 100;
    x = c.getContext('2d'); x.font = '600 72px Arial, Helvetica, sans-serif'; x.fillStyle = '#111'; x.textBaseline = 'middle'; x.fillText(t, 10, 52);
    var d = trim(c); addItem('date', d.src, d.aspect);
  });
  function resizeSel(k) {
    var it = items[selected]; if (!it) return;
    var cx = it.x + it.w / 2, nw = clamp(it.w * k, 0.05, 0.9);
    it.w = nw; it.x = clamp(cx - nw / 2, 0, 1 - nw); renderItems();
  }
  $('smaller').addEventListener('click', function () { resizeSel(0.85); });
  $('bigger').addEventListener('click', function () { resizeSel(1.18); });
  function removeSel() { if (selected < 0) return; items.splice(selected, 1); selected = -1; renderItems(); }
  $('remove').addEventListener('click', removeSel);

  // ---------- Save ----------
  function dataUrlBytes(u) { var b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  $('go').addEventListener('click', async function () {
    try {
      SK.status(status, 'info', 'Signing…');
      var PDFLib = await SK.pdfLib();
      var doc = await PDFLib.PDFDocument.load(buf.slice(0));
      var cache = {};
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var jsPage = await pdf.getPage(it.page);
        var vp = jsPage.getViewport({ scale: 1 }); // 1 CSS px = 1 PDF point, rotation included
        var vw = vp.width, vh = vp.height;
        var wPt = it.w * vw, hPt = it.w * it.aspect * vw;
        var bl = vp.convertToPdfPoint(it.x * vw, it.y * vh + hPt); // bottom-left as the reader sees it
        if (!cache[it.src]) cache[it.src] = await doc.embedPng(dataUrlBytes(it.src));
        doc.getPage(it.page - 1).drawImage(cache[it.src], { x: bl[0], y: bl[1], width: wPt, height: hPt, rotate: PDFLib.degrees(jsPage.rotate || 0) });
      }
      outBlob = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
      var first = Math.min.apply(null, items.map(function (x) { return x.page; }));
      var pdfjs = await SK.pdfjs(), op = await pdfjs.getDocument({ data: await outBlob.arrayBuffer() }).promise;
      var pg = await op.getPage(first), v0 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: 520 / Math.max(v0.width, v0.height) });
      var c = document.createElement('canvas'); c.width = v.width; c.height = v.height;
      await pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
      $('out-img').src = c.toDataURL('image/jpeg', 0.85); $('out-img').hidden = false;
      $('out-meta').textContent = 'Signed ' + items.filter(function (x) { return x.kind === 'sig'; }).length + ' place(s) · ' + op.numPages + ' pages · ' + SK.bytes(outBlob.size) + ' · showing page ' + first;
      op.destroy();
      SK.status(status); result.classList.add('show'); $('dl').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });
  $('dl').addEventListener('click', function () { if (outBlob) SK.download(outBlob, fname.get()); });
  $('back-edit').addEventListener('click', function () { result.classList.remove('show'); stage.scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  window.__skSign = { items: function () { return items; } };
})();
