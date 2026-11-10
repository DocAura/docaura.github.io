/* Money, health and date calculators. Each page has <div data-calc="name"> and inputs with ids.
   All maths runs in the browser; numbers are estimates, explained on each page. */
(function () {
  var root = document.querySelector('[data-calc]'); if (!root) return;
  var kind = root.getAttribute('data-calc');
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var v = $(id) ? $(id).value : ''; return v === '' ? NaN : Number(v); };
  var inr = function (v) { return '₹' + Math.round(v).toLocaleString('en-IN'); };
  function row(k, v, big) { return '<div' + (big ? ' class="big"' : '') + '><span>' + k + '</span><b>' + v + '</b></div>'; }
  function bar(a, b, la, lb) {
    var t = a + b, pa = t > 0 ? Math.round(a / t * 100) : 0;
    return '<div class="calc-bar" role="img" aria-label="' + la + ' ' + pa + '%, ' + lb + ' ' + (100 - pa) + '%"><i style="width:' + pa + '%"></i></div>' +
      '<p class="hint" style="margin:0">' + la + ' ' + pa + '% · ' + lb + ' ' + (100 - pa) + '%</p>';
  }
  function out(html) { $('out').innerHTML = html; }
  function need(msg) { out('<p class="hint" style="margin:0">' + msg + '</p>'); }
  var choice = {};
  document.querySelectorAll('.choices[id]').forEach(function (c) { choice[c.id] = SK.choices(c, function () { calc(true); }); });
  function pick(id) { return choice[id] ? choice[id]() : null; }

  var C = {
    sip: function () {
      var mode = pick('mode'), r = num('r'), y = num('y');
      document.querySelectorAll('[data-sip]').forEach(function (el) { el.hidden = el.getAttribute('data-sip') !== mode; });
      if (!(r >= 0 && y > 0 && y <= 60)) return need('Type the expected return and number of years.');
      var i = r / 1200, n = Math.round(y * 12), inv = 0, fv = 0;
      if (mode === 'lump') {
        var P = num('lp'); if (!(P > 0)) return need('Type the amount you will invest once.');
        inv = P; fv = P * Math.pow(1 + r / 100, y);
      } else {
        var m = num('m'), step = num('step') || 0; if (!(m > 0)) return need('Type your monthly SIP amount.');
        for (var k = 0; k < n; k++) { var amt = m * Math.pow(1 + step / 100, Math.floor(k / 12)); inv += amt; fv = (fv + amt) * (1 + i); }
      }
      out(row('Expected value after ' + y + ' years', inr(fv), true) + row('You invest', inr(inv)) + row('Estimated gain', inr(fv - inv)) + bar(inv, fv - inv, 'Invested', 'Gain'));
    },
    fd: function () {
      var P = num('p'), r = num('r'), y = (num('y') || 0) + (num('mo') || 0) / 12, f = Number(pick('freq'));
      if (!(P > 0 && r >= 0 && y > 0)) return need('Type the deposit amount, rate and time.');
      var mat = P * Math.pow(1 + r / 100 / f, f * y);
      out(row('Maturity amount', inr(mat), true) + row('Interest earned', inr(mat - P)) + row('Deposit', inr(P)) + bar(P, mat - P, 'Deposit', 'Interest'));
    },
    rd: function () {
      var R = num('m'), r = num('r'), n = Math.round(num('n'));
      if (!(R > 0 && r >= 0 && n >= 1 && n <= 600)) return need('Type the monthly deposit, rate and number of months.');
      var mat = 0; // each instalment grows with quarterly compounding for the months it stays in
      for (var k = 1; k <= n; k++) mat += R * Math.pow(1 + r / 400, (n - k + 1) / 3);
      out(row('Maturity amount', inr(mat), true) + row('Interest earned', inr(mat - R * n)) + row('Total deposited', inr(R * n)) + bar(R * n, mat - R * n, 'Deposited', 'Interest'));
    },
    ppf: function () {
      var P = num('p'), r = num('r'), y = Math.round(num('y'));
      if (!(P >= 500 && P <= 150000)) return need('Yearly deposit must be between ₹500 and ₹1,50,000.');
      if (!(r >= 0 && y >= 15 && y <= 50)) return need('PPF runs for at least 15 years (extendable in blocks of 5).');
      var bal = 0; for (var k = 0; k < y; k++) bal = (bal + P) * (1 + r / 100);
      out(row('Maturity amount after ' + y + ' years', inr(bal), true) + row('Total deposited', inr(P * y)) + row('Total interest (tax-free)', inr(bal - P * y)) + bar(P * y, bal - P * y, 'Deposited', 'Interest'));
    },
    compound: function () {
      var P = num('p') || 0, r = num('r'), y = num('y'), f = Number(pick('freq')), add = num('add') || 0;
      if (!(r >= 0 && y > 0 && y <= 100 && (P > 0 || add > 0))) return need('Type a starting amount (or a monthly addition), rate and years.');
      // Effective monthly rate for the chosen compounding; additions at the end of each month
      var im = Math.pow(1 + r / 100 / f, f / 12) - 1, months = Math.round(y * 12), bal = P, inv = P;
      for (var mth = 0; mth < months; mth++) { bal = bal * (1 + im) + add; inv += add; }
      out(row('Final amount', money(bal), true) + row('Total put in', money(inv)) + row('Interest earned', money(bal - inv)) + bar(inv, bal - inv, 'Put in', 'Interest'));
    },
    tip: function () {
      var bill = num('bill'), tp = num('tp'), ppl = Math.max(1, Math.round(num('ppl') || 1));
      if (!(bill > 0 && tp >= 0)) return need('Type the bill amount and tip %.');
      var tipAmt = bill * tp / 100, total = bill + tipAmt;
      out(row('Each person pays', money2(total / ppl), true) + row('Tip', money2(tipAmt)) + row('Total with tip', money2(total)) + row('Tip per person', money2(tipAmt / ppl)));
    },
    units: function () {
      var U = {
        length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
        weight: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.028349523125, t: 1000 },
        area: { 'm²': 1, 'km²': 1e6, 'ft²': 0.09290304, acre: 4046.8564224, hectare: 10000, 'sq yd': 0.83612736 },
        volume: { L: 1, mL: 0.001, 'US gal': 3.785411784, 'UK gal': 4.54609, 'US cup': 0.2365882365, 'm³': 1000 },
        speed: { 'km/h': 1, 'mph': 1.609344, 'm/s': 3.6, knot: 1.852 },
        temp: { '°C': 1, '°F': 1, K: 1 }
      };
      var cat = pick('cat'), from = $('uf'), to = $('ut');
      if (from.getAttribute('data-cat') !== cat) {
        [from, to].forEach(function (sel, i) { sel.innerHTML = ''; Object.keys(U[cat]).forEach(function (k) { var o = document.createElement('option'); o.value = o.textContent = k; sel.appendChild(o); }); sel.selectedIndex = i === 0 ? 0 : 1; sel.setAttribute('data-cat', cat); });
      }
      var v = num('uv'); if (isNaN(v)) return need('Type a number to convert.');
      var a = from.value, b = to.value, res;
      if (cat === 'temp') {
        var c = a === '°C' ? v : a === '°F' ? (v - 32) * 5 / 9 : v - 273.15;
        res = b === '°C' ? c : b === '°F' ? c * 9 / 5 + 32 : c + 273.15;
      } else res = v * U[cat][a] / U[cat][b];
      var shown = Math.abs(res) >= 1e-4 && Math.abs(res) < 1e12 ? Number(res.toPrecision(10)).toLocaleString(undefined, { maximumFractionDigits: 6 }) : res.toExponential(6);
      out(row(v.toLocaleString() + ' ' + a + ' =', shown + ' ' + b, true));
    },
    tz: function () {
      var t = $('tt').value, z1 = $('z1').value, z2 = $('z2').value, day = $('td').value;
      if (!t || !day) return need('Pick a date and time.');
      function off(zone, utc) { // minutes ahead of UTC for that zone at that moment
        var p = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(utc));
        var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
        return (Date.UTC(+g.year, g.month - 1, +g.day, +g.hour % 24, +g.minute) - utc) / 60000;
      }
      var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day), tm = /^(\d{2}):(\d{2})/.exec(t);
      var guess = Date.UTC(+dm[1], dm[2] - 1, +dm[3], +tm[1], +tm[2]);
      var utc = guess - off(z1, guess) * 60000; utc = guess - off(z1, utc) * 60000; // two passes handle daylight-saving edges
      var fmtz = function (z) { return new Date(utc).toLocaleString('en-GB', { timeZone: z, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
      var diff = (off(z2, utc) - off(z1, utc)) / 60;
      out(row('In ' + z2.split('/').pop().replace(/_/g, ' '), fmtz(z2), true) + row('In ' + z1.split('/').pop().replace(/_/g, ' '), fmtz(z1)) +
          row('Time difference', diff === 0 ? 'Same time' : (function () { var a = Math.abs(diff), h = Math.floor(a), mi = Math.round((a - h) * 60);
            return z2.split('/').pop().replace(/_/g, ' ') + ' is ' + h + ' h' + (mi ? ' ' + mi + ' min' : '') + (diff > 0 ? ' ahead' : ' behind'); })()));
    },
    tax: function () {
      var inc = (num('sal') || 0) + (num('oth') || 0), salaried = (num('sal') || 0) > 0, ded = num('ded') || 0, age = pick('age');
      if (!(inc > 0)) return need('Type your yearly income.');
      function slab(t, s) { var tax = 0, prev = 0; for (var k = 0; k < s.length; k++) { var top = s[k][0], rate = s[k][1]; if (t > prev) tax += (Math.min(t, top) - prev) * rate; prev = top; } return tax; }
      function finish(taxable, base, limit, rebate, old) {
        var t = base;
        if (taxable <= limit) t = Math.max(0, t - rebate);
        else if (limit === 1200000) t = Math.min(t, taxable - limit); // marginal relief just above ₹12 lakh (new regime)
        var sc = taxable > 50000000 ? (old ? 0.37 : 0.25) : taxable > 20000000 ? 0.25 : taxable > 10000000 ? 0.15 : taxable > 5000000 ? 0.10 : 0;
        return t * (1 + sc) * 1.04;
      }
      var tNew = Math.max(0, inc - (salaried ? 75000 : 0));
      var newTax = finish(tNew, slab(tNew, [[400000, 0], [800000, .05], [1200000, .10], [1600000, .15], [2000000, .20], [2400000, .25], [Infinity, .30]]), 1200000, 60000);
      var tOld = Math.max(0, inc - (salaried ? 50000 : 0) - ded);
      var first = age === '80' ? 500000 : age === '60' ? 300000 : 250000;
      var oldSlabs = age === '80' ? [[500000, 0], [1000000, .20], [Infinity, .30]] : [[first, 0], [500000, .05], [1000000, .20], [Infinity, .30]];
      var oldTax = finish(tOld, slab(tOld, oldSlabs), 500000, 12500, true);
      var better = newTax <= oldTax ? 'New regime' : 'Old regime', save = Math.abs(newTax - oldTax);
      out(row(better + ' saves you', inr(save), true) +
          row('New regime tax (FY 2026-27)', inr(newTax)) + row('Old regime tax', inr(oldTax)) +
          row('Monthly tax (new regime)', inr(newTax / 12)) + row('Taxable income: new / old', inr(tNew) + ' / ' + inr(tOld)));
    },
    salary: function () {
      var ctc = num('ctc'), bp = (num('basic') || 50) / 100, pt = num('pt'); if (isNaN(pt)) pt = 2500;
      if (!(ctc > 0 && bp > 0 && bp <= 1)) return need('Type your yearly CTC.');
      var pfCap = pick('pf') === 'cap';
      var basic = ctc * bp, pfBase = pfCap ? Math.min(basic, 180000) : basic;
      var empPF = pfBase * 0.12, grat = pick('grat') === 'yes' ? basic * 0.0481 : 0;
      var gross = ctc - empPF - grat, eePF = pfBase * 0.12;
      var taxable = Math.max(0, gross - 75000);
      var slab = [[400000, 0], [800000, .05], [1200000, .10], [1600000, .15], [2000000, .20], [2400000, .25], [Infinity, .30]], tax = 0, prev = 0;
      for (var k = 0; k < slab.length; k++) { if (taxable > prev) tax += (Math.min(taxable, slab[k][0]) - prev) * slab[k][1]; prev = slab[k][0]; }
      if (taxable <= 1200000) tax = 0; else tax = Math.min(tax, taxable - 1200000);
      tax *= 1.04;
      var inhand = gross - eePF - pt - tax;
      out(row('In-hand salary per month', inr(inhand / 12), true) + row('In-hand per year', inr(inhand)) +
          row('Gross salary', inr(gross)) + row('Your PF (12%)', inr(eePF)) + row('Employer PF + gratuity in CTC', inr(empPF + grat)) +
          row('Income tax (new regime)', inr(tax)) + row('Professional tax', inr(pt)));
    },
    gratuity: function () {
      var w = num('w'), yrs = num('yrs') || 0, mo = num('mo') || 0, cov = pick('cov') === 'yes';
      if (!(w > 0 && (yrs > 0 || mo > 0))) return need('Type your last monthly basic + DA and years of service.');
      var years = yrs + (mo > 6 ? 1 : 0); // under the Gratuity Act, more than 6 months counts as a full year
      var g = cov ? w * 15 / 26 * years : w * 15 / 30 * Math.floor(yrs);
      out(row('Gratuity', inr(g), true) + row('Years counted', String(cov ? years : Math.floor(yrs))) +
          row('Formula', cov ? 'Basic+DA × 15 ÷ 26 × years' : 'Basic+DA × 15 ÷ 30 × full years') +
          (yrs < 5 ? '<p class="hint" style="margin:0">Most employees need 5 years of service (fixed-term employees: 1 year) to be eligible.</p>' : ''));
    },
    bmi: function () {
      var unit = pick('unit'), kg = num('kg'), cm;
      document.querySelectorAll('[data-u]').forEach(function (el) { el.hidden = el.getAttribute('data-u') !== unit; });
      cm = unit === 'cm' ? num('cm') : ((num('ft') || 0) * 30.48 + (num('in') || 0) * 2.54);
      if (!(kg > 0 && cm > 50 && cm < 260)) return need('Type your height and weight.');
      var b = kg / Math.pow(cm / 100, 2), asian = pick('scale') === 'asia';
      var cut = asian ? [18.5, 23, 25] : [18.5, 25, 30];
      var cat = b < cut[0] ? 'Underweight' : b < cut[1] ? 'Healthy range' : b < cut[2] ? 'Overweight' : 'Obesity range';
      var lo = cut[0] * Math.pow(cm / 100, 2), hi = cut[1] * Math.pow(cm / 100, 2);
      out(row('Your BMI', b.toFixed(1), true) + row('Category (' + (asian ? 'Asian' : 'WHO') + ' cut-offs)', cat) +
          row('Healthy weight for your height', lo.toFixed(1) + ' – ' + hi.toFixed(1) + ' kg') +
          '<p class="hint" style="margin:0">BMI is a rough screening number. It does not measure muscle, body fat or health — talk to a doctor for advice about your body.</p>');
    },
    days: function () {
      var mode = pick('mode');
      document.querySelectorAll('[data-dm]').forEach(function (el) { el.hidden = el.getAttribute('data-dm') !== mode; });
      function d(id) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec($(id).value || ''); return m ? Date.UTC(+m[1], m[2] - 1, +m[3]) : null; }
      function show(t) { return new Date(t).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
      if (mode === 'between') {
        var a = d('d1'), b = d('d2'); if (a === null || b === null) return need('Pick both dates.');
        var days = Math.round((b - a) / 864e5), abs = Math.abs(days), inc = $('incl').checked ? 1 : 0;
        var wk = 0; for (var t = Math.min(a, b), k = 0; k < abs + inc; k++, t += 864e5) { var wd = new Date(t).getUTCDay(); if (wd !== 0 && wd !== 6) wk++; }
        out(row('Days between', (abs + inc).toLocaleString('en-IN') + ' days', true) + row('Weeks + days', Math.floor((abs + inc) / 7) + ' weeks, ' + (abs + inc) % 7 + ' days') +
            row('Working days (Mon–Fri)', wk.toLocaleString('en-IN')) + row('Hours', ((abs + inc) * 24).toLocaleString('en-IN')));
      } else {
        var s = d('d3'), n = num('nd'); if (s === null || isNaN(n)) return need('Pick a date and type the number of days.');
        var sign = pick('dir') === 'sub' ? -1 : 1, res = s + sign * n * 864e5;
        out(row('Result', show(res), true) + row('Start date', show(s)));
      }
    }
  };
  // Currency: a <select id="cur"> on the page, else rupees
  function money(v, dec) {
    var c = $('cur') ? $('cur').value : 'INR';
    try { return new Intl.NumberFormat(c === 'INR' ? 'en-IN' : 'en', { style: 'currency', currency: c, maximumFractionDigits: dec || 0, minimumFractionDigits: dec || 0 }).format(v); }
    catch (e) { return Math.round(v).toLocaleString(); }
  }
  function money2(v) { return money(v, 2); }

  function calc(user) { try { C[kind](); if (user) SK.used('calculate'); } catch (e) { need('Please check the numbers you typed.'); } }
  root.querySelectorAll('input, select').forEach(function (el) {
    el.addEventListener('input', function () { calc(true); }); el.addEventListener('change', function () { calc(true); });
  });
  try { if ($('td') && !$('td').value) $('td').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); } catch (e) {}
  try { if ($('d1') && !$('d1').value) { var td = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); $('d1').value = td; $('d3').value = td; } } catch (e) {}
  calc(false);
})();
