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
    skills: '', languages: '', certs: '', tpl: 'modern', color: 'theme', photo: ''
  };
  var SAMPLE = {
    name: 'Priya Sharma', title: 'Senior Accountant', email: 'priya.sharma@email.com', phone: '+91 98765 43210',
    location: 'Hyderabad, India', link: 'linkedin.com/in/priyasharma',
    summary: 'Chartered accountant with 7 years of experience in GST, audits and month-end closing for manufacturing and retail companies. Known for clean books, on-time filings and training junior staff.',
    exp: [
      { role: 'Senior Accountant', company: 'Sunrise Textiles Pvt Ltd', place: 'Hyderabad', start: 'Apr 2021', end: 'Present',
        bullets: 'Closed monthly books 3 days faster by building Excel templates for reconciliations\nFiled GST returns for 4 business units with zero penalties in 3 years\nLed a team of 3 junior accountants and trained them on Tally Prime' },
      { role: 'Accountant', company: 'Kumar & Associates', place: 'Vijayawada', start: 'Jun 2017', end: 'Mar 2021',
        bullets: 'Handled accounts and tax filings for 40+ small business clients\nPrepared statutory audit reports and supported partners in client meetings' }
    ],
    edu: [
      { degree: 'Chartered Accountant (CA)', school: 'Institute of Chartered Accountants of India', year: '2017', detail: '' },
      { degree: 'B.Com', school: 'Osmania University', year: '2014', detail: 'First class with distinction' }
    ],
    skills: 'GST filing, Tally Prime, MS Excel, Audit, TDS, Financial reporting, Team leadership',
    languages: 'English, Hindi, Telugu', certs: 'GST Practitioner Certificate (2019)', tpl: 'modern', color: 'theme', photo: ''
  };

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
    showTheme();
  }
  document.querySelectorAll('[data-k]').forEach(function (el) {
    el.addEventListener('input', function () { data[el.getAttribute('data-k')] = el.value; changed(); });
  });
  SK.choices($('color'), function (v) { data.color = v; changed(true); });

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
    $('tpl-name').textContent = t.name;
    $('tpl-tag').textContent = t.tag === 'ats' ? 'Job-portal friendly' : 'Stylish';
    $('tpl-tag').className = 'tpl-tag ' + t.tag;
    $('photo-note').hidden = !(data.photo && !t.photo);
  }
  var dlg = $('designs'), grid = $('design-grid'), thumbsDone = false;
  R.THEMES.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'design-card'; b.setAttribute('data-id', t.id);
    b.innerHTML = '<span class="design-img"><span class="design-ph">Loading…</span></span><span class="design-name"></span><span class="tpl-tag ' + t.tag + '">' +
      (t.tag === 'ats' ? 'Job-portal friendly' : 'Stylish') + (t.photo ? ' · photo' : '') + '</span>';
    b.querySelector('.design-name').textContent = t.name;
    b.addEventListener('click', function () {
      data.tpl = t.id; showTheme(); changed(true); closeDesigns();
    });
    grid.appendChild(b);
  });
  function markCurrent() {
    grid.querySelectorAll('.design-card').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-id') === data.tpl ? 'true' : 'false'); });
  }
  function openDesigns() {
    markCurrent();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    var cur = grid.querySelector('[aria-pressed="true"]'); if (cur) cur.focus();
    if (!thumbsDone) { thumbsDone = true; drawThumbs(); }
  }
  function closeDesigns() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); $('open-designs').focus(); }
  $('open-designs').addEventListener('click', openDesigns);
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
    var keep = { tpl: data.tpl, color: data.color, photo: data.photo };
    data = JSON.parse(JSON.stringify(SAMPLE)); Object.assign(data, keep); refreshAll();
  });
  $('clear').addEventListener('click', function () {
    if (hasContent() && !confirm('Clear everything and start empty?')) return;
    data = JSON.parse(JSON.stringify(EMPTY)); refreshAll();
  });
  function hasContent() { return !!(data.name || data.summary || (data.exp[0] && data.exp[0].role)); }
  function refreshAll() { fillSimple(); renderList('exp'); renderList('edu'); loadPhoto().then(function () { showTheme(); changed(true); }); }

  var timer = null;
  function changed(now) {
    save();
    clearTimeout(timer);
    timer = setTimeout(preview, now ? 0 : 350);
  }
  function buildPdf(jsPDF) { return R.build(jsPDF, data, data.tpl, data.color, photoImg); }

  // ---------- Preview ----------
  var pdfDoc = null, pageNo = 1, rendering = false, again = false;
  async function preview() {
    if (rendering) { again = true; return; }
    rendering = true;
    try {
      var jsPDF = await SK.jsPDF();
      var pdfjs = await SK.pdfjs();
      var bytes = buildPdf(jsPDF).output('arraybuffer');
      if (pdfDoc) pdfDoc.destroy();
      pdfDoc = await pdfjs.getDocument({ data: bytes }).promise;
      if (pageNo > pdfDoc.numPages) pageNo = pdfDoc.numPages;
      await drawPage();
      $('pager').hidden = pdfDoc.numPages < 2;
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
    rendering = false;
    if (again) { again = false; preview(); }
  }
  async function drawPage() {
    var page = await pdfDoc.getPage(pageNo);
    var c = $('page-canvas'), box = $('paper');
    var vp0 = page.getViewport({ scale: 1 });
    var scale = (box.clientWidth * (window.devicePixelRatio || 1)) / vp0.width;
    var vp = page.getViewport({ scale: scale });
    var off = document.createElement('canvas'); off.width = Math.floor(vp.width); off.height = Math.floor(vp.height);
    await page.render({ canvasContext: off.getContext('2d'), viewport: vp }).promise;
    c.width = off.width; c.height = off.height; c.getContext('2d').drawImage(off, 0, 0);
    $('page-no').textContent = 'Page ' + pageNo + ' of ' + pdfDoc.numPages;
    $('prev-p').disabled = pageNo <= 1; $('next-p').disabled = pageNo >= pdfDoc.numPages;
  }
  $('prev-p').addEventListener('click', function () { if (pageNo > 1) { pageNo--; drawPage(); } });
  $('next-p').addEventListener('click', function () { if (pdfDoc && pageNo < pdfDoc.numPages) { pageNo++; drawPage(); } });
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (pdfDoc) drawPage(); }, 200); });

  $('dl').addEventListener('click', async function () {
    try {
      var jsPDF = await SK.jsPDF();
      var name = (R.clean(data.name) || 'my').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
      var blob = buildPdf(jsPDF).output('blob');
      SK.download(blob, name + '-resume.pdf');
      SK.status(status, 'ok', 'Your resume has been downloaded (' + SK.bytes(blob.size) + '). Good luck!');
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  // For automated tests
  window.__skResume = { set: function (d) { data = d; refreshAll(); }, get: function () { return data; } };

  refreshAll();
})();
