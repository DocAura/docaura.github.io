(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), go = $('go');
  var outBlob = null;
  var SIZES = { a4: [595.28, 841.89], letter: [612, 792] };

  var getSize = SK.choices($('pagesize'));
  var getMargin = SK.choices($('margin'));

  var list = SK.fileList($('list'), function (items) {
    $('opts').hidden = !items.length;
    $('drop-t').textContent = items.length ? 'Add more photos' : 'Tap here to choose photos';
    if (items.length) SK.step(2);
    result.classList.remove('show');
  });

  SK.drop($('drop'), async function (files) {
    var imgs = files.filter(SK.isImage);
    if (imgs.length < files.length) SK.status(status, 'err', (files.length - imgs.length) + ' file(s) skipped because they are not photos.');
    else SK.status(status);
    for (var i = 0; i < imgs.length; i++) {
      var f = imgs[i];
      var item = { file: f, thumb: SK.isHeic(f) ? null : URL.createObjectURL(f) };
      list.items.push(item);
    }
    list.render();
  });

  async function toJpeg(file) {
    var img = await SK.fileToImage(file);
    var w = img.naturalWidth, h = img.naturalHeight, max = 2480;
    if (Math.max(w, h) > max) { var r = max / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    var blob = await SK.canvasToBlob(c, 'image/jpeg', 0.85);
    c.width = c.height = 0;
    return { bytes: new Uint8Array(await blob.arrayBuffer()), w: w, h: h };
  }

  go.addEventListener('click', async function () {
    if (!list.items.length) return;
    go.disabled = true;
    try {
      var PDFLib = await SK.pdfLib();
      var doc = await PDFLib.PDFDocument.create();
      var size = getSize(), margin = Number(getMargin());
      var n = list.items.length;
      for (var i = 0; i < n; i++) {
        SK.status(status, 'info', 'Adding photo ' + (i + 1) + ' of ' + n + '…', (i / n) * 100);
        var j = await toJpeg(list.items[i].file);
        var img = await doc.embedJpg(j.bytes);
        var pw, ph;
        if (size === 'fit') {
          // 1 photo pixel ≈ 1/150 inch → sensible physical size
          pw = j.w * 72 / 150 + margin * 2; ph = j.h * 72 / 150 + margin * 2;
        } else {
          pw = SIZES[size][0]; ph = SIZES[size][1];
          if (j.w > j.h) { var t = pw; pw = ph; ph = t; } // landscape photo → landscape page
        }
        var page = doc.addPage([pw, ph]);
        var aw = pw - margin * 2, ah = ph - margin * 2;
        var s = Math.min(aw / j.w, ah / j.h);
        var dw = j.w * s, dh = j.h * s;
        page.drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
      }
      outBlob = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
      $('out-meta').textContent = n + (n === 1 ? ' page' : ' pages') + ' · ' + SK.bytes(outBlob.size);
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
    go.disabled = false;
  });

  $('dl').addEventListener('click', function () {
    if (outBlob) SK.download(outBlob, list.items.length === 1 ? SK.baseName(list.items[0].file.name) + '.pdf' : 'photos.pdf');
  });
  $('again').addEventListener('click', function () {
    list.items = []; list.render(); outBlob = null; SK.status(status); SK.step(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
