(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result');
  var file = null, buf = null, outBlob = null;
  var getPos = SK.choices($('pos')), getFmt = SK.choices($('fmt')), getTxtPos = SK.choices($('txtpos')), getSize = SK.choices($('size'));
  var fname = SK.nameField($('out-btns'), '.pdf');

  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    file = f; buf = await f.arrayBuffer();
    $('file-info').innerHTML = ''; $('file-info').appendChild(SK.fileItem(f.name, f.size)); $('file-info').hidden = false;
    fname.set(SK.baseName(f.name) + '-numbered');
    $('drop').hidden = true; $('opts').hidden = false; result.classList.remove('show'); SK.status(status); SK.step(2);
  });

  // Place text at a position as the reader sees the page, even if the page is stored rotated.
  function place(page, PDFLib, str, font, size, where) {
    var mb = page.getSize(), w = mb.width, h = mb.height;
    var r = ((page.getRotation().angle || 0) % 360 + 360) % 360;
    var vw = r % 180 ? h : w, vh = r % 180 ? w : h;
    var tw = font.widthOfTextAtSize(str, size), m = Math.max(22, Math.min(vw, vh) * 0.045);
    var vx = where[1] === 'l' ? m : where[1] === 'r' ? vw - m - tw : (vw - tw) / 2;
    var vy = where[0] === 't' ? vh - m - size * 0.8 : m;
    var x, y;
    if (r === 0) { x = vx; y = vy; }
    else if (r === 90) { x = w - vy; y = vx; }
    else if (r === 180) { x = w - vx; y = h - vy; }
    else { x = vy; y = h - vx; }
    page.drawText(str, { x: x, y: y, size: size, font: font, color: PDFLib.rgb(0.13, 0.13, 0.16), rotate: PDFLib.degrees(r) });
  }

  $('go').addEventListener('click', async function () {
    if (!buf) return;
    try {
      SK.status(status, 'info', 'Adding numbers…');
      var PDFLib = await SK.pdfLib();
      var doc = await PDFLib.PDFDocument.load(buf.slice(0));
      var font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      var bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      var pages = doc.getPages();
      var pos = getPos(), fmt = getFmt(), size = Number(getSize());
      var start = Math.max(0, parseInt($('start').value, 10) || 0), skip = Math.max(0, parseInt($('skip').value, 10) || 0);
      // Standard PDF fonts only cover basic Latin letters; replace anything else so it never fails
      var txt = $('txt').value.trim().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/·/g, '-');
      var safeTxt = txt.replace(/[^\x20-\x7E -ÿ]/g, '');
      var counted = pages.length - skip, last = start + counted - 1;
      pages.forEach(function (p, i) {
        if (pos !== 'none' && i >= skip) {
          var n = start + i - skip;
          var s = fmt === 'n' ? String(n) : fmt === 'page' ? 'Page ' + n : 'Page ' + n + ' of ' + last;
          place(p, PDFLib, s, font, size, pos === 'bc' ? 'bc' : pos === 'br' ? 'br' : 'tr');
        }
        if (safeTxt) {
          var tp = getTxtPos(); var where = tp === 'tl' ? 'tl' : tp === 'tc' ? 'tc' : 'tr';
          if (!(where === 'tr' && pos === 'tr')) place(p, PDFLib, safeTxt, bold, size, where);
          else place(p, PDFLib, safeTxt, bold, size, 'tl');
        }
      });
      outBlob = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
      var n = await SK.pdfPreview(outBlob, $('out-img'));
      $('out-meta').textContent = n + ' pages · ' + SK.bytes(outBlob.size) + (safeTxt !== txt && txt ? ' · some special letters in your text were left out' : '');
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  $('dl').addEventListener('click', function () { if (outBlob) SK.download(outBlob, fname.get()); });
  $('again').addEventListener('click', function () {
    file = buf = outBlob = null; result.classList.remove('show'); $('opts').hidden = true; $('file-info').hidden = true; $('drop').hidden = false;
    SK.step(1); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
