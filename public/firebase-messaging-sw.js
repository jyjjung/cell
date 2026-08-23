
/**
 * @fileOverview Firebase Messaging Service Worker.
 * Handles background push notifications when the app is closed or in the background.
 *
 * Heal version: 2026-07-23-v1 — bump this when clients need to rebind push subscriptions.
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

function normalizeAppPath(pathOrUrl) {
  try {
    const url = pathOrUrl.startsWith('http')
      ? new URL(pathOrUrl)
      : new URL(pathOrUrl, self.location.origin);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return path;
  } catch {
    return '/';
  }
}

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const link = payload.data?.link || '/';
  const targetPath = normalizeAppPath(link);

  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    const viewingTarget = clientList.some((client) => {
      const visible = client.visibilityState === 'visible' || client.focused;
      if (!visible) return false;
      return normalizeAppPath(client.url) === targetPath;
    });

    // Only raise the badge when the server sent a positive count.
    // Never clearAppBadge from a push — a missing/0 badge often means timeout, not "all read".
    const badgeRaw = payload.data?.badge;
    if (badgeRaw != null && badgeRaw !== '') {
      const badgeCount = parseInt(badgeRaw, 10);
      if (!Number.isNaN(badgeCount) && badgeCount > 0 && 'setAppBadge' in navigator) {
        navigator.setAppBadge(badgeCount).catch(() => {});
      }
    }

    if (viewingTarget) {
      return;
    }

    const notificationTitle = payload.data?.title || 'New Message';
    const notificationOptions = {
      body: payload.data?.body || 'You have a new update.',
      icon: payload.data?.icon || '/icon-192x192-v6.png',
      tag: payload.data?.tag || 'default-tag',
      data: {
        link,
      },
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
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
