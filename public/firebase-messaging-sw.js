
/**
 * @fileOverview Firebase Messaging Service Worker.
 * Handles background push notifications when the app is closed or in the background.
 *
 * Heal version: 2026-07-15-v2 — bump this when clients need to rebind push subscriptions.
 */

// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

firebase.initializeApp({
  apiKey: "AIzaSyBjpGl-kwbFgnQ1hGA8dg23K2aGxT1f8jo",
  authDomain: "cell-abca4.firebaseapp.com",
  projectId: "cell-abca4",
  storageBucket: "cell-abca4.appspot.com",
  messagingSenderId: "942477536312",
  appId: "1:942477536312:web:9487c6359a19a4c0e7cacd",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // --- UPDATE APP BADGE ---
  // This is the ONLY way to update the home screen badge when the app is closed.
  // navigator.setAppBadge is available in service worker scope (iOS 16.4+ PWA, Chrome).
  const badgeCount = parseInt(payload.data?.badge || '0', 10);
  if ('setAppBadge' in navigator) {
    if (badgeCount > 0) {
      navigator.setAppBadge(badgeCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  // --- SHOW NOTIFICATION ---
  const notificationTitle = payload.data?.title || 'New Message';
  const notificationOptions = {
    body: payload.data?.body || 'You have a new update.',
    icon: payload.data?.icon || '/icon-192x192-v4.png',
    tag: payload.data?.tag || 'default-tag',
    data: {
        link: payload.data?.link || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const link = event.notification.data?.link || '/';
  const fullUrl = self.location.origin + link;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window on the same origin and navigate it
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(fullUrl);
        }
      }
      // If no window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Listen for SKIP_WAITING messages from the client (e.g. on version update or chunk error)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
