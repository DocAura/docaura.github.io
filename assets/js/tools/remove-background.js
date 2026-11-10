(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), pv = $('pv'), img = null, mask = null, seg = null, segP = null, name = 'photo';
  var base = new URL(SK.root + 'assets/vendor/bg/', location.href).href;
  var getBg = SK.choices($('bg'), function (v) { $('col').hidden = v !== 'custom'; render(); });
  $('col').addEventListener('input', render);
  $('sharp').addEventListener('change', render);

  function model() {
    if (segP) return segP;
    segP = SK.loadScript(base + 'selfie_segmentation.js').then(function () {
      seg = new window.SelfieSegmentation({ locateFile: function (f) { return base + f; } });
      seg.setOptions({ modelSelection: 0, selfieMode: false });
      return seg.initialize().then(function () { return seg; });
    }).catch(function (e) { segP = null; throw e; });
    return segP;
  }
  function segment(image) {
    return model().then(function (s) {
      return new Promise(function (res, rej) {
        var t = setTimeout(function () { rej(new Error('This is taking too long. Please try a smaller photo.')); }, 60000);
        s.onResults(function (r) {
          clearTimeout(t);
          var c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
          c.getContext('2d').drawImage(r.segmentationMask, 0, 0, c.width, c.height);
          res(c);
        });
        s.send({ image: image }).catch(function (e) { clearTimeout(t); rej(e); });
      });
    });
  }

  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isImage(f)) { SK.status(status, 'err', 'Please choose a photo.'); return; }
    name = SK.baseName(f.name);
    try {
      SK.status(status, 'info', 'Opening photo…', 5);
      var im = await SK.fileToImage(f);
      // Work at max 1600px for speed on phones
      var s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
      var c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      SK.status(status, 'info', 'Loading the background remover (first time only)…', 25);
      await model();
      SK.status(status, 'info', 'Removing the background…', 70);
      mask = await segment(c); img = c;
      $('drop').hidden = true; $('opts').hidden = false; SK.status(status); SK.step(2); render();
      SK.used('remove-bg');
    } catch (e) { SK.status(status, 'err', (e && e.message) ? e.message : 'Sorry, the background could not be removed on this device. Please try another browser.'); }
  });

  function cutout() {
    var w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.drawImage(mask, 0, 0);
    if ($('sharp').checked) { // harden the soft mask edge
      var d = x.getImageData(0, 0, w, h), p = d.data;
      for (var i = 3; i < p.length; i += 4) { var a = p[i] / 255; a = Math.max(0, Math.min(1, (a - 0.35) / 0.3)); p[i] = Math.round(a * 255); }
      x.putImageData(d, 0, 0);
    }
    x.globalCompositeOperation = 'source-in'; x.drawImage(img, 0, 0);
    return c;
  }
  function compose() {
    var bg = getBg(), cut = cutout(), c = document.createElement('canvas'); c.width = cut.width; c.height = cut.height;
    var x = c.getContext('2d');
    if (bg !== 'none') { x.fillStyle = bg === 'custom' ? $('col').value : bg; x.fillRect(0, 0, c.width, c.height); }
    x.drawImage(cut, 0, 0);
    return c;
  }
  function render() {
    if (!img) return;
    var c = compose(); pv.width = c.width; pv.height = c.height;
    var x = pv.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0);
  }
  $('dl').addEventListener('click', async function () {
    if (!img) return;
    var c = compose(), png = getBg() === 'none';
    SK.download(await SK.canvasToBlob(c, png ? 'image/png' : 'image/jpeg', 0.95), name + (png ? '-no-background.png' : '-new-background.jpg'));
    SK.step(3);
  });
  $('again').addEventListener('click', function () {
    img = mask = null; $('opts').hidden = true; $('drop').hidden = false; SK.step(1); $('drop').querySelector('input').click();
  });
})();
