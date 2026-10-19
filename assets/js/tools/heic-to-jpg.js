(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result');
  var outs = [];

  SK.drop($('drop'), async function (files) {
    outs.forEach(function (o) { URL.revokeObjectURL(o.url); }); outs = [];
    var box = $('out-thumbs'); box.innerHTML = '';
    var list = files.filter(function (f) { return SK.isImage(f); });
    if (!list.length) { SK.status(status, 'err', 'Please choose HEIC photos.'); return; }
    SK.step(2); result.classList.remove('show');
    var failed = 0;
    try {
      SK.status(status, 'info', 'Getting ready…', 0);
      await SK.loadScript(SK.root + 'assets/vendor/heic2any.min.js');
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        SK.status(status, 'info', 'Converting photo ' + (i + 1) + ' of ' + list.length + '…', (i / list.length) * 100);
        var blob;
        try {
          if (SK.isHeic(f)) {
            blob = await window.heic2any({ blob: f, toType: 'image/jpeg', quality: 0.92 });
            if (Array.isArray(blob)) blob = blob[0];
          } else {
            // Already a normal picture — re-save as JPG
            var img = await SK.fileToImage(f);
            var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
            var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
            blob = await SK.canvasToBlob(c, 'image/jpeg', 0.92);
          }
        } catch (e) { failed++; continue; }
        var o = { blob: blob, url: URL.createObjectURL(blob), name: SK.baseName(f.name) + '.jpg' };
        outs.push(o);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'page-thumb';
        b.setAttribute('aria-label', 'Save ' + o.name);
        b.innerHTML = '<img alt="" src="' + o.url + '">';
        b.appendChild(document.createTextNode(o.name));
        (function (oo) { b.addEventListener('click', function () { SK.download(oo.blob, oo.name); }); })(o);
        box.appendChild(b);
      }
      if (!outs.length) throw new Error('These photos could not be opened. Please check they are HEIC photos.');
      $('out-meta').textContent = outs.length + (outs.length === 1 ? ' photo' : ' photos') + ' converted' + (failed ? ' · ' + failed + ' could not be opened' : '');
      $('dl-all').textContent = outs.length === 1 ? 'Save photo' : 'Save all ' + outs.length + ' photos';
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl-all').focus();
    } catch (e) { SK.status(status, 'err', e.message); }
  });

  $('dl-all').addEventListener('click', async function () {
    for (var i = 0; i < outs.length; i++) { SK.download(outs[i].blob, outs[i].name); await SK.sleep(350); }
  });
  $('again').addEventListener('click', function () {
    result.classList.remove('show'); SK.step(1); $('drop').querySelector('input').click();
  });
})();
