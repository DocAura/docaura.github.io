(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), pv = $('pv'), src = null, sig = null;

  var getKb = SK.choices($('kb'));
  var getPx = SK.choices($('px'), function (v) { $('px-wrap').hidden = v !== 'custom'; render(); });
  ['pw', 'ph'].forEach(function (id) { $(id).addEventListener('input', render); });
  $('clean').addEventListener('change', function () { if (src) { sig = SK.cleanSignature(src, this.checked); render(); } });

  SK.drop($('drop'), function (files) {
    var f = files[0];
    if (!SK.isImage(f)) { SK.status(status, 'err', 'Please choose a photo of your signature.'); return; }
    SK.status(status, 'info', 'Cleaning your signature…');
    SK.fileToImage(f).then(function (im) {
      src = im; sig = SK.cleanSignature(im, $('clean').checked);
      $('drop').hidden = true; $('opts').hidden = false; SK.status(status); SK.step(2); render();
    }).catch(function (e) { SK.status(status, 'err', SK.errText(e)); });
  });

  function dims() {
    var v = getPx();
    if (v === 'keep') { var w = Math.min(600, sig.width); return [w, Math.max(10, Math.round(w * sig.height / sig.width)), false]; }
    if (v === 'custom') return [Math.round(Number($('pw').value)), Math.round(Number($('ph').value)), true];
    var p = v.split('x'); return [Number(p[0]), Number(p[1]), true];
  }
  function draw(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.imageSmoothingQuality = 'high';
    var r = Math.min(w * 0.94 / sig.width, h * 0.9 / sig.height), dw = sig.width * r, dh = sig.height * r;
    x.drawImage(sig, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return c;
  }
  function render() {
    if (!sig) return;
    var d = dims(); if (!(d[0] >= 20 && d[1] >= 10 && d[0] <= 3000 && d[1] <= 3000)) return;
    var c = draw(d[0], d[1]); pv.width = c.width; pv.height = c.height;
    pv.style.width = Math.min(c.width * (c.width < 200 ? 2 : 1), 520) + 'px';
    pv.getContext('2d').drawImage(c, 0, 0);
  }

  $('go').addEventListener('click', async function () {
    if (!sig) return;
    var d = dims(), kb = getKb().split('-'), min = Number(kb[0]) * 1024, max = Number(kb[1]) * 1024;
    if (!(d[0] >= 20 && d[1] >= 10 && d[0] <= 3000 && d[1] <= 3000)) { SK.status(status, 'err', 'Please type a width of 20–3000 and a height of 10–3000 pixels.'); return; }
    var btn = this; btn.disabled = true; SK.status(status, 'info', 'Working…');
    try {
      var r = await SK.jpegUnder(draw, d[0], d[1], max, d[2]);
      if (!r) throw new Error('This pixel size cannot fit under ' + (max / 1024) + 'KB. Try “Keep shape” or a bigger KB size.');
      var blob = await SK.padJpeg(r.blob, min);
      SK.status(status, 'ok', 'Done! ' + SK.bytes(blob.size) + ' · ' + r.canvas.width + ' × ' + r.canvas.height + ' px · JPG');
      SK.download(blob, 'signature-' + r.canvas.width + 'x' + r.canvas.height + '.jpg'); SK.step(3);
    } catch (e) { SK.status(status, 'err', e.message); }
    btn.disabled = false;
  });
  $('again').addEventListener('click', function () {
    src = sig = null; $('opts').hidden = true; $('drop').hidden = false; SK.status(status); SK.step(1);
    $('drop').querySelector('input').click();
  });
})();
