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

  // Ready-made examples for different kinds of jobs (all names and companies are made up)
  var SAMPLES = {
    finance: SAMPLE,
    it: { name: 'Daniel Kim', title: 'Senior Software Engineer', email: 'daniel.kim@email.com', phone: '+1 415 555 0134', location: 'San Francisco, CA', link: 'github.com/danielkim',
      summary: 'Software engineer with 6 years of experience building fast, reliable web applications with React, Node.js and AWS. I enjoy turning messy requirements into simple products and mentoring newer developers.',
      exp: [{ role: 'Senior Software Engineer', company: 'Brightline Analytics', place: 'San Francisco', start: 'Mar 2022', end: 'Present', bullets: 'Rebuilt the customer dashboard in React and TypeScript, cutting page load time by 45%\nDesigned REST APIs in Node.js serving 2 million requests a day\nMentored 4 junior engineers and introduced code reviews that halved production bugs' },
        { role: 'Software Engineer', company: 'Northwind Apps', place: 'Seattle', start: 'Jul 2019', end: 'Feb 2022', bullets: 'Built payment features used by 300,000 customers\nAutomated deployments with Docker and GitHub Actions, saving 6 hours a week' }],
      edu: [{ degree: 'B.S. Computer Science', school: 'University of Washington', year: '2019', detail: '' }],
      skills: 'JavaScript, TypeScript, React, Node.js, Python, SQL, PostgreSQL, AWS, Docker, CI/CD, REST APIs, Agile', languages: 'English, Korean', certs: 'AWS Certified Developer - Associate (2023)' },
    sales: { name: 'Sofia Martinez', title: 'Account Executive', email: 'sofia.martinez@email.com', phone: '+1 512 555 0178', location: 'Austin, TX', link: 'linkedin.com/in/sofiamartinez',
      summary: 'Results-driven B2B sales professional with 5 years of experience closing software deals. Consistently above target, with a strong network in retail and logistics.',
      exp: [{ role: 'Account Executive', company: 'Peakview Software', place: 'Austin', start: 'Jan 2022', end: 'Present', bullets: 'Closed $1.8M in new annual revenue in 2025, 132% of quota\nBuilt a pipeline of 60+ qualified leads per quarter through cold calling and LinkedIn\nShortened the average sales cycle from 74 to 51 days' },
        { role: 'Sales Development Representative', company: 'CloudCart', place: 'Dallas', start: 'Jun 2020', end: 'Dec 2021', bullets: 'Booked 25 discovery meetings a month for 3 account executives\nRanked #1 of 14 SDRs for meetings booked in 2021' }],
      edu: [{ degree: 'B.B.A. Marketing', school: 'University of Texas at Austin', year: '2020', detail: '' }],
      skills: 'B2B sales, Salesforce, HubSpot, Lead generation, Cold calling, Negotiation, Pipeline management, Forecasting, Presentation', languages: 'English, Spanish', certs: 'Salesforce Certified Administrator' },
    health: { name: 'Grace Okafor', title: 'Registered Nurse', email: 'grace.okafor@email.com', phone: '+44 7700 900123', location: 'Manchester, UK', link: '',
      summary: 'Caring registered nurse with 8 years of experience in busy medical and surgical wards. Calm under pressure, with strong patient care, medication and teamwork skills.',
      exp: [{ role: 'Senior Staff Nurse', company: 'Riverside General Hospital', place: 'Manchester', start: 'Apr 2021', end: 'Present', bullets: 'Lead a team of 6 nurses on a 28-bed surgical ward\nCut medication errors by 30% by introducing a double-check routine\nTrained 15 newly qualified nurses on ward procedures and infection control' },
        { role: 'Staff Nurse', company: 'St Anne’s Hospital', place: 'Leeds', start: 'Sep 2017', end: 'Mar 2021', bullets: 'Cared for up to 8 patients per shift on an acute medical ward\nUsed electronic health records to plan and document patient care' }],
      edu: [{ degree: 'BSc (Hons) Adult Nursing', school: 'University of Leeds', year: '2017', detail: '' }],
      skills: 'Patient care, Medication administration, Triage, Wound care, Infection control, Electronic health records, Care planning, Team leadership', languages: 'English, Yoruba', certs: 'NMC Registered Nurse\nAdvanced Life Support (ALS)' },
    teacher: { name: 'Ananya Rao', title: 'Mathematics Teacher', email: 'ananya.rao@email.com', phone: '+91 98450 12345', location: 'Bengaluru, India', link: '',
      summary: 'Patient and creative maths teacher with 9 years of experience teaching grades 8 to 12. I make maths simple with real-life examples and regular feedback.',
      exp: [{ role: 'Mathematics Teacher (Grades 8–10)', company: 'Greenfield Public School', place: 'Bengaluru', start: 'Jun 2019', end: 'Present', bullets: 'Raised the class average in board exams from 68% to 81% over 3 years\nCreated weekly online quizzes in Google Classroom for 160 students\nRun the school maths club and coached students to 4 state olympiad medals' },
        { role: 'Mathematics Teacher', company: 'Sunrise Academy', place: 'Mysuru', start: 'Jun 2016', end: 'May 2019', bullets: 'Taught algebra and geometry to 5 sections of grade 9\nStarted after-school support classes for weaker students' }],
      edu: [{ degree: 'B.Ed', school: 'Bangalore University', year: '2016', detail: '' }, { degree: 'M.Sc Mathematics', school: 'University of Mysore', year: '2015', detail: '' }],
      skills: 'Lesson planning, Classroom management, Assessment, Google Classroom, Student engagement, Curriculum design, Parent communication', languages: 'English, Kannada, Hindi', certs: 'CTET qualified (2016)' },
    fresher: { name: 'Rahul Verma', title: 'Graduate Engineer Trainee', email: 'rahul.verma@email.com', phone: '+91 91234 56789', location: 'Pune, India', link: 'github.com/rahulverma',
      summary: 'Final-year computer engineering student with hands-on project and internship experience in Python and web development. Quick learner looking for my first full-time role.',
      exp: [{ role: 'Software Development Intern', company: 'Bluepeak Technologies', place: 'Pune', start: 'May 2025', end: 'Jul 2025', bullets: 'Built 3 internal web pages with React used by 40+ employees\nWrote Python scripts that cleaned 10,000 records of customer data' },
        { role: 'Final-year project: Attendance app', company: 'College project', place: '', start: '2025', end: '2026', bullets: 'Led a team of 4 to build a face-recognition attendance app for 300 students' }],
      edu: [{ degree: 'B.E. Computer Engineering', school: 'Savitribai Phule Pune University', year: '2026', detail: 'CGPA 8.4 / 10' }, { degree: 'Class XII (Science)', school: 'Kendriya Vidyalaya', year: '2022', detail: '91%' }],
      skills: 'Python, Java, SQL, HTML, CSS, JavaScript, React, Git, Problem solving, Teamwork', languages: 'English, Hindi, Marathi', certs: 'Google Data Analytics Certificate (2025)\nWinner, college hackathon (2024)' },
    marketing: { name: 'Emma Clarke', title: 'Digital Marketing Manager', email: 'emma.clarke@email.com', phone: '+44 7700 900456', location: 'London, UK', link: 'linkedin.com/in/emmaclarke',
      summary: 'Digital marketer with 7 years of experience growing brands through SEO, paid ads and social media. Data-led, creative and comfortable managing budgets and teams.',
      exp: [{ role: 'Digital Marketing Manager', company: 'Oakleaf Home', place: 'London', start: 'Feb 2022', end: 'Present', bullets: 'Grew organic website traffic by 120% in 18 months through SEO and content marketing\nManaged a £400,000 yearly Google Ads and Meta budget with a 4.2x return\nLed a team of 3 marketers and 2 agencies' },
        { role: 'Marketing Executive', company: 'Bright Beauty', place: 'London', start: 'Aug 2018', end: 'Jan 2022', bullets: 'Launched email campaigns with a 32% open rate\nGrew Instagram followers from 8,000 to 95,000' }],
      edu: [{ degree: 'BA (Hons) Marketing', school: 'University of Manchester', year: '2018', detail: '' }],
      skills: 'SEO, Google Ads, Google Analytics, Social media, Content marketing, Email marketing, Copywriting, Budgeting, Team leadership', languages: 'English, French', certs: 'Google Ads Search Certification' }
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
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (pdfDoc) safeDraw(); }, 200); });

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

  // For automated tests
  window.__skResume = { set: function (d) { data = d; refreshAll(); }, get: function () { return data; }, build: function (jsPDF) { return buildPdf(jsPDF); } };

  refreshAll();
})();
