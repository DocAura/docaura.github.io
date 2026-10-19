(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'sk-resume-v1';
  var status = $('status');

  // ---------- Data ----------
  var EMPTY = {
    name: '', title: '', email: '', phone: '', location: '', link: '', summary: '',
    exp: [{ role: '', company: '', place: '', start: '', end: '', bullets: '' }],
    edu: [{ degree: '', school: '', year: '', detail: '' }],
    skills: '', languages: '', certs: '', tpl: 'modern', color: '#3B2D8F'
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
    languages: 'English, Hindi, Telugu', certs: 'GST Practitioner Certificate (2019)', tpl: 'modern', color: '#3B2D8F'
  };

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.exp) return s; } catch (e) {}
    return JSON.parse(JSON.stringify(EMPTY));
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  var data = load();

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
      FIELDS[kind].forEach(function (f, fi) {
        var id = 'rb' + (++uid);
        var wrap = document.createElement('div');
        var lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = f[1];
        var inp = document.createElement(f[3] ? 'textarea' : 'input');
        inp.className = 'input'; inp.id = id; inp.placeholder = f[2]; inp.value = item[f[0]] || '';
        inp.addEventListener('input', function () { item[f[0]] = inp.value; changed(); });
        wrap.appendChild(lab); wrap.appendChild(inp);
        var pair = (kind === 'exp' && (f[0] === 'start' || f[0] === 'end')) || (kind === 'edu' && f[0] === 'year');
        if (pair && kind === 'exp') {
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
    ['tpl', 'color'].forEach(function (g) {
      $(g).querySelectorAll('.choice').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === data[g] ? 'true' : 'false'); });
    });
  }
  document.querySelectorAll('[data-k]').forEach(function (el) {
    el.addEventListener('input', function () { data[el.getAttribute('data-k')] = el.value; changed(); });
  });
  SK.choices($('tpl'), function (v) { data.tpl = v; changed(true); });
  SK.choices($('color'), function (v) { data.color = v; changed(true); });

  $('sample').addEventListener('click', function () {
    if (hasContent() && !confirm('Replace what you typed with the example?')) return;
    data = JSON.parse(JSON.stringify(SAMPLE)); refreshAll();
  });
  $('clear').addEventListener('click', function () {
    if (hasContent() && !confirm('Clear everything and start empty?')) return;
    data = JSON.parse(JSON.stringify(EMPTY)); refreshAll();
  });
  function hasContent() { return !!(data.name || data.summary || (data.exp[0] && data.exp[0].role)); }
  function refreshAll() { fillSimple(); renderList('exp'); renderList('edu'); changed(true); }

  var timer = null;
  function changed(now) {
    save();
    clearTimeout(timer);
    timer = setTimeout(preview, now ? 0 : 350);
  }

  // ---------- PDF layout ----------
  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function clean(s) { return (s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/–|—/g, '-').replace(/₹/g, 'Rs.').trim(); }

  function buildPdf(jsPDF) {
    var d = data, tpl = d.tpl, accent = hexRgb(d.color || '#3B2D8F');
    var doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    doc.setProperties({ title: (clean(d.name) || 'Resume') + ' - Resume', creator: 'SimpleKit Resume Builder' });
    var W = 595.28, H = 841.89;
    var M = tpl === 'compact' ? 40 : 48;
    var font = tpl === 'compact' ? 'times' : 'helvetica';
    var body = tpl === 'compact' ? 10.5 : 10;
    var lh = body * 1.38;
    var y = M, cw = W - M * 2;
    var dark = [29, 29, 31], grey = [90, 90, 98];

    function ensure(h) { if (y + h > H - M) { doc.addPage(); y = M; } }
    function setF(style, size, color) { doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor.apply(doc, color || dark); }
    function para(text, opts) {
      opts = opts || {};
      var x = opts.x || M, w = opts.w || cw;
      var lines = doc.splitTextToSize(text, w);
      lines.forEach(function (ln) { ensure(lh); doc.text(ln, x, y, { baseline: 'top', align: opts.align || 'left' }); y += lh; });
    }

    // Header
    var contact = [d.email, d.phone, d.location, d.link].map(clean).filter(Boolean);
    if (tpl === 'modern') {
      var bandH = 34 + (d.name ? 30 : 0) + (d.title ? 18 : 0) + (contact.length ? 16 : 0);
      doc.setFillColor.apply(doc, accent); doc.rect(0, 0, W, bandH, 'F');
      y = 30;
      if (d.name) { setF('bold', 26, [255, 255, 255]); doc.text(clean(d.name), M, y, { baseline: 'top' }); y += 32; }
      if (d.title) { setF('normal', 12.5, [255, 255, 255]); doc.text(clean(d.title), M, y, { baseline: 'top' }); y += 19; }
      if (contact.length) { setF('normal', 9.5, [235, 235, 245]); doc.text(doc.splitTextToSize(contact.join('   |   '), cw)[0], M, y, { baseline: 'top' }); }
      y = bandH + 22;
    } else {
      var center = tpl === 'classic';
      var x0 = center ? W / 2 : M, al = center ? 'center' : 'left';
      if (d.name) { setF('bold', tpl === 'compact' ? 22 : 24, center ? dark : accent); doc.text(clean(d.name), x0, y, { baseline: 'top', align: al }); y += tpl === 'compact' ? 26 : 30; }
      if (d.title) { setF('normal', 12, grey); doc.text(clean(d.title), x0, y, { baseline: 'top', align: al }); y += 17; }
      if (contact.length) {
        setF('normal', 9.5, grey);
        doc.splitTextToSize(contact.join('  •  '), cw).forEach(function (ln) { doc.text(ln, x0, y, { baseline: 'top', align: al }); y += 13; });
      }
      y += 6;
      if (center) { doc.setDrawColor.apply(doc, accent); doc.setLineWidth(1.5); doc.line(M, y, W - M, y); y += 14; }
      else y += 6;
    }

    function heading(t) {
      ensure(40);
      y += tpl === 'compact' ? 4 : 8;
      setF('bold', tpl === 'compact' ? 11 : 11.5, accent);
      var label = tpl === 'modern' ? t : t.toUpperCase();
      if (tpl === 'modern') { doc.setFillColor.apply(doc, accent); doc.rect(M, y + 1, 3.5, 12, 'F'); doc.text(label, M + 10, y, { baseline: 'top' }); y += 19; }
      else {
        if (doc.setCharSpace) doc.setCharSpace(0.8);
        doc.text(label, M, y, { baseline: 'top' });
        if (doc.setCharSpace) doc.setCharSpace(0);
        y += 15; doc.setDrawColor(200, 200, 205); doc.setLineWidth(0.7); doc.line(M, y, W - M, y); y += 8;
      }
    }
    function rowLR(left, right, style, size) {
      setF(style, size);
      var rw = right ? doc.getTextWidth(right) + 12 : 0;
      var lines = doc.splitTextToSize(left, cw - rw);
      ensure(lh * lines.length);
      lines.forEach(function (ln, i) {
        doc.text(ln, M, y, { baseline: 'top' });
        if (i === 0 && right) { setF('normal', body - 0.5, grey); doc.text(right, W - M, y, { baseline: 'top', align: 'right' }); setF(style, size); }
        y += lh + 0.5;
      });
    }
    function bullets(text) {
      setF('normal', body);
      text.split(/\n+/).map(clean).filter(Boolean).forEach(function (b) {
        b = b.replace(/^[-•*]\s*/, '');
        var lines = doc.splitTextToSize(b, cw - 14);
        ensure(lh * Math.min(lines.length, 2));
        lines.forEach(function (ln, i) {
          ensure(lh);
          if (i === 0) doc.text('•', M + 2, y, { baseline: 'top' });
          doc.text(ln, M + 14, y, { baseline: 'top' }); y += lh;
        });
      });
    }

    if (clean(d.summary)) { heading('Summary'); setF('normal', body); para(clean(d.summary)); y += 4; }

    var exps = d.exp.filter(function (e) { return clean(e.role) || clean(e.company); });
    if (exps.length) {
      heading('Work experience');
      exps.forEach(function (e, i) {
        if (i) y += 7;
        ensure(lh * 3);
        var dates = [clean(e.start), clean(e.end)].filter(Boolean).join(' - ');
        rowLR(clean(e.role) || clean(e.company), dates, 'bold', body + 1);
        var sub = [clean(e.role) ? clean(e.company) : '', clean(e.place)].filter(Boolean).join(', ');
        if (sub) { setF('italic', body, grey); para(sub); }
        y += 2;
        if (clean(e.bullets)) bullets(e.bullets);
      });
      y += 4;
    }

    var edus = d.edu.filter(function (e) { return clean(e.degree) || clean(e.school); });
    if (edus.length) {
      heading('Education');
      edus.forEach(function (e, i) {
        if (i) y += 6;
        ensure(lh * 2);
        rowLR(clean(e.degree) || clean(e.school), clean(e.year), 'bold', body + 0.5);
        var sub = [clean(e.degree) ? clean(e.school) : '', clean(e.detail)].filter(Boolean).join(' - ');
        if (sub) { setF('normal', body, grey); para(sub); }
      });
      y += 4;
    }

    if (clean(d.skills)) {
      heading('Skills'); setF('normal', body);
      para(clean(d.skills).split(/\s*,\s*/).filter(Boolean).join('  •  '));
      y += 4;
    }
    if (clean(d.languages)) { heading('Languages'); setF('normal', body); para(clean(d.languages)); y += 4; }
    if (clean(d.certs)) { heading('Certificates and awards'); bullets(d.certs); }

    if (!d.name && !exps.length && !edus.length && !clean(d.summary)) {
      setF('normal', 12, [150, 150, 160]);
      doc.text('Start typing on the left — your resume will appear here.', W / 2, H / 2, { align: 'center' });
    }
    return doc;
  }

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
      var name = (clean(data.name) || 'my').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
      var blob = buildPdf(jsPDF).output('blob');
      SK.download(blob, name + '-resume.pdf');
      SK.status(status, 'ok', 'Your resume has been downloaded (' + SK.bytes(blob.size) + '). Good luck!');
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  // Expose layout for tests
  window.__skResume = { build: function (jsPDF) { return buildPdf(jsPDF); }, set: function (d) { data = d; refreshAll(); } };

  refreshAll();
})();
