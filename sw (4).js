/**
 * COMEX GOLD - Service Worker
 * ===========================
 * Offline support + Fast loading cache
 * Version: 1.0.0
 */

const CACHE_NAME = 'comex-gold-v1';
const STATIC_CACHE = 'comex-static-v1';

// Cache လုပ်မည့် files
const STATIC_ASSETS = [
  '/COMEX-GOLD_FUTURE-TRADE/',
  '/COMEX-GOLD_FUTURE-TRADE/index.html',
  '/COMEX-GOLD_FUTURE-TRADE/patch.js',
  '/COMEX-GOLD_FUTURE-TRADE/manifest.json',
];

// Cache မလုပ်သင့်တဲ့ domains (Firebase, TradingView)
const NO_CACHE_DOMAINS = [
  'firebaseio.com',
  'googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  's3.tradingview.com',
];

// ============================================================
// INSTALL - Static assets cache
// ============================================================
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function (err) {
        console.warn('[SW] Cache install warning:', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// ============================================================
// ACTIVATE - Old cache cleanup
// ============================================================
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            return name !== CACHE_NAME && name !== STATIC_CACHE;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ============================================================
// FETCH - Smart cache strategy
// ============================================================
self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Firebase / TradingView - cache မလုပ်ဘဲ network သာသုံးမယ်
  var isNoCacheDomain = NO_CACHE_DOMAINS.some(function (domain) {
    return url.indexOf(domain) !== -1;
  });

  if (isNoCacheDomain) {
    event.respondWith(fetch(event.request).catch(function () {
      return new Response('{}', {
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  // POST requests - cache မလုပ်ဘူး
  if (event.request.method !== 'GET') return;

  // Static assets - Cache First strategy
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        // Background မှာ update လုပ်မယ် (stale-while-revalidate)
        var fetchPromise = fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            var responseClone = response.clone();
            caches.open(STATIC_CACHE).then(function (cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(function () {});

        return cached;
      }

      // Cache မရှိရင် network မှ fetch လုပ်မယ်
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200) return response;

        var responseClone = response.clone();
        caches.open(STATIC_CACHE).then(function (cache) {
          cache.put(event.request, responseClone);
        });

        return response;
      }).catch(function () {
        // Offline - index.html ပြမယ်
        return caches.match('/COMEX-GOLD_FUTURE-TRADE/index.html');
      });
    })
  );
});

// ============================================================
// PUSH NOTIFICATIONS (Future use)
// ============================================================
self.addEventListener('push', function (event) {
  if (!event.data) return;

  var data = event.data.json();
  var options = {
    body: data.body || 'COMEX GOLD notification',
    icon: '/COMEX-GOLD_FUTURE-TRADE/icon-192.png',
    badge: '/COMEX-GOLD_FUTURE-TRADE/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/COMEX-GOLD_FUTURE-TRADE/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'COMEX GOLD', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/COMEX-GOLD_FUTURE-TRADE/';

  event.waitUntil(clients.openWindow(url));
});
