(function () {
  var $ = function (id) { return document.getElementById(id); };
  var inr = function (v) { return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  function row(k, v, big) { return '<div' + (big ? ' class="big"' : '') + '><span>' + k + '</span><b>' + v + '</b></div>'; }
  var getRate = SK.choices($('rates'), function (v) { $('custom').value = v; calc(true); });
  var getMode = SK.choices($('mode'), function () { calc(true); });
  function calc(user) {
    var a = Number($('amt').value), rate = Number($('custom').value);
    document.querySelectorAll('#rates .choice').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-value')) === rate)); });
    if (!(a >= 0 && rate >= 0)) { $('out').innerHTML = ''; return; }
    var base, gst;
    if (getMode() === 'add') { base = a; gst = a * rate / 100; } else { base = a / (1 + rate / 100); gst = a - base; }
    var half = gst / 2;
    $('out').innerHTML = row(getMode() === 'add' ? 'Total with GST' : 'Price before GST', inr(getMode() === 'add' ? base + gst : base), true) +
      row('GST amount (' + rate + '%)', inr(gst)) + row('Price before GST', inr(base)) + row('Total with GST', inr(base + gst)) +
      row('Same state: CGST ' + rate / 2 + '% + SGST ' + rate / 2 + '%', inr(half) + ' + ' + inr(half)) + row('Other state: IGST ' + rate + '%', inr(gst));
    if (user) SK.used('calculate', { rate: String(rate) });
  }
  ['amt', 'custom'].forEach(function (id) { $(id).addEventListener('input', function () { calc(true); }); });
  calc(false);
})();
