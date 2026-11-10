(function () {
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), pv = $('pv');
  var photo = null, sigImg = null, sig = null;
  var W = 300, PH = 386; // 3.5 x 4.5 photo shape

  var getMode = SK.choices($('mode'), function () { layout(); render(); });
  var getSize = SK.choices($('sizes'));
  $('clean').addEventListener('change', function () { if (sigImg) sig = SK.cleanSignature(sigImg, this.checked); render(); });
  ['nm', 'dt'].forEach(function (id) { $(id).addEventListener('input', render); });
  try { $('dt').value = new Date().toISOString().slice(0, 10); } catch (e) {}

  function layout() {
    var m = getMode();
    $('drop-sig').hidden = m !== 'sig';
    $('name-wrap').hidden = m !== 'name';
    ready();
  }
  function ready() {
    var ok = photo && (getMode() === 'name' || sig);
    $('opts').hidden = !ok;
    if (ok) SK.step(2);
  }
  function pick(el, done) {
    SK.drop(el, function (files) {
      var f = files[0];
      if (!SK.isImage(f)) { SK.status(status, 'err', 'Please choose a picture (JPG, PNG or HEIC).'); return; }
      SK.status(status, 'info', 'Opening…');
      SK.fileToImage(f).then(function (im) {
        SK.status(status); done(im);
        el.querySelector('b').textContent = '✓ ' + (el.id === 'drop-photo' ? 'Photo added — tap to change' : 'Signature added — tap to change');
        ready(); render();
      }).catch(function (e) { SK.status(status, 'err', SK.errText(e)); });
    });
  }
  pick($('drop-photo'), function (im) { photo = im; });
  pick($('drop-sig'), function (im) { sigImg = im; sig = SK.cleanSignature(im, $('clean').checked); });

  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }

  // Draw at scale k (1 = 300px wide)
  function draw(k) {
    var mode = getMode(), w = Math.round(W * k), ph = Math.round(PH * k);
    var extra = mode === 'sig' ? Math.round(w / 3) : Math.round(76 * k);
    var c = document.createElement('canvas'); c.width = w; c.height = ph + extra;
    var x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    if (photo) { // cover-crop the photo into the 3.5x4.5 box, keeping the top (face) area
      var iw = photo.naturalWidth, ih = photo.naturalHeight, s = Math.max(w / iw, ph / ih), sw = w / s, sh = ph / s;
      x.drawImage(photo, (iw - sw) / 2, Math.max(0, (ih - sh) * 0.3), sw, sh, 0, 0, w, ph);
    }
    if (mode === 'sig') {
      x.fillStyle = '#e8e8e8'; x.fillRect(0, ph, w, Math.max(1, Math.round(k)));
      if (sig) {
        var bw = w * 0.9, bh = extra * 0.8, r = Math.min(bw / sig.width, bh / sig.height);
        var dw = sig.width * r, dh = sig.height * r;
        x.drawImage(sig, (w - dw) / 2, ph + (extra - dh) / 2, dw, dh);
      }
    } else {
      var name = ($('nm').value || '').trim().toUpperCase(), date = fmtDate($('dt').value);
      x.fillStyle = '#000'; x.textAlign = 'center'; x.textBaseline = 'middle';
      var fs = Math.round(26 * k);
      x.font = '700 ' + fs + 'px Arial, sans-serif';
      while (x.measureText(name).width > w * 0.94 && fs > 10 * k) { fs--; x.font = '700 ' + fs + 'px Arial, sans-serif'; }
      x.fillText(name || 'YOUR NAME', w / 2, ph + extra * 0.32);
      x.font = '700 ' + Math.round(22 * k) + 'px Arial, sans-serif';
      x.fillText(date ? 'DATE: ' + date : '', w / 2, ph + extra * 0.74);
    }
    return c;
  }

  function render() {
    if (!photo) return;
    var c = draw(1);
    pv.width = c.width; pv.height = c.height; pv.getContext('2d').drawImage(c, 0, 0);
  }

  $('go').addEventListener('click', async function () {
    if (!photo) return;
    if (getMode() === 'name' && !$('nm').value.trim()) { SK.status(status, 'err', 'Please type your name.'); $('nm').focus(); return; }
    var kb = Number(getSize()), btn = this; btn.disabled = true;
    SK.status(status, 'info', 'Making your image…');
    try {
      var r = await SK.jpegUnder(function (w) { return draw(w / W); }, W * 2, Math.round((PH + 130) * 2), kb * 1024);
      if (!r) throw new Error('Could not fit under ' + kb + 'KB. Please pick a bigger size.');
      SK.status(status, 'ok', 'Done! ' + SK.bytes(r.blob.size) + ' · ' + r.canvas.width + ' × ' + r.canvas.height + ' px');
      SK.download(r.blob, (getMode() === 'sig' ? 'photo-signature-' : 'photo-name-date-') + kb + 'kb.jpg');
      SK.step(3);
    } catch (e) { SK.status(status, 'err', e.message); }
    btn.disabled = false;
  });
  layout();
})();
