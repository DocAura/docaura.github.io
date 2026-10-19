(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), go = $('go');
  var file = null, buf = null, outs = [];
  var getQ = SK.choices($('quality')), getF = SK.choices($('format'));

  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    file = f; buf = await f.arrayBuffer();
    $('file-info').innerHTML = ''; $('file-info').appendChild(SK.fileItem(f.name, f.size)); $('file-info').hidden = false;
    $('drop').hidden = true; $('opts').hidden = false; result.classList.remove('show'); SK.status(status); SK.step(2); go.focus();
  });

  go.addEventListener('click', async function () {
    go.disabled = true;
    outs.forEach(function (o) { URL.revokeObjectURL(o.url); }); outs = [];
    var box = $('out-thumbs'); box.innerHTML = '';
    try {
      var dpi = Number(getQ()), fmt = getF();
      var type = fmt === 'png' ? 'image/png' : 'image/jpeg';
      var pdfjs = await SK.pdfjs();
      var pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      var n = pdf.numPages, totalSize = 0;
      for (var i = 1; i <= n; i++) {
        SK.status(status, 'info', 'Making picture ' + i + ' of ' + n + '…', ((i - 1) / n) * 100);
        var page = await pdf.getPage(i);
        var vp = page.getViewport({ scale: dpi / 72 });
        var c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        var blob = await SK.canvasToBlob(c, type, 0.88);
        c.width = c.height = 0; page.cleanup();
        var o = { blob: blob, url: URL.createObjectURL(blob), name: SK.baseName(file.name) + '-page-' + i + '.' + fmt };
        outs.push(o); totalSize += blob.size;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'page-thumb';
        b.setAttribute('aria-label', 'Save page ' + i);
        b.innerHTML = '<img alt="" src="' + o.url + '">Page ' + i + ' · ' + SK.bytes(blob.size);
        (function (oo) { b.addEventListener('click', function () { SK.download(oo.blob, oo.name); }); })(o);
        box.appendChild(b);
      }
      $('out-meta').textContent = n + (n === 1 ? ' picture' : ' pictures') + ' · ' + SK.bytes(totalSize) + ' in total';
      $('dl-all').textContent = n === 1 ? 'Save picture' : 'Save all ' + n + ' pictures';
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl-all').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
    go.disabled = false;
  });

  $('dl-all').addEventListener('click', async function () {
    for (var i = 0; i < outs.length; i++) { SK.download(outs[i].blob, outs[i].name); await SK.sleep(350); }
  });
  $('again').addEventListener('click', function () {
    file = buf = null; result.classList.remove('show'); $('opts').hidden = true; $('file-info').hidden = true; $('drop').hidden = false;
    SK.step(1); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
