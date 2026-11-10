(function () {
  var $ = function (id) { return document.getElementById(id); };
  var getCat = SK.choices($('cat'), calc);
  function parse(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function dim(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // days in month m (1-12)
  function utc(p) { return Date.UTC(p.y, p.m - 1, p.d); }
  function diff(a, b) { // full years, months, days from a to b (b >= a)
    var y = b.y - a.y, m = b.m - a.m, d = b.d - a.d;
    if (d < 0) { m--; var pm = b.m - 1 || 12, py = b.m - 1 ? b.y : b.y - 1; d += dim(py, pm); }
    if (m < 0) { y--; m += 12; }
    return { y: y, m: m, d: d };
  }
  function pl(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  try { $('ason').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); } catch (e) {}

  function calc() {
    var a = parse($('dob').value), b = parse($('ason').value), out = $('out'), el = $('elig');
    if (!a || !b) { out.hidden = true; el.className = 'status'; return; }
    if (utc(b) < utc(a)) { out.hidden = false; $('age-big').textContent = 'The “as on” date is before the birth date.'; $('age-more').textContent = ''; return; }
    var r = diff(a, b), days = Math.round((utc(b) - utc(a)) / 864e5);
    out.hidden = false;
    $('age-big').textContent = pl(r.y, 'year') + ', ' + pl(r.m, 'month') + ', ' + pl(r.d, 'day');
    var ny = b.y, nb = { y: ny, m: a.m, d: Math.min(a.d, dim(ny, a.m)) };
    if (utc(nb) <= utc(b)) { ny++; nb = { y: ny, m: a.m, d: Math.min(a.d, dim(ny, a.m)) }; }
    var toNext = Math.round((utc(nb) - utc(b)) / 864e5);
    var wd = new Date(utc(a)).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' });
    $('age-more').textContent = 'Total: ' + days.toLocaleString('en-IN') + ' days · ' + (r.y * 12 + r.m).toLocaleString('en-IN') + ' months · Born on a ' + wd + ' · Next birthday in ' + pl(toNext, 'day');
    SK.used('calculate');
    // Eligibility
    var mn = $('amin').value === '' ? null : Number($('amin').value), mx = $('amax').value === '' ? null : Number($('amax').value);
    if (mn === null && mx === null) { el.className = 'status'; el.textContent = ''; return; }
    var rel = Number(getCat()), maxR = mx === null ? null : mx + rel;
    var tooYoung = mn !== null && r.y < mn;
    // Like SSC rules: "18–27" means born not later than cut-off − 18 years and not earlier than
    // cut-off − 27 years + 1 day, so completing the maximum age on the cut-off date is already over.
    var tooOld = maxR !== null && r.y >= maxR;
    el.className = 'status show ' + (tooYoung || tooOld ? 'err' : 'ok');
    el.textContent = tooYoung ? '✗ Not eligible yet — you are under ' + mn + ' years on this date.'
      : tooOld ? '✗ Over the age limit — you have completed ' + maxR + ' years on this date' + (rel ? ' (limit includes ' + rel + ' years relaxation)' : '') + '.'
      : '✓ Eligible by age' + (maxR !== null ? ' (limit ' + maxR + ' years' + (rel ? ' with relaxation' : '') + ')' : '') + '.';
  }
  ['dob', 'ason', 'amin', 'amax'].forEach(function (id) { $(id).addEventListener('input', calc); $(id).addEventListener('change', calc); });
})();
