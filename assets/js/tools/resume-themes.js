/* DocAura resume designs: 20 themes drawn with jsPDF as real text (readable by job portals). */
(function () {
  'use strict';

  // tag: 'ats' = single column, safe for company job portals; 'stylish' = sidebar layouts
  var THEMES = [
    { id: 'modern', name: 'Modern', tag: 'ats', accent: '#3B2D8F', header: 'band', heading: 'bar', photo: true, best: ["Any job", "IT & tech", "Sales"] },
    { id: 'classic', name: 'Classic', tag: 'ats', accent: '#3B2D8F', header: 'center', heading: 'rule', best: ["Finance", "Government", "Any job"] },
    { id: 'compact', name: 'Compact', tag: 'ats', accent: '#1F5F8B', font: 'times', header: 'left', heading: 'rule', size: 10.5, margin: 40, tight: true, best: ["Experienced", "Engineering"] },
    { id: 'harvard', name: 'Harvard', tag: 'ats', accent: '#222222', font: 'times', header: 'center', heading: 'center', eduFirst: true, size: 10.5, best: ["Fresher", "Academic", "Finance"] },
    { id: 'executive', name: 'Executive', tag: 'ats', accent: '#1F3A5F', header: 'underline', heading: 'tint', nameSize: 28, best: ["Executive", "Finance"] },
    { id: 'minimal', name: 'Minimal', tag: 'ats', accent: '#333333', header: 'left', heading: 'caps', margin: 56, loose: true, best: ["IT & tech", "Design"] },
    { id: 'fresher', name: 'Fresher', tag: 'ats', accent: '#1D6B45', header: 'split', heading: 'accentrule', eduFirst: true, skills: 'tags', photo: true, best: ["Fresher"] },
    { id: 'swiss', name: 'Swiss', tag: 'ats', accent: '#D9480F', header: 'left', heading: 'accentrule', nameSize: 30, best: ["Creative", "Marketing"] },
    { id: 'spearmint', name: 'Spearmint', tag: 'ats', accent: '#0F7B5F', header: 'left', heading: 'plain', skills: 'tags', best: ["Healthcare"] },
    { id: 'elegant', name: 'Elegant', tag: 'ats', accent: '#1B2A4A', font: 'times', header: 'center', heading: 'lines', upperName: true, best: ["Executive", "Legal"] },
    { id: 'bright', name: 'Bright', tag: 'ats', accent: '#E8590C', header: 'strip', heading: 'bar', skills: 'tags', best: ["Sales", "Marketing"] },
    { id: 'tech', name: 'Tech', tag: 'ats', accent: '#0B7285', headFont: 'courier', header: 'left', heading: 'plain', skills: 'tags', best: ["IT & tech"] },
    { id: 'timeline', name: 'Timeline', tag: 'ats', accent: '#5F3DC4', header: 'left', heading: 'bar', exp: 'timeline', best: ["Experienced", "Any job"] },
    { id: 'sidebar', name: 'Sidebar', tag: 'stylish', accent: '#3B2D8F', layout: 'sidebarL', side: 'fill', heading: 'bar', photo: true, best: ["Creative", "Sales"] },
    { id: 'softside', name: 'Soft Sidebar', tag: 'stylish', accent: '#1F5F8B', layout: 'sidebarR', side: 'tint', heading: 'accentrule', photo: true, best: ["Healthcare", "Teaching"] },
    { id: 'blocks', name: 'Bold Blocks', tag: 'ats', accent: '#222222', header: 'band', heading: 'fill', best: ["Engineering", "Executive"] },
    { id: 'chrono', name: 'Chronological', tag: 'ats', accent: '#1F5F8B', header: 'left', heading: 'side', best: ["Experienced", "Finance"] },
    { id: 'corporate', name: 'Corporate', tag: 'ats', accent: '#0B4F8A', header: 'split', heading: 'accentrule', photo: true, best: ["Finance", "Executive"] },
    { id: 'coral', name: 'Coral', tag: 'stylish', accent: '#D9485F', header: 'band', heading: 'bar', skills: 'tags', photo: true, best: ["Creative", "Hospitality"] },
    { id: 'scholar', name: 'Scholar', tag: 'ats', accent: '#111111', font: 'times', header: 'center', heading: 'smallcaps', size: 10.5, tight: true, nameSize: 26, subRight: true, best: ["IT & tech", "Fresher", "Engineering"] },
    { id: 'academic', name: 'Academic', tag: 'ats', accent: '#2B5D8A', font: 'times', header: 'split', heading: 'smallcaps', eduFirst: true, subRight: true, size: 10.5, best: ["Fresher", "Academic", "Teaching"] },
    { id: 'slate', name: 'Slate Sidebar', tag: 'stylish', accent: '#2E3A4B', layout: 'sidebarL', side: 'fill', sideName: true, nameColor: '#5CC2F2', heading: 'accentrule', photo: true, best: ["Marketing", "Sales", "Executive"] },
    { id: 'teal', name: 'Teal Profile', tag: 'stylish', accent: '#0E9C9C', layout: 'sidebarL', side: 'fill', sideName: true, upperName: true, heading: 'bar', exp: 'timeline', photo: true, best: ["Creative", "Design", "Hospitality"] },
    { id: 'mono', name: 'Mono Bold', tag: 'ats', accent: '#111111', header: 'monotop', heading: 'shortbar', upperName: true, best: ["Executive", "Engineering", "Any job"] },
    { id: 'simple', name: 'Simple', tag: 'ats', accent: '#222222', header: 'left', heading: 'rule', best: ["Any job", "Government", "Teaching"] }
  ];
  var BY_ID = {};
  THEMES.forEach(function (t) { BY_ID[t.id] = t; });

  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mix(c, w, k) { return c.map(function (v, i) { return Math.round(v + (w[i] - v) * k); }); }
  function clean(s) {
    return (s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/–|—/g, '-')
      .replace(/₹/g, 'Rs.').replace(/•/g, '-').trim();
  }

  // Round photo with a solid background, returned as a JPEG data URL
  function roundPhoto(img, bg) {
    var S = 360, c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d');
    x.fillStyle = 'rgb(' + bg.join(',') + ')'; x.fillRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); x.clip();
    var iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(S / iw, S / ih);
    x.drawImage(img, (S - iw * s) / 2, (S - ih * s) / 2.6, iw * s, ih * s);
    x.restore();
    return c.toDataURL('image/jpeg', 0.9);
  }

  // Extra fonts (Lato, Montserrat, Lora) are loaded on demand as base64 TTF
  var FONT_FILES = { lato: 'lato', montserrat: 'montserrat', lora: 'lora' };
  function registerFonts(doc, fonts) {
    if (!fonts) return;
    Object.keys(fonts).forEach(function (fam) {
      var f = fonts[fam];
      [['regular', 'normal'], ['bold', 'bold'], ['italic', 'italic']].forEach(function (st) {
        if (!f[st[0]]) return;
        var file = fam + '-' + st[0] + '.ttf';
        doc.addFileToVFS(file, f[st[0]]); doc.addFont(file, fam, st[1]);
      });
    });
  }
  function loadFont(root, fam) {
    if (!FONT_FILES[fam]) return Promise.resolve(null);
    if (loadFont.cache[fam]) return loadFont.cache[fam];
    loadFont.cache[fam] = Promise.all(['regular', 'bold', 'italic'].map(function (st) {
      return fetch(root + 'assets/fonts/' + fam + '-' + st + '.ttf').then(function (r) { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); }).then(function (b) {
        var u = new Uint8Array(b), bin = '', CH = 0x8000;
        for (var i = 0; i < u.length; i += CH) bin += String.fromCharCode.apply(null, u.subarray(i, i + CH));
        return btoa(bin);
      });
    })).then(function (a) { return { regular: a[0], bold: a[1], italic: a[2] }; }).catch(function () { delete loadFont.cache[fam]; return null; });
    return loadFont.cache[fam];
  }
  loadFont.cache = {};

  function build(jsPDF, d, themeId, colorChoice, photoImg, opts) {
    opts = opts || {};
    var T = BY_ID[themeId] || THEMES[0];
    var accent = hexRgb(colorChoice && colorChoice !== 'theme' ? colorChoice : T.accent);
    var WHITE = [255, 255, 255], DARK = [29, 29, 31], GREY = [88, 88, 98], LINE = [205, 205, 212];
    var tint = mix(accent, WHITE, 0.88);
    var letter = opts.paper === 'letter';
    var doc = new jsPDF({ unit: 'pt', format: letter ? 'letter' : 'a4', compress: true });
    registerFonts(doc, opts.fonts);
    doc.setProperties({ title: (clean(d.name) || 'Resume') + ' - Resume', creator: 'DocAura Resume Builder' });
    var W = letter ? 612 : 595.28, H = letter ? 792 : 841.89;
    var M = T.margin || 46;
    var BODY = T.font || 'helvetica', HEAD = T.headFont || BODY;
    if (opts.font && opts.font !== 'theme' && (opts.font === 'helvetica' || opts.font === 'times' || (opts.fonts && opts.fonts[opts.font]))) { BODY = HEAD = opts.font; }
    var size = T.size || 10;
    var lh = size * (T.tight ? 1.32 : T.loose ? 1.5 : 1.4);
    var gap = T.tight ? 0.75 : T.loose ? 1.3 : 1;
    var hasPhoto = !!(photoImg && T.photo);

    // ---- Columns ----
    var sideW = 178;
    var layout = T.layout || 'single';
    var main, side = null;
    if (layout === 'sidebarL') { side = { x: 26, w: sideW - 46, y: M, page: 1 }; main = { x: sideW + 26, w: W - sideW - 26 - M + 6, y: M, page: 1 }; }
    else if (layout === 'sidebarR') { main = { x: M, w: W - sideW - M - 22, y: M, page: 1 }; side = { x: W - sideW + 22, w: sideW - 44, y: M, page: 1 }; }
    else main = { x: M, w: W - M * 2, y: M, page: 1 };
    var sideText = side ? (T.side === 'fill' ? WHITE : DARK) : DARK;
    var sideMuted = side ? (T.side === 'fill' ? mix(accent, WHITE, 0.75) : GREY) : GREY;

    function decorate() {
      if (!side) return;
      if (T.side === 'fill') doc.setFillColor.apply(doc, accent); else doc.setFillColor.apply(doc, tint);
      doc.rect(layout === 'sidebarL' ? 0 : W - sideW, 0, sideW, H, 'F');
    }
    decorate();

    function ensure(col, h) {
      doc.setPage(col.page);
      if (col.y + h > H - M) {
        col.page++;
        if (col.page > doc.getNumberOfPages()) { doc.addPage(); decorate(); }
        doc.setPage(col.page);
        col.y = M;
      }
    }
    function font(fam, style, sz, color) { doc.setFont(fam, style); doc.setFontSize(sz); doc.setTextColor.apply(doc, color || DARK); }
    function text(t, x, y, o) { o = o || {}; o.baseline = 'top'; doc.text(t, x, y, o); }
    function para(col, t, opt) {
      opt = opt || {};
      var w = opt.w || col.w, x = opt.x || col.x;
      doc.splitTextToSize(t, w).forEach(function (ln) {
        ensure(col, lh); text(ln, opt.align === 'center' ? x + w / 2 : x, col.y, { align: opt.align || 'left' }); col.y += lh;
      });
    }
    function spaced(on) { if (doc.setCharSpace) doc.setCharSpace(on || 0); }

    // ---- Header ----
    var contact = [d.email, d.phone, d.location, d.link].map(clean).filter(Boolean);
    var name = clean(d.name), title = clean(d.title);
    if (T.upperName) name = name.toUpperCase();
    var nameSize = T.nameSize || 25;

    function headerBand() {
      var ph = hasPhoto ? 78 : 0;
      var tw = W - M * 2 - (ph ? ph + 16 : 0);
      font(HEAD, 'bold', nameSize); var nameLines = name ? doc.splitTextToSize(name, tw) : [];
      font(BODY, 'normal', 9.5); var cLines = contact.length ? doc.splitTextToSize(contact.join('   |   '), tw) : [];
      var inner = nameLines.length * (nameSize + 4) + (title ? 19 : 0) + cLines.length * 13;
      var bandH = Math.max(inner + 58, ph ? ph + 44 : 0);
      doc.setFillColor.apply(doc, accent); doc.rect(0, 0, W, bandH, 'F');
      var y = (bandH - inner) / 2;
      font(HEAD, 'bold', nameSize, WHITE); nameLines.forEach(function (l) { text(l, M, y); y += nameSize + 4; });
      if (title) { font(BODY, 'normal', 12.5, WHITE); text(title, M, y); y += 19; }
      font(BODY, 'normal', 9.5, mix(accent, WHITE, 0.82)); cLines.forEach(function (l) { text(l, M, y); y += 13; });
      if (ph) doc.addImage(roundPhoto(photoImg, accent), 'JPEG', W - M - ph, (bandH - ph) / 2, ph, ph);
      main.y = bandH + 22;
    }
    function headerStacked(align) {
      var y = main.y, x = align === 'center' ? W / 2 : M, o = { align: align };
      if (name) {
        font(HEAD, 'bold', nameSize, align === 'center' || T.header === 'underline' ? DARK : accent);
        if (T.upperName) spaced(2);
        doc.splitTextToSize(name, W - M * 2).forEach(function (l) { text(l, x, y, o); y += nameSize + 4; });
        spaced(0);
      }
      if (T.header === 'underline') { doc.setFillColor.apply(doc, accent); doc.rect(M, y + 2, 56, 4, 'F'); y += 14; }
      if (title) { font(BODY, 'normal', 12, GREY); text(title, x, y, o); y += 17; }
      if (contact.length) {
        font(BODY, 'normal', 9.5, GREY);
        doc.splitTextToSize(contact.join('  •  '), W - M * 2).forEach(function (l) { text(l, x, y, o); y += 13; });
      }
      y += 6;
      if (align === 'center') { doc.setDrawColor.apply(doc, accent); doc.setLineWidth(1.4); doc.line(M, y, W - M, y); y += 14; }
      else y += 8;
      main.y = y;
    }
    function headerSplit() {
      var ph = hasPhoto ? 70 : 0, x = M + (ph ? ph + 16 : 0), y = M;
      var leftW = (W - M * 2) * 0.58 - (ph ? ph + 16 : 0);
      if (ph) doc.addImage(roundPhoto(photoImg, WHITE), 'JPEG', M, M - 4, ph, ph);
      if (name) { font(HEAD, 'bold', nameSize - 1, accent); doc.splitTextToSize(name, leftW).forEach(function (l) { text(l, x, y); y += nameSize + 2; }); }
      if (title) { font(BODY, 'normal', 12, GREY); text(title, x, y); y += 17; }
      var ry = M + 2; font(BODY, 'normal', 9.5, GREY);
      contact.forEach(function (c) { text(doc.splitTextToSize(c, (W - M * 2) * 0.4)[0], W - M, ry, { align: 'right' }); ry += 13.5; });
      y = Math.max(y, ry, ph ? M + ph : 0) + 10;
      doc.setDrawColor.apply(doc, accent); doc.setLineWidth(1.2); doc.line(M, y, W - M, y);
      main.y = y + 16;
    }
    function headerSidebar() {
      var y = main.y + 4;
      if (!T.sideName) {
        if (name) { font(HEAD, 'bold', nameSize, accent); doc.splitTextToSize(name, main.w).forEach(function (l) { text(l, main.x, y); y += nameSize + 4; }); }
        if (title) { font(BODY, 'normal', 12.5, GREY); text(title, main.x, y); y += 18; }
        main.y = y + 14;
      }
      // Sidebar: photo + contact
      if (hasPhoto) {
        var ps = Math.min(110, side.w);
        doc.addImage(roundPhoto(photoImg, T.side === 'fill' ? accent : tint), 'JPEG', side.x + (side.w - ps) / 2, side.y, ps, ps);
        side.y += ps + 20;
      }
      if (T.sideName) {
        var nc = T.nameColor ? hexRgb(T.nameColor) : (T.side === 'fill' ? WHITE : accent), ns = Math.min(nameSize, 22);
        if (name) { font(HEAD, 'bold', ns, nc); if (T.upperName) spaced(1); doc.splitTextToSize(name, side.w).forEach(function (l) { text(l, side.x, side.y); side.y += ns + 3; }); spaced(0); }
        if (title) { font(BODY, 'normal', 10.5, sideMuted); doc.splitTextToSize(title, side.w).forEach(function (l) { text(l, side.x, side.y); side.y += 14; }); }
        side.y += 18;
      }
      if (contact.length) {
        sideHeading('Contact');
        font(BODY, 'normal', 9, sideText);
        contact.forEach(function (c) { doc.splitTextToSize(c, side.w).forEach(function (l) { ensure(side, 12); text(l, side.x, side.y); side.y += 12; }); side.y += 4; });
        side.y += 8;
      }
    }

    if (side) headerSidebar();
    else if (T.header === 'band') headerBand();
    else if (T.header === 'strip') { doc.setFillColor.apply(doc, accent); doc.rect(0, 0, W, 10, 'F'); main.y = M + 6; headerStacked('left'); }
    else if (T.header === 'split') headerSplit();
    else if (T.header === 'monotop') {
      doc.setFillColor.apply(doc, accent); doc.rect(M, M - 14, W - M * 2, 5, 'F');
      main.y = M + 6;
      if (name) { font(HEAD, 'bold', nameSize + 3, DARK); spaced(3); doc.splitTextToSize(name, W - M * 2).forEach(function (l) { text(l, M, main.y); main.y += nameSize + 6; }); spaced(0); }
      if (title) { font(BODY, 'bold', 10.5, GREY); spaced(2.2); text(title.toUpperCase(), M, main.y); spaced(0); main.y += 18; }
      if (contact.length) { font(BODY, 'normal', 9.5, GREY); doc.splitTextToSize(contact.join('   /   '), W - M * 2).forEach(function (l) { text(l, M, main.y); main.y += 13; }); }
      main.y += 8; doc.setDrawColor.apply(doc, accent); doc.setLineWidth(1.2); doc.line(M, main.y, W - M, main.y); main.y += 14;
    }
    else headerStacked(T.header === 'center' ? 'center' : 'left');

    // Chronological: labels on the left, content to the right
    var labelW = 0;
    if (T.heading === 'side') { labelW = 118; main.x += labelW; main.w -= labelW; }

    // ---- Section headings ----
    function heading(t) {
      var col = main;
      ensure(col, 46);
      col.y += 9 * gap;
      var x = col.x, w = col.w, up = t.toUpperCase();
      switch (T.heading) {
        case 'bar':
          doc.setFillColor.apply(doc, accent); doc.rect(x, col.y + 1, 3.5, 12, 'F');
          font(HEAD, 'bold', 11.5, accent); text(t, x + 10, col.y); col.y += 19; break;
        case 'rule':
          font(HEAD, 'bold', 11, accent); spaced(0.8); text(up, x, col.y); spaced(0);
          col.y += 15; doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.7); doc.line(x, col.y, x + w, col.y); col.y += 8; break;
        case 'accentrule':
          font(HEAD, 'bold', 12, DARK); text(t, x, col.y); col.y += 16;
          doc.setDrawColor.apply(doc, accent); doc.setLineWidth(1.6); doc.line(x, col.y, x + w, col.y); col.y += 9; break;
        case 'plain':
          font(HEAD, 'bold', 13, accent); text(t, x, col.y); col.y += 19; break;
        case 'caps':
          font(HEAD, 'bold', 9.5, [110, 110, 118]); spaced(1.6); text(up, x, col.y); spaced(0); col.y += 18; break;
        case 'fill':
          doc.setFillColor.apply(doc, accent); doc.rect(x, col.y, w, 19, 'F');
          font(HEAD, 'bold', 10.5, WHITE); spaced(1); text(up, x + 8, col.y + 4.5); spaced(0); col.y += 27; break;
        case 'tint':
          doc.setFillColor.apply(doc, tint); doc.rect(x, col.y, w, 19, 'F');
          font(HEAD, 'bold', 11, accent); text(t, x + 8, col.y + 4); col.y += 27; break;
        case 'lines':
          font(HEAD, 'bold', 11, accent);
          var tw = doc.getTextWidth(up);
          text(up, x + w / 2, col.y, { align: 'center' });
          doc.setDrawColor.apply(doc, accent); doc.setLineWidth(0.6);
          doc.line(x, col.y + 6, x + w / 2 - tw / 2 - 10, col.y + 6); doc.line(x + w / 2 + tw / 2 + 10, col.y + 6, x + w, col.y + 6);
          col.y += 20; break;
        case 'smallcaps':
          font(HEAD, 'normal', 13, T.accent === '#111111' && !(colorChoice && colorChoice !== 'theme') ? DARK : accent); spaced(0.8); text(up, x, col.y); spaced(0);
          col.y += 16; doc.setDrawColor.apply(doc, T.accent === '#111111' ? [30, 30, 30] : accent); doc.setLineWidth(0.7); doc.line(x, col.y, x + w, col.y); col.y += 7; break;
        case 'shortbar':
          font(HEAD, 'bold', 11, DARK); spaced(1.8); text(up, x, col.y); spaced(0);
          col.y += 15; doc.setFillColor.apply(doc, accent); doc.rect(x, col.y, 34, 3, 'F'); col.y += 12; break;
        case 'center':
          font(HEAD, 'bold', 11, DARK); spaced(1); text(up, x + w / 2, col.y, { align: 'center' }); spaced(0);
          col.y += 15; doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.6); doc.line(x, col.y, x + w, col.y); col.y += 8; break;
        case 'side':
          font(HEAD, 'bold', 10.5, accent); spaced(0.6);
          doc.splitTextToSize(up, labelW - 16).forEach(function (l, i) { text(l, x - labelW, col.y + 1 + i * 13); });
          spaced(0); col.y += 1; break;
      }
    }
    function sideHeading(t) {
      ensure(side, 40);
      font(HEAD, 'bold', 10, T.side === 'fill' ? WHITE : accent); spaced(1.2); text(t.toUpperCase(), side.x, side.y); spaced(0);
      side.y += 14;
      if (T.side === 'fill') doc.setDrawColor.apply(doc, mix(accent, WHITE, 0.5)); else doc.setDrawColor.apply(doc, mix(accent, WHITE, 0.55));
      doc.setLineWidth(0.8); doc.line(side.x, side.y, side.x + side.w, side.y); side.y += 9;
    }

    // ---- Content blocks ----
    function rowLR(col, x, w, left, right, sz) {
      font(BODY, 'bold', sz);
      var rw = right ? (doc.setFont(BODY, 'normal'), doc.setFontSize(size - 0.5), doc.getTextWidth(right) + 12) : 0;
      font(BODY, 'bold', sz);
      var lines = doc.splitTextToSize(left, w - rw);
      ensure(col, lh * lines.length);
      lines.forEach(function (ln, i) {
        font(BODY, 'bold', sz); text(ln, x, col.y);
        if (i === 0 && right) { font(BODY, 'normal', size - 0.5, GREY); text(right, x + w, col.y, { align: 'right' }); }
        col.y += lh + 0.5;
      });
    }
    function bullets(col, x, w, t) {
      font(BODY, 'normal', size);
      t.split(/\n+/).map(clean).filter(Boolean).forEach(function (b) {
        b = b.replace(/^[-*]\s*/, '');
        var lines = doc.splitTextToSize(b, w - 13);
        ensure(col, lh * Math.min(lines.length, 2));
        lines.forEach(function (ln, i) {
          ensure(col, lh);
          if (i === 0) { doc.setFillColor.apply(doc, T.tag === 'ats' && T.heading !== 'caps' ? accent : GREY); doc.circle(x + 3, col.y + size * 0.52, 1.5, 'F'); }
          text(ln, x + 13, col.y); col.y += lh;
        });
      });
    }
    function tags(col, list, onSide) {
      var x = col.x, maxX = col.x + col.w, padX = 7, h = size + 9;
      font(BODY, onSide ? 'normal' : 'bold', size - 0.5);
      ensure(col, h + 4);
      list.forEach(function (s) {
        var tw = doc.getTextWidth(s) + padX * 2;
        if (x + tw > maxX && x > col.x) { x = col.x; col.y += h + 5; ensure(col, h + 4); }
        doc.setFillColor.apply(doc, onSide && T.side === 'fill' ? mix(accent, WHITE, 0.18) : tint);
        doc.roundedRect(x, col.y, tw, h, h / 2, h / 2, 'F');
        doc.setTextColor.apply(doc, onSide && T.side === 'fill' ? WHITE : accent);
        text(s, x + padX, col.y + 4.5);
        x += tw + 5;
      });
      col.y += h + 6;
    }

    function summary() {
      if (!clean(d.summary)) return;
      heading(T.heading === 'side' ? 'Profile' : 'Summary');
      font(BODY, 'normal', size); para(main, clean(d.summary)); main.y += 4 * gap;
    }
    function experience() {
      var list = d.exp.filter(function (e) { return clean(e.role) || clean(e.company); });
      if (!list.length) return;
      heading(T.heading === 'side' ? 'Experience' : 'Work experience');
      var tl = T.exp === 'timeline', off = tl ? 16 : 0;
      list.forEach(function (e, i) {
        if (i) main.y += 8 * gap;
        ensure(main, lh * 3);
        var startY = main.y, startPage = main.page;
        var x = main.x + off, w = main.w - off;
        var dates = [clean(e.start), clean(e.end)].filter(Boolean).join(' - ');
        rowLR(main, x, w, clean(e.role) || clean(e.company), dates, size + 1);
        var sub = [clean(e.role) ? clean(e.company) : '', clean(e.place)].filter(Boolean).join(', ');
        if (T.subRight && clean(e.role) && (clean(e.company) || clean(e.place))) {
          ensure(main, lh); font(BODY, 'italic', size, GREY);
          text(doc.splitTextToSize(clean(e.company), w * 0.7)[0] || '', x, main.y);
          if (clean(e.place)) text(clean(e.place), x + w, main.y, { align: 'right' });
          main.y += lh;
        } else if (sub) { font(BODY, T.heading === 'caps' ? 'normal' : 'italic', size, T.tag === 'stylish' || T.heading === 'plain' ? accent : GREY); para(main, sub, { x: x, w: w }); }
        main.y += 2;
        if (clean(e.bullets)) bullets(main, x, w, e.bullets);
        if (tl) {
          doc.setPage(startPage);
          doc.setFillColor.apply(doc, accent); doc.circle(main.x + 4, startY + 6, 3.5, 'F');
          if (main.page === startPage) { doc.setDrawColor.apply(doc, mix(accent, WHITE, 0.6)); doc.setLineWidth(1.2); doc.line(main.x + 4, startY + 12, main.x + 4, main.y - 2); }
          doc.setPage(main.page);
        }
      });
      main.y += 4 * gap;
    }
    function education() {
      var list = d.edu.filter(function (e) { return clean(e.degree) || clean(e.school); });
      if (!list.length) return;
      heading('Education');
      list.forEach(function (e, i) {
        if (i) main.y += 6 * gap;
        ensure(main, lh * 2);
        rowLR(main, main.x, main.w, clean(e.degree) || clean(e.school), clean(e.year), size + 0.5);
        var sub = [clean(e.degree) ? clean(e.school) : '', clean(e.detail)].filter(Boolean).join(' - ');
        if (sub) { font(BODY, 'normal', size, GREY); para(main, sub); }
      });
      main.y += 4 * gap;
    }
    var skillList = clean(d.skills).split(/\s*[,\n]\s*/).filter(Boolean);
    function skillsMain() {
      if (!skillList.length) return;
      heading('Skills');
      if (T.skills === 'tags') tags(main, skillList);
      else { font(BODY, 'normal', size); para(main, skillList.join('  •  ')); }
      main.y += 4 * gap;
    }
    function langsMain() { if (clean(d.languages)) { heading('Languages'); font(BODY, 'normal', size); para(main, clean(d.languages)); main.y += 4 * gap; } }
    function certsMain() { if (clean(d.certs)) { heading(T.heading === 'side' ? 'Awards' : 'Certificates and awards'); bullets(main, main.x, main.w, d.certs); } }

    if (side) {
      summary(); experience(); education();
      if (skillList.length) {
        sideHeading('Skills');
        if (T.skills === 'tags') tags(side, skillList, true);
        else { font(BODY, 'normal', 9.5, sideText); skillList.forEach(function (s) { doc.splitTextToSize(s, side.w).forEach(function (l) { ensure(side, 13); text(l, side.x, side.y); side.y += 13; }); side.y += 2; }); }
        side.y += 10;
      }
      if (clean(d.languages)) {
        sideHeading('Languages'); font(BODY, 'normal', 9.5, sideText);
        clean(d.languages).split(/\s*,\s*/).forEach(function (s) { ensure(side, 13); text(s, side.x, side.y); side.y += 13; });
        side.y += 10;
      }
      if (clean(d.certs)) {
        sideHeading('Awards'); font(BODY, 'normal', 9, sideText);
        d.certs.split(/\n+/).map(clean).filter(Boolean).forEach(function (s) { doc.splitTextToSize(s, side.w).forEach(function (l) { ensure(side, 12); text(l, side.x, side.y); side.y += 12; }); side.y += 4; });
      }
    } else {
      summary();
      if (T.eduFirst) { education(); experience(); } else { experience(); education(); }
      skillsMain(); langsMain(); certsMain();
    }

    if (!name && !clean(d.summary) && !d.exp.some(function (e) { return clean(e.role); })) {
      doc.setPage(1); font('helvetica', 'normal', 12, [150, 150, 160]);
      doc.text('Start typing on the left - your resume will appear here.', side ? main.x + main.w / 2 : W / 2, H / 2, { align: 'center' });
    }
    return doc;
  }

  window.SKResume = { THEMES: THEMES, byId: BY_ID, build: build, clean: clean, loadFont: loadFont };
})();
