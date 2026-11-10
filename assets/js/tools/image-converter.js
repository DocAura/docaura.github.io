(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), outs = [];
  var getFmt = SK.choices($('fmt'));
  SK.drop($('drop'), async function (files) {
    outs.forEach(function (o) { URL.revokeObjectURL(o.url); }); outs = [];
    var box = $('out-thumbs'); box.innerHTML = ''; result.classList.remove('show');
    var list = files.filter(SK.isImage), fmt = getFmt(), ext = fmt === 'jpeg' ? 'jpg' : fmt, failed = 0;
    if (!list.length) { SK.status(status, 'err', 'Please choose image files.'); return; }
    SK.step(2);
    for (var i = 0; i < list.length; i++) {
      SK.status(status, 'info', 'Converting ' + (i + 1) + ' of ' + list.length + '…', i / list.length * 100);
      try {
        var f = list[i], im = SK.isHeic(f) ? await SK.loadImage(URL.createObjectURL(await SK.heicToJpeg(f, 0.95))) : await SK.fileToImage(f);
        var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        var x = c.getContext('2d'); if (fmt === 'jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(im, 0, 0);
        var blob = await SK.canvasToBlob(c, 'image/' + fmt, 0.92);
        if (!blob || (fmt === 'webp' && blob.type !== 'image/webp')) throw new Error('webp');
        var o = { blob: blob, url: URL.createObjectURL(blob), name: SK.baseName(f.name) + '.' + ext };
        outs.push(o);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'page-thumb'; b.setAttribute('aria-label', 'Save ' + o.name);
        b.innerHTML = '<img alt="" src="' + o.url + '">'; b.appendChild(document.createTextNode(o.name + ' · ' + SK.bytes(blob.size)));
        (function (oo) { b.addEventListener('click', function () { SK.download(oo.blob, oo.name); }); })(o);
        box.appendChild(b);
      } catch (e) { failed++; }
    }
    if (!outs.length) { SK.status(status, 'err', fmt === 'webp' ? 'This browser cannot save WEBP. Please choose JPG or PNG.' : 'These images could not be opened.'); return; }
    $('out-meta').textContent = outs.length + ' converted to ' + ext.toUpperCase() + (failed ? ' · ' + failed + ' could not be opened' : '');
    SK.status(status); result.classList.add('show'); SK.step(3);
  });
  $('dl-all').addEventListener('click', async function () { for (var i = 0; i < outs.length; i++) { SK.download(outs[i].blob, outs[i].name); await SK.sleep(350); } });
  $('again').addEventListener('click', function () { result.classList.remove('show'); SK.step(1); $('drop').querySelector('input').click(); });
})();
