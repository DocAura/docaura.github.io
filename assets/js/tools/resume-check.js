/* SimpleKit resume checks: job-advert keyword match + plain-English improvement tips. Runs in the browser. */
(function () {
  'use strict';

  // Common skills and keywords across industries (lower case). Multi-word phrases are matched first.
  var SKILLS = ('javascript,typescript,react,angular,vue,node.js,node,python,java,c++,c#,.net,php,ruby,go,golang,rust,kotlin,swift,sql,mysql,postgresql,mongodb,nosql,html,css,' +
    'aws,azure,google cloud,gcp,docker,kubernetes,terraform,linux,git,ci/cd,devops,rest api,apis,graphql,microservices,machine learning,deep learning,data analysis,data science,' +
    'power bi,tableau,excel,ms excel,microsoft excel,vlookup,pivot tables,word,powerpoint,ms office,microsoft office,google sheets,sap,oracle,salesforce,hubspot,crm,erp,jira,agile,scrum,kanban,' +
    'project management,product management,stakeholder management,risk management,change management,team leadership,leadership,people management,mentoring,coaching,training,' +
    'communication,written communication,verbal communication,presentation,negotiation,problem solving,critical thinking,time management,attention to detail,customer service,' +
    'customer support,client relationship,account management,business development,lead generation,cold calling,b2b,b2c,sales,pipeline management,forecasting,upselling,retail,' +
    'marketing,digital marketing,seo,sem,google ads,google analytics,social media,content marketing,email marketing,copywriting,branding,market research,campaign management,' +
    'accounting,bookkeeping,accounts payable,accounts receivable,payroll,taxation,tax,gst,vat,tds,audit,auditing,financial reporting,financial analysis,financial modelling,financial modeling,budgeting,' +
    'reconciliation,bank reconciliation,month-end close,ifrs,gaap,quickbooks,tally,xero,cost control,invoicing,compliance,regulatory compliance,kyc,aml,underwriting,' +
    'patient care,nursing,clinical,medication administration,triage,electronic health records,ehr,emr,cpr,bls,acls,infection control,phlebotomy,wound care,care planning,' +
    'teaching,lesson planning,curriculum,classroom management,assessment,special education,student engagement,tutoring,google classroom,e-learning,' +
    'logistics,supply chain,procurement,inventory,inventory management,warehouse,operations,quality control,quality assurance,lean,six sigma,safety,health and safety,' +
    'autocad,solidworks,revit,matlab,electrical,mechanical,civil,maintenance,troubleshooting,manufacturing,' +
    'recruitment,recruiting,onboarding,hr,human resources,employee relations,performance management,talent acquisition,' +
    'graphic design,ui design,ux design,ux,ui,figma,photoshop,illustrator,adobe creative suite,canva,video editing,' +
    'data entry,typing,scheduling,calendar management,administration,office management,front desk,reception,hospitality,food safety,cooking,driving licence,driving license,' +
    'english,spanish,french,german,hindi,arabic,mandarin,bilingual,multilingual').split(',');

  var STOP = ('a,an,the,and,or,but,if,of,in,on,at,to,for,from,by,with,without,as,is,are,was,were,be,been,being,this,that,these,those,it,its,our,we,you,your,they,their,them,he,she,his,her,' +
    'will,would,should,can,could,may,might,must,shall,do,does,did,done,have,has,had,not,no,yes,all,any,each,every,some,such,more,most,other,than,then,also,very,well,into,over,under,' +
    'about,across,within,per,via,etc,eg,ie,who,what,when,where,which,while,how,why,one,two,three,year,years,month,months,day,days,time,role,job,position,candidate,candidates,company,' +
    'team,teams,work,working,ability,able,strong,excellent,good,great,new,including,include,includes,required,requirements,requirement,preferred,plus,experience,experienced,' +
    'skills,skill,knowledge,understanding,responsibilities,responsible,looking,join,us,apply,based,within,ensure,provide,support,help,make,using,use,used,etc.,minimum,least,' +
    'opportunity,environment,business,customers,customer,people,across,full,part,level,high,highly,key,well,need,needs,want,like,degree,equivalent,related,field,salary,benefits,location,' +
    'senior,junior,lead,principal,head,engineer,engineers,developer,developers,manager,managers,specialist,assistant,associate,officer,executive,analyst,hiring,hire,hired,' +
    'software,build,building,design,designing,deploy,services,service,platform,frontend,backend,take,part,reviews,review,code,staff,member,members,day,daily,weekly,based,remote,office,' +
    'bachelor,master,science,computer,equivalent,requirements,qualifications,qualification,duties,description,applicants,successful,ideal,join,growing,fast,paced,world,class').split(',');
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });

  function norm(t) { return ' ' + (t || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9+#./\-' ]+/g, ' ').replace(/\s+/g, ' ') + ' '; }
  function stem(w) { return w.replace(/(ing|ed|es|s)$/, ''); }
  function has(text, phrase) {
    var esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('(^|[^a-z0-9+#])' + esc + '([^a-z0-9+#]|$)').test(text)) return true;
    if (phrase.indexOf(' ') < 0 && phrase.length > 4) { // simple word-form match: manage ~ managed ~ managing
      var st = stem(phrase);
      return new RegExp('(^|[^a-z0-9])' + st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]{0,3}([^a-z0-9]|$)').test(text);
    }
    return false;
  }

  function resumeText(d) {
    var parts = [d.title, d.summary, d.skills, d.languages, d.certs];
    (d.exp || []).forEach(function (e) { parts.push(e.role, e.company, e.bullets); });
    (d.edu || []).forEach(function (e) { parts.push(e.degree, e.school, e.detail); });
    return parts.filter(Boolean).join(' \n ');
  }

  // Returns {score, matched:[...], missing:[...], notes:[...]}
  function analyze(d, jd) {
    var J = norm(jd), R = norm(resumeText(d)), weights = {};
    // 1. Known skills mentioned in the advert (longest first so "machine learning" beats "learning")
    SKILLS.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (s) {
      if (has(J, s) && !Object.keys(weights).some(function (k) { return k.indexOf(s) >= 0 && k !== s; })) weights[s] = 3;
    });
    // 2. Acronyms and tool names written in capitals in the advert (e.g. SQL, CRM, IFRS, AutoCAD)
    var caps = (jd.match(/\b[A-Z][A-Za-z0-9+#.]*[A-Z0-9+#][A-Za-z0-9+#.]*\b/g) || []).filter(function (w) { return w.length >= 2 && w.length <= 12 && !/^(I|A|AN|THE|AND|OR|WE|OUR|YOU|US|UK|USA|EU|HR|CV|NOTE)$/.test(w); });
    caps.forEach(function (w) {
      var k = w.toLowerCase();
      var partOf = Object.keys(weights).some(function (x) { return x !== k && x.split(/[^a-z0-9+#]+/).indexOf(k) >= 0; });
      if (!weights[k] && !STOPSET[k] && !partOf && !/^(ci|cd|it|id|ok|uk|us)$/.test(k)) weights[k] = 2;
    });
    // 3. Words the advert repeats (2+ times) that are not filler
    var counts = {};
    J.trim().split(' ').forEach(function (w) { w = w.replace(/^[^a-z0-9]+|[^a-z0-9+#]+$/g, ''); if (w.length > 3 && !STOPSET[w] && !/^\d+$/.test(w)) counts[w] = (counts[w] || 0) + 1; });
    Object.keys(counts).forEach(function (w) { if (counts[w] >= 2 && !weights[w] && !Object.keys(weights).some(function (k) { return k.indexOf(w) >= 0; })) weights[w] = 1; });
    var keys = Object.keys(weights).sort(function (a, b) { return weights[b] - weights[a] || (counts[b] || 0) - (counts[a] || 0); }).slice(0, 40);
    var matched = [], missing = [], got = 0, total = 0;
    var SYN = { ehr: ['electronic health records', 'electronic health record', 'emr'], emr: ['electronic medical records', 'ehr'], js: ['javascript'], ts: ['typescript'],
      ml: ['machine learning'], ai: ['artificial intelligence'], ui: ['user interface'], ux: ['user experience'], crm: ['salesforce', 'hubspot'], 'ms excel': ['excel'], excel: ['ms excel'],
      'node.js': ['node', 'nodejs'], node: ['node.js'], k8s: ['kubernetes'], kubernetes: ['k8s'], gcp: ['google cloud'], seo: ['search engine optimisation', 'search engine optimization'],
      'ci/cd': ['continuous integration', 'github actions', 'jenkins'], 'b2b': ['business to business'], hr: ['human resources'], 'human resources': ['hr'], cpr: ['bls'], bls: ['basic life support'], als: ['advanced life support'] };
    keys.forEach(function (k) {
      total += weights[k];
      var found = has(R, k) || (SYN[k] || []).some(function (x) { return has(R, x); });
      if (found) { matched.push(k); got += weights[k]; } else missing.push(k);
    });
    var notes = [];
    var yrs = jd.match(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years|yrs)/i);
    if (yrs) {
      var have = yearsOf(d);
      notes.push(have !== null ? 'The job asks for ' + yrs[1] + '+ years of experience. Your resume shows about ' + have + (have === 1 ? ' year.' : ' years.') : 'The job asks for ' + yrs[1] + '+ years of experience. Make your job dates clear.');
    }
    if (/\b(bachelor|master|degree|b\.?sc|m\.?sc|mba|b\.?tech|b\.?com|phd|diploma)\b/i.test(jd) && !(d.edu || []).some(function (e) { return (e.degree || '').trim(); })) notes.push('The job mentions a degree or diploma. Add your education.');
    var title = (jd.match(/^\s*([A-Z][^\n]{3,60})\n/) || [])[1];
    if (d.title && title && !has(norm(title), (d.title || '').toLowerCase().trim().split(' ')[0])) notes.push('Your job title (“' + d.title + '”) is different from the advert. If it fits, use the advert’s title.');
    return { score: total ? Math.round(got / total * 100) : 0, matched: matched, missing: missing, notes: notes, total: keys.length };
  }

  function yearsOf(d) {
    var now = new Date().getFullYear(), min = null, max = null;
    (d.exp || []).forEach(function (e) {
      var a = (e.start || '').match(/(19|20)\d{2}/), b = /present|now|current|today/i.test(e.end || '') ? [String(now)] : (e.end || '').match(/(19|20)\d{2}/);
      if (a) { var y = Number(a[0]); min = min === null ? y : Math.min(min, y); }
      if (b) { var z = Number(b[0]); max = max === null ? z : Math.max(max, z); }
    });
    return min !== null && max !== null && max >= min ? max - min : null;
  }

  // ---------- Improvement tips ----------
  var IRREG = { leading: 'Led', building: 'Built', writing: 'Wrote', running: 'Ran', teaching: 'Taught', selling: 'Sold', making: 'Made', doing: 'Did', taking: 'Took', giving: 'Gave', bringing: 'Brought', setting: 'Set', keeping: 'Kept', meeting: 'Met', winning: 'Won', speaking: 'Spoke', handling: 'Handled', managing: 'Managed', planning: 'Planned' };
  function pastTense(w) {
    var l = w.toLowerCase();
    if (IRREG[l]) return IRREG[l];
    if (/ing$/.test(l)) { var st = l.slice(0, -3); if (/(at|iz|ys|ov|iv|rv|ur|uc|ag|ot|ut|os|ar)$/.test(st) && !/e$/.test(st) && !/(ar)$/.test(st)) st += 'e'; var out = /e$/.test(st) ? st + 'd' : st + 'ed'; return out.charAt(0).toUpperCase() + out.slice(1); }
    return null;
  }
  var WEAK = [
    [/^(i was |i am )?responsible for (\w+ing)\b/i, function (m) { return pastTense(m[2]); }],
    [/^(i was |i am )?responsible for /i, function () { return 'Managed '; }],
    [/^(i )?(was )?in charge of (\w+ing)\b/i, function (m) { return pastTense(m[3]); }],
    [/^(i )?(was )?in charge of /i, function () { return 'Led '; }],
    [/^(i )?(was )?tasked with (\w+ing)\b/i, function (m) { return pastTense(m[3]); }],
    [/^(i )?helped (to |with )?/i, function () { return 'Supported '; }],
    [/^(i )?assisted (with |in )?/i, function () { return 'Supported '; }],
    [/^(i )?worked on /i, function () { return 'Delivered '; }],
    [/^(i )?(was )?involved in (\w+ing)\b/i, function (m) { return pastTense(m[3]); }],
    [/^(i )?(was )?involved in /i, function () { return 'Contributed to '; }],
    [/^duties (included|include) /i, function () { return ''; }]
  ];
  function improveLine(line) {
    var t = line.replace(/^[-*•]\s*/, '').trim(), orig = t, why = [];
    for (var i = 0; i < WEAK.length; i++) {
      var m = t.match(WEAK[i][0]);
      if (m) { var rep = WEAK[i][1](m); if (rep !== null) { t = rep + t.slice(m[0].length).replace(/^\s+/, rep && !/ $/.test(rep) ? ' ' : ''); why.push('starts with a weak phrase'); } break; }
    }
    if (/^i /i.test(t)) { t = t.replace(/^i /i, ''); why.push('starts with “I”'); }
    if (/^[a-z]/.test(t)) { t = t.charAt(0).toUpperCase() + t.slice(1); if (!why.length) why.push('starts with a small letter'); }
    if (/\.$/.test(t) && !/\b(etc|Ltd|Inc)\.$/.test(t)) { t = t.replace(/\.$/, ''); }
    return { text: t, changed: t !== orig && why.length > 0, why: why };
  }

  // Returns [{level:'fix'|'tip', msg, quote?, apply?: function(d)}]
  function tips(d) {
    var out = [];
    var hasSkills = (d.skills || '').split(/[,\n]/).filter(function (s) { return s.trim(); }).length;
    if (!(d.email || '').trim() || !(d.phone || '').trim()) out.push({ level: 'tip', msg: 'Add your email and phone number so employers can contact you.' });
    if (!(d.summary || '').trim()) out.push({ level: 'tip', msg: 'Add a short summary (2–3 lines) saying who you are and what job you want.' });
    else if ((d.summary || '').split(/\s+/).length > 80) out.push({ level: 'tip', msg: 'Your summary is long. Keep it to 2–3 short lines.' });
    if (hasSkills < 5) out.push({ level: 'tip', msg: 'List at least 5 skills. Use the words from job adverts you apply to.' });
    var verbs = {};
    (d.exp || []).forEach(function (e, ei) {
      var lines = (e.bullets || '').split('\n').filter(function (l) { return l.trim(); });
      if ((e.role || e.company) && !lines.length) out.push({ level: 'tip', msg: 'Add 2–4 achievements for “' + (e.role || e.company) + '”.' });
      var noNum = 0;
      lines.forEach(function (l, li) {
        var r = improveLine(l);
        if (r.changed) out.push({ level: 'fix', msg: 'This line ' + r.why.join(' and ') + '.', quote: l.trim(), to: r.text, apply: function (dd) { var arr = dd.exp[ei].bullets.split('\n'); var k = arr.findIndex(function (x) { return x.trim() === l.trim(); }); if (k >= 0) arr[k] = r.text; dd.exp[ei].bullets = arr.join('\n'); } });
        if (!/\d/.test(l)) noNum++;
        if (l.split(/\s+/).length > 32) out.push({ level: 'tip', msg: 'This line is long. Try to keep each point under 2 lines.', quote: l.trim() });
        var v = (r.text.split(' ')[0] || '').toLowerCase(); if (v) verbs[v] = (verbs[v] || 0) + 1;
      });
      if (lines.length >= 2 && noNum === lines.length) out.push({ level: 'tip', msg: 'Add numbers to “' + (e.role || e.company) + '” — how many, how much, how fast. Example: “Served 60+ customers a day”.' });
    });
    Object.keys(verbs).forEach(function (v) { if (verbs[v] >= 3) out.push({ level: 'tip', msg: 'You start ' + verbs[v] + ' lines with “' + v.charAt(0).toUpperCase() + v.slice(1) + '”. Mix in other action words like Led, Built, Improved, Reduced, Trained.' }); });
    if (!(d.exp || []).some(function (e) { return (e.role || '').trim(); }) && !(d.edu || []).some(function (e) { return (e.degree || '').trim(); })) out.push({ level: 'tip', msg: 'Add your work experience or education — even internships, projects or volunteering count.' });
    return out;
  }

  window.SKCheck = { analyze: analyze, tips: tips, improveLine: improveLine, resumeText: resumeText, yearsOf: yearsOf };
})();
