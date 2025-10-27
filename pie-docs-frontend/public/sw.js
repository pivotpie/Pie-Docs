/* eslint-env serviceworker */
/**
 * Service Worker for Pie Docs
 * Handles offline functionality and background sync
 */

const CACHE_NAME = 'pie-docs-v1';
const OFFLINE_URL = '/offline.html';

// Cache essential resources
const CACHE_RESOURCES = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Add other essential static resources
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching essential resources');
        return cache.addAll(CACHE_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip extension requests
  if (request.url.includes('extension')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // If online, update cache with fresh content
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // If offline, serve from cache
        return caches.match(request)
          .then((response) => {
            if (response) {
              return response;
            }

            // If it's a navigation request and not in cache, serve offline page
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }

            // For other requests, return a basic offline response
            return new Response('Offline', {
              status: 408,
              statusText: 'Request Timeout'
            });
          });
      })
  );
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-operations') {
    event.waitUntil(syncOfflineOperations());
  }
});

// Sync offline operations
async function syncOfflineOperations() {
  try {
    console.log('Starting background sync...');

    // This would typically communicate with the main app
    // through postMessage to trigger sync
    const clients = await self.clients.matchAll();

    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'SYNC_OFFLINE_OPERATIONS'
      });
    }

    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error; // This will cause the sync to be retried
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  const options = {
    body: 'Your offline data has been synchronized',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'sync-notification',
    requireInteraction: false,
    silent: false
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
  }

  event.waitUntil(
    self.registration.showNotification('Pie Docs', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_OPERATION':
      // Cache offline operation for later sync
      cacheOfflineOperation(data);
      break;

    case 'SYNC_NOW':
      // Trigger immediate sync
      syncOfflineOperations();
      break;

    default:
      console.log('Unknown message type:', type);
  }
});

// Cache offline operation
async function cacheOfflineOperation(operationData) {
  try {
    const cache = await caches.open('offline-operations');
    const request = new Request(`/offline-op/${Date.now()}`, {
      method: 'POST',
      body: JSON.stringify(operationData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = new Response(JSON.stringify(operationData), {
      headers: { 'Content-Type': 'application/json' }
    });

    await cache.put(request, response);
    console.log('Offline operation cached');
  } catch (error) {
    console.error('Failed to cache offline operation:', error);
  }
}

// Registration for background sync
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REGISTER_SYNC') {
    self.registration.sync.register('background-sync-operations')
      .then(() => {
        console.log('Background sync registered');
        event.ports[0].postMessage({ success: true });
      })
      .catch((error) => {
        console.error('Background sync registration failed:', error);
        event.ports[0].postMessage({ success: false, error: error.message });
      });
  }
});