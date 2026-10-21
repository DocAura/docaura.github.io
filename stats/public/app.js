(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY_STORE = 'docaura-dash-key', days = 1, timer = null;
  function getKey() { try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return mem; } }
  var mem = '';
  function setKey(k) { mem = k; try { localStorage.setItem(KEY_STORE, k); } catch (e) {} }
  // A key in the link (#k=...) is saved on this device and removed from the address bar
  var m = /[#&]k=([A-Za-z0-9_-]{16,})/.exec(location.hash);
  if (m) { setKey(m[1]); try { history.replaceState(null, '', location.pathname); } catch (e) {} }

  var LABEL = { 'pageview': 'Opened a page', 'file-chosen': 'Chose a file', 'option': 'Picked an option', 'action': 'Pressed a main button',
    'download': 'Downloaded a file', 'error': 'Saw an error', 'time-on-tool': 'Time spent recorded', 'resume-design': 'Picked a resume design',
    'resume-example': 'Opened a resume example', 'resume-download': 'Downloaded a resume', 'job-match': 'Ran job match',
    'support-shown': 'Saw the chai card', 'support-click': 'Tapped Buy me a chai' };
  var region = null; try { region = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}
  function country(c) { if (!c || c === '--' || c === '-') return 'Unknown'; try { return region ? region.of(c) : c; } catch (e) { return c; } }
  function pageName(p) { return p === '/' ? 'Homepage' : p.replace(/^\/|\/$/g, ''); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function rank(ol, obj, nameFn, limit) {
    ol.innerHTML = '';
    var rows = Object.keys(obj || {}).map(function (k) { return [k, obj[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, limit || 10);
    if (!rows.length) { ol.appendChild(el('li', 'empty', 'Nothing yet')); return; }
    var max = rows[0][1];
    rows.forEach(function (r) {
      var li = el('li'); li.appendChild(el('span', 'nm', nameFn ? nameFn(r[0]) : r[0])); li.appendChild(el('span', 'n', r[1].toLocaleString('en-IN')));
      var tr = el('span', 'track'), i = el('i'); i.style.width = Math.max(3, r[1] / max * 100) + '%'; tr.appendChild(i); li.appendChild(tr);
      ol.appendChild(li);
    });
  }
  function bars(box, items, nowIndex) {
    box.innerHTML = '';
    var max = Math.max(1, Math.max.apply(null, items.map(function (x) { return x.v; })));
    items.forEach(function (x, i) {
      var b = el('div', 'bar' + (x.v ? '' : ' zero') + (i === nowIndex ? ' now' : '')); b.title = x.title;
      if (x.v) b.appendChild(el('span', null, String(x.v)));
      var bi = el('i'); bi.style.height = (x.v / max * 100) + '%'; b.appendChild(bi); b.appendChild(el('em', null, x.label));
      box.appendChild(b);
    });
  }
  function istHour() { return new Date(Date.now() + 5.5 * 3600e3).getUTCHours(); }

  function render(s) {
    var t = s.today || {};
    var range = s.rangeDays || 1, dayKeys = Object.keys(s.days || {}).sort();
    var sum = function (f) { return dayKeys.reduce(function (a, d) { return a + (s.days[d][f] || 0); }, 0); };
    if (range === 1) {
      $('k1l').textContent = 'Visitors today'; $('k1').textContent = t.visitors || 0;
      $('k2').textContent = t.views || 0; $('k3').textContent = t.downloads || 0; $('k4').textContent = t.supportClicks || 0;
      $('k1s').textContent = $('k2s').textContent = $('k3s').textContent = $('k4s').textContent = 'since midnight';
    } else {
      $('k1l').textContent = 'Visitors (' + range + ' days)'; $('k1').textContent = sum('visitors');
      $('k2').textContent = sum('views'); $('k3').textContent = sum('downloads'); $('k4').textContent = sum('supportClicks');
      $('k1s').textContent = 'today: ' + (t.visitors || 0); $('k2s').textContent = 'today: ' + (t.views || 0);
      $('k3s').textContent = 'today: ' + (t.downloads || 0); $('k4s').textContent = 'today: ' + (t.supportClicks || 0);
    }
    bars($('hours'), (s.hours || []).map(function (h, i) { return { v: h.visitors, label: i % 3 ? '' : (i % 12 || 12) + (i < 12 ? 'a' : 'p'), title: i + ':00 – ' + h.visitors + ' visitors, ' + h.views + ' views' }; }), istHour());
    $('daysCard').hidden = range === 1;
    if (range > 1) {
      var list = []; for (var i = range - 1; i >= 0; i--) { var d = new Date(Date.now() + 5.5 * 3600e3 - i * 864e5).toISOString().slice(0, 10); var r = (s.days || {})[d] || {}; list.push({ v: r.visitors || 0, label: d.slice(8), title: d + ' – ' + (r.visitors || 0) + ' visitors' }); }
      $('days').style.gridTemplateColumns = 'repeat(' + range + ', minmax(14px, 1fr))'; bars($('days'), list, range - 1);
    }
    rank($('pages'), s.pages, pageName, 12);
    rank($('events'), s.events, function (k) { return LABEL[k] || k; });
    rank($('tot'), s.timeOnTool);
    rank($('support'), s.support);
    rank($('refs'), s.refs, null, 10);
    rank($('countries'), s.countries, country, 10);
    rank($('devices'), s.devices, function (d) { return { phone: '📱 Phone', computer: '💻 Computer', tablet: 'Tablet' }[d] || d; });
    var box = $('options'); box.innerHTML = '';
    var groups = Object.keys(s.props || {}).filter(function (k) { return !/→ (time|button|where|files|group|from)$/.test(k); })
      .sort(function (a, b) { return total(s.props[b]) - total(s.props[a]); }).slice(0, 8);
    function total(o) { return Object.keys(o).reduce(function (a, k) { return a + o[k]; }, 0); }
    if (!groups.length) box.appendChild(el('p', 'empty', 'Nothing yet'));
    groups.forEach(function (g) {
      var w = el('div', 'optgroup'); var parts = g.split(' → ');
      w.appendChild(el('h3', null, (LABEL[parts[0]] || parts[0]) + ' · ' + parts[1]));
      var c = el('div', 'chips');
      Object.keys(s.props[g]).sort(function (a, b) { return s.props[g][b] - s.props[g][a]; }).slice(0, 12).forEach(function (v) {
        var sp = el('span'); sp.appendChild(document.createTextNode(v + ' ')); sp.appendChild(el('b', null, String(s.props[g][v]))); c.appendChild(sp);
      });
      w.appendChild(c); box.appendChild(w);
    });
    var feed = $('feed'); feed.innerHTML = '';
    if (!(s.recent || []).length) feed.appendChild(el('li', 'empty', 'No activity yet. Open docaura.github.io to see yourself appear here.'));
    (s.recent || []).forEach(function (e) {
      var li = el('li'), tm = el('time'); var d = new Date(e.ts);
      tm.textContent = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + (range > 1 ? ' ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '');
      li.appendChild(tm);
      var w = el('div', 'what'); var tg = el('span', 'tag ' + e.ev, LABEL[e.ev] || e.ev); w.appendChild(tg);
      w.appendChild(el('b', null, pageName(e.page)));
      var extra = Object.keys(e.props || {}).filter(function (k) { return k !== 'seconds'; }).map(function (k) { return e.props[k]; }).join(' · ');
      if (extra) w.appendChild(document.createTextNode(' — ' + extra));
      w.appendChild(el('div', 'meta', 'Visitor ' + e.visitor + ' · ' + country(e.country) + ' · ' + e.dev));
      li.appendChild(w); feed.appendChild(li);
    });
    $('foot').textContent = 'Updated ' + new Date(s.generatedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST · ' + (s.totalEvents || 0) + ' events in range · no cookies, no IP addresses stored';
  }

  function load() {
    var k = getKey(); if (!k) { showGate(); return; }
    fetch('/api/stats?days=' + days, { headers: { 'x-dash-key': k }, cache: 'no-store' }).then(function (r) {
      if (r.status === 401) { showGate(true); return null; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (s) { if (!s) return; $('gate').hidden = true; $('app').hidden = false; $('live').classList.remove('off'); render(s); })
      .catch(function () { $('live').classList.add('off'); $('live').textContent = '● Offline – retrying'; });
  }
  function showGate(bad) { $('app').hidden = true; $('gate').hidden = false; $('gate-err').hidden = !bad; $('key').focus(); }
  $('gate-form').addEventListener('submit', function (e) { e.preventDefault(); var v = $('key').value.trim(); if (v) { setKey(v); load(); } });
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true');
      days = Number(b.getAttribute('data-days')); load();
    });
  });
  load(); timer = setInterval(function () { if (!document.hidden) { $('live').textContent = '● Live'; load(); } }, 30000);
})();
