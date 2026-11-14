/**
 * Sumukha Co-Op Society - Progressive Web App (PWA) Service Worker
 * Provides offline caching, instantaneous load times, and standalone mobile app experience.
 */

const CACHE_NAME = 'sumukha-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/style.css',
  '/src/resources/logo.jpg'
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Service worker asset pre-cache notice:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Purge older version caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Pass through on localhost; Network-first with cache fallback in production
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache completely for localhost, dev tooling, APIs, and Supabase
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    event.request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/')
  ) {
    return;
  }

  // Network-first strategy: always fetch freshest from network, fallback to cache if offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
