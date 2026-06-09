const CACHE = 'ig-manager-v12';
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
  // Notion API: never touch.
  if (e.request.url.includes('api.notion.com')) return;

  // DATA FEED: never intercept the static posts feed. The app loads it with a
  // cache-busting query + no-store; the SW must never serve a stale posts.json.
  if (e.request.url.includes('/data/')) return;

  // VIDEOS / THUMBS: the Service Worker does NOT intercept them at all.
  // The browser fetches them natively (correct range handling, fast download, no stale
  // cache). This is deliberate: SW interception of media broke iPhone downloads and
  // served stale muted files. Keep media 100% out of the SW.
  if (e.request.url.includes('/videos/') || e.request.url.includes('/thumbs/')) return;

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

  // Other static assets (icons, manifest): cache-first.
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
