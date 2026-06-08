const CACHE = 'ig-manager-v9';
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

  // MEDIA (videos/thumbs): STALE-WHILE-REVALIDATE.
  // Serve the cached copy INSTANTLY (keeps the iOS share/download gesture alive = fast
  // download), and refresh the cache in the background so a re-pushed file self-heals on
  // the next load. This fixes BOTH bugs: v7 cache-first served a stale MUTED file forever;
  // v8 network-first made downloads fail (fetching 4MB on tap expired the share gesture).
  if (e.request.url.includes('/videos/') || e.request.url.includes('/thumbs/')) {
    e.respondWith(caches.open(CACHE).then(c =>
      c.match(e.request).then(cached => {
        const net = fetch(e.request).then(res => {
          if (res && res.ok && e.request.method === 'GET') c.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    ));
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
