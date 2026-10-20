(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'sk-resume-v1';
  var status = $('status');
  var R = window.SKResume;

  // ---------- Data ----------
  var EMPTY = {
    name: '', title: '', email: '', phone: '', location: '', link: '', summary: '',
    exp: [{ role: '', company: '', place: '', start: '', end: '', bullets: '' }],
    edu: [{ degree: '', school: '', year: '', detail: '' }],
    skills: '', languages: '', certs: '', tpl: 'modern', color: 'theme', photo: '', font: 'theme', paper: 'a4'
  };
  // Ready-made examples for different kinds of jobs (all names and companies are made up).
  // Generated from build/data + build/seo_resume.py into resume-samples.js, shared with the resume example pages.
  var SAMPLES = window.SK_SAMPLES || {};
  var SAMPLE = SAMPLES.finance;

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.exp) { if (!s.color) s.color = 'theme'; return s; }
    } catch (e) {}
    return JSON.parse(JSON.stringify(EMPTY));
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  var data = load();
  if (!R.byId[data.tpl]) data.tpl = 'modern';
  var photoImg = null;

  // ---------- Form ----------
  var FIELDS = {
    exp: [['role', 'Job title', 'e.g. Sales Executive'], ['company', 'Company', 'e.g. ABC Pvt Ltd'], ['place', 'City (optional)', ''],
          ['start', 'Started', 'e.g. Jan 2022'], ['end', 'Ended', 'e.g. Present'], ['bullets', 'What you did (one per line)', 'e.g. Increased sales by 20%', true]],
    edu: [['degree', 'Degree or course', 'e.g. B.Com'], ['school', 'College or school', ''], ['year', 'Year finished', 'e.g. 2020'], ['detail', 'Marks or notes (optional)', 'e.g. 82%']]
  };
  var uid = 0;
  function renderList(kind) {
    var box = $(kind); box.innerHTML = '';
    data[kind].forEach(function (item, i) {
      var div = document.createElement('div'); div.className = 'rb-entry';
      var top = document.createElement('div'); top.className = 'top';
      top.appendChild(document.createTextNode((kind === 'exp' ? 'Job ' : 'Education ') + (i + 1)));
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'link-btn'; rm.textContent = 'Remove';
      rm.setAttribute('aria-label', 'Remove ' + (kind === 'exp' ? 'job ' : 'education ') + (i + 1));
      rm.addEventListener('click', function () { data[kind].splice(i, 1); renderList(kind); changed(); });
      top.appendChild(rm); div.appendChild(top);
      var row = null;
      FIELDS[kind].forEach(function (f) {
        var id = 'rb' + (++uid);
        var wrap = document.createElement('div');
        var lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = f[1];
        var inp = document.createElement(f[3] ? 'textarea' : 'input');
        inp.className = 'input'; inp.id = id; inp.placeholder = f[2]; inp.value = item[f[0]] || '';
        inp.addEventListener('input', function () { item[f[0]] = inp.value; changed(); });
        wrap.appendChild(lab); wrap.appendChild(inp);
        if (kind === 'exp' && (f[0] === 'start' || f[0] === 'end')) {
          if (f[0] === 'start') { row = document.createElement('div'); row.className = 'row'; div.appendChild(row); }
          row.appendChild(wrap);
        } else div.appendChild(wrap);
      });
      box.appendChild(div);
    });
  }
  document.querySelectorAll('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-add');
      data[k].push(k === 'exp' ? { role: '', company: '', place: '', start: '', end: '', bullets: '' } : { degree: '', school: '', year: '', detail: '' });
      renderList(k); changed();
      var inputs = $(k).querySelectorAll('.rb-entry:last-child .input'); if (inputs[0]) inputs[0].focus();
    });
  });
  function fillSimple() {
    document.querySelectorAll('[data-k]').forEach(function (el) { el.value = data[el.getAttribute('data-k')] || ''; });
    $('color').querySelectorAll('.choice').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === (data.color || 'theme') ? 'true' : 'false'); });
    $('font').querySelectorAll('.choice').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === (data.font || 'theme') ? 'true' : 'false'); });
    $('paper-size').querySelectorAll('.choice').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === (data.paper || 'a4') ? 'true' : 'false'); });
    showTheme();
  }
  document.querySelectorAll('[data-k]').forEach(function (el) {
    el.addEventListener('input', function () { data[el.getAttribute('data-k')] = el.value; changed(); });
  });
  SK.choices($('color'), function (v) { data.color = v; changed(true); });
  SK.choices($('font'), function (v) { data.font = v; ensureFont().then(function () { changed(true); }); });
  SK.choices($('paper-size'), function (v) { data.paper = v; changed(true); });
  var fontData = {};
  function ensureFont() {
    var f = data.font;
    if (!f || f === 'theme' || f === 'helvetica' || f === 'times' || fontData[f]) return Promise.resolve();
    SK.status(status, 'info', 'Loading font…');
    return R.loadFont(SK.root, f).then(function (d) { if (d) fontData[f] = d; SK.status(status); });
  }

  // ---------- Photo ----------
  function loadPhoto() {
    photoImg = null;
    $('photo-remove').hidden = !data.photo;
    $('photo-thumb').hidden = !data.photo;
    if (!data.photo) return Promise.resolve();
    $('photo-thumb').src = data.photo;
    return SK.loadImage(data.photo).then(function (im) { photoImg = im; }).catch(function () { data.photo = ''; });
  }
  $('photo-in').addEventListener('change', async function () {
    var f = this.files[0]; this.value = '';
    if (!f) return;
    try {
      var im = await SK.fileToImage(f);
      var S = 480, c = document.createElement('canvas'); c.width = c.height = S;
      var s = Math.max(S / im.naturalWidth, S / im.naturalHeight);
      c.getContext('2d').drawImage(im, (S - im.naturalWidth * s) / 2, (S - im.naturalHeight * s) / 3, im.naturalWidth * s, im.naturalHeight * s);
      data.photo = c.toDataURL('image/jpeg', 0.85);
      await loadPhoto(); showTheme(); changed(true);
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });
  $('photo-remove').addEventListener('click', function () { data.photo = ''; loadPhoto(); showTheme(); changed(true); });

  // ---------- Designs ----------
  function showTheme() {
    var t = R.byId[data.tpl];
    document.querySelectorAll('.show-card').forEach(function (c) {
      var on = c.querySelector('[data-design]').getAttribute('data-design') === data.tpl;
      c.classList.toggle('on', on);
      c.querySelector('.show-use').textContent = on ? '✓ Selected' : 'Use this design';
    });
    $('tpl-name').textContent = t.name;
    $('tpl-tag').textContent = t.tag === 'ats' ? 'Job-portal friendly' : 'Stylish';
    $('tpl-tag').className = 'tpl-tag ' + t.tag;
    $('photo-note').hidden = !(data.photo && !t.photo);
  }
  var dlg = $('designs'), grid = $('design-grid'), thumbsDone = false;
  R.THEMES.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'design-card'; b.setAttribute('data-id', t.id);
    b.innerHTML = '<span class="design-img"><img loading="lazy" alt="" width="600" height="849" src="' + SK.root + 'assets/img/designs/' + t.id + '.webp"></span><span class="design-name"></span><span class="tpl-tag ' + t.tag + '">' +
      (t.tag === 'ats' ? 'Job-portal friendly' : 'Stylish') + (t.photo ? ' · photo' : '') + '</span>';
    b.querySelector('.design-name').textContent = t.name;
    var bf = document.createElement('span'); bf.className = 'design-best'; bf.textContent = 'Best for: ' + (t.best || []).join(', ');
    b.insertBefore(bf, b.querySelector('.tpl-tag'));
    b.setAttribute('data-best', (t.best || []).join('|') + '|' + (t.tag === 'ats' ? 'ATS' : 'Stylish') + (t.photo ? '|Photo' : ''));
    b.addEventListener('click', function () {
      data.tpl = t.id; showTheme(); changed(true); closeDesigns();
    });
    grid.appendChild(b);
  });
  var FILTERS = ['All', 'ATS', 'Fresher', 'IT & tech', 'Finance', 'Sales', 'Marketing', 'Healthcare', 'Teaching', 'Executive', 'Engineering', 'Creative', 'Photo'];
  var FLABEL = { ATS: 'Job-portal friendly', Photo: 'With photo' };
  FILTERS.forEach(function (f, i) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = FLABEL[f] || f; b.setAttribute('aria-pressed', i ? 'false' : 'true');
    b.addEventListener('click', function () {
      $('design-filter').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true');
      grid.querySelectorAll('.design-card').forEach(function (c) { c.hidden = f !== 'All' && c.getAttribute('data-best').split('|').indexOf(f) < 0; });
    });
    $('design-filter').appendChild(b);
  });
  function markCurrent() {
    grid.querySelectorAll('.design-card').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-id') === data.tpl ? 'true' : 'false'); });
  }
  function openDesigns() {
    markCurrent();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    var cur = grid.querySelector('[aria-pressed="true"]'); if (cur) cur.focus();

  }
  function closeDesigns() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); $('open-designs').focus(); }
  $('open-designs').addEventListener('click', openDesigns);
  $('see-all').addEventListener('click', openDesigns);
  // Showcase at the top of the page: pick a design, then jump to the form
  document.querySelectorAll('.showcase [data-design]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-design');
      if (!R.byId[id]) return;
      data.tpl = id; showTheme(); changed(true);
      SK.status(status, 'ok', 'Design chosen: ' + R.byId[id].name + '. Now fill in your details.');
      var target = $('fill-h'); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { $('f-name').focus({ preventScroll: true }); }, 500);
    });
  });
  $('close-designs').addEventListener('click', closeDesigns);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDesigns(); });

  async function drawThumbs() {
    var jsPDF = await SK.jsPDF(), pdfjs = await SK.pdfjs();
    var sample = JSON.parse(JSON.stringify(SAMPLE));
    var cards = grid.querySelectorAll('.design-card');
    for (var i = 0; i < R.THEMES.length; i++) {
      var t = R.THEMES[i];
      try {
        var bytes = R.build(jsPDF, sample, t.id, 'theme', null).output('arraybuffer');
        var pdf = await pdfjs.getDocument({ data: bytes }).promise;
        var page = await pdf.getPage(1);
        var vp = page.getViewport({ scale: 360 / page.getViewport({ scale: 1 }).width });
        var c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        var img = new Image(); img.alt = ''; img.src = c.toDataURL('image/jpeg', 0.82);
        var holder = cards[i].querySelector('.design-img'); holder.innerHTML = ''; holder.appendChild(img);
        pdf.destroy();
      } catch (e) { /* leave placeholder */ }
    }
  }

  $('sample').addEventListener('click', function () {
    if (hasContent() && !confirm('Replace what you typed with the example?')) return;
    var keep = { tpl: data.tpl, color: data.color, photo: data.photo, font: data.font, paper: data.paper };
    data = JSON.parse(JSON.stringify(SAMPLES[$('sample-kind').value] || SAMPLE)); Object.assign(data, keep); refreshAll();
  });
  $('clear').addEventListener('click', function () {
    if (hasContent() && !confirm('Clear everything and start empty?')) return;
    data = JSON.parse(JSON.stringify(EMPTY)); refreshAll();
  });
  function hasContent() { return !!(data.name || data.summary || (data.exp[0] && data.exp[0].role)); }
  function refreshAll() { fillSimple(); renderList('exp'); renderList('edu'); Promise.all([loadPhoto(), ensureFont()]).then(function () { showTheme(); changed(true); }); }

  var timer = null, tipTimer = null;
  function changed(now) {
    save();
    clearTimeout(tipTimer); tipTimer = setTimeout(renderTips, 600);
    clearTimeout(timer);
    timer = setTimeout(preview, now ? 0 : 350);
  }
  function buildPdf(jsPDF) { return R.build(jsPDF, data, data.tpl, data.color, photoImg, { font: data.font, paper: data.paper, fonts: fontData }); }

  // ---------- Preview ----------
  var pdfDoc = null, pageNo = 1, rendering = false, again = false;
  async function preview() {
    if (rendering) { again = true; return; }
    rendering = true;
    try {
      var jsPDF = await SK.jsPDF();
      var pdfjs = await SK.pdfjs();
      var bytes = buildPdf(jsPDF).output('arraybuffer');
      var old = pdfDoc;
      pdfDoc = await pdfjs.getDocument({ data: bytes }).promise;
      if (pageNo > pdfDoc.numPages) pageNo = pdfDoc.numPages;
      await drawPage();
      if (old) setTimeout(function () { old.destroy(); }, 1500); // let any drawing still using it finish
      $('pager').hidden = pdfDoc.numPages < 2;
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
    rendering = false;
    if (again) { again = false; preview(); }
  }
  async function drawPage() {
    var page = await pdfDoc.getPage(pageNo);
    var c = $('page-canvas'), box = $('paper');
    var vp0 = page.getViewport({ scale: 1 });
    box.style.aspectRatio = vp0.width + ' / ' + vp0.height;
    var scale = (box.clientWidth * (window.devicePixelRatio || 1)) / vp0.width;
    var vp = page.getViewport({ scale: scale });
    var off = document.createElement('canvas'); off.width = Math.floor(vp.width); off.height = Math.floor(vp.height);
    await page.render({ canvasContext: off.getContext('2d'), viewport: vp }).promise;
    c.width = off.width; c.height = off.height; c.getContext('2d').drawImage(off, 0, 0);
    $('page-no').textContent = 'Page ' + pageNo + ' of ' + pdfDoc.numPages;
    $('prev-p').disabled = pageNo <= 1; $('next-p').disabled = pageNo >= pdfDoc.numPages;
  }
  function safeDraw() { drawPage().catch(function () {}); }
  $('prev-p').addEventListener('click', function () { if (pageNo > 1) { pageNo--; safeDraw(); } });
  $('next-p').addEventListener('click', function () { if (pdfDoc && pageNo < pdfDoc.numPages) { pageNo++; safeDraw(); } });
  SK.onWidthChange(function () { if (pdfDoc) safeDraw(); });

  $('dl').addEventListener('click', async function () {
    try {
      var jsPDF = await SK.jsPDF();
      var name = (R.clean(data.name) || 'my').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
      var blob = buildPdf(jsPDF).output('blob');
      SK.download(blob, name + '-resume.pdf');
      SK.status(status, 'ok', 'Your resume has been downloaded (' + SK.bytes(blob.size) + '). Good luck!');
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  // ---------- Check my resume ----------
  function chip(text, cls, onAdd) {
    var c = document.createElement('span'); c.className = 'kw ' + cls; c.textContent = text;
    if (onAdd) { var b = document.createElement('button'); b.type = 'button'; b.textContent = '+ Add'; b.setAttribute('aria-label', 'Add ' + text + ' to my skills'); b.addEventListener('click', onAdd); c.appendChild(b); }
    return c;
  }
  function nice(k) {
    var jd = $('jd').value, m = jd.match(new RegExp('(^|[^A-Za-z0-9])(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![A-Za-z0-9])', 'i'));
    if (m) return m[2]; return k.length <= 4 && !/\./.test(k) ? k.toUpperCase() : k.replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }); }
  function runMatch() {
    var jd = $('jd').value.trim(), box = $('match-out');
    if (jd.split(/\s+/).length < 25) { box.hidden = false; box.innerHTML = '<p class="status show err" role="alert">Please paste the full job advert (at least a few lines).</p>'; return; }
    var r = SKCheck.analyze(data, jd);
    box.hidden = false; box.innerHTML = '';
    var col = r.score >= 70 ? ['#DDF3E6', '#1D6B45'] : r.score >= 45 ? ['#FFF1C9', '#7A5200'] : ['#FBE1E6', '#9B1C31'];
    var m = document.createElement('div'); m.className = 'meter';
    m.innerHTML = '<span class="ring" style="background:' + col[0] + ';color:' + col[1] + '">' + r.score + '%</span><div><b>Keyword match</b><p class="hint" style="margin:2px 0 0">' +
      (r.score >= 70 ? 'Great match. Make sure your strongest points are near the top.' : r.score >= 45 ? 'Good start. Add the missing keywords you really have.' : 'Low match. Add the skills below that you have, using the same words as the advert.') +
      '</p><p class="hint" style="margin:2px 0 0;font-size:13px">This compares words only. Every company’s system is different, so it is a guide, not an official score.</p></div>';
    box.appendChild(m);
    if (r.missing.length) {
      var h = document.createElement('b'); h.textContent = 'Missing from your resume (' + r.missing.length + ')'; box.appendChild(h);
      var w = document.createElement('div'); w.className = 'kw-chips';
      r.missing.forEach(function (k) { w.appendChild(chip(nice(k), 'miss', function () { addSkill(nice(k)); this.parentNode.remove(); })); });
      box.appendChild(w);
      var hint = document.createElement('p'); hint.className = 'hint'; hint.style.margin = '0'; hint.textContent = 'Only add skills you really have. It is even better to mention them in a work achievement too.'; box.appendChild(hint);
    }
    if (r.matched.length) {
      var h2 = document.createElement('b'); h2.textContent = 'Already in your resume (' + r.matched.length + ')'; box.appendChild(h2);
      var w2 = document.createElement('div'); w2.className = 'kw-chips';
      r.matched.forEach(function (k) { w2.appendChild(chip(nice(k), 'hit')); }); box.appendChild(w2);
    }
    r.notes.forEach(function (n) { var p = document.createElement('p'); p.className = 'tip'; p.textContent = n; box.appendChild(p); });
  }
  function addSkill(k) {
    var list = (data.skills || '').split(/\s*,\s*/).filter(Boolean);
    if (list.map(function (x) { return x.toLowerCase(); }).indexOf(k.toLowerCase()) < 0) list.push(k);
    data.skills = list.join(', '); $('f-skills').value = data.skills; changed(true);
  }
  $('match-go').addEventListener('click', runMatch);
  function renderTips() {
    var list = SKCheck.tips(data), box = $('tips'); box.innerHTML = '';
    var fixes = list.filter(function (t) { return t.apply; });
    if (!list.length) { var g = document.createElement('div'); g.className = 'tip good'; g.textContent = 'Looking good! No common problems found.'; box.appendChild(g); }
    list.slice(0, 12).forEach(function (t) {
      var d = document.createElement('div'); d.className = 'tip';
      var tx = document.createElement('div'); tx.className = 'tx'; tx.textContent = t.msg;
      if (t.quote) { var q = document.createElement('q'); q.textContent = t.quote; tx.appendChild(q); }
      if (t.to) { var q2 = document.createElement('q'); q2.style.fontStyle = 'normal'; q2.style.color = '#1D6B45'; q2.textContent = '→ ' + t.to; tx.appendChild(q2); }
      d.appendChild(tx);
      if (t.apply) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-small'; b.textContent = 'Fix'; b.addEventListener('click', function () { t.apply(data); renderList('exp'); changed(true); renderTips(); }); d.appendChild(b); }
      box.appendChild(d);
    });
    $('fix-all').hidden = fixes.length < 2;
  }
  $('fix-all').addEventListener('click', function () { SKCheck.tips(data).forEach(function (t) { if (t.apply) t.apply(data); }); renderList('exp'); changed(true); renderTips(); });

  // Example list in the "Fill with this example" menu
  (function () {
    var sel = $('sample-kind'), L = window.SK_SAMPLE_LABELS || {};
    if (!sel || !Object.keys(L).length) return;
    sel.innerHTML = '';
    Object.keys(L).forEach(function (k) { if (!SAMPLES[k]) return; var o = document.createElement('option'); o.value = k; o.textContent = 'Example: ' + L[k]; sel.appendChild(o); });
  })();

  // Links from the resume example and template pages: ?example=it&design=tech
  (function () {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var own = function (o, k) { return !!k && Object.prototype.hasOwnProperty.call(o, k); };
    var ex = q.get('example'), ds = q.get('design'), note = [];
    if (own(SAMPLES, ex)) {
      var label = own(window.SK_SAMPLE_LABELS || {}, ex) ? window.SK_SAMPLE_LABELS[ex] : 'this';
      if (!hasContent() || confirm('Open the ' + label + ' example? This replaces what you typed before.')) {
        var keep = { tpl: data.tpl, color: data.color, photo: data.photo, font: data.font, paper: data.paper };
        data = JSON.parse(JSON.stringify(SAMPLES[ex])); Object.assign(data, keep);
        if ($('sample-kind')) $('sample-kind').value = ex;
        note.push('The ' + label + ' example is filled in — change it to your own details.');
      }
    }
    if (own(R.byId, ds)) { data.tpl = ds; note.unshift('Design chosen: ' + R.byId[ds].name + '.'); }
    if (note.length) {
      save();
      setTimeout(function () { SK.status(status, 'ok', note.join(' ')); var t = $('fill-h'); if (t) t.scrollIntoView({ block: 'start' }); }, 300);
    }
    if (ex || ds) try { history.replaceState(null, '', location.pathname); } catch (e) {}
  })();

  // For automated tests
  window.__skResume = { set: function (d) { data = d; refreshAll(); }, get: function () { return data; }, samples: SAMPLES, build: function (jsPDF) { return buildPdf(jsPDF); } };

  refreshAll();
})();
