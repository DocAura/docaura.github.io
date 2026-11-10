(function () {
  var $ = function (id) { return document.getElementById(id); }, ta = $('txt');
  function mins(n, wpm) { var m = n / wpm; return m < 1 ? Math.max(0, Math.round(m * 60)) + ' sec' : Math.round(m) + ' min'; }
  function count() {
    var t = ta.value, words = t.trim() ? t.trim().split(/\s+/).length : 0;
    var chars = Array.from(t).length, noSp = Array.from(t.replace(/\s/g, '')).length;
    var sent = t.trim() ? (t.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || []).filter(function (s) { return s.trim(); }).length : 0;
    var paras = t.trim() ? t.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length : 0;
    var cells = [['Words', words], ['Characters', chars], ['Without spaces', noSp], ['Sentences', sent], ['Paragraphs', paras], ['Reading time', mins(words, 200)], ['Speaking time', mins(words, 130)]];
    $('counts').innerHTML = '';
    cells.forEach(function (c) { var d = document.createElement('div'); var b = document.createElement('b'); b.textContent = typeof c[1] === 'number' ? c[1].toLocaleString() : c[1]; var s = document.createElement('span'); s.textContent = c[0]; d.appendChild(b); d.appendChild(s); $('counts').appendChild(d); });
    if (words) SK.used('count');
  }
  function title(s) { return s.toLowerCase().replace(/(^|[\s(\["'-])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }); }
  function sentence(s) { return s.toLowerCase().replace(/(^\s*|[.!?।]\s+)(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }); }
  document.querySelectorAll('[data-case]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-case'), v = ta.value;
      ta.value = k === 'upper' ? v.toUpperCase() : k === 'lower' ? v.toLowerCase() : k === 'title' ? title(v) : k === 'sentence' ? sentence(v) : v.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      count(); SK.used('case-' + k);
    });
  });
  $('copy').addEventListener('click', function () { SK.copy(ta.value, this); });
  $('clear').addEventListener('click', function () { ta.value = ''; count(); ta.focus(); });
  ta.addEventListener('input', count);
  count();
})();
