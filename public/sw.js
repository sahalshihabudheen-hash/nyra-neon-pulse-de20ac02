/**
 * Service Worker (sw.js)
 * Responsible for caching application shell assets (HTML, JS, CSS, icons)
 * to allow the web app to open and remain interactive completely offline.
 */

const CACHE_NAME = 'nyra-shell-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline-db.js',
  '/app.js',
  '/manifest.json',
  '/favicon.ico'
];

// Install Event: Cache all essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching static assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting obsolete cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network First falling back to Cache strategy
self.addEventListener('fetch', (event) => {
  // We do not intercept heavy audio streams or third-party analytical requests here.
  // IndexedDB is used exclusively for the binary audio caching.
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/get-audio-url') || url.searchParams.has('videoId')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, update the static shell cache dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseCopy);
          });
        }
        return response;
      })
      .catch(() => {
        console.log('[Service Worker] Network failed, served from cache fallback:', event.request.url);
        return caches.match(event.request).then((fallback) => {
          if (fallback) return fallback;
          // Return offline fallback if hitting navigation request
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
