const CACHE = 'workout-v5';

const PRECACHE = [
  './',
  './index.html',
  './support.js',
  './react.min.js',
  './react-dom.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Page loads go network-first: a content change (like the trunk-twists reorder
  // or this fix itself) reaches an already-installed client the next time it's
  // online, without depending on remembering to bump CACHE. Both 073c252 and
  // bd2e44d changed only index.html and never bumped CACHE, so the byte-identical
  // sw.js never reinstalled and neither change ever reached an installed phone
  // (task #2329). Falls back to the cached shell when offline, same guarantee as
  // before — this only changes the online case.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache GIFs and fonts lazily on first fetch
        if (
          e.request.url.includes('/gifs/') ||
          e.request.url.includes('fonts.g') ||
          e.request.url.includes('fonts.googleapis')
        ) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
