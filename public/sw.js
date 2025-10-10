// Service Worker for IT Panel Admin Dashboard
const CACHE_NAME = 'it-panel-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache dynamic content (only for GET requests)
          if (event.request.method === 'GET') {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          
          return response;
        });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push notification received:', event);
  
  let notificationData = {};
  
  // Parse notification data
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'IT Panel Notification',
        body: event.data.text()
      };
    }
  }
  
  // Notification options
  const options = {
    body: notificationData.body || 'You have a new notification',
    icon: notificationData.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    requireInteraction: notificationData.priority === 'urgent',
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon.svg'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'IT Panel',
      options
    )
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();
  
  // Handle action buttons
  if (event.action === 'close') {
    return;
  }
  
  // Get URL to open
  const urlToOpen = event.notification.data.url || '/';
  
  // Open or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Check if there's already a window open
        for (let client of windowClients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event - track dismissed notifications
self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed:', event);
});
