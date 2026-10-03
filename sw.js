const CACHE_NAME = 'gh-studio-v3.6';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/styles.css',
    '/css/login.css',
    '/app.js',
    '/js/auth.js',
    '/js/db.js',
    '/js/whatsapp.js',
    '/js/pdf.js',
    '/js/calculator.js',
    '/assets/logo.jpg',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('Pre-cache error (some assets optional):', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Skip non-GET requests or Firebase API endpoints
    if (e.request.method !== 'GET') return;
    if (url.origin.includes('firestore.googleapis.com') ||
        url.origin.includes('identitytoolkit.googleapis.com') ||
        url.origin.includes('firebaseinstallations.googleapis.com') ||
        url.origin.includes('accounts.google.com')) {
        return;
    }

    // Network-First with Cache Fallback
    e.respondWith(
        fetch(e.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(e.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    if (e.request.mode === 'navigate') {
                        return caches.match('/index.html') || caches.match('/login.html');
                    }
                    return null;
                });
            })
    );
});
