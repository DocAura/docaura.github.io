/* DocAura service worker: lets the site install as an app and open offline.
   Pages: network first (always fresh), cached copy only when offline.
   Our files (scripts, styles, tool engines): served from cache, refreshed in the background. */
const CACHE = 'docaura-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match(new URL('./', self.registration.scope).href))));
    return;
  }
  if (!/\/assets\//.test(url.pathname)) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok && res.status === 200) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
