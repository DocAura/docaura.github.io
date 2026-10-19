(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), thumbs = $('thumbs');
  var file = null, buf = null, total = 0, picked = new Set(), btns = [];
  var tick = '<span class="tick"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>';

  function sync() {
    btns.forEach(function (b, i) { b.setAttribute('aria-pressed', picked.has(i) ? 'true' : 'false'); });
    var n = picked.size;
    $('count').textContent = n ? n + ' of ' + total + ' pages chosen' : 'Tap the pages you want to keep';
    $('go').disabled = $('each').disabled = n === 0;
    if (n) SK.step(2);
  }

  function parseRange(s) {
    var set = new Set();
    s.split(/[,;\s]+/).forEach(function (part) {
      var m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return;
      var a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
      if (a > b) { var t = a; a = b; b = t; }
      for (var i = Math.max(1, a); i <= Math.min(total, b); i++) set.add(i - 1);
    });
    return set;
  }
  $('range').addEventListener('input', function () { picked = parseRange(this.value); sync(); });
  $('all').addEventListener('click', function () { picked = new Set(btns.map(function (_, i) { return i; })); sync(); });
  $('none').addEventListener('click', function () { picked = new Set(); $('range').value = ''; sync(); });

  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    file = f; buf = await f.arrayBuffer(); result.classList.remove('show');
    try {
      SK.status(status, 'info', 'Opening your PDF…');
      var pdfjs = await SK.pdfjs();
      var pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      total = pdf.numPages; picked = new Set(); btns = []; thumbs.innerHTML = '';
      $('file-info').innerHTML = ''; $('file-info').appendChild(SK.fileItem(f.name + ' · ' + total + ' pages', f.size)); $('file-info').hidden = false;
      $('drop').hidden = true; $('opts').hidden = false;
      for (var i = 0; i < total; i++) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'page-thumb'; b.setAttribute('aria-pressed', 'false');
        b.innerHTML = tick + '<canvas aria-hidden="true"></canvas>Page ' + (i + 1);
        (function (idx) { b.addEventListener('click', function () { picked.has(idx) ? picked.delete(idx) : picked.add(idx); sync(); }); })(i);
        thumbs.appendChild(b); btns.push(b);
      }
      sync(); SK.status(status);
      // Draw small previews one by one
      for (var p = 1; p <= total; p++) {
        var page = await pdf.getPage(p);
        var vp0 = page.getViewport({ scale: 1 });
        var vp = page.getViewport({ scale: 220 / vp0.width });
        var c = btns[p - 1].querySelector('canvas');
        c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        page.cleanup();
      }
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  async function build(indices) {
    var PDFLib = await SK.pdfLib();
    var src = await PDFLib.PDFDocument.load(buf.slice(0));
    var out = await PDFLib.PDFDocument.create();
    var pages = await out.copyPages(src, indices);
    pages.forEach(function (p) { out.addPage(p); });
    return new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
  }
  function sorted() { return Array.from(picked).sort(function (a, b) { return a - b; }); }

  $('go').addEventListener('click', async function () {
    try {
      SK.status(status, 'info', 'Saving your pages…');
      var idx = sorted();
      var blob = await build(idx);
      showResult(idx.length + ' pages saved in one PDF · ' + SK.bytes(blob.size), [{ label: 'Download PDF', blob: blob, name: SK.baseName(file.name) + '-pages.pdf' }]);
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  $('each').addEventListener('click', async function () {
    try {
      var idx = sorted(), items = [];
      for (var k = 0; k < idx.length; k++) {
        SK.status(status, 'info', 'Saving page ' + (k + 1) + ' of ' + idx.length + '…', (k / idx.length) * 100);
        items.push({ label: 'Page ' + (idx[k] + 1), blob: await build([idx[k]]), name: SK.baseName(file.name) + '-page-' + (idx[k] + 1) + '.pdf' });
      }
      showResult('Tap each button to save that page:', items);
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  function showResult(text, items) {
    $('out-meta').textContent = text;
    var box = $('out-btns'); box.innerHTML = '';
    items.forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = items.length > 1 ? 'btn btn-light btn-small' : 'btn';
      b.textContent = it.label;
      b.addEventListener('click', function () { SK.download(it.blob, it.name); });
      box.appendChild(b);
    });
    var again = document.createElement('button'); again.type = 'button'; again.className = 'btn btn-light'; again.textContent = 'Choose different pages';
    again.addEventListener('click', function () { result.classList.remove('show'); thumbs.scrollIntoView({ behavior: 'smooth' }); });
    box.appendChild(again);
    SK.status(status); result.classList.add('show'); SK.step(3);
    box.querySelector('button').focus();
  }
})();
