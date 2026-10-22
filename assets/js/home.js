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

// "Came from YouTube?" strip: shown only to visitors arriving from YouTube (or a link tagged utm_source=youtube)
(function () {
  var strip = document.getElementById('yt-strip'); if (!strip) return;
  var KEY = 'docaura-yt';
  function store(v) { try { if (v === undefined) return sessionStorage.getItem(KEY); sessionStorage.setItem(KEY, v); } catch (e) { return null; } }
  var ref = document.referrer || '', fromYT = false;
  try { fromYT = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(new URL(ref).hostname); } catch (e) {}
  if (/com\.google\.android\.youtube/.test(ref) || /[?&]utm_source=youtube/i.test(location.search)) fromYT = true;
  if (fromYT) store('1');
  if (store() !== '1') return;           // remembered for this visit, so it's still there if they come back to the homepage
  strip.hidden = false;
  if (window.SK && SK.track) SK.track('yt-strip-shown', {}, true);
  document.getElementById('yt-close').addEventListener('click', function () { strip.hidden = true; store('0'); });
})();
