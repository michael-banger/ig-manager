const CACHE = 'ig-manager-v8';
const ASSETS = ['/ig-manager/', '/ig-manager/index.html', '/ig-manager/manifest.json', '/ig-manager/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.notion.com')) return;

  // MEDIA (videos/thumbs): NETWORK-FIRST. A re-pushed file must never be served
  // stale from cache (that was the "downloaded video has no audio" bug: an old
  // muted version stayed cached under the same URL). Fall back to cache only offline.
  if (e.request.url.includes('/videos/') || e.request.url.includes('/thumbs/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // App shell HTML: network-first (keep fresh), fallback to cache offline.
  if (e.request.mode === 'navigate' || e.request.url.includes('/ig-manager/index.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('/ig-manager/index.html')))
    );
    return;
  }

  // Other static assets: cache-first.
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
