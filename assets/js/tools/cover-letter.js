(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var status = $('status'), R = window.SKResume;
  var RKEY = 'sk-resume-v1', CKEY = 'sk-cover-v1', SIGKEY = 'sk-sign-v1';
  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var resume = get(RKEY) || { name: '', title: '', email: '', phone: '', location: '', link: '', exp: [], edu: [], skills: '', tpl: 'modern', color: 'theme', font: 'theme', paper: 'a4' };
  var letter = get(CKEY) || { job: '', company: '', manager: '', address: '', p1: '', p2: '', p3: '', p4: '', signoff: 'Sincerely,' };
  var sig = get(SIGKEY);
  if (!sig) { $('c-sig').disabled = true; $('c-sig').parentNode.title = 'Save a signature in “Sign a PDF” first'; $('c-sig').parentNode.style.opacity = '.55'; }
  var theme = R.byId[resume.tpl] || R.THEMES[0];
  $('tpl-name').textContent = theme.name;
  if (resume.name) { $('from-resume').hidden = false; $('from-resume').textContent = 'We found your resume for ' + resume.name + '. Your letter uses the same details and design.'; }

  document.querySelectorAll('[data-c]').forEach(function (el) {
    var k = el.getAttribute('data-c'); el.value = letter[k] || (k === 'signoff' ? 'Sincerely,' : '');
    el.addEventListener('input', function () { letter[k] = el.value; changed(); });
    el.addEventListener('change', function () { letter[k] = el.value; changed(); });
  });
  document.querySelectorAll('[data-r]').forEach(function (el) {
    var k = el.getAttribute('data-r'); el.value = resume[k] || '';
    el.addEventListener('input', function () { resume[k] = el.value; var saved = get(RKEY); if (saved) { saved[k] = el.value; put(RKEY, saved); } changed(); });
  });
  $('c-sig').addEventListener('change', changed);

  // ---------- First draft from the resume ----------
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function bullets() {
    var out = [];
    (resume.exp || []).forEach(function (e) { (e.bullets || '').split('\n').forEach(function (b) { b = b.replace(/^[-*•]\s*/, '').trim(); if (b) out.push({ b: b, e: e }); }); });
    // Prefer achievements with numbers
    return out.sort(function (a, b) { return (/\d/.test(b.b) ? 1 : 0) - (/\d/.test(a.b) ? 1 : 0); });
  }
  $('draft').addEventListener('click', function () {
    var filled = ['p1', 'p2', 'p3', 'p4'].some(function (k) { return (letter[k] || '').trim(); });
    if (filled && !confirm('Replace your letter with a new first draft?')) return;
    var job = letter.job.trim() || '[job title]', co = letter.company.trim() || '[company name]';
    var skills = (resume.skills || '').split(/\s*,\s*/).filter(Boolean).slice(0, 3);
    var years = window.SKCheck ? SKCheck.yearsOf(resume) : null;
    var first = (resume.exp || []).find(function (e) { return (e.role || '').trim(); });
    var bs = bullets();
    var skillTxt = skills.length > 1 ? skills.slice(0, -1).join(', ') + ' and ' + skills[skills.length - 1] : (skills[0] || '[your main skills]');
    letter.p1 = 'I am writing to apply for the ' + job + ' position at ' + co + '. ' +
      (years ? 'With ' + years + ' years of experience' + (resume.title ? ' as a ' + resume.title : '') : (resume.title ? 'As a ' + resume.title : 'With my background')) +
      ' and strong skills in ' + skillTxt + ', I am confident I can make a real contribution to your team.';
    if (first && bs.length) {
      letter.p2 = 'In my role as ' + first.role + (first.company ? ' at ' + first.company : '') + ', I ' + lowerFirst(bs[0].b.replace(/\.$/, '')) + '. ' +
        (bs[1] ? 'I also ' + lowerFirst(bs[1].b.replace(/\.$/, '')) + '. ' : '') +
        'I would bring the same focus on results to ' + co + '.';
    } else {
      letter.p2 = 'During my studies and projects, I [describe one thing you achieved, with a number if possible]. This taught me [a skill the job needs], which I am eager to use at ' + co + '.';
    }
    letter.p3 = 'I am especially drawn to ' + co + ' because [one specific reason — its products, values, customers or growth]. I would be proud to help the team [what you would help them achieve].';
    letter.p4 = 'Thank you for considering my application. I would welcome the chance to discuss how I can help ' + co + '. I look forward to hearing from you.';
    if (!letter.manager.trim() && /faithfully/.test(letter.signoff) === false && /sincerely/i.test(letter.signoff)) { /* keep */ }
    ['p1', 'p2', 'p3', 'p4'].forEach(function (k) { $('c-' + k).value = letter[k]; });
    changed(true);
    $('c-p3').focus();
  });

  // ---------- Build the PDF ----------
  var fontData = {};
  function ensureFont() {
    var f = resume.font;
    if (!f || f === 'theme' || f === 'helvetica' || f === 'times' || fontData[f]) return Promise.resolve();
    return R.loadFont(SK.root, f).then(function (d) { if (d) fontData[f] = d; });
  }
  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function build(jsPDF) {
    var letterPaper = resume.paper === 'letter';
    var doc = new jsPDF({ unit: 'pt', format: letterPaper ? 'letter' : 'a4', compress: true });
    var W = letterPaper ? 612 : 595.28, H = letterPaper ? 792 : 841.89, M = 64;
    if (fontData[resume.font]) {
      var fd = fontData[resume.font];
      [['regular', 'normal'], ['bold', 'bold'], ['italic', 'italic']].forEach(function (st) { var f = resume.font + '-' + st[0] + '.ttf'; doc.addFileToVFS(f, fd[st[0]]); doc.addFont(f, resume.font, st[1]); });
    }
    var FONT = resume.font && resume.font !== 'theme' && (resume.font === 'helvetica' || resume.font === 'times' || fontData[resume.font]) ? resume.font : (theme.font || 'helvetica');
    var accent = hexRgb(resume.color && resume.color !== 'theme' ? resume.color : theme.accent);
    var DARK = [29, 29, 31], GREY = [88, 88, 98];
    doc.setProperties({ title: (resume.name || 'Cover letter') + ' - Cover letter', creator: 'DocAura' });
    var clean = R.clean;
    var name = clean(resume.name), title = clean(resume.title);
    var contact = [resume.email, resume.phone, resume.location, resume.link].map(clean).filter(Boolean);
    var y = M;
    function f(style, size, col) { doc.setFont(FONT, style); doc.setFontSize(size); doc.setTextColor.apply(doc, col || DARK); }
    // Header in the resume's style
    if (theme.header === 'band' || theme.layout) {
      var bandH = 34 + (name ? 30 : 0) + (title ? 18 : 0) + (contact.length ? 14 : 0) + 10;
      doc.setFillColor.apply(doc, accent); doc.rect(0, 0, W, bandH, 'F');
      y = 30;
      if (name) { f('bold', 24, [255, 255, 255]); doc.text(name, M, y, { baseline: 'top' }); y += 30; }
      if (title) { f('normal', 12, [255, 255, 255]); doc.text(title, M, y, { baseline: 'top' }); y += 18; }
      if (contact.length) { f('normal', 9.5, [235, 235, 245]); doc.text(doc.splitTextToSize(contact.join('   |   '), W - M * 2)[0], M, y, { baseline: 'top' }); }
      y = bandH + 34;
    } else {
      var center = theme.header === 'center';
      var x0 = center ? W / 2 : M, al = { baseline: 'top', align: center ? 'center' : 'left' };
      if (theme.header === 'strip') { doc.setFillColor.apply(doc, accent); doc.rect(0, 0, W, 10, 'F'); }
      if (name) { f('bold', 24, center ? DARK : accent); doc.text(theme.upperName ? name.toUpperCase() : name, x0, y, al); y += 30; }
      if (title) { f('normal', 12, GREY); doc.text(title, x0, y, al); y += 17; }
      if (contact.length) { f('normal', 9.5, GREY); doc.splitTextToSize(contact.join('  •  '), W - M * 2).forEach(function (l) { doc.text(l, x0, y, al); y += 13; }); }
      y += 8; doc.setDrawColor.apply(doc, accent); doc.setLineWidth(1.4); doc.line(M, y, W - M, y); y += 30;
    }
    var size = 11, lh = size * 1.5, cw = W - M * 2;
    function para(t, opts) {
      opts = opts || {};
      doc.splitTextToSize(clean(t), cw).forEach(function (ln) {
        if (y + lh > H - M) { doc.addPage(); y = M; }
        doc.text(ln, M, y, { baseline: 'top' }); y += lh;
      });
      y += opts.after === undefined ? lh * 0.6 : opts.after;
    }
    f('normal', size, GREY);
    para(new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }), { after: lh * 0.8 });
    f('normal', size);
    var rec = [letter.manager, letter.company, letter.address].map(function (s) { return (s || '').trim(); }).filter(Boolean);
    rec.forEach(function (r) { para(r, { after: 0 }); });
    if (rec.length) y += lh * 0.8;
    if (letter.job.trim()) { f('bold', size); para('Re: Application for ' + letter.job.trim(), { after: lh * 0.8 }); f('normal', size); }
    para('Dear ' + (letter.manager.trim() || 'Hiring Manager') + ',');
    ['p1', 'p2', 'p3', 'p4'].forEach(function (k) { if ((letter[k] || '').trim()) (letter[k] || '').split(/\n{2,}/).forEach(function (pp) { para(pp.replace(/\n/g, ' ')); }); });
    y += lh * 0.3;
    para(letter.signoff || 'Sincerely,', { after: 6 });
    if ($('c-sig').checked && sig) {
      var sh = 42, sw = Math.min(170, sh / sig.aspect);
      if (y + sh > H - M) { doc.addPage(); y = M; }
      doc.addImage(sig.src, 'PNG', M, y, sw, sw * sig.aspect); y += sw * sig.aspect + 6;
    } else y += lh * 0.6;
    f('bold', size); para(name || '[Your name]', { after: 0 });
    return doc;
  }

  // ---------- Preview ----------
  var pdfDoc = null, rendering = false, again = false, timer = null;
  function changed(now) { put(CKEY, letter); clearTimeout(timer); timer = setTimeout(preview, now === true ? 0 : 350); }
  async function preview() {
    if (rendering) { again = true; return; }
    rendering = true;
    try {
      var jsPDF = await SK.jsPDF(), pdfjs = await SK.pdfjs();
      await ensureFont();
      var bytes = build(jsPDF).output('arraybuffer');
      var old = pdfDoc;
      pdfDoc = await pdfjs.getDocument({ data: bytes }).promise;
      if (old) setTimeout(function () { old.destroy(); }, 1500);
      var page = await pdfDoc.getPage(1), c = $('page-canvas'), box = $('paper');
      var vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: box.clientWidth * (window.devicePixelRatio || 1) / vp0.width });
      box.style.aspectRatio = vp0.width + ' / ' + vp0.height;
      var off = document.createElement('canvas'); off.width = Math.floor(vp.width); off.height = Math.floor(vp.height);
      await page.render({ canvasContext: off.getContext('2d'), viewport: vp }).promise;
      c.width = off.width; c.height = off.height; c.getContext('2d').drawImage(off, 0, 0);
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
    rendering = false;
    if (again) { again = false; preview(); }
  }
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(preview, 200); });

  $('dl').addEventListener('click', async function () {
    var all = ['p1', 'p2', 'p3', 'p4'].map(function (k) { return letter[k] || ''; }).join(' ');
    if (/\[[^\]]+\]/.test(all) && !confirm('Your letter still has text in [square brackets]. Download anyway?')) return;
    try {
      var jsPDF = await SK.jsPDF(); await ensureFont();
      var nm = (R.clean(resume.name) || 'my').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
      var blob = build(jsPDF).output('blob');
      SK.download(blob, nm + '-cover-letter.pdf');
      SK.status(status, 'ok', 'Your cover letter has been downloaded (' + SK.bytes(blob.size) + '). Good luck!');
    } catch (e) { SK.status(status, 'err', SK.errText(e)); }
  });

  window.__skCover = { letter: function () { return letter; } };
  preview();
})();
