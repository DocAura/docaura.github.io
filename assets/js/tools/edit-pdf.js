(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result');
  var MODE = $('editor').getAttribute('data-mode'); // 'edit' or 'fill'
  var file = null, buf = null, pdf = null, libDoc = null, pageNo = 1, outBlob = null;
  var items = [];       // {page, kind, x, y, w, h, text, size, color, src, aspect}
  var fields = [];      // {name, type, page, x, y, w, h, value, options, multiline, widgetIndex}
  var formVals = {};    // field name -> value (string, bool)
  var selected = -1, vp = null, scale = 1;
  var fname = SK.nameField($('out-btns'), '.pdf');
  var getTool = SK.choices($('tool'), function (t) {
    if (t === 'img') $('img-in').click();
    if (t === 'sig') {
      if (mySig) {
        SK.status(status, 'info', 'Tap the page to add your saved signature. ');
        var b = document.createElement('button'); b.type = 'button'; b.className = 'link-btn'; b.textContent = 'Draw a new one';
        b.addEventListener('click', function () { mySig = null; SK.status(status); openSig(); });
        status.appendChild(b);
      } else SK.status(status, 'info', 'Tap the page where you want to sign.');
    } else if (status.classList.contains('info')) SK.status(status);
  });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- Load ----------
  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    try {
      file = f; buf = await f.arrayBuffer();
      SK.status(status, 'info', 'Opening your PDF…');
      var pdfjs = await SK.pdfjs(), PDFLib = await SK.pdfLib();
      pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      try { libDoc = await PDFLib.PDFDocument.load(buf.slice(0)); } catch (e) { libDoc = null; }
      items = []; fields = []; formVals = {}; selected = -1; pageNo = 1;
      await readFields(PDFLib);
      fname.set(SK.baseName(f.name) + (MODE === 'fill' ? '-filled' : '-edited'));
      $('drop').hidden = true; $('work').hidden = false; SK.step(2); SK.status(status);
      var note = $('form-note');
      if (fields.length) {
        note.textContent = 'This form has ' + fields.length + ' fillable ' + (fields.length === 1 ? 'box' : 'boxes') + ' — they are light blue. Tap one and type.';
        note.hidden = false; $('flat-wrap').hidden = false;
      } else if (MODE === 'fill') {
        note.textContent = 'This form has no fillable boxes. No problem — choose “Text”, tap where you want to write, and type.';
        note.hidden = false;
      } else note.hidden = true;
      await drawPage();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  async function readFields(PDFLib) {
    if (!libDoc) return;
    var form; try { form = libDoc.getForm(); } catch (e) { return; }
    var pages = libDoc.getPages(), refIndex = new Map();
    pages.forEach(function (p, i) { refIndex.set(p.ref.toString(), i); });
    var all = form.getFields();
    for (var fi = 0; fi < all.length; fi++) {
      var fld = all[fi], name = fld.getName(), type = null, value = '', options = null, multiline = false;
      if (fld instanceof PDFLib.PDFTextField) { type = 'text'; value = fld.getText() || ''; try { multiline = fld.isMultiline(); } catch (e) {} }
      else if (fld instanceof PDFLib.PDFCheckBox) { type = 'check'; value = fld.isChecked(); }
      else if (fld instanceof PDFLib.PDFRadioGroup) { type = 'radio'; value = fld.getSelected() || ''; options = fld.getOptions(); }
      else if (fld instanceof PDFLib.PDFDropdown) { type = 'select'; value = (fld.getSelected() || [])[0] || ''; options = fld.getOptions(); }
      else continue;
      try { if (fld.isReadOnly()) continue; } catch (e) {}
      formVals[name] = value;
      var widgets = fld.acroField.getWidgets();
      for (var wi = 0; wi < widgets.length; wi++) {
        var wd = widgets[wi], pref = wd.P(), pi = -1;
        if (pref) pi = refIndex.has(pref.toString()) ? refIndex.get(pref.toString()) : -1;
        if (pi < 0) { // find the page that lists this widget
          for (var k = 0; k < pages.length && pi < 0; k++) {
            var annots = pages[k].node.Annots(); if (!annots) continue;
            for (var a = 0; a < annots.size(); a++) { if (annots.get(a) === wd.dict || libDoc.context.lookup(annots.get(a)) === wd.dict) { pi = k; break; } }
          }
        }
        if (pi < 0) continue;
        var r = wd.getRectangle();
        fields.push({ name: name, type: type, page: pi + 1, rect: [r.x, r.y, r.x + r.width, r.y + r.height], options: options, multiline: multiline,
          radioValue: type === 'radio' && options ? options[wi] : null });
      }
    }
  }

  // ---------- Render page ----------
  var stage = $('stage'), layer = $('layer'), fieldLayer = $('fields'), cv = $('page-cv');
  async function drawPage() {
    var page = await pdf.getPage(pageNo);
    var vp1 = page.getViewport({ scale: 1 });
    var cssW = Math.min(stage.parentElement.clientWidth, 820);
    scale = cssW / vp1.width;
    vp = page.getViewport({ scale: scale });
    var dpr = window.devicePixelRatio || 1, vpr = page.getViewport({ scale: scale * dpr });
    cv.width = Math.floor(vpr.width); cv.height = Math.floor(vpr.height);
    cv.style.width = vp.width + 'px'; cv.style.height = vp.height + 'px';
    stage.style.width = vp.width + 'px'; stage.style.height = vp.height + 'px';
    var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vpr }).promise; // form boxes are drawn by our own inputs
    $('pno').textContent = 'Page ' + pageNo + ' of ' + pdf.numPages;
    $('pprev').disabled = pageNo <= 1; $('pnext').disabled = pageNo >= pdf.numPages;
    renderFields(); renderItems();
  }
  $('pprev').addEventListener('click', function () { if (pageNo > 1) { pageNo--; selected = -1; drawPage(); } });
  $('pnext').addEventListener('click', function () { if (pageNo < pdf.numPages) { pageNo++; selected = -1; drawPage(); } });
  // Redraw on rotation / window width change, but never while typing on the page (it would close the keyboard)
  var redrawLater = false;
  SK.onWidthChange(function () {
    if ($('work').hidden) return;
    if (stage.contains(document.activeElement)) { redrawLater = true; return; }
    drawPage();
  });
  stage.addEventListener('focusout', function () {
    setTimeout(function () { if (redrawLater && !stage.contains(document.activeElement)) { redrawLater = false; drawPage(); } }, 300);
  });

  function renderFields() {
    fieldLayer.innerHTML = '';
    fields.forEach(function (f) {
      if (f.page !== pageNo) return;
      var r = vp.convertToViewportRectangle(f.rect);
      var x = Math.min(r[0], r[2]), y = Math.min(r[1], r[3]), w = Math.abs(r[2] - r[0]), h = Math.abs(r[3] - r[1]);
      var el;
      if (f.type === 'text') {
        el = document.createElement(f.multiline ? 'textarea' : 'input');
        el.value = formVals[f.name] || '';
        el.addEventListener('input', function () { formVals[f.name] = el.value; syncSame(f.name, el); });
        el.style.fontSize = Math.max(9, Math.min(h * 0.62, 14 * scale)) + 'px';
      } else if (f.type === 'check' || f.type === 'radio') {
        el = document.createElement('input'); el.type = f.type === 'check' ? 'checkbox' : 'radio';
        if (f.type === 'radio') el.name = 'r-' + f.name;
        el.checked = f.type === 'check' ? !!formVals[f.name] : formVals[f.name] === f.radioValue;
        el.addEventListener('change', function () { formVals[f.name] = f.type === 'check' ? el.checked : f.radioValue; });
        var s = Math.min(w, h); x += (w - s) / 2; y += (h - s) / 2; w = h = s;
      } else {
        el = document.createElement('select');
        (f.options || []).forEach(function (o) { var op = document.createElement('option'); op.value = op.textContent = o; el.appendChild(op); });
        el.value = formVals[f.name] || '';
        el.addEventListener('change', function () { formVals[f.name] = el.value; });
        el.style.fontSize = Math.max(9, h * 0.6) + 'px';
      }
      el.className = 'ed-field'; el.setAttribute('aria-label', f.name); el.setAttribute('data-field', f.name);
      el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px';
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      fieldLayer.appendChild(el);
    });
  }
  function syncSame(name, src) { fieldLayer.querySelectorAll('[data-field]').forEach(function (n) { if (n !== src && n.getAttribute('data-field') === name) n.value = src.value; }); }

  // ---------- Items ----------
  function markImage(kind, color) {
    var c = document.createElement('canvas'); c.width = c.height = 120; var x = c.getContext('2d');
    x.strokeStyle = color; x.lineWidth = 16; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
    if (kind === 'tick') { x.moveTo(18, 64); x.lineTo(48, 94); x.lineTo(104, 24); }
    else { x.moveTo(24, 24); x.lineTo(96, 96); x.moveTo(96, 24); x.lineTo(24, 96); }
    x.stroke(); return c.toDataURL('image/png');
  }
  function addItem(kind, fx, fy, extra) {
    var W = vp.width, H = vp.height, it = { page: pageNo, kind: kind };
    if (kind === 'text') { Object.assign(it, { x: fx, y: fy - 0.012, text: '', size: 12, color: '#111111' }); }
    else if (kind === 'tick' || kind === 'cross') { var s = 18 / (W / scale); Object.assign(it, { x: fx - s / 2, y: fy - s / 2 * W / H, w: s, aspect: 1, color: '#111111', src: markImage(kind, '#111111') }); }
    else if (kind === 'white' || kind === 'hl') { Object.assign(it, { x: fx - 0.1, y: fy - 0.012, w: 0.2, h: 0.024 }); }
    else if (kind === 'img') { Object.assign(it, { x: fx - extra.w / 2, y: fy - extra.w * extra.aspect * W / H / 2, w: extra.w, aspect: extra.aspect, src: extra.src }); }
    it.x = clamp(it.x, 0, 0.98); it.y = clamp(it.y, 0, 0.98);
    items.push(it); selected = items.length - 1; renderItems();
    if (kind === 'text') { var t = layer.querySelector('.ed-item.sel .ed-text'); if (t) t.focus(); }
    result.classList.remove('show');
  }
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.ed-item') || e.target.closest('.ed-field')) return;
    if (selected >= 0) {
      var ae = document.activeElement;
      if (ae && layer.contains(ae)) ae.blur();
      selected = -1; renderItems(); return;
    }
    var r = stage.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    var t = getTool();
    if (t === 'img') { if (pendingImg) addItem('img', fx, fy, pendingImg); else $('img-in').click(); return; }
    if (t === 'sig') {
      if (mySig) addItem('img', fx, fy, { src: mySig.src, aspect: mySig.aspect, w: 0.24 });
      else { sigAt = [fx, fy]; openSig(); }
      return;
    }
    e.preventDefault();
    if (t === 'date') {
      addItem('text', fx, fy);
      var it = items[items.length - 1];
      it.text = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
      renderItems();
      return;
    }
    addItem(t, fx, fy);
  });

  // ---------- Signature (shared with the Sign PDF tool) ----------
  var SIGKEY = 'sk-sign-v1', mySig = null, sigAt = null;
  try { mySig = JSON.parse(localStorage.getItem(SIGKEY)); } catch (e) { mySig = null; }
  var sdlg = $('sig-dlg'), spad = $('sig-pad'), sctx = spad.getContext('2d'), sInk = false, sLast = null, sDown = false;
  function openSig() {
    if (sdlg.showModal) sdlg.showModal(); else sdlg.setAttribute('open', '');
    var r = spad.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    spad.width = Math.round(r.width * dpr); spad.height = Math.round(r.height * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.lineCap = sctx.lineJoin = 'round'; sctx.strokeStyle = sctx.fillStyle = '#111'; sInk = false;
  }
  function closeSig() { if (sdlg.close) sdlg.close(); else sdlg.removeAttribute('open'); }
  $('sig-close').addEventListener('click', closeSig);
  $('sig-clear').addEventListener('click', function () { sctx.clearRect(0, 0, spad.width, spad.height); sInk = false; });
  function sp(e) { var r = spad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  spad.addEventListener('pointerdown', function (e) { e.preventDefault(); spad.setPointerCapture(e.pointerId); sDown = true; sLast = sp(e); sctx.beginPath(); sctx.arc(sLast.x, sLast.y, 1.4, 0, 7); sctx.fill(); sInk = true; });
  spad.addEventListener('pointermove', function (e) {
    if (!sDown) return; var q = sp(e), d = Math.hypot(q.x - sLast.x, q.y - sLast.y);
    sctx.lineWidth = Math.max(1.8, Math.min(3.6, 4.2 - d * 0.12));
    sctx.beginPath(); sctx.moveTo(sLast.x, sLast.y); sctx.quadraticCurveTo(sLast.x, sLast.y, (sLast.x + q.x) / 2, (sLast.y + q.y) / 2); sctx.lineTo(q.x, q.y); sctx.stroke(); sLast = q;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { spad.addEventListener(t, function () { sDown = false; }); });
  $('sig-use').addEventListener('click', function () {
    if (!sInk) return;
    var w = spad.width, h = spad.height, d = sctx.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    var o = document.createElement('canvas'); o.width = x1 - x0 + 9; o.height = y1 - y0 + 9;
    o.getContext('2d').drawImage(spad, x0 - 4, y0 - 4, o.width, o.height, 0, 0, o.width, o.height);
    mySig = { src: o.toDataURL('image/png'), aspect: o.height / o.width };
    if ($('sig-remember').checked) { try { localStorage.setItem(SIGKEY, JSON.stringify(mySig)); } catch (e) {} }
    closeSig();
    var at = sigAt || [0.5, 0.8]; sigAt = null;
    addItem('img', at[0], at[1], { src: mySig.src, aspect: mySig.aspect, w: 0.24 });
  });
  var pendingImg = null;
  $('img-in').addEventListener('change', async function () {
    var f = this.files[0]; this.value = '';
    if (!f) return;
    try {
      var img = await SK.fileToImage(f), c = SK.drawRotated(img, 0, 1600);
      var png = /png|webp|gif/i.test(f.type);
      pendingImg = { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9), aspect: c.height / c.width, w: 0.3 };
      addItem('img', 0.5, 0.4, pendingImg);
      SK.status(status, 'info', 'Picture added. Drag it into place. Tap the page to add it again.');
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  function heightFrac(it) { return it.h !== undefined ? it.h : it.w * it.aspect * vp.width / vp.height; }
  // Put the caret at the end of a text box
  function caretEnd(t) {
    try { var r = document.createRange(), s = window.getSelection(); r.selectNodeContents(t); r.collapse(false); s.removeAllRanges(); s.addRange(r); } catch (e) {}
  }
  function renderItems() {
    // If the person is typing in a text box, keep that box focused after the redraw
    // (rebuilding the boxes would otherwise drop focus and close the phone keyboard).
    var ae = document.activeElement, typingIn = ae && layer.contains(ae) && ae._it ? ae._it : null;
    layer.innerHTML = '';
    var W = vp.width, H = vp.height;
    items.forEach(function (it, i) {
      if (it.page !== pageNo) return;
      var el = document.createElement('div');
      el.className = 'ed-item ' + it.kind + (i === selected ? ' sel' : '');
      el.style.left = it.x * W + 'px'; el.style.top = it.y * H + 'px';
      if (it.kind === 'text') {
        var t = document.createElement('div'); t.className = 'ed-text'; t.contentEditable = 'true'; t.spellcheck = true;
        t.setAttribute('aria-label', 'Text box'); t.textContent = it.text; t._it = it;
        t.style.fontSize = it.size * scale + 'px'; t.style.color = it.color;
        t.addEventListener('input', function () { it.text = t.innerText.replace(/\n$/, ''); });
        t.addEventListener('focus', function () { if (selected !== i) { selected = i; markSel(); } });
        t.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (selected !== i) { selected = i; markSel(); } });
        t.addEventListener('blur', function () { if (!it.text.trim()) { setTimeout(function () { var idx = items.indexOf(it), a = document.activeElement; if (idx >= 0 && !it.text.trim() && !(a && a._it === it)) { items.splice(idx, 1); if (selected === idx) selected = -1; renderItems(); } }, 150); } });
        el.appendChild(t);
        // Finger-sized tap area around the (often tiny) text box: tapping near it starts typing in it
        el.addEventListener('pointerdown', function (e) {
          if (e.target !== el) return;
          e.preventDefault();
          if (selected !== i) { selected = i; markSel(); }
          t.focus(); caretEnd(t);
        });
        var g = document.createElement('span'); g.className = 'grip'; g.setAttribute('aria-hidden', 'true');
        g.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>';
        dragMove(g, it, el, i); el.appendChild(g);
      } else {
        el.style.width = it.w * W + 'px'; el.style.height = heightFrac(it) * H + 'px';
        var inner = document.createElement(it.src ? 'img' : 'div');
        if (it.src) { inner.src = it.src; inner.alt = ''; inner.draggable = false; } else inner.className = it.kind === 'white' ? 'ed-white' : 'ed-hl';
        el.appendChild(inner);
        dragMove(el, it, el, i);
        var rs = document.createElement('span'); rs.className = 'rs'; rs.setAttribute('aria-hidden', 'true');
        dragResize(rs, it, el); el.appendChild(rs);
      }
      layer.appendChild(el);
    });
    if (typingIn) {
      var nt = Array.prototype.find.call(layer.querySelectorAll('.ed-text'), function (n) { return n._it === typingIn; });
      if (nt) { nt.focus(); caretEnd(nt); }
    }
    updateBar();
  }
  // Toolbar buttons (bigger/smaller/colour) must not steal focus from the text box, or the keyboard closes
  $('selbar').addEventListener('pointerdown', function (e) { if (!e.target.closest('input, select, textarea')) e.preventDefault(); });
  function markSel() { layer.querySelectorAll('.ed-item').forEach(function (n) { n.classList.remove('sel'); }); var n = layer.querySelectorAll('.ed-item')[items.filter(function (x, k) { return x.page === pageNo && k < selected; }).length]; if (n) n.classList.add('sel'); updateBar(); }
  function dragMove(handle, it, el, i) {
    handle.addEventListener('pointerdown', function (e) {
      e.stopPropagation(); e.preventDefault(); handle.setPointerCapture(e.pointerId);
      if (selected !== i) { selected = i; markSel(); }
      var sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y, W = vp.width, H = vp.height;
      handle.onpointermove = function (ev) {
        it.x = clamp(ox + (ev.clientX - sx) / W, 0, 0.99); it.y = clamp(oy + (ev.clientY - sy) / H, 0, 0.99);
        el.style.left = it.x * W + 'px'; el.style.top = it.y * H + 'px';
      };
      handle.onpointerup = handle.onpointercancel = function () { handle.onpointermove = null; };
    });
  }
  function dragResize(handle, it, el) {
    handle.addEventListener('pointerdown', function (e) {
      e.stopPropagation(); e.preventDefault(); handle.setPointerCapture(e.pointerId);
      var sx = e.clientX, sy = e.clientY, ow = it.w, oh = heightFrac(it), W = vp.width, H = vp.height;
      handle.onpointermove = function (ev) {
        it.w = clamp(ow + (ev.clientX - sx) / W, 0.01, 1 - it.x);
        if (it.h !== undefined) it.h = clamp(oh + (ev.clientY - sy) / H, 0.006, 1 - it.y);
        el.style.width = it.w * W + 'px'; el.style.height = heightFrac(it) * H + 'px';
      };
      handle.onpointerup = handle.onpointercancel = function () { handle.onpointermove = null; };
    });
  }
  function updateBar() {
    var it = items[selected], on = it && it.page === pageNo;
    $('selbar').hidden = !on;
    if (!on) return;
    var names = { text: 'text', tick: 'tick', cross: 'cross', white: 'white-out', hl: 'highlight', img: 'picture' };
    $('sel-name').textContent = 'Selected: ' + names[it.kind];
    $('text-ctrls').hidden = it.kind !== 'text' && it.kind !== 'tick' && it.kind !== 'cross';
    $('text-ctrls').style.display = $('text-ctrls').hidden ? 'none' : 'contents';
    $('t-smaller').style.display = $('t-bigger').style.display = it.kind === 'text' ? '' : 'none';
    $('size-ctrls').style.display = it.kind === 'text' ? 'none' : 'contents';
  }
  $('t-smaller').addEventListener('click', function () { var it = items[selected]; if (it) { it.size = Math.max(6, it.size - 2); renderItems(); } });
  $('t-bigger').addEventListener('click', function () { var it = items[selected]; if (it) { it.size = Math.min(72, it.size + 2); renderItems(); } });
  document.querySelectorAll('[data-color]').forEach(function (b) {
    b.addEventListener('click', function () {
      var it = items[selected]; if (!it) return;
      it.color = b.getAttribute('data-color');
      if (it.kind === 'tick' || it.kind === 'cross') it.src = markImage(it.kind, it.color);
      renderItems();
    });
  });
  function resizeSel(k) { var it = items[selected]; if (!it) return; it.w = clamp(it.w * k, 0.01, 1); if (it.h !== undefined) it.h = clamp(it.h * k, 0.005, 1); renderItems(); }
  $('i-smaller').addEventListener('click', function () { resizeSel(0.85); });
  $('i-bigger').addEventListener('click', function () { resizeSel(1.18); });
  $('del').addEventListener('click', function () { if (selected >= 0) { items.splice(selected, 1); selected = -1; renderItems(); } });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Delete') && selected >= 0 && !(document.activeElement && document.activeElement.isContentEditable)) { items.splice(selected, 1); selected = -1; renderItems(); }
  });

  // ---------- Save ----------
  function hex(c) { return [parseInt(c.substr(1, 2), 16) / 255, parseInt(c.substr(3, 2), 16) / 255, parseInt(c.substr(5, 2), 16) / 255]; }
  function bytes(u) { var b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  var WINANSI = /^[\x20-\x7E -ÿ–—‘’“”•…€]*$/;
  function lineImage(text, size, color) { // any language: draw the line as a sharp picture
    var px = size * 6, c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = px + 'px Helvetica, Arial, "Noto Sans", sans-serif';
    c.width = Math.max(4, Math.ceil(x.measureText(text).width) + 4); c.height = Math.ceil(px * 1.25);
    x = c.getContext('2d'); x.font = px + 'px Helvetica, Arial, "Noto Sans", sans-serif'; x.fillStyle = color; x.textBaseline = 'alphabetic';
    x.fillText(text, 0, px * 0.95);
    return { src: c.toDataURL('image/png'), wPt: c.width / 6, hPt: c.height / 6 };
  }

  $('go').addEventListener('click', async function () {
    try {
      SK.status(status, 'info', 'Saving…');
      var PDFLib = await SK.pdfLib();
      var doc = await PDFLib.PDFDocument.load(buf.slice(0));
      var font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      // Form answers
      if (fields.length) {
        var form = doc.getForm(), badFont = false;
        Object.keys(formVals).forEach(function (name) {
          var v = formVals[name], fld;
          try { fld = form.getField(name); } catch (e) { return; }
          try {
            if (fld instanceof PDFLib.PDFTextField) { fld.setText(v || undefined); if (v && !WINANSI.test(String(v).replace(/[\r\n\t]/g, ''))) badFont = true; }
            else if (fld instanceof PDFLib.PDFCheckBox) { v ? fld.check() : fld.uncheck(); }
            else if (fld instanceof PDFLib.PDFRadioGroup) { if (v) fld.select(v); }
            else if (fld instanceof PDFLib.PDFDropdown) { if (v) fld.select(v); }
          } catch (e) { /* keep going with other fields */ }
        });
        try { form.updateFieldAppearances(font); } catch (e) { badFont = true; }
        if ($('flatten').checked && !badFont) { try { form.flatten(); } catch (e) {} }
      }
      // Added items
      var cache = {};
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var jp = await pdf.getPage(it.page), v1 = jp.getViewport({ scale: 1 }), rot = PDFLib.degrees(jp.rotate || 0);
        var page = doc.getPage(it.page - 1), VW = v1.width, VH = v1.height;
        var pt = function (vx, vy) { return v1.convertToPdfPoint(vx, vy); };
        if (it.kind === 'text') {
          if (!it.text.trim()) continue;
          var lines = it.text.split('\n'), lh = it.size * 1.2;
          for (var L = 0; L < lines.length; L++) {
            var line = lines[L]; if (!line) continue;
            var vx = it.x * VW, top = it.y * VH + L * lh;
            if (WINANSI.test(line)) {
              var p = pt(vx, top + it.size * 0.945);
              var c = hex(it.color);
              page.drawText(line, { x: p[0], y: p[1], size: it.size, font: font, color: PDFLib.rgb(c[0], c[1], c[2]), rotate: rot });
            } else {
              var im = lineImage(line, it.size, it.color);
              var emb = await doc.embedPng(bytes(im.src));
              var p2 = pt(vx, top + im.hPt + it.size * 0.02);
              page.drawImage(emb, { x: p2[0], y: p2[1], width: im.wPt, height: im.hPt, rotate: rot });
            }
          }
        } else if (it.kind === 'white' || it.kind === 'hl') {
          var bl = pt(it.x * VW, (it.y + it.h) * VH);
          page.drawRectangle({ x: bl[0], y: bl[1], width: it.w * VW, height: it.h * VH, rotate: rot,
            color: it.kind === 'white' ? PDFLib.rgb(1, 1, 1) : PDFLib.rgb(1, 0.9, 0),
            opacity: it.kind === 'white' ? 1 : 0.45, blendMode: it.kind === 'hl' ? PDFLib.BlendMode.Multiply : undefined, borderWidth: 0 });
        } else {
          var hPt = it.w * it.aspect * VW;
          var bl2 = pt(it.x * VW, it.y * VH + hPt);
          if (!cache[it.src]) cache[it.src] = /^data:image\/png/.test(it.src) ? await doc.embedPng(bytes(it.src)) : await doc.embedJpg(bytes(it.src));
          page.drawImage(cache[it.src], { x: bl2[0], y: bl2[1], width: it.w * VW, height: hPt, rotate: rot });
        }
      }
      outBlob = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
      // Preview: the first page that changed, with form answers drawn
      var pdfjs = await SK.pdfjs(), op = await pdfjs.getDocument({ data: await outBlob.arrayBuffer() }).promise;
      var show = items.length ? Math.min.apply(null, items.map(function (x) { return x.page; })) : (fields[0] ? fields[0].page : 1);
      var pg = await op.getPage(show), v0 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: 560 / Math.max(v0.width, v0.height) });
      var cc = document.createElement('canvas'); cc.width = v.width; cc.height = v.height;
      await pg.render({ canvasContext: cc.getContext('2d'), viewport: v, annotationMode: pdfjs.AnnotationMode.ENABLE }).promise;
      $('out-img').src = cc.toDataURL('image/jpeg', 0.85); $('out-img').hidden = false;
      var filled = Object.keys(formVals).filter(function (k) { return formVals[k]; }).length;
      $('out-meta').textContent = (fields.length ? filled + ' form answers · ' : '') + items.filter(function (x) { return x.kind !== 'text' || x.text.trim(); }).length + ' additions · ' + op.numPages + ' pages · ' + SK.bytes(outBlob.size) + ' · showing page ' + show;
      op.destroy();
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });
  $('dl').addEventListener('click', function () { if (outBlob) SK.download(outBlob, fname.get()); });
  $('back-edit').addEventListener('click', function () { result.classList.remove('show'); stage.scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  window.__skEdit = { items: function () { return items; }, fields: function () { return fields; }, vals: function () { return formVals; } };
})();
