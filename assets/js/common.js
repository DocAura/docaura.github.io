/* SimpleKit shared helpers. Everything runs in the browser — no uploads. */
(function () {
  'use strict';

  // ---- Settings you fill in later ----
  // Paste your AdSense publisher id (looks like "ca-pub-1234567890123456") once approved.
  var ADSENSE_CLIENT = '';

  var ROOT = (document.currentScript && document.currentScript.getAttribute('data-root')) || './';

  // ---- Bigger text toggle (remembered per browser) ----
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  if (store('sk-big') === '1') document.documentElement.classList.add('big-text');
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-big-text]');
    if (!b) return;
    var on = document.documentElement.classList.toggle('big-text');
    store('sk-big', on ? '1' : '0');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.querySelector('[data-big-text]');
    if (b) b.setAttribute('aria-pressed', document.documentElement.classList.contains('big-text') ? 'true' : 'false');
    initAds();
  });

  // ---- Ads: only load when a publisher id is set ----
  function initAds() {
    if (!ADSENSE_CLIENT) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
    document.querySelectorAll('.ad-slot').forEach(function (slot) {
      slot.innerHTML = '<div class="ad-label">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="' +
        ADSENSE_CLIENT + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }

  // ---- Helpers used by every tool ----
  var SK = {};
  SK.root = ROOT;

  SK.bytes = function (n) {
    if (n < 1024) return n + ' bytes';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  };

  SK.baseName = function (name) { return name.replace(/\.[^.]+$/, ''); };

  // Upload portals (Canvas, Moodle, Google Classroom, govt sites) often reject names with # & % ( ) or spaces.
  SK.safeName = function (name, ext) {
    var m = String(name || '').match(/^(.*?)(\.[A-Za-z0-9]{2,5})?$/);
    var base = (m[1] || 'file').normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'file';
    return base + (ext || m[2] || '');
  };

  SK.download = function (blob, filename) {
    filename = SK.safeName(filename);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  };

  // Drop zone: el = .drop element containing <input type=file>
  SK.drop = function (el, onFiles) {
    var input = el.querySelector('input[type=file]');
    input.addEventListener('change', function () {
      if (input.files.length) onFiles(Array.prototype.slice.call(input.files));
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (t) {
      el.addEventListener(t, function (e) { e.preventDefault(); el.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      el.addEventListener(t, function (e) { e.preventDefault(); el.classList.remove('over'); });
    });
    el.addEventListener('drop', function (e) {
      var f = Array.prototype.slice.call(e.dataTransfer.files || []);
      if (f.length) onFiles(f);
    });
  };

  // Status box: SK.status(el, 'info'|'ok'|'err', text, percent?)
  SK.status = function (el, kind, text, pct) {
    if (!kind) { el.className = 'status'; el.innerHTML = ''; return; }
    el.className = 'status show ' + kind;
    el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    el.textContent = text;
    if (typeof pct === 'number') {
      var w = document.createElement('div'); w.className = 'bar-wrap';
      var f = document.createElement('div'); f.className = 'bar-fill'; f.style.width = Math.round(pct) + '%';
      w.appendChild(f); el.appendChild(w);
    }
  };

  // Choice buttons (aria-pressed group). Returns getter.
  SK.choices = function (container, onChange) {
    var btns = container.querySelectorAll('.choice');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        if (onChange) onChange(b.getAttribute('data-value'));
      });
    });
    return function () {
      var on = container.querySelector('.choice[aria-pressed="true"]');
      return on ? on.getAttribute('data-value') : null;
    };
  };

  SK.isPdf = function (f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name); };
  SK.isImage = function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name); };
  SK.isHeic = function (f) { return /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name); };

  SK.readBuffer = function (file) { return file.arrayBuffer(); };

  SK.loadImage = function (src) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('Could not open this picture.')); };
      img.src = src;
    });
  };

  // Opens any image file (including iPhone HEIC) as an <img>.
  SK.fileToImage = function (file) {
    var p = SK.isHeic(file)
      ? SK.loadScript(ROOT + 'assets/vendor/heic2any.min.js').then(function () {
          return window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
        }).then(function (b) { return Array.isArray(b) ? b[0] : b; })
      : Promise.resolve(file);
    return p.then(function (blob) {
      var url = URL.createObjectURL(blob);
      return SK.loadImage(url);
    });
  };

  SK.canvasToBlob = function (canvas, type, q) {
    return new Promise(function (res) { canvas.toBlob(res, type, q); });
  };

  var loaded = {};
  SK.loadScript = function (src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = function () { delete loaded[src]; rej(new Error('Could not load. Please check your internet and try again.')); };
      document.head.appendChild(s);
    });
    return loaded[src];
  };

  SK.pdfLib = function () {
    return SK.loadScript(ROOT + 'assets/vendor/pdf-lib.min.js').then(function () { return window.PDFLib; });
  };
  SK.jsPDF = function () {
    return SK.loadScript(ROOT + 'assets/vendor/jspdf.umd.min.js').then(function () { return window.jspdf.jsPDF; });
  };
  var pdfjsP;
  SK.pdfjs = function () {
    if (!pdfjsP) {
      var base = new URL(ROOT + 'assets/vendor/', location.href).href;
      pdfjsP = import(base + 'pdf.min.mjs').then(function (m) {
        m.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
        return m;
      });
    }
    return pdfjsP;
  };

  // Friendly error text
  SK.errText = function (e) {
    var m = (e && e.message) || String(e);
    if (/password|encrypt/i.test(m)) return 'This PDF is locked with a password. Please unlock it first and try again.';
    if (/Invalid PDF|No PDF header|bad XRef/i.test(m)) return 'This file does not look like a working PDF. Please try another file.';
    return 'Sorry, something went wrong: ' + m;
  };

  // Highlight progress step n (1-based) in the top step bar
  SK.step = function (n) {
    document.querySelectorAll('.progress-steps .ps').forEach(function (el) {
      el.classList.toggle('on', Number(el.getAttribute('data-step')) <= n);
      el.classList.toggle('cur', Number(el.getAttribute('data-step')) === n);
    });
  };

  SK.fileItem = function (name, size, thumbUrl) {
    var li = document.createElement('li'); li.className = 'file-item';
    var t = thumbUrl ? document.createElement('img') : document.createElement('span');
    t.className = 'thumb';
    if (thumbUrl) { t.src = thumbUrl; t.alt = ''; } else { t.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B2D8F" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'; }
    var n = document.createElement('span'); n.className = 'nm'; n.textContent = name;
    var s = document.createElement('span'); s.className = 'sz'; s.textContent = SK.bytes(size);
    n.appendChild(s);
    li.appendChild(t); li.appendChild(n);
    return li;
  };

  // "File name" box placed before the download buttons. Returns a getter for the chosen name.
  SK.nameField = function (beforeEl, ext) {
    var wrap = document.createElement('div');
    var id = 'fname-' + Math.random().toString(36).slice(2, 7);
    wrap.innerHTML = '<label class="field-label" for="' + id + '" style="margin-bottom:6px">File name</label>' +
      '<div style="display:flex;align-items:center;gap:8px"><input class="input" id="' + id + '" style="background:#fff" autocomplete="off"><span style="font-weight:700">' + ext + '</span></div>' +
      '<p class="hint" style="margin-top:6px">Tip: use your name and the assignment, e.g. Priya_Maths_Homework3. Spaces and symbols are removed so upload sites accept it.</p>';
    beforeEl.parentNode.insertBefore(wrap, beforeEl);
    var input = wrap.querySelector('input');
    return {
      set: function (n) { input.value = SK.safeName(SK.baseName(n || 'file')); },
      get: function () { return SK.safeName(input.value || 'file', ext); }
    };
  };

  // Render page 1 of a PDF blob into an <img>, return the page count. Lets people check before submitting.
  SK.pdfPreview = async function (blob, img) {
    var pdfjs = await SK.pdfjs();
    var pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
    var page = await pdf.getPage(1);
    var vp = page.getViewport({ scale: 1 });
    vp = page.getViewport({ scale: 420 / Math.max(vp.width, vp.height) });
    var c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    img.src = c.toDataURL('image/jpeg', 0.85); img.hidden = false;
    var n = pdf.numPages; pdf.destroy();
    return n;
  };

  // Make phone photos of paper readable: removes shadows and uneven light, whitens the paper.
  // mode: 'clear' (keeps colour) or 'bw' (black ink on white). Works on the canvas in place.
  SK.cleanScan = function (canvas, mode) {
    var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Estimate the lighting by shrinking the photo a lot (ink disappears, paper brightness stays)
    var cur = canvas, cw = w, ch = h;
    while (cw > 64 || ch > 64) {
      var nw = Math.max(16, Math.round(cw / 2)), nh = Math.max(16, Math.round(ch / 2));
      var t = document.createElement('canvas'); t.width = nw; t.height = nh;
      var tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(cur, 0, 0, nw, nh);
      cur = t; cw = nw; ch = nh;
      if (nw === 16 && nh === 16) break;
    }
    var bg = document.createElement('canvas'); bg.width = w; bg.height = h;
    var bc = bg.getContext('2d', { willReadFrequently: true }); bc.imageSmoothingQuality = 'high'; bc.drawImage(cur, 0, 0, w, h);
    var im = ctx.getImageData(0, 0, w, h), d = im.data, b = bc.getImageData(0, 0, w, h).data;
    for (var i = 0; i < d.length; i += 4) {
      var r = Math.min(255, d[i] * 255 / Math.max(b[i], 40)),
          g = Math.min(255, d[i + 1] * 255 / Math.max(b[i + 1], 40)),
          bl = Math.min(255, d[i + 2] * 255 / Math.max(b[i + 2], 40));
      if (mode === 'bw') {
        var l = 0.299 * r + 0.587 * g + 0.114 * bl;
        // Soft threshold keeps smooth edges on handwriting
        l = l > 205 ? 255 : l < 125 ? 0 : (l - 125) * 255 / 80;
        d[i] = d[i + 1] = d[i + 2] = l;
      } else {
        // Darken the ink a little, whiten near-white paper
        d[i] = r > 225 ? 255 : Math.max(0, 255 - (255 - r) * 1.3);
        d[i + 1] = g > 225 ? 255 : Math.max(0, 255 - (255 - g) * 1.3);
        d[i + 2] = bl > 225 ? 255 : Math.max(0, 255 - (255 - bl) * 1.3);
      }
    }
    ctx.putImageData(im, 0, 0);
    return canvas;
  };

  // Draw an image onto a new canvas, rotated by 0/90/180/270 and scaled to fit maxSide
  SK.drawRotated = function (img, rot, maxSide) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var s = maxSide && Math.max(w, h) > maxSide ? maxSide / Math.max(w, h) : 1;
    var dw = Math.round(w * s), dh = Math.round(h * s);
    var c = document.createElement('canvas');
    var side = rot % 180 !== 0;
    c.width = side ? dh : dw; c.height = side ? dw : dh;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(c.width / 2, c.height / 2); ctx.rotate(rot * Math.PI / 180);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    return c;
  };

  // Reorderable file list with up / down / remove buttons.
  // items: [{file, thumb?, rot?}] ; opts: {rotate: true, extra: function(li, item)} ; returns {items, render}
  SK.fileList = function (ul, onChange, opts) {
    opts = opts || {};
    var api = { items: [] };
    var svg = function (d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B2D8F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };
    api.render = function () {
      ul.innerHTML = '';
      api.items.forEach(function (it, i) {
        var li = SK.fileItem((i + 1) + '. ' + it.file.name, it.file.size, it.thumb);
        var mk = function (label, d, dis, fn) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn';
          b.setAttribute('aria-label', label + ' ' + it.file.name); b.innerHTML = svg(d); b.disabled = dis;
          b.addEventListener('click', fn); li.appendChild(b);
        };
        if (opts.rotate) {
          var th = li.querySelector('.thumb'); if (th && it.rot) th.style.transform = 'rotate(' + it.rot + 'deg)';
          mk('Turn', 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5', false, function () { it.rot = ((it.rot || 0) + 90) % 360; api.render(); });
        }
        if (opts.extra) opts.extra(li, it);
        mk('Move up', 'm6 15 6-6 6 6', i === 0, function () { api.items.splice(i - 1, 0, api.items.splice(i, 1)[0]); api.render(); });
        mk('Move down', 'm6 9 6 6 6-6', i === api.items.length - 1, function () { api.items.splice(i + 1, 0, api.items.splice(i, 1)[0]); api.render(); });
        mk('Remove', 'M18 6 6 18M6 6l12 12', false, function () { api.items.splice(i, 1); api.render(); });
        ul.appendChild(li);
      });
      ul.hidden = api.items.length === 0;
      if (onChange) onChange(api.items);
    };
    return api;
  };

  SK.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  window.SK = SK;
})();
