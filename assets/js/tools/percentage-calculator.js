(function () {
  var $ = function (id) { return document.getElementById(id); };
  function f(v) { return (Math.round(v * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
  function n(id) { var v = $(id).value; return v === '' ? NaN : Number(v); }
  function set(id, txt) { $(id).textContent = txt; }
  function calc(user) {
    var a1 = n('a1'), a2 = n('a2'), b1 = n('b1'), b2 = n('b2'), c1 = n('c1'), c2 = n('c2'), d1 = n('d1'), d2 = n('d2'), e1 = n('e1');
    set('a', isNaN(a1 + a2) ? '' : '= ' + f(a2 * a1 / 100) + '   (' + f(a2) + ' × ' + f(a1) + ' ÷ 100)');
    set('b', isNaN(b1 + b2) || !b2 ? '' : '= ' + f(b1 / b2 * 100) + '%   (' + f(b1) + ' ÷ ' + f(b2) + ' × 100)');
    if (isNaN(c1 + c2) || !c1) set('c', ''); else { var ch = (c2 - c1) / Math.abs(c1) * 100; set('c', '= ' + (ch >= 0 ? '+' : '') + f(ch) + '% ' + (ch >= 0 ? 'increase' : 'decrease') + '   (difference ' + f(c2 - c1) + ')'); }
    set('d', isNaN(d1 + d2) ? '' : '= ' + f(d1 * (1 - d2 / 100)) + '   (you save ' + f(d1 * d2 / 100) + ')');
    set('e', isNaN(e1) ? '' : '= ' + f(e1 * 9.5) + '%');
    if (user) SK.used('calculate');
  }
  document.querySelectorAll('.pc').forEach(function (el) { el.addEventListener('input', function () { calc(true); }); });
  calc(false);
})();
