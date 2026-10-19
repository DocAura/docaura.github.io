(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), go = $('go');
  var outBlob = null;
  var SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
  var images = new Map(); // file -> decoded <img>

  var getSize = SK.choices($('pagesize'));
  var getLimit = SK.choices($('limit'));
  var getFilter = SK.choices($('filter'), function () { refreshThumbs(); });
  var fname = SK.nameField($('out-btns'), '.pdf');

  var list = SK.fileList($('list'), function (items) {
    $('opts').hidden = !items.length;
    $('drop-t').textContent = items.length ? 'Add more photos' : 'Tap here to choose photos';
    if (items.length) SK.step(2);
    result.classList.remove('show');
  }, { rotate: true });

  async function imgFor(file) {
    if (!images.has(file)) images.set(file, await SK.fileToImage(file));
    return images.get(file);
  }
  function process(img, rot, filter, maxSide) {
    var c = SK.drawRotated(img, rot || 0, maxSide);
    if (filter !== 'none') SK.cleanScan(c, filter);
    return c;
  }
  async function refreshThumbs() {
    var f = getFilter();
    for (var i = 0; i < list.items.length; i++) {
      var it = list.items[i];
      try {
        var img = await imgFor(it.file);
        var c = process(img, 0, f, 200);
        it.thumb = c.toDataURL('image/jpeg', 0.8);
      } catch (e) { it.thumb = null; }
    }
    list.render();
  }

  SK.drop($('drop'), async function (files) {
    var imgs = files.filter(SK.isImage);
    if (imgs.length < files.length) SK.status(status, 'err', (files.length - imgs.length) + ' file(s) skipped because they are not photos.');
    else SK.status(status, 'info', 'Opening your photos…');
    imgs.forEach(function (f) { list.items.push({ file: f, rot: 0 }); });
    if (list.items.length && !fname._set) { fname.set(SK.baseName(list.items[0].file.name)); fname._set = true; }
    list.render();
    await refreshThumbs();
    if (status.classList.contains('info')) SK.status(status);
  });

  // Quality ladder used when a size limit is chosen: [max pixels on the long side, JPEG quality]
  var LADDER = [[2480, 0.85], [2000, 0.75], [1700, 0.7], [1400, 0.62], [1200, 0.55], [1000, 0.5], [850, 0.45], [700, 0.4]];

  async function buildPdf(maxSide, q, onProgress) {
    var PDFLib = await SK.pdfLib();
    var doc = await PDFLib.PDFDocument.create();
    var size = getSize(), filter = getFilter(), margin = size === 'fit' ? 0 : 18;
    var n = list.items.length;
    for (var i = 0; i < n; i++) {
      onProgress(i, n);
      var it = list.items[i];
      var c = process(await imgFor(it.file), it.rot, filter, maxSide);
      var blob = await SK.canvasToBlob(c, 'image/jpeg', q);
      var jw = c.width, jh = c.height; c.width = c.height = 0;
      var img = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      var pw, ph;
      if (size === 'fit') { pw = jw * 72 / 150; ph = jh * 72 / 150; }
      else { pw = SIZES[size][0]; ph = SIZES[size][1]; if (jw > jh) { var t = pw; pw = ph; ph = t; } }
      var page = doc.addPage([pw, ph]);
      var s = Math.min((pw - margin * 2) / jw, (ph - margin * 2) / jh);
      page.drawImage(img, { x: (pw - jw * s) / 2, y: (ph - jh * s) / 2, width: jw * s, height: jh * s });
    }
    return new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
  }

  go.addEventListener('click', async function () {
    if (!list.items.length) return;
    go.disabled = true; result.classList.remove('show');
    try {
      var limitMB = Number(getLimit()), limit = limitMB * 1024 * 1024 * 0.97;
      var steps = limitMB ? LADDER : [LADDER[0]];
      var blob = null;
      for (var k = 0; k < steps.length; k++) {
        blob = await buildPdf(steps[k][0], steps[k][1], function (i, n) {
          SK.status(status, 'info', (k ? 'Making it smaller — ' : '') + 'page ' + (i + 1) + ' of ' + n + '…', ((k + i / n) / steps.length) * 100);
        });
        if (!limitMB || blob.size <= limit) break;
      }
      outBlob = blob;
      var pages = await SK.pdfPreview(blob, $('out-img'));
      var over = limitMB && blob.size > limit;
      $('out-meta').textContent = pages + (pages === 1 ? ' page' : ' pages') + ' · ' + SK.bytes(blob.size) + (limitMB && !over ? ' · under ' + limitMB + 'MB ✓' : '');
      if (over) SK.status(status, 'err', 'Still bigger than ' + limitMB + 'MB with this many pages. Try “Black & white”, or split it into two PDFs.');
      else SK.status(status);
      result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
    go.disabled = false;
  });

  $('dl').addEventListener('click', function () { if (outBlob) SK.download(outBlob, fname.get()); });
  $('again').addEventListener('click', function () {
    list.items = []; images.clear(); list.render(); outBlob = null; fname._set = false; SK.status(status); SK.step(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
