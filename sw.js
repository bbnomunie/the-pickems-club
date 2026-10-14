// Pickems Club service worker.
// - Pages: network-first, so players always get the newest version of the
//   site; the cached copy is only a fallback when offline.
// - Only same-origin GET requests are touched. Supabase (database, auth,
//   realtime), CDN scripts and everything else go straight to the network
//   and are never cached, so picks and scores are always live.
const CACHE = 'pickems-shell-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(req)
            .then(res => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
                }
                return res;
            })
            .catch(() =>
                caches.match(req).then(hit =>
                    hit || (req.mode === 'navigate' ? caches.match('./') : undefined)
                )
            )
    );
});
