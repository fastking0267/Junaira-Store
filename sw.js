// Network-first service worker: online hole shobsomoy notun file ane, offline hole cache theke chale.
// HTML edit korle ei file bodlano dorkar nai.
const CACHE = 'junaira-v3';
const CORE_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const NETWORK_TIMEOUT = 4000; // dhir net hole 4 sec por cache theke dibe

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // ekta file (jemon icon) na thakleo install fail hobe na
      .then(cache => Promise.all(CORE_FILES.map(f => cache.add(f).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('junaira-') && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(
      res => { clearTimeout(timer); resolve(res); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase sync etc. sorasori network e jabe

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isPage = request.mode === 'navigate';
    try {
      // HTTP cache bypass kore shobsomoy notun file anbe
      const fresh = await fetchWithTimeout(
        new Request(request, { cache: 'no-cache' }),
        isPage ? NETWORK_TIMEOUT : 10000
      );
      if (fresh && fresh.ok) {
        // page hole index.html er nam e rakhi, jate offline e shob URL e kaj kore
        cache.put(isPage ? './index.html' : request, fresh.clone());
      }
      return fresh;
    } catch (err) {
      // offline ba khub dhir net: cache theke dao
      const cached = isPage
        ? ((await cache.match('./index.html')) || (await cache.match('./')))
        : await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      return new Response(
        isPage ? 'Offline. Ekbar online e app ta khulun, tarpor offline e cholbe.' : '',
        { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }
  })());
});
