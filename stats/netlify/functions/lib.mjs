// Shared logic for the DocAura recorder. Kept free of Netlify imports so it can be tested locally.
// Every event is stored as ONE blob whose KEY holds all its (small, anonymous) data, so the
// dashboard only needs to LIST keys - no read-modify-write counters, no race conditions.
export const SITE_ORIGIN = 'https://docaura.github.io';
export const EVENTS = new Set(['pageview', 'file-chosen', 'option', 'action', 'download', 'error', 'time-on-tool',
  'resume-design', 'resume-example', 'resume-download', 'job-match', 'support-shown', 'support-click']);
const SEP = '~';
const clean = (v, n = 40, slash = false) => String(v ?? '').replace(slash ? /[~\\\n\r\t]/g : /[~\/\\\n\r\t]/g, ' ').replace(slash ? /[^\p{L}\p{N} .,:_()+#%\/-]/gu : /[^\p{L}\p{N} .,:_()+#%-]/gu, '').trim().slice(0, n) || '-';
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s) => { try { return JSON.parse(Buffer.from(s, 'base64url').toString('utf8')); } catch { return {}; } };

export function device(ua = '') {
  if (/bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(ua)) return 'bot';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'phone';
  return 'computer';
}
export async function visitorId(ip, ua, day, salt) {
  // Anonymous daily visitor id: a one-way hash that changes every day. The IP itself is never stored.
  const data = new TextEncoder().encode([ip, ua, day, salt].join('|'));
  const h = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(h).toString('hex').slice(0, 12);
}
// India-time day, since the site's owner reads the dashboard in IST
export function istDay(ts) { return new Date(ts + 5.5 * 3600e3).toISOString().slice(0, 10); }

export function buildKey({ ts, vid, ev, page, country, dev, ref, props }) {
  const p = {}; let n = 0;
  for (const [k, v] of Object.entries(props || {})) { if (k === 'tool') continue; if (n++ >= 6) break; p[clean(k, 20)] = clean(v, 40); }
  const key = [istDay(ts) + '/' + ts, vid, clean(ev, 20), clean(page, 60, true), clean(country, 2), dev, clean(ref, 40), b64(JSON.stringify(p))].join(SEP);
  return key.slice(0, 590);
}
export function parseKey(key) {
  const [dayTs, vid, ev, page, country, dev, ref, props] = key.split(SEP);
  const ts = Number(dayTs.split('/')[1]);
  return { ts, vid, ev, page, country, dev, ref, props: unb64(props || '') };
}
export function validate(body, origin) {
  if (origin !== SITE_ORIGIN) return 'origin';
  if (!body || typeof body !== 'object') return 'body';
  if (!EVENTS.has(body.n)) return 'event';
  return null;
}
export function refHost(r) {
  try { const h = new URL(r).hostname.replace(/^www\./, ''); return h === 'docaura.github.io' ? '' : h; } catch { return ''; }
}

// Turn a list of parsed events into everything the dashboard shows
export function summarise(events, todayStr) {
  const S = { days: {}, hours: Array(24).fill(0).map(() => ({ views: 0, visitors: new Set() })), pages: {}, events: {}, props: {},
    countries: {}, devices: {}, refs: {}, support: {}, timeOnTool: {}, recent: [] };
  const dayVisitors = {}, todayVisitors = new Set();
  for (const e of events) {
    if (e.dev === 'bot') continue;
    const day = istDay(e.ts);
    const d = (S.days[day] ||= { views: 0, events: 0, downloads: 0, supportClicks: 0 });
    (dayVisitors[day] ||= new Set()).add(e.vid);
    if (e.ev === 'pageview') {
      d.views++; S.pages[e.page] = (S.pages[e.page] || 0) + 1;
      if (e.ref && e.ref !== '-') S.refs[e.ref] = (S.refs[e.ref] || 0) + 1;
      S.countries[e.country] = (S.countries[e.country] || 0) + 1;
      S.devices[e.dev] = (S.devices[e.dev] || 0) + 1;
    } else {
      d.events++;
      S.events[e.ev] = (S.events[e.ev] || 0) + 1;
      if (e.ev === 'download') d.downloads++;
      if (e.ev === 'support-click') { d.supportClicks++; const k = (e.props.button || '?') + ' · ' + (e.props.where || '?'); S.support[k] = (S.support[k] || 0) + 1; }
      if (e.ev === 'time-on-tool') { const k = e.props.time || '?'; S.timeOnTool[k] = (S.timeOnTool[k] || 0) + 1; }
      for (const [k, v] of Object.entries(e.props)) { if (k === 'seconds') continue; const pk = e.ev + ' → ' + k; ((S.props[pk] ||= {})[v] = (S.props[pk][v] || 0) + 1); }
    }
    if (day === todayStr) {
      todayVisitors.add(e.vid);
      const hr = new Date(e.ts + 5.5 * 3600e3).getUTCHours();
      if (e.ev === 'pageview') S.hours[hr].views++;
      S.hours[hr].visitors.add(e.vid);
    }
  }
  for (const [day, set] of Object.entries(dayVisitors)) S.days[day].visitors = set.size;
  S.hours = S.hours.map((h) => ({ views: h.views, visitors: h.visitors.size }));
  S.today = { day: todayStr, visitors: todayVisitors.size, ...(S.days[todayStr] || { views: 0, events: 0, downloads: 0, supportClicks: 0 }) };
  S.recent = events.filter((e) => e.dev !== 'bot').sort((a, b) => b.ts - a.ts).slice(0, 60)
    .map((e) => ({ ts: e.ts, visitor: e.vid.slice(0, 6), ev: e.ev, page: e.page, country: e.country, dev: e.dev, props: e.props }));
  return S;
}
