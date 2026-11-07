const CACHE = 'junaira-v2';
const CORE_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('junaira-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);

    // Refresh the cache in the background, while returning cached content fast.
    const refresh = fetch(request).then(response => {
      if (response && response.ok) {
        return cache.put(request, response.clone()).then(() => response);
      }
      return response;
    }).catch(() => null);

    event.waitUntil(refresh.then(() => undefined));

    if (cached) return cached;

    const fresh = await refresh;
    if (fresh) return fresh;

    if (request.mode === 'navigate') {
      return (await cache.match('./index.html')) ||
             (await cache.match('./')) ||
             Response.error();
    }
    return Response.error();
  })());
});
