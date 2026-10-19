(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), grid = $('grid');
  var file = null, buf = null, pages = [], original = [], outBlob = null;
  var fname = SK.nameField($('out-btns'), '.pdf');
  var svg = function (d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B2D8F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };
  var ICON = { turn: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5', left: 'm15 6-6 6 6 6', right: 'm9 6 6 6-6 6', del: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14' };

  function render() {
    grid.innerHTML = '';
    pages.forEach(function (p, i) {
      var card = document.createElement('div'); card.className = 'org-card';
      var pv = document.createElement('div'); pv.className = 'pv';
      var im = document.createElement('img'); im.alt = ''; im.src = p.thumb || '';
      im.style.transform = 'rotate(' + p.rot + 'deg)';
      pv.appendChild(im); card.appendChild(pv);
      var lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = (i + 1) + (p.src !== i ? '  (was ' + (p.src + 1) + ')' : '');
      card.appendChild(lbl);
      var acts = document.createElement('div'); acts.className = 'acts';
      function btn(label, icon, dis, fn) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn';
        b.setAttribute('aria-label', label + ' page ' + (i + 1)); b.innerHTML = svg(ICON[icon]); b.disabled = dis;
        b.addEventListener('click', fn); acts.appendChild(b);
      }
      btn('Turn', 'turn', false, function () { p.rot = (p.rot + 90) % 360; render(); });
      btn('Move earlier', 'left', i === 0, function () { pages.splice(i - 1, 0, pages.splice(i, 1)[0]); render(); });
      btn('Move later', 'right', i === pages.length - 1, function () { pages.splice(i + 1, 0, pages.splice(i, 1)[0]); render(); });
      btn('Remove', 'del', pages.length === 1, function () { pages.splice(i, 1); render(); });
      card.appendChild(acts);
      grid.appendChild(card);
    });
    $('count').textContent = pages.length + (pages.length === 1 ? ' page' : ' pages') + (pages.length !== original.length ? ' (removed ' + (original.length - pages.length) + ')' : '');
    result.classList.remove('show');
  }

  $('rot-all').addEventListener('click', function () { pages.forEach(function (p) { p.rot = (p.rot + 90) % 360; }); render(); });
  $('reset').addEventListener('click', function () { pages = original.map(function (p) { return Object.assign({}, p, { rot: 0 }); }); render(); });

  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    try {
      file = f; buf = await f.arrayBuffer();
      SK.status(status, 'info', 'Opening your PDF…');
      var pdfjs = await SK.pdfjs();
      var pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      original = [];
      for (var i = 0; i < pdf.numPages; i++) original.push({ src: i, rot: 0, thumb: '' });
      pages = original.map(function (p) { return Object.assign({}, p); });
      fname.set(SK.baseName(f.name) + '-fixed');
      $('drop').hidden = true; $('opts').hidden = false; SK.step(2); render(); SK.status(status);
      for (var k = 1; k <= pdf.numPages; k++) {
        var page = await pdf.getPage(k);
        var vp0 = page.getViewport({ scale: 1 });
        var vp = page.getViewport({ scale: 200 / Math.max(vp0.width, vp0.height) });
        var c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        var url = c.toDataURL('image/jpeg', 0.8);
        original[k - 1].thumb = url;
        pages.forEach(function (p) { if (p.src === k - 1) p.thumb = url; });
        var imgs = grid.querySelectorAll('.org-card img');
        pages.forEach(function (p, idx) { if (p.src === k - 1 && imgs[idx]) imgs[idx].src = url; });
        page.cleanup();
      }
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  $('go').addEventListener('click', async function () {
    try {
      SK.status(status, 'info', 'Saving…');
      var PDFLib = await SK.pdfLib();
      var src = await PDFLib.PDFDocument.load(buf.slice(0));
      var out = await PDFLib.PDFDocument.create();
      var copied = await out.copyPages(src, pages.map(function (p) { return p.src; }));
      copied.forEach(function (pg, i) {
        var cur = pg.getRotation().angle || 0;
        pg.setRotation(PDFLib.degrees((cur + pages[i].rot) % 360));
        out.addPage(pg);
      });
      outBlob = new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
      var n = await SK.pdfPreview(outBlob, $('out-img'));
      $('out-meta').textContent = n + (n === 1 ? ' page' : ' pages') + ' · ' + SK.bytes(outBlob.size);
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  $('dl').addEventListener('click', function () { if (outBlob) SK.download(outBlob, fname.get()); });
  $('again').addEventListener('click', function () {
    file = buf = outBlob = null; pages = []; original = []; grid.innerHTML = '';
    result.classList.remove('show'); $('opts').hidden = true; $('drop').hidden = false; SK.step(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
