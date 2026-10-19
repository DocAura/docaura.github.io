(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), go = $('go');
  var outBlob = null;
  var fname = SK.nameField($('out-btns'), '.pdf');
  fname.set('joined');

  var list = SK.fileList($('list'), function (items) {
    go.disabled = items.length < 2;
    $('need').hidden = items.length >= 2;
    $('range-tip').hidden = !items.some(function (it) { return SK.isPdf(it.file); });
    $('drop-t').textContent = items.length ? 'Add more files' : 'Tap here to choose PDFs or photos';
    if (items.length) SK.step(2);
    result.classList.remove('show');
  }, {
    extra: function (li, it) {
      if (!SK.isPdf(it.file)) return;
      var inp = document.createElement('input');
      inp.className = 'input'; inp.placeholder = 'Pages: all'; inp.value = it.range || '';
      inp.setAttribute('aria-label', 'Pages to use from ' + it.file.name + ', for example 1-3, 5');
      inp.style.cssText = 'flex:0 1 130px;min-height:48px;padding:8px 12px;background:#fff;min-width:0';
      inp.addEventListener('input', function () { it.range = inp.value; });
      li.appendChild(inp);
    }
  });

  SK.drop($('drop'), function (files) {
    var bad = 0;
    files.forEach(function (f) {
      if (SK.isPdf(f)) list.items.push({ file: f, range: '' });
      else if (SK.isImage(f)) list.items.push({ file: f, thumb: SK.isHeic(f) ? null : URL.createObjectURL(f) });
      else bad++;
    });
    if (bad) SK.status(status, 'err', bad + ' file(s) skipped because they are not PDFs or photos.'); else SK.status(status);
    list.render();
  });

  function parseRange(s, total) {
    s = (s || '').trim();
    if (!s || /^all$/i.test(s)) return null;
    var out = [];
    s.split(/[,;\s]+/).forEach(function (part) {
      var m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return;
      var a = Number(m[1]), b = m[2] ? Number(m[2]) : a, step = a <= b ? 1 : -1;
      for (var i = a; step > 0 ? i <= b : i >= b; i += step) if (i >= 1 && i <= total) out.push(i - 1);
    });
    return out;
  }

  go.addEventListener('click', async function () {
    go.disabled = true; result.classList.remove('show');
    try {
      var PDFLib = await SK.pdfLib();
      var out = await PDFLib.PDFDocument.create();
      var n = list.items.length, pages = 0;
      for (var i = 0; i < n; i++) {
        SK.status(status, 'info', 'Joining file ' + (i + 1) + ' of ' + n + '…', (i / n) * 100);
        var it = list.items[i], f = it.file;
        if (SK.isPdf(f)) {
          var src;
          try { src = await PDFLib.PDFDocument.load(await f.arrayBuffer()); }
          catch (e) { throw new Error('“' + f.name + '” could not be opened. ' + SK.errText(e).replace('Sorry, something went wrong: ', '')); }
          var idx = parseRange(it.range, src.getPageCount());
          if (idx && !idx.length) throw new Error('“' + f.name + '”: the pages “' + it.range + '” do not exist. It has ' + src.getPageCount() + ' pages.');
          var copied = await out.copyPages(src, idx || src.getPageIndices());
          copied.forEach(function (p) { out.addPage(p); });
          pages += copied.length;
        } else {
          var img = await SK.fileToImage(f);
          var c = SK.drawRotated(img, 0, 2480);
          var jb = await SK.canvasToBlob(c, 'image/jpeg', 0.85);
          var em = await out.embedJpg(new Uint8Array(await jb.arrayBuffer()));
          var pw = 595.28, ph = 841.89; if (c.width > c.height) { pw = 841.89; ph = 595.28; }
          var s = Math.min((pw - 36) / c.width, (ph - 36) / c.height);
          out.addPage([pw, ph]).drawImage(em, { x: (pw - c.width * s) / 2, y: (ph - c.height * s) / 2, width: c.width * s, height: c.height * s });
          pages++;
        }
      }
      outBlob = new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
      await SK.pdfPreview(outBlob, $('out-img'));
      $('out-meta').textContent = n + ' files joined · ' + pages + ' pages · ' + SK.bytes(outBlob.size);
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) {
      SK.status(status, 'err', e.message.indexOf('“') === 0 ? e.message : SK.errText(e));
    }
    go.disabled = list.items.length < 2;
  });

  $('dl').addEventListener('click', function () { if (outBlob) SK.download(outBlob, fname.get()); });
  $('again').addEventListener('click', function () {
    list.items = []; list.render(); outBlob = null; SK.status(status); SK.step(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
