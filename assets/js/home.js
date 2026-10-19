(function () {
  var input = document.getElementById('find');
  var form = document.getElementById('find-form');
  var cards = Array.prototype.slice.call(document.querySelectorAll('#tool-grid .tool'));
  var none = document.getElementById('no-match');

  function score(card, words) {
    var keys = card.getAttribute('data-keys');
    var s = 0;
    words.forEach(function (w) { if (keys.indexOf(w) !== -1) s++; });
    return s;
  }
  function filter() {
    var words = input.value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 1 && ['to', 'my', 'a', 'the', 'and', 'of', 'for', 'into'].indexOf(w) === -1; });
    var shown = 0;
    cards.forEach(function (c) {
      var ok = !words.length || score(c, words) > 0;
      c.hidden = !ok; if (ok) shown++;
    });
    none.hidden = shown !== 0;
    return words;
  }
  input.addEventListener('input', filter);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var words = filter();
    if (!words.length) return;
    var best = null, bestS = 0;
    cards.forEach(function (c) { var s = score(c, words); if (s > bestS) { bestS = s; best = c; } });
    if (best) location.href = best.href;
  });
})();
