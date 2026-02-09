// Service Worker for Wendy Voice Assistant PWA
const CACHE_NAME = 'wendy-v1';
const urlsToCache = [
    '/voice/',
    '/voice/index.html',
    '/voice/style.css',
    '/voice/app.js',
    '/voice/manifest.json',
    '/voice/icon-192.png',
    '/voice/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching app resources');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service worker installed successfully');
                self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service worker activated successfully');
            self.clients.claim();
        })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Don't cache API requests
    if (event.request.url.includes('api.') || 
        event.request.url.includes('openai.com') ||
        event.request.url.includes('elevenlabs.io') ||
        event.request.url.includes('100.87.212.85')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    console.log('Serving from cache:', event.request.url);
                    return response;
                }
                
                console.log('Fetching from network:', event.request.url);
                return fetch(event.request).then((response) => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    // Add to cache
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // Return offline page or fallback
                console.log('Network and cache failed for:', event.request.url);
                if (event.request.destination === 'document') {
                    return caches.match('/voice/index.html');
                }
            })
    );
});

// Background sync for offline message queue
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // Handle queued messages when back online
    console.log('Background sync triggered');
}

// Push notification support
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const options = {
        body: data.body || 'New message from Wendy',
        icon: '/voice/icon-192.png',
        badge: '/voice/icon-192.png',
        vibrate: [100, 50, 100],
        data: data.url || '/voice/'
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Wendy', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data || '/voice/')
    );
});