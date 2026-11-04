/**
 * sw.js — GuardianLink PWA service worker
 *
 * Minimal cache strategy: cache the shell for offline reading,
 * but always try network first for API calls.
 * Lesson content is cached for offline educational access.
 * Confidential reporting is NEVER cached — always goes to network.
 */
const CACHE_NAME = 'guardianlink-pwa-v2';
const SHELL_FILES = [
  'index.html',
  'styles.css',
  'config.js',
  'i18n.js',
  'api.js',
  'app.js',
  'manifest.json',
];

// API paths that should be cached for offline lesson access
const OFFLINE_CACHEABLE = [
  '/lessons',
];

// API paths that must NEVER be cached (confidential/sensitive)
const NEVER_CACHE = [
  '/reports',
  '/cases',
  '/evidence',
  '/curiosity',
  '/login',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache confidential/sensitive API calls
  if (NEVER_CACHE.some(path => url.pathname.startsWith(path))) {
    return; // Let the request go through normally
  }

  // Cache lesson content for offline educational access
  if (OFFLINE_CACHEABLE.some(path => url.pathname.startsWith(path)) && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // Try network first, fall back to cache
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached || new Response('Offline — lessons not cached yet.', { status: 503 }));
      })
    );
    return;
  }

  // Cache-first for shell files
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache new successful responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
