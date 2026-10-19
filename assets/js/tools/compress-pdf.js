(function () {
  var $ = function (id) { return document.getElementById(id); };
  var drop = $('drop'), info = $('file-info'), opts = $('opts'), status = $('status'), result = $('result');
  var go = $('go');
  var file = null, buf = null, outBlob = null;

  var getSize = SK.choices($('sizes'), function (v) { $('custom-wrap').hidden = v !== 'custom'; });

  // From clearest to smallest: [dots per inch, JPEG quality]
  var LEVELS = [[150, 0.8], [130, 0.72], [110, 0.65], [96, 0.58], [84, 0.5], [72, 0.45], [62, 0.4], [52, 0.35], [44, 0.3], [36, 0.25]];

  SK.drop(drop, function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    file = f; result.classList.remove('show');
    f.arrayBuffer().then(function (b) {
      buf = b;
      info.innerHTML = ''; info.appendChild(SK.fileItem(f.name, f.size)); info.hidden = false;
      opts.hidden = false; drop.hidden = true; SK.step(2); go.focus();
    });
  });

  async function renderAll(pdf, dpi, q, onPage) {
    var PDFLib = await SK.pdfLib();
    var out = await PDFLib.PDFDocument.create();
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var vp1 = page.getViewport({ scale: 1 });
      var vp = page.getViewport({ scale: dpi / 72 });
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(vp.width)); c.height = Math.max(1, Math.floor(vp.height));
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      var blob = await SK.canvasToBlob(c, 'image/jpeg', q);
      var jpg = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      var p = out.addPage([vp1.width, vp1.height]);
      p.drawImage(jpg, { x: 0, y: 0, width: vp1.width, height: vp1.height });
      c.width = c.height = 0;
      page.cleanup();
      if (onPage) onPage(i, pdf.numPages);
    }
    var bytes = await out.save({ useObjectStreams: true });
    return new Blob([bytes], { type: 'application/pdf' });
  }

  go.addEventListener('click', async function () {
    if (!buf) return;
    var v = getSize();
    var limit = v === 'auto' ? null : (v === 'custom' ? Math.max(20, Number($('custom-kb').value) || 0) : Number(v)) * 1024;
    go.disabled = true;
    result.classList.remove('show');
    try {
      SK.status(status, 'info', 'Opening your PDF…');
      var pdfjs = await SK.pdfjs();
      var pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;

      // Step 1: a lossless clean-up. Sometimes that alone is enough.
      var PDFLib = await SK.pdfLib();
      var best = null;
      try {
        var doc = await PDFLib.PDFDocument.load(buf.slice(0), { updateMetadata: false });
        var clean = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
        if (clean.size < file.size) best = clean;
      } catch (e) { /* encrypted or unusual — skip */ }
      var smallest = best && best.size < file.size ? best : file;
      if (limit && smallest.size <= limit) { finish(smallest, true); return; }

      // "Smaller": good quality first; if that barely helps, one stronger try
      var levels = limit ? LEVELS : [LEVELS[1], LEVELS[4]];
      var done = false;
      for (var li = 0; li < levels.length && !done; li++) {
        var L = levels[li];
        var attempt = li + 1;
        var blob = await renderAll(pdf, L[0], L[1], function (i, n) {
          var label = limit ? 'Trying setting ' + attempt + ' of ' + levels.length + ' — page ' + i + ' of ' + n : 'Working — page ' + i + ' of ' + n;
          SK.status(status, 'info', label, limit ? ((li + i / n) / levels.length) * 100 : (i / n) * 100);
        });
        if (blob.size < smallest.size) smallest = blob;
        if (!limit) { if (smallest.size < file.size * 0.75) done = true; }
        else if (blob.size <= limit) done = true;
        else if (blob.size > limit * 3 && li < levels.length - 3) li += 2;      // far away: jump ahead
        else if (blob.size > limit * 1.7 && li < levels.length - 2) li += 1;
      }
      if (limit && smallest.size > limit) {
        finish(smallest, false, 'We could only get it down to ' + SK.bytes(smallest.size) + '. Try a bigger size, or split the PDF into fewer pages first.');
        return;
      }
      if (!limit && smallest === file) {
        finish(file, false, 'This PDF is already very small — we could not make it smaller without losing quality.');
        return;
      }
      finish(smallest, true);
    } catch (e) {
      SK.status(status, 'err', SK.errText(e));
    }
    go.disabled = false;
  });

  function finish(blob, ok, note) {
    outBlob = blob;
    var pct = Math.round((1 - blob.size / file.size) * 100);
    $('out-meta').textContent = 'New size: ' + SK.bytes(blob.size) + ' (was ' + SK.bytes(file.size) + ')' + (pct > 0 ? ' — ' + pct + '% smaller' : '');
    if (note) SK.status(status, ok ? 'info' : 'err', note); else SK.status(status);
    result.classList.add('show'); SK.step(3); go.disabled = false;
    $('dl').focus();
  }

  $('dl').addEventListener('click', function () {
    if (outBlob) SK.download(outBlob, SK.baseName(file.name) + '-small.pdf');
  });
  $('again').addEventListener('click', function () {
    file = buf = outBlob = null;
    result.classList.remove('show'); opts.hidden = true; info.hidden = true; drop.hidden = false; SK.status(status);
    SK.step(1); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
