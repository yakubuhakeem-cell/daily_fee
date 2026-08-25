const STATIC_CACHE_NAME = 'holy-child-static-v9';
const DYNAMIC_CACHE_NAME = 'holy-child-dynamic-v9';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-192.png',
  '/maskable-512.png',
  '/fee_tracker_logo.jpg',
  '/fee_tracker_logo.png',
  '/school_logo.jpg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRE_CACHE_ASSETS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        let completed = 0;
        const total = urls.length;
        if (total === 0) {
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'CACHE_COMPLETED',
                cacheName: STATIC_CACHE_NAME
              });
            });
          });
          return;
        }

        const notifyProgress = (url, success) => {
          completed++;
          const progress = Math.round((completed / total) * 100);
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'CACHE_PROGRESS',
                url,
                success,
                progress,
                completed,
                total
              });
            });
          });
        };

        return Promise.all(
          urls.map((url) => {
            // Check if already cached to avoid re-fetching
            return cache.match(url).then((matched) => {
              if (matched) {
                notifyProgress(url, true);
                return;
              }
              return cache.add(url)
                .then(() => {
                  notifyProgress(url, true);
                })
                .catch((err) => {
                  console.warn(`[Service Worker] Failed to pre-cache asset: ${url}`, err);
                  notifyProgress(url, false);
                });
            });
          })
        ).then(() => {
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'CACHE_COMPLETED',
                cacheName: STATIC_CACHE_NAME
              });
            });
          });
        });
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // We only handle GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Check if it is an API request (local or external APIs like firestore)
  const isApiRequest = url.pathname.includes('/api/') || 
                       url.hostname.includes('firestore.googleapis.com') ||
                       url.hostname.includes('firebase');

  if (isApiRequest) {
    // Network-first strategy for API data
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If successful network response, save a clone to the dynamic cache
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback - check cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If API request is not cached and we are offline, return fallback JSON
            return new Response(JSON.stringify({ 
              error: "Offline", 
              message: "You are currently offline. This live data is unavailable.",
              offline: true 
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
  } else {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate: Serve from cache immediately, fetch fresh in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(STATIC_CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
            })
            .catch(() => {/* Ignore network errors for background sync when offline */});
          
          return cachedResponse;
        }

        // Cache miss: fetch from network
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Cache static assets on demand
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            // Offline fallback for navigations (HTML)
            if (request.mode === 'navigate') {
              return caches.match('/index.html') || caches.match('/');
            }
          });
      })
    );
  }
});
