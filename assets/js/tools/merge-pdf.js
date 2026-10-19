(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), go = $('go');
  var outBlob = null;

  var list = SK.fileList($('list'), function (items) {
    go.disabled = items.length < 2;
    $('need').hidden = items.length >= 2;
    $('drop-t').textContent = items.length ? 'Add more PDFs' : 'Tap here to choose PDFs';
    if (items.length) SK.step(2);
    result.classList.remove('show');
  });

  SK.drop($('drop'), function (files) {
    var bad = 0;
    files.forEach(function (f) { if (SK.isPdf(f)) list.items.push({ file: f }); else bad++; });
    if (bad) SK.status(status, 'err', bad + ' file(s) skipped because they are not PDFs.'); else SK.status(status);
    list.render();
  });

  go.addEventListener('click', async function () {
    go.disabled = true;
    try {
      var PDFLib = await SK.pdfLib();
      var out = await PDFLib.PDFDocument.create();
      var n = list.items.length, pages = 0;
      for (var i = 0; i < n; i++) {
        SK.status(status, 'info', 'Joining file ' + (i + 1) + ' of ' + n + '…', (i / n) * 100);
        var f = list.items[i].file;
        var src;
        try { src = await PDFLib.PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: false }); }
        catch (e) { throw new Error('“' + f.name + '” could not be opened. ' + SK.errText(e).replace('Sorry, something went wrong: ', '')); }
        var copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach(function (p) { out.addPage(p); });
        pages += copied.length;
      }
      outBlob = new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
      $('out-meta').textContent = n + ' files joined · ' + pages + ' pages · ' + SK.bytes(outBlob.size);
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) {
      SK.status(status, 'err', e.message.indexOf('“') === 0 ? e.message : SK.errText(e));
    }
    go.disabled = list.items.length < 2;
  });

  $('dl').addEventListener('click', function () { if (outBlob) SK.download(outBlob, 'joined.pdf'); });
  $('again').addEventListener('click', function () {
    list.items = []; list.render(); outBlob = null; SK.status(status); SK.step(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
