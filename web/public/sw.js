/**
 * sw.js — GuardianLink PWA service worker
 *
 * Caches the app shell and approved educational content for offline access.
 * NEVER caches confidential reports, case data, or recovery secrets.
 */

const CACHE_NAME = 'guardianlink-web-v1';
const SHELL_CACHE = '/';

// Paths that must NEVER be cached (confidential/sensitive)
const NEVER_CACHE = ['/reports', '/cases', '/evidence', '/curiosity', '/login', '/auth'];

// Paths that CAN be cached for offline educational access
const OFFLINE_OK = ['/lessons'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_CACHE)));
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

  // Never intercept non-GET requests
  if (event.request.method !== 'GET') return;

  // Never cache confidential paths
  if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) return;

  // Cache lesson content for offline educational access
  if (OFFLINE_OK.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Cache-first for same-origin static assets (JS, CSS, images)
  if (url.origin === self.location.origin && !url.pathname.startsWith('/api')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
});
