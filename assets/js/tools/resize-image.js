(function () {
  var $ = function (id) { return document.getElementById(id); };
  var drop = $('drop'), info = $('file-info'), opts = $('opts'), status = $('status'), result = $('result');
  var go = $('go'), outImg = $('out-img'), outMeta = $('out-meta');
  var file = null, img = null, outBlob = null;

  var getSize = SK.choices($('sizes'), function (v) {
    $('custom-wrap').hidden = v !== 'custom';
    label();
  });
  $('custom-kb').addEventListener('input', label);
  $('use-px').addEventListener('change', function () { $('px-wrap').hidden = !this.checked; });

  function targetKB() {
    var v = getSize();
    if (v === 'custom') return Math.max(5, Number($('custom-kb').value) || 0);
    return Number(v);
  }
  function label() {
    go.childNodes[0].nodeValue = 'Make it ' + targetKB() + 'KB ';
  }

  SK.drop(drop, function (files) {
    var f = files[0];
    if (!SK.isImage(f)) { SK.status(status, 'err', 'Please choose a photo (JPG, PNG, WEBP or HEIC).'); return; }
    file = f; result.classList.remove('show');
    SK.status(status, 'info', 'Opening your photo…');
    SK.fileToImage(f).then(function (im) {
      img = im;
      info.innerHTML = '';
      var li = SK.fileItem(f.name, f.size, im.src);
      li.querySelector('.sz').textContent += ' · ' + im.naturalWidth + ' × ' + im.naturalHeight + ' px';
      info.appendChild(li); info.hidden = false;
      opts.hidden = false; drop.hidden = true;
      SK.status(status); SK.step(2);
      go.focus();
    }).catch(function (e) { SK.status(status, 'err', SK.errText(e)); });
  });

  function draw(w, h, cover) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h); // JPG has no transparency
    ctx.imageSmoothingQuality = 'high';
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (cover) {
      var s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s;
      ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
    } else {
      ctx.drawImage(img, 0, 0, w, h);
    }
    return c;
  }

  // Best quality JPEG under limit at this canvas size: {blob, q} or null
  async function fit(canvas, limit) {
    var lo = 0.05, hi = 0.92;
    var b = await SK.canvasToBlob(canvas, 'image/jpeg', hi);
    if (b.size <= limit) return { blob: b, q: hi };
    b = await SK.canvasToBlob(canvas, 'image/jpeg', lo);
    if (b.size > limit) return null;
    var best = { blob: b, q: lo };
    for (var i = 0; i < 7; i++) {
      var mid = (lo + hi) / 2;
      b = await SK.canvasToBlob(canvas, 'image/jpeg', mid);
      if (b.size <= limit) { best = { blob: b, q: mid }; lo = mid; } else { hi = mid; }
    }
    return best;
  }

  go.addEventListener('click', async function () {
    if (!img) return;
    var kb = targetKB();
    var limit = kb * 1024;
    go.disabled = true;
    result.classList.remove('show');
    SK.status(status, 'info', 'Working on it…');
    try {
      var blob = null, w, h, canvas;
      if ($('use-px').checked) {
        w = Math.round(Number($('px-w').value)); h = Math.round(Number($('px-h').value));
        if (!(w >= 10 && h >= 10 && w <= 8000 && h <= 8000)) throw new Error('Please type a width and height between 10 and 8000 pixels.');
        canvas = draw(w, h, true);
        var r1 = await fit(canvas, limit);
        if (!r1) throw new Error('This pixel size cannot get under ' + kb + 'KB. Try smaller pixels or a bigger KB size.');
        blob = r1.blob;
      } else {
        w = img.naturalWidth; h = img.naturalHeight;
        // Very large photos: start at a sensible size so it is fast
        var maxSide = 2400;
        if (Math.max(w, h) > maxSide) { var r = maxSide / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
        // Shrink pixels step by step until it fits with decent quality (q >= 0.5)
        var fallback = null, fallbackCanvas = null;
        for (var tries = 0; tries < 30; tries++) {
          canvas = draw(w, h, false);
          var res = await fit(canvas, limit);
          if (res && res.q >= 0.5) { blob = res.blob; break; }
          if (res) { fallback = res.blob; fallbackCanvas = canvas; }
          if (Math.max(w, h) < 80) break;
          w = Math.max(16, Math.round(w * 0.82)); h = Math.max(16, Math.round(h * 0.82));
          SK.status(status, 'info', 'Working on it…', Math.min(95, 10 + tries * 6));
        }
        if (!blob && fallback) { blob = fallback; canvas = fallbackCanvas; }
        if (!blob) throw new Error('Could not get this photo under ' + kb + 'KB. Try a bigger size.');
      }
      outBlob = blob;
      if (outImg.src) URL.revokeObjectURL(outImg.src);
      outImg.src = URL.createObjectURL(blob);
      outMeta.textContent = 'New size: ' + SK.bytes(blob.size) + ' (was ' + SK.bytes(file.size) + ') · ' + canvas.width + ' × ' + canvas.height + ' px · JPG';
      SK.status(status); result.classList.add('show'); SK.step(3);
      $('dl').focus();
    } catch (e) {
      SK.status(status, 'err', e.message || SK.errText(e));
    }
    go.disabled = false;
  });

  $('dl').addEventListener('click', function () {
    if (outBlob) SK.download(outBlob, SK.baseName(file.name) + '-' + targetKB() + 'kb.jpg');
  });
  $('again').addEventListener('click', function () {
    file = img = outBlob = null;
    result.classList.remove('show'); opts.hidden = true; info.hidden = true; drop.hidden = false;
    SK.step(1); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  label();
})();
