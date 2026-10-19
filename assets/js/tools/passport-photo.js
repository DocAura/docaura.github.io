(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), canvas = $('crop'), box = $('crop-box'), zoom = $('zoom');
  var img = null, file = null;
  var mmW = 35, mmH = 45;
  var view = { w: 300, h: 386, base: 1, z: 1, ox: 0, oy: 0 }; // ox/oy: image top-left in view px
  var DPI = 300, outOne = null, outCanvas = null;

  var getPreset = SK.choices($('preset'), function (v) {
    $('custom-wrap').hidden = v !== 'custom';
    applyPreset();
  });
  ['cw', 'ch'].forEach(function (id) { $(id).addEventListener('input', applyPreset); });

  function applyPreset() {
    var v = getPreset();
    if (v === 'custom') { mmW = clamp(Number($('cw').value) || 30, 10, 100); mmH = clamp(Number($('ch').value) || 40, 10, 100); }
    else { var p = v.split('x'); mmW = Number(p[0]); mmH = Number(p[1]); }
    if (img) layout(true);
    result.classList.remove('show');
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function layout(reset) {
    var maxW = Math.min(340, box.parentElement.clientWidth - 8);
    view.w = Math.round(maxW);
    view.h = Math.round(maxW * mmH / mmW);
    if (view.h > 440) { view.h = 440; view.w = Math.round(440 * mmW / mmH); }
    var dpr = window.devicePixelRatio || 1;
    canvas.width = view.w * dpr; canvas.height = view.h * dpr;
    canvas.style.width = view.w + 'px'; canvas.style.height = view.h + 'px';
    view.base = Math.max(view.w / img.naturalWidth, view.h / img.naturalHeight);
    if (reset) {
      view.z = 1; zoom.value = 1;
      var s = view.base;
      view.ox = (view.w - img.naturalWidth * s) / 2;
      view.oy = (view.h - img.naturalHeight * s) / 2;
    }
    constrain(); draw();
  }

  function scale() { return view.base * view.z; }
  function constrain() {
    var s = scale(), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    view.ox = clamp(view.ox, view.w - iw, 0);
    view.oy = clamp(view.oy, view.h - ih, 0);
  }

  function draw() {
    var ctx = canvas.getContext('2d'), dpr = canvas.width / view.w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, view.w, view.h);
    var s = scale();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, view.ox, view.oy, img.naturalWidth * s, img.naturalHeight * s);
    // Face guide: oval for the head, line for the eyes
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    var cx = view.w / 2, cy = view.h * 0.44, rx = view.w * 0.3, ry = view.h * 0.31;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(59,45,143,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 2, ry + 2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function setZoom(z, cx, cy) {
    var old = scale();
    view.z = clamp(z, 1, 4); zoom.value = view.z;
    var s = scale();
    if (cx === undefined) { cx = view.w / 2; cy = view.h / 2; }
    view.ox = cx - (cx - view.ox) * s / old;
    view.oy = cy - (cy - view.oy) * s / old;
    constrain(); draw(); result.classList.remove('show');
  }
  zoom.addEventListener('input', function () { setZoom(Number(zoom.value)); });
  $('zin').addEventListener('click', function () { setZoom(view.z + 0.15); });
  $('zout').addEventListener('click', function () { setZoom(view.z - 0.15); });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = canvas.getBoundingClientRect();
    setZoom(view.z * (e.deltaY < 0 ? 1.08 : 0.93), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // Drag (mouse + touch) and two-finger pinch
  var pointers = new Map(), last = null, pinch0 = null;
  canvas.addEventListener('pointerdown', function (e) { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, e); last = e; if (pointers.size === 2) pinch0 = { d: dist(), z: view.z }; });
  canvas.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);
    if (pointers.size === 2 && pinch0) { setZoom(pinch0.z * dist() / pinch0.d); return; }
    if (last) { view.ox += e.clientX - last.clientX; view.oy += e.clientY - last.clientY; constrain(); draw(); result.classList.remove('show'); }
    last = e;
  });
  function up(e) { pointers.delete(e.pointerId); last = null; if (pointers.size < 2) pinch0 = null; }
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  function dist() { var p = Array.from(pointers.values()); return Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY) || 1; }
  // Keyboard: arrow keys move the photo
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', function (e) {
    var d = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (!d) return; e.preventDefault(); view.ox += d[0]; view.oy += d[1]; constrain(); draw();
  });
  window.addEventListener('resize', function () { if (img) layout(false); });

  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isImage(f)) { SK.status(status, 'err', 'Please choose a photo.'); return; }
    try {
      SK.status(status, 'info', 'Opening your photo…');
      img = await SK.fileToImage(f); file = f;
      $('drop').hidden = true; $('opts').hidden = false; SK.status(status); SK.step(2);
      layout(true);
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  function mmToPx(mm) { return Math.round(mm / 25.4 * DPI); }

  function renderPhoto() {
    var W = mmToPx(mmW), H = mmToPx(mmH);
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';
    var k = W / view.w, s = scale() * k;
    ctx.drawImage(img, view.ox * k, view.oy * k, img.naturalWidth * s, img.naturalHeight * s);
    return c;
  }

  // Tile photos on a sheet with 2 mm gaps and thin cut lines
  function sheet(sheetWmm, sheetHmm) {
    var SW = mmToPx(sheetWmm), SH = mmToPx(sheetHmm), pw = outCanvas.width, ph = outCanvas.height, gap = mmToPx(3);
    var cols = Math.floor((SW - gap) / (pw + gap)), rows = Math.floor((SH - gap) / (ph + gap));
    var c = document.createElement('canvas'); c.width = SW; c.height = SH;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SW, SH);
    var x0 = (SW - (cols * pw + (cols - 1) * gap)) / 2, y0 = (SH - (rows * ph + (rows - 1) * gap)) / 2;
    ctx.strokeStyle = '#BBBBBB'; ctx.lineWidth = 2;
    for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) {
      var x = x0 + q * (pw + gap), y = y0 + r * (ph + gap);
      ctx.drawImage(outCanvas, x, y); ctx.strokeRect(x - 1, y - 1, pw + 2, ph + 2);
    }
    return { canvas: c, count: rows * cols };
  }

  $('go').addEventListener('click', async function () {
    if (!img) return;
    outCanvas = renderPhoto();
    outOne = await SK.canvasToBlob(outCanvas, 'image/jpeg', 0.93);
    var o = $('out-img'); if (o.src) URL.revokeObjectURL(o.src); o.src = URL.createObjectURL(outOne);
    var s46 = sheet(152.4, 101.6);
    $('out-meta').textContent = mmW + ' × ' + mmH + ' mm · ' + outCanvas.width + ' × ' + outCanvas.height + ' px · ' + SK.bytes(outOne.size) +
      ' · the 4 × 6 sheet fits ' + s46.count + ' photos';
    result.classList.add('show'); SK.step(3); $('dl-one').focus();
  });

  $('dl-one').addEventListener('click', function () { if (outOne) SK.download(outOne, 'passport-photo-' + mmW + 'x' + mmH + 'mm.jpg'); });
  $('dl-46').addEventListener('click', async function () {
    var s = sheet(152.4, 101.6); // landscape 6 × 4 inch
    SK.download(await SK.canvasToBlob(s.canvas, 'image/jpeg', 0.93), 'passport-photos-4x6-sheet.jpg');
  });
  $('dl-a4').addEventListener('click', async function () {
    try {
      var s = sheet(210, 297);
      var jpg = await SK.canvasToBlob(s.canvas, 'image/jpeg', 0.93);
      var PDFLib = await SK.pdfLib();
      var doc = await PDFLib.PDFDocument.create();
      var im = await doc.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
      var p = doc.addPage([595.28, 841.89]);
      p.drawImage(im, { x: 0, y: 0, width: 595.28, height: 841.89 });
      SK.download(new Blob([await doc.save()], { type: 'application/pdf' }), 'passport-photos-A4.pdf');
      SK.status(status, 'info', 'Tip: when printing, choose “Actual size” or 100% so the photos are the correct size.');
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });
  $('adjust').addEventListener('click', function () { result.classList.remove('show'); SK.step(2); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
})();
