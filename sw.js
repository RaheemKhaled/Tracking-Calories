// Raheem Coach Service Worker - Network First with Auto-Update
const CACHE_NAME = 'raheem-coach-v2.7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/raheem-coach.css',
  './css/appediet.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/storage.js',
  './js/onboarding_wizard.js',
  './js/exercise_engine.js',
  './js/google_auth.js',
  './js/nutrition_scanner.js',
  './js/weekly_report.js',
  './js/body_analyzer.js',
  './js/hunger_coach.js',
  './js/gemini_api.js',
  './js/google_workspace_sync.js',
  './assets/app-logo.svg',
  './assets/mascots.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon.png'
];

self.addEventListener('install', (event) => {
  // Force immediate activation
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Delete ALL previous caches (including appediet-*)
          if (key !== CACHE_NAME) {
            console.log('Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass Google API and external requests directly to network
  if (
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('script.google.com') ||
    event.request.url.includes('/api/')
  ) {
    return;
  }

  // Network-First strategy: Always fetch latest version from server, fallback to cache if offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
