// Firebase messaging service worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-firebase-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: payload.notification?.icon || payload.data?.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.tag || 'notification',
    data: {
      url: payload.data?.url || '/dashboard',
      priority: payload.data?.priority || 'medium',
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: 'View Details',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/icon-192.png'
      }
    ],
    requireInteraction: payload.data?.priority === 'urgent',
    silent: payload.data?.priority === 'low'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received.');

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      // If no existing window/tab, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('Notification was closed', event);
  
  // Optional: Track notification dismissal analytics
  // You can send analytics data here if needed
});

// Handle push events (fallback)
self.addEventListener('push', function(event) {
  console.log('Push event received', event);
  
  if (event.data) {
    const payload = event.data.json();
    console.log('Push payload:', payload);
    
    const title = payload.notification?.title || payload.data?.title || 'New Notification';
    const options = {
      body: payload.notification?.body || payload.data?.body || 'You have a new notification',
      icon: payload.notification?.icon || payload.data?.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.data?.tag || 'notification',
      data: payload.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

console.log('Firebase messaging service worker loaded');
