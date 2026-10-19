(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), result = $('result'), scanBox = $('scan-box');
  var file = null, buf = null, outBlob = null;
  var fname = SK.nameField($('out-btns'), '.docx');

  function docxLib() { return SK.loadScript(SK.root + 'assets/vendor/docx.min.js').then(function () { return window.docx; }); }

  SK.drop($('drop'), async function (files) {
    var f = files[0];
    if (!SK.isPdf(f)) { SK.status(status, 'err', 'Please choose a PDF file.'); return; }
    file = f; buf = await f.arrayBuffer();
    $('file-info').innerHTML = ''; $('file-info').appendChild(SK.fileItem(f.name, f.size)); $('file-info').hidden = false;
    fname.set(SK.baseName(f.name));
    $('drop').hidden = true; $('opts').hidden = false; result.classList.remove('show'); scanBox.classList.remove('show');
    SK.status(status); SK.step(2); $('go').focus();
  });

  // ---- Reading order: items → lines → paragraphs ----
  function pageLines(tc, vp) {
    var W = vp.width, segs = [];
    var items = tc.items.filter(function (it) { return it.str !== undefined; }).map(function (it) {
      var p = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      var size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
      return { s: it.str, x: p[0], y: p[1], w: it.width, size: size, font: it.fontName };
    }).filter(function (it) { return it.s.trim() || it.s === ' '; });
    items.sort(function (a, b) { return Math.abs(a.y - b.y) < Math.min(a.size, b.size) * 0.45 ? a.x - b.x : a.y - b.y; });
    // Build line segments; a big horizontal gap starts a new segment (columns, tab stops)
    var cur = null;
    items.forEach(function (it) {
      var sameLine = cur && Math.abs(it.y - cur.y) < Math.min(it.size, cur.size) * 0.5;
      var gap = cur ? it.x - cur.x1 : 0;
      if (sameLine && gap < cur.size * 2.5) {
        if (gap > cur.size * 0.2 && !/\s$/.test(cur.t) && !/^\s/.test(it.s)) cur.t += ' ';
        cur.t += it.s; cur.x1 = Math.max(cur.x1, it.x + it.w); cur.size = Math.max(cur.size, it.size);
      } else {
        cur = { t: it.s, x: it.x, x1: it.x + it.w, y: it.y, size: it.size };
        segs.push(cur);
      }
    });
    segs.forEach(function (s) { s.t = s.t.replace(/\s+/g, ' ').trim(); });
    segs = segs.filter(function (s) { return s.t; });
    // Two-column pages: many segments start right of the middle and the rest end before it
    var right = segs.filter(function (s) { return s.x > W * 0.45; });
    var leftEnds = segs.filter(function (s) { return s.x < W * 0.45 && s.x1 < W * 0.56; });
    if (right.length > 4 && right.length > segs.length * 0.3 && leftEnds.length > segs.length * 0.3) {
      var col1 = segs.filter(function (s) { return s.x <= W * 0.45; }), col2 = right;
      segs = col1.sort(byY).concat(col2.sort(byY));
    }
    return segs;
  }
  function byY(a, b) { return a.y - b.y; }

  function paragraphs(lines, bodySize) {
    var out = [], p = null, maxW = 0;
    lines.forEach(function (l) { maxW = Math.max(maxW, l.x1 - l.x); });
    lines.forEach(function (l, i) {
      var prev = lines[i - 1];
      var newPara = !p || l.y < prev.y ||                               // column jump
        l.y - prev.y > Math.max(prev.size, l.size) * 1.65 ||           // big vertical gap
        Math.abs(l.size - p.size) > p.size * 0.15 ||                   // size change (heading)
        (prev.x1 - prev.x) < maxW * 0.7 && /[.:!?]$/.test(prev.t) ||   // short line ending a sentence
        /^([•●▪◦\-*–]|\d{1,2}[.)]|[a-z][.)])\s/.test(l.t) ||            // list item
        l.x - p.x > l.size * 1.5 ||                                    // indented first line
        l.size >= bodySize * 1.25 && (prev.x1 - prev.x) < maxW * 0.8;  // big text: each short line is its own heading
      if (newPara) { p = { lines: [l.t], size: l.size, x: l.x, x1: l.x1, center: false }; out.push(p); }
      else {
        var last = p.lines[p.lines.length - 1];
        if (/[a-z]-$/.test(last) && /^[a-z]/.test(l.t)) p.lines[p.lines.length - 1] = last.slice(0, -1) + l.t;
        else p.lines.push(l.t);
        p.x1 = Math.max(p.x1, l.x1);
      }
    });
    out.forEach(function (q) { q.text = q.lines.join(' ').replace(/ ([,.;:!?])/g, '$1'); q.heading = q.size >= bodySize * 1.6 ? 1 : q.size >= bodySize * 1.25 ? 2 : 0; });
    return out;
  }

  async function extract(pdf, onPage) {
    var pages = [], chars = 0, sizes = {};
    for (var i = 1; i <= pdf.numPages; i++) {
      onPage(i, pdf.numPages);
      var page = await pdf.getPage(i);
      var vp = page.getViewport({ scale: 1 });
      var tc = await page.getTextContent();
      var lines = pageLines(tc, vp);
      lines.forEach(function (l) { chars += l.t.length; var k = Math.round(l.size * 2) / 2; sizes[k] = (sizes[k] || 0) + l.t.length; });
      pages.push({ lines: lines, vp: vp, w: vp.width, h: vp.height });
      page.cleanup();
    }
    var body = 11, best = 0;
    Object.keys(sizes).forEach(function (k) { if (sizes[k] > best) { best = sizes[k]; body = Number(k); } });
    return { pages: pages, chars: chars, body: body };
  }

  $('go').addEventListener('click', async function () {
    if (!buf) return;
    $('go').disabled = true; result.classList.remove('show'); scanBox.classList.remove('show');
    try {
      SK.status(status, 'info', 'Reading your PDF…');
      var pdfjs = await SK.pdfjs(), D = await docxLib();
      var pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      var ex = await extract(pdf, function (i, n) { SK.status(status, 'info', 'Reading page ' + i + ' of ' + n + '…', (i / n) * 80); });
      if (ex.chars < 25 * pdf.numPages) {
        SK.status(status); scanBox.classList.add('show'); $('as-pics').focus(); $('go').disabled = false; return;
      }
      var children = [], paraCount = 0, sample = [];
      ex.pages.forEach(function (pg, pi) {
        var paras = paragraphs(pg.lines, ex.body);
        paras.forEach(function (q, qi) {
          var isList = /^([•●▪◦\-*–])\s/.test(q.text);
          var text = isList ? q.text.replace(/^([•●▪◦\-*–])\s/, '') : q.text;
          var center = Math.abs((q.x + q.x1) / 2 - pg.w / 2) < pg.w * 0.06 && (q.x1 - q.x) < pg.w * 0.6;
          var opt = {
            children: [new D.TextRun({ text: text, bold: q.heading > 0, size: Math.round((q.heading ? q.size : ex.body) * 2) })],
            spacing: { after: q.heading ? 120 : 160 },
            alignment: center ? D.AlignmentType.CENTER : D.AlignmentType.LEFT,
            pageBreakBefore: $('breaks').checked && pi > 0 && qi === 0
          };
          if (q.heading) opt.heading = q.heading === 1 ? D.HeadingLevel.HEADING_1 : D.HeadingLevel.HEADING_2;
          if (isList) opt.bullet = { level: 0 };
          children.push(new D.Paragraph(opt)); paraCount++;
          if (sample.length < 6) sample.push({ t: text, h: q.heading });
        });
      });
      var first = ex.pages[0];
      var doc = new D.Document({
        creator: 'SimpleKit', title: SK.baseName(file.name),
        styles: { default: { document: { run: { font: 'Calibri', size: Math.round(ex.body * 2) } } } },
        sections: [{ properties: { page: { size: { width: Math.round(first.w * 20), height: Math.round(first.h * 20) }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, children: children }]
      });
      SK.status(status, 'info', 'Making your Word file…', 95);
      outBlob = await D.Packer.toBlob(doc);
      $('out-meta').textContent = pdf.numPages + (pdf.numPages === 1 ? ' page' : ' pages') + ' · ' + paraCount + ' paragraphs · ' + SK.bytes(outBlob.size);
      var box = $('sample'); box.innerHTML = '';
      sample.forEach(function (s) { var el = document.createElement(s.h ? 'b' : 'p'); el.textContent = s.t.length > 220 ? s.t.slice(0, 220) + '…' : s.t; box.appendChild(el); });
      SK.status(status); result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
    $('go').disabled = false;
  });

  // Scanned PDF: each page as a picture in Word
  $('as-pics').addEventListener('click', async function () {
    try {
      var pdfjs = await SK.pdfjs(), D = await docxLib();
      var pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      var children = [], first = null;
      for (var i = 1; i <= pdf.numPages; i++) {
        SK.status(status, 'info', 'Adding page ' + i + ' of ' + pdf.numPages + '…', (i / pdf.numPages) * 100);
        var page = await pdf.getPage(i), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 150 / 72 });
        if (!first) first = vp1;
        var c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        var jpg = new Uint8Array(await (await SK.canvasToBlob(c, 'image/jpeg', 0.82)).arrayBuffer());
        var maxW = 600, wpx = Math.min(maxW, vp1.width * 96 / 72), hpx = wpx * vp1.height / vp1.width;
        children.push(new D.Paragraph({ pageBreakBefore: i > 1, children: [new D.ImageRun({ type: 'jpg', data: jpg, transformation: { width: Math.round(wpx), height: Math.round(hpx) } })] }));
      }
      var doc = new D.Document({ sections: [{ properties: { page: { margin: { top: 360, bottom: 360, left: 360, right: 360 } } }, children: children }] });
      outBlob = await D.Packer.toBlob(doc);
      $('out-meta').textContent = pdf.numPages + ' pages as pictures · ' + SK.bytes(outBlob.size);
      $('sample').innerHTML = '';
      scanBox.classList.remove('show'); SK.status(status); result.classList.add('show'); SK.step(3); $('dl').focus();
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  $('dl').addEventListener('click', function () { if (outBlob) SK.download(outBlob, fname.get()); });
  $('again').addEventListener('click', function () {
    file = buf = outBlob = null; result.classList.remove('show'); $('opts').hidden = true; $('file-info').hidden = true; $('drop').hidden = false;
    SK.step(1); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
