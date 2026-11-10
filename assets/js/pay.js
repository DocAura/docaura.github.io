/* Resume downloads: first one free, then small UPI packs (paid to the owner's own UPI ID).
   The site cannot see UPI payments, so after paying the visitor types the last 6 digits of the
   UPI transaction ID (UTR). That unlocks the downloads at once.
   Paid downloads are saved on our server so they are never lost: in a restore code (DA-XXXX-XXXX)
   and, if the person wishes, under their Google sign-in (we keep only the email address — never a
   password). Free users never see a login. */
(function () {
  var CFG = window.SK_CONFIG || {}, KEY = 'docaura-resume-pay', AKEY = 'docaura-acct', GRACE = 30 * 60 * 1000;
  var PLANS = CFG.resumePlans || [[10, 2], [50, 10]], UPI = CFG.upi || '', API = CFG.statsUrl ? CFG.statsUrl + '/api/acct' : '';
  var GID = CFG.googleClientId || '';
  var T = {
    freeNote: '🎉 Your first resume download was free! Fix anything and download again free for the next 30 minutes.',
    left: function (n) { return n + (n === 1 ? ' paid download' : ' paid downloads') + ' left. Re-downloads are free for 30 minutes.'; },
    title: 'Get more downloads', lead: 'Your first resume was free. Pick a small pack for more downloads — it keeps DocAura running. 💜',
    pack: function (a, n) { return '₹' + a + ' · ' + n + ' downloads'; }, pay: function (a) { return 'Pay ₹' + a + ' with any UPI app'; },
    scan: 'Scan with any UPI app', upiId: 'UPI ID', copy: 'Copy',
    after: 'After paying: open the payment in your UPI app and type the last 6 digits of the UPI Ref No. / UTR (12 digits).',
    utr: 'Last 6 digits of UTR', unlock: 'Unlock downloads', cancel: 'Not now',
    bad: 'Please type the last 6 digits of the UTR (numbers only).', used: 'This UTR has already been used. If you paid again, check the new UTR — or contact us.',
    thanks: function (n) { return 'Thank you! 💜 ' + n + ' downloads unlocked.'; },
    net: 'Could not reach our server. Please check your internet and try again.',
    saveH: 'Save your downloads 💜', saveP: 'Your downloads are saved under this restore code. Use it to get them back on another phone or after clearing your browser:',
    saveG: 'Or sign in with Google to save them to your email automatically (we only see your email address, never your password):',
    cont: 'Continue to download', restoreLink: 'Bought downloads before? Restore them', restoreH: 'Restore your paid downloads',
    codeL: 'Restore code', codeBtn: 'Restore', badCode: 'That code was not found. Please check it (it looks like DA-7K3P-9QXM).',
    signed: function (who, n) { return 'Signed in as ' + who + ' · ' + n + (n === 1 ? ' paid download' : ' paid downloads') + ' left'; },
    out: 'Sign out', or: 'or'
  };

  function load(k) { try { return JSON.parse(localStorage.getItem(k || KEY)) || {}; } catch (e) { return {}; } }
  function save(s, k) { try { localStorage.setItem(k || KEY, JSON.stringify(s)); } catch (e) {} }
  function acct() { return load(AKEY); }
  function setAcct(r) {
    if (!r) { try { localStorage.removeItem(AKEY); } catch (e) {} bar(); return; }
    var a = acct(); a.session = r.session || a.session; a.email = r.email || ''; a.code = r.code || a.code || ''; a.credits = r.credits; save(a, AKEY); bar();
  }
  function api(op, body) {
    if (!API) return Promise.reject(new Error('off'));
    return fetch(API, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(Object.assign({ op: op }, body || {})) })
      .then(function (r) { return r.json(); });
  }
  function phone() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); }
  function upiLink(a) { return 'upi://pay?pa=' + encodeURIComponent(UPI) + '&pn=' + encodeURIComponent('DocAura') + '&am=' + a.toFixed(2) + '&cu=INR&tn=' + encodeURIComponent('DocAura resume'); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function dialog(children, onClose) {
    var back = el('div', { class: 'pay-back', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pay-h' });
    var box = el('div', { class: 'pay-box' }, children);
    function close() { back.remove(); document.removeEventListener('keydown', esc); if (onClose) onClose(); }
    function esc(e) { if (e.key === 'Escape') close(); }
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.appendChild(box); document.body.appendChild(back); document.addEventListener('keydown', esc);
    return { box: box, close: close };
  }

  // After signing in, move downloads bought earlier on this device (before accounts existed) into the account
  function mergeLocal() {
    var s = load(), a = acct();
    if (!a.session || !(s.credits > 0)) return Promise.resolve();
    return api('merge', { session: a.session, credits: s.credits }).then(function (r) { if (!r.error) { s.credits = 0; save(s); setAcct(r); } }).catch(function () {});
  }

  // ---- Google sign-in (only when a client id is configured) ----
  var gisP = null;
  function googleButton(where, done) {
    if (!GID) return;
    if (!gisP) gisP = SK.loadScript('https://accounts.google.com/gsi/client');
    gisP.then(function () {
      window.google.accounts.id.initialize({
        client_id: GID, ux_mode: 'popup', auto_select: false,
        callback: function (resp) {
          api('google', { credential: resp.credential, session: acct().session }).then(function (r) {
            if (r.error) return; setAcct(r); SK.track('pay-signin', { via: 'google' }, true); mergeLocal().then(function () { if (done) done(r); });
          }).catch(function () {});
        }
      });
      window.google.accounts.id.renderButton(where, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill' });
    }).catch(function () { where.hidden = true; });
  }

  // ---- Small account line under the download button ----
  function bar() {
    var host = document.getElementById('acct-bar');
    if (!host) { var dl = document.getElementById('dl'); if (!dl || !API) return; host = el('div', { id: 'acct-bar', class: 'acct-bar' }); dl.parentNode.insertBefore(host, dl.nextSibling); }
    host.innerHTML = '';
    var a = acct();
    if (a.session) {
      host.appendChild(el('span', { text: T.signed(a.email || a.code, a.credits || 0) }));
      var o = el('button', { type: 'button', class: 'link-btn', text: T.out });
      o.addEventListener('click', function () { api('logout', { session: a.session }).catch(function () {}); setAcct(null); });
      host.appendChild(document.createTextNode(' · ')); host.appendChild(o);
    } else {
      var r = el('button', { type: 'button', class: 'link-btn', text: T.restoreLink });
      r.addEventListener('click', openRestore); host.appendChild(r);
    }
  }

  function openRestore() {
    var inp = el('input', { class: 'input', id: 'restore-code', type: 'text', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'DA-7K3P-9QXM' });
    var msg = el('p', { class: 'status', role: 'status' }), g = el('div', { class: 'pay-g' });
    var go = el('button', { type: 'button', class: 'btn', text: T.codeBtn }), d;
    go.addEventListener('click', function () {
      api('code', { code: inp.value }).then(function (r) {
        if (r.error) { msg.className = 'status show err'; msg.textContent = T.badCode; return; }
        setAcct(r); SK.track('pay-signin', { via: 'code' }, true); mergeLocal(); d.close();
      }).catch(function () { msg.className = 'status show err'; msg.textContent = T.net; });
    });
    d = dialog([el('h2', { id: 'pay-h', text: T.restoreH }), GID ? g : null, GID ? el('p', { class: 'hint', text: T.or }) : null,
      el('label', { class: 'field-label', for: 'restore-code', text: T.codeL }), inp, msg, el('div', { class: 'btns' }, [go])]);
    googleButton(g, function () { d.close(); });
    setTimeout(function () { inp.focus(); }, 50);
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

  function showCode(d, code, onDone) {
    d.box.innerHTML = '';
    var cp = el('button', { type: 'button', class: 'btn btn-light btn-small', text: T.copy });
    cp.addEventListener('click', function () { SK.copy(code, cp); });
    var g = el('div', { class: 'pay-g' }), cont = el('button', { type: 'button', class: 'btn btn-big', text: T.cont });
    cont.addEventListener('click', function () { d.close(); onDone(); });
    [el('h2', { id: 'pay-h', text: T.saveH }), el('p', { class: 'hint', text: T.saveP }),
     el('p', { class: 'pay-code' }, [el('b', { text: code }), document.createTextNode(' '), cp]),
     GID ? el('p', { class: 'hint', text: T.saveG }) : null, GID ? g : null, cont].forEach(function (c) { if (c) d.box.appendChild(c); });
    googleButton(g);
  }

  function openPay(onUnlock) {
    var plan = PLANS[0], payArea, utrIn, msg, d;
    SK.track('pay-shown', {}, true);
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
    function fail(t) { msg.className = 'status show err'; msg.textContent = t; unlock.disabled = false; }
    unlock.addEventListener('click', function () {
      var dgt = (utrIn.value || '').replace(/\D/g, '');
      if (dgt.length < 6) { fail(T.bad); utrIn.focus(); return; }
      var last6 = dgt.slice(-6), s = load(); s.claims = s.claims || [];
      if (s.claims.indexOf(last6) !== -1) return fail(T.used);
      unlock.disabled = true;
      SK.track('pay-claim', { amount: String(plan[0]), downloads: String(plan[1]), utr: last6 }, true);
      function localUnlock() { s.claims.push(last6); s.credits = (s.credits || 0) + plan[1]; save(s); }
      api('claim', { session: acct().session, amount: plan[0], downloads: plan[1], utr: last6 }).then(function (r) {
        if (r.error === 'utr-used') return fail(T.used);
        if (r.error) { localUnlock(); msg.className = 'status show ok'; msg.textContent = T.thanks(plan[1]); setTimeout(function () { d.close(); onUnlock(); }, 900); return; }
        s.claims.push(last6); save(s); setAcct(r);
        msg.className = 'status show ok'; msg.textContent = T.thanks(plan[1]);
        if (r.newCode) setTimeout(function () { showCode(d, r.code, onUnlock); }, 700);
        else setTimeout(function () { d.close(); onUnlock(); }, 900);
      }).catch(function () { // server unreachable: still unlock on this device so the customer is never stuck
        localUnlock(); msg.className = 'status show ok'; msg.textContent = T.thanks(plan[1]);
        setTimeout(function () { d.close(); onUnlock(); }, 900);
      });
    });
    var restore = el('button', { type: 'button', class: 'link-btn', text: T.restoreLink });
    d = dialog([el('h2', { id: 'pay-h', text: T.title }), el('p', { class: 'hint', text: T.lead }), packs, payArea,
      el('p', { class: 'pay-after', text: T.after }), el('label', { class: 'field-label', for: 'pay-utr', text: T.utr }), utrIn, msg,
      el('div', { class: 'btns' }, [unlock, cancel]), API ? restore : null]);
    cancel.addEventListener('click', function () { d.close(); });
    restore.addEventListener('click', function () { d.close(); openRestore(); });
    showPay(); setTimeout(function () { packs.querySelector('.choice').focus(); }, 50);
  }

  // allow(statusEl, go): runs go() if a download is allowed; otherwise asks for payment first
  function allow(statusEl, go) {
    var s = load(), now = Date.now(), a = acct();
    function run(t) { Promise.resolve(go()).then(function (ok) { if (ok === false || !t || !statusEl) return; var p = document.createElement('p'); p.className = 'hint'; p.style.margin = '8px 0 0'; p.textContent = t; statusEl.appendChild(p); }); }
    function again() { allow(statusEl, go); }
    if (!UPI) { run(); return; }                                   // payments not set up: always free
    if (s.until && now < s.until) { run(); return; }                // re-download window
    if (!s.freeUsed) { s.freeUsed = 1; s.until = now + GRACE; save(s); SK.track('pay-free', {}, true); run(T.freeNote); return; }
    if ((s.credits || 0) > 0) { s.credits--; s.until = now + GRACE; save(s); run(T.left(s.credits)); return; }
    if (a.session) {
      api('use', { session: a.session }).then(function (r) {
        if (r.error === 'signed-out') { setAcct(null); openPay(again); return; }
        if (r.error) { SK.status(statusEl, 'err', T.net); return; }
        setAcct(r);
        if (r.ok) { var st = load(); st.until = Date.now() + GRACE; save(st); run(T.left(r.credits)); } else openPay(again);
      }).catch(function () { SK.status(statusEl, 'err', T.net); });
      return;
    }
    openPay(again);
  }

  window.SKPay = { allow: allow, state: load, account: acct };
  // Refresh the saved account quietly when the page opens
  document.addEventListener('DOMContentLoaded', function () {
    var a = acct();
    if (a.session) api('state', { session: a.session }).then(function (r) { if (r.error === 'signed-out') setAcct(null); else if (!r.error) setAcct(r); }).catch(function () {});
    bar();
  });
})();
