/* Resume downloads: first one free, then small UPI packs (paid to the owner's own UPI ID).
   The site cannot see UPI payments, so after paying the visitor types the last 6 digits of the
   UPI transaction ID (UTR). That unlocks the downloads at once, and the claim is recorded on the
   private dashboard so the owner can match it against the bank app. Everything is kept in this browser. */
(function () {
  var CFG = window.SK_CONFIG || {}, KEY = 'docaura-resume-pay', GRACE = 30 * 60 * 1000;
  var PLANS = CFG.resumePlans || [[10, 2], [50, 10]], UPI = CFG.upi || '';
  var hi = document.documentElement.lang === 'hi';
  var T = hi ? {
    freeNote: '🎉 आपका पहला रिज़्यूमे डाउनलोड फ़्री था! अगले 30 मिनट तक गलती ठीक करके दोबारा फ़्री डाउनलोड करें।',
    left: function (n) { return n + ' डाउनलोड बाकी। 30 मिनट तक दोबारा डाउनलोड फ़्री।'; },
    title: 'और डाउनलोड पाएं', lead: 'आपका पहला रिज़्यूमे फ़्री था। आगे के डाउनलोड के लिए एक पैक चुनें — इससे DocAura चलता रहता है। 💜',
    pack: function (a, n) { return '₹' + a + ' · ' + n + ' डाउनलोड'; }, pay: function (a) { return 'UPI ऐप से ₹' + a + ' भरें'; },
    scan: 'किसी भी UPI ऐप से स्कैन करें', upiId: 'UPI ID', copy: 'कॉपी',
    after: 'पेमेंट के बाद: UPI ऐप में ट्रांज़ैक्शन खोलें और UPI Ref No. / UTR (12 अंक) के आख़िरी 6 अंक लिखें।',
    utr: 'UTR के आख़िरी 6 अंक', unlock: 'डाउनलोड अनलॉक करें', cancel: 'अभी नहीं',
    bad: 'कृपया UTR के आख़िरी 6 अंक लिखें (सिर्फ़ नंबर)।', used: 'यह UTR पहले ही इस्तेमाल हो चुका है।',
    thanks: function (n) { return 'धन्यवाद! 💜 ' + n + ' डाउनलोड अनलॉक हो गए।'; }
  } : {
    freeNote: '🎉 Your first resume download was free! Fix anything and download again free for the next 30 minutes.',
    left: function (n) { return n + (n === 1 ? ' download' : ' downloads') + ' left. Re-downloads are free for 30 minutes.'; },
    title: 'Get more downloads', lead: 'Your first resume was free. Pick a small pack for more downloads — it keeps DocAura running. 💜',
    pack: function (a, n) { return '₹' + a + ' · ' + n + ' downloads'; }, pay: function (a) { return 'Pay ₹' + a + ' with any UPI app'; },
    scan: 'Scan with any UPI app', upiId: 'UPI ID', copy: 'Copy',
    after: 'After paying: open the payment in your UPI app and type the last 6 digits of the UPI Ref No. / UTR (12 digits).',
    utr: 'Last 6 digits of UTR', unlock: 'Unlock downloads', cancel: 'Not now',
    bad: 'Please type the last 6 digits of the UTR (numbers only).', used: 'This UTR has already been used on this device.',
    thanks: function (n) { return 'Thank you! 💜 ' + n + ' downloads unlocked.'; }
  };

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function phone() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); }
  function upiLink(a) { return 'upi://pay?pa=' + encodeURIComponent(UPI) + '&pn=' + encodeURIComponent('DocAura') + '&am=' + a.toFixed(2) + '&cu=INR&tn=' + encodeURIComponent('DocAura resume'); }

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  var qrLib = null;
  function drawQR(canvas, text) {
    if (!qrLib) qrLib = SK.loadScript(SK.root + 'assets/vendor/qrcode.js');
    qrLib.then(function () {
      var q = window.qrcode(0, 'M'); q.addData(text); q.make();
      var n = q.getModuleCount(), cell = Math.floor(232 / (n + 8)), size = cell * (n + 8), x = canvas.getContext('2d');
      canvas.width = canvas.height = size; x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#1b1340';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect((c + 4) * cell, (r + 4) * cell, cell, cell);
    });
  }

  function openPay(onUnlock) {
    var plan = PLANS[0], box, payArea, utrIn, msg;
    SK.track('pay-shown', {}, true);
    var back = el('div', { class: 'pay-back', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pay-h' });
    function close() { back.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    var packs = el('div', { class: 'choices pay-packs', role: 'group' });
    PLANS.forEach(function (p, i) {
      var b = el('button', { type: 'button', class: 'choice', 'aria-pressed': String(i === 0), text: T.pack(p[0], p[1]) });
      b.addEventListener('click', function () {
        packs.querySelectorAll('.choice').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true'); plan = p; showPay();
      });
      packs.appendChild(b);
    });
    payArea = el('div', { class: 'pay-area' });
    function showPay() {
      payArea.innerHTML = '';
      if (phone()) {
        var a = el('a', { class: 'btn btn-big', href: upiLink(plan[0]), text: T.pay(plan[0]) });
        a.addEventListener('click', function () { SK.track('pay-open', { amount: String(plan[0]) }, true); });
        payArea.appendChild(a);
      } else {
        var cv = el('canvas', { class: 'pay-qr', width: '232', height: '232', 'aria-label': T.scan });
        payArea.appendChild(cv); payArea.appendChild(el('p', { class: 'hint', text: T.scan + ' · ₹' + plan[0] }));
        drawQR(cv, upiLink(plan[0]));
      }
      var cp = el('button', { type: 'button', class: 'btn btn-light btn-small', text: T.copy });
      cp.addEventListener('click', function () { SK.copy(UPI, cp); });
      payArea.appendChild(el('p', { class: 'pay-upi' }, [el('span', { text: T.upiId + ': ' }), el('b', { text: UPI }), document.createTextNode(' '), cp]));
    }
    utrIn = el('input', { class: 'input', id: 'pay-utr', type: 'text', inputmode: 'numeric', maxlength: '12', autocomplete: 'off', placeholder: '123456' });
    msg = el('p', { class: 'status', role: 'status' });
    var unlock = el('button', { type: 'button', class: 'btn', text: T.unlock });
    var cancel = el('button', { type: 'button', class: 'btn btn-light', text: T.cancel });
    unlock.addEventListener('click', function () {
      var d = (utrIn.value || '').replace(/\D/g, '');
      if (d.length < 6) { msg.className = 'status show err'; msg.textContent = T.bad; utrIn.focus(); return; }
      var last6 = d.slice(-6), s = load();
      s.claims = s.claims || [];
      if (s.claims.indexOf(last6) !== -1) { msg.className = 'status show err'; msg.textContent = T.used; return; }
      s.claims.push(last6); s.credits = (s.credits || 0) + plan[1]; save(s);
      SK.track('pay-claim', { amount: String(plan[0]), downloads: String(plan[1]), utr: last6 }, true);
      msg.className = 'status show ok'; msg.textContent = T.thanks(plan[1]);
      setTimeout(function () { close(); onUnlock(); }, 900);
    });
    cancel.addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    box = el('div', { class: 'pay-box' }, [
      el('h2', { id: 'pay-h', text: T.title }), el('p', { class: 'hint', text: T.lead }), packs, payArea,
      el('p', { class: 'pay-after', text: T.after }),
      el('label', { class: 'field-label', for: 'pay-utr', text: T.utr }), utrIn, msg,
      el('div', { class: 'btns' }, [unlock, cancel])
    ]);
    back.appendChild(box); document.body.appendChild(back); document.addEventListener('keydown', esc);
    showPay(); setTimeout(function () { packs.querySelector('.choice').focus(); }, 50);
  }

  // allow(statusEl, go): runs go() if a download is allowed; otherwise asks for payment first
  window.SKPay = {
    allow: function (statusEl, go) {
      var s = load(), now = Date.now();
      function run(t) { Promise.resolve(go()).then(function (ok) { if (ok === false || !t || !statusEl) return; var p = document.createElement('p'); p.className = 'hint'; p.style.margin = '8px 0 0'; p.textContent = t; statusEl.appendChild(p); }); }
      if (!UPI) { run(); return; }                                    // payments not set up: always free
      if (s.until && now < s.until) { run(); return; }                 // re-download window
      if (!s.freeUsed) { s.freeUsed = 1; s.until = now + GRACE; save(s); SK.track('pay-free', {}, true); run(T.freeNote); return; }
      if ((s.credits || 0) > 0) { s.credits--; s.until = now + GRACE; save(s); run(T.left(s.credits)); return; }
      openPay(function () { window.SKPay.allow(statusEl, go); });
    },
    state: load
  };
})();
