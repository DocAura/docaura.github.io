(function () {
  var $ = function (id) { return document.getElementById(id); };
  var inr = function (v) { return '₹' + Math.round(v).toLocaleString('en-IN'); };
  function row(k, v, big) { return '<div' + (big ? ' class="big"' : '') + '><span>' + k + '</span><b>' + v + '</b></div>'; }
  function calc(user) {
    var P = Number($('p').value), R = Number($('r').value), n = Number($('n').value) * ($('u').value === 'y' ? 12 : 1);
    if (!(P > 0 && R >= 0 && n >= 1 && n <= 1200)) { $('out').innerHTML = '<p class="hint">Please type a loan amount, rate and time.</p>'; $('sched').innerHTML = ''; return; }
    n = Math.round(n);
    var r = R / 1200, emi = r ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n, total = emi * n;
    var pi = Math.round((P / total) * 100);
    $('out').innerHTML = row('Monthly EMI', inr(emi), true) + row('Total interest', inr(total - P)) + row('Total payment', inr(total)) +
      '<div class="calc-bar" role="img" aria-label="Principal ' + pi + '%, interest ' + (100 - pi) + '%"><i style="width:' + pi + '%"></i></div><p class="hint" style="margin:0">Principal ' + pi + '% · Interest ' + (100 - pi) + '%</p>';
    var bal = P, h = '<table class="calc-table"><thead><tr><th>Year</th><th>Principal paid</th><th>Interest paid</th><th>Balance</th></tr></thead><tbody>';
    for (var y = 1; y <= Math.ceil(n / 12); y++) {
      var pp = 0, ip = 0;
      for (var m = 0; m < 12 && (y - 1) * 12 + m < n; m++) { var it = bal * r, pr = emi - it; ip += it; pp += pr; bal = Math.max(0, bal - pr); }
      h += '<tr><td>' + y + '</td><td>' + inr(pp) + '</td><td>' + inr(ip) + '</td><td>' + inr(bal) + '</td></tr>';
    }
    $('sched').innerHTML = h + '</tbody></table>';
    if (user) SK.used('calculate');
  }
  ['p', 'r', 'n', 'u'].forEach(function (id) { $(id).addEventListener('input', function () { calc(true); }); $(id).addEventListener('change', function () { calc(true); }); });
  calc(false);
})();
