
/**
 * @fileOverview Firebase Cloud Messaging Service Worker (Standalone)
 * 
 * This is the SOLE service worker for the app. It is registered manually
 * in use-fcm-token.ts via navigator.serviceWorker.register().
 * 
 * Responsibilities:
 *  - Handle background push events (app closed / backgrounded)
 *  - Update the native app badge count
 *  - Handle notification click → navigate to deep link
 *  - Respond to SYNC_BADGE messages from the main thread
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ─── Firebase Init ────────────────────────────────────────────────────────────

firebase.initializeApp({
  apiKey: "AIzaSyBjpGl-kwbFgnQ1hGA8dg23K2aGxT1f8jo",
  authDomain: "cell-abca4.firebaseapp.com",
  projectId: "cell-abca4",
  storageBucket: "cell-abca4.firebasestorage.app",
  messagingSenderId: "942477536312",
  appId: "1:942477536312:web:9487c6359a19a4c0e7cacd",
});

const messaging = firebase.messaging();

// ─── IndexedDB Badge Helpers ──────────────────────────────────────────────────

function openBadgeDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('badgeDB', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('badgeStore');
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getBadgeCount() {
  try {
    const db = await openBadgeDB();
    return new Promise((resolve) => {
      const tx = db.transaction('badgeStore', 'readonly');
      const store = tx.objectStore('badgeStore');
      const req = store.get('count');
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

async function setBadgeCount(count) {
  try {
    const db = await openBadgeDB();
    return new Promise((resolve) => {
      const tx = db.transaction('badgeStore', 'readwrite');
      tx.objectStore('badgeStore').put(count, 'count');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail — badge is cosmetic
  }
}

async function incrementAndSetBadge() {
  const current = await getBadgeCount();
  const next = current + 1;
  await setBadgeCount(next);
  if (self.navigator && 'setAppBadge' in self.navigator) {
    await self.navigator.setAppBadge(next).catch(() => {});
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── SYNC_BADGE from main thread ─────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_BADGE') {
    event.waitUntil(
      (async () => {
        const count = event.data.count ?? 0;
        await setBadgeCount(count);
        if (self.navigator && 'setAppBadge' in self.navigator) {
          if (count > 0) {
            await self.navigator.setAppBadge(count).catch(() => {});
          } else {
            await self.navigator.clearAppBadge().catch(() => {});
          }
        }
      })()
    );
  }
});

// ─── Background / Closed Push Handler ────────────────────────────────────────
// Firebase Messaging SDK calls this for data-only messages in the background.
// For notification+data messages, Firebase auto-shows the notification,
// but we still need to update the badge.

messaging.onBackgroundMessage((payload) => {
  // Firebase auto-displays title/body from the notification block.
  // We only need to handle badge + optional custom notification.
  const data = payload.data || {};

  // If there is no built-in notification (data-only payload), show one manually.
  const hasBuiltInNotification = payload.notification?.title;
  
  const title = data.title || payload.notification?.title || 'New Message';
  const body = data.body || payload.notification?.body || 'You have a new update.';
  const link = data.link || '/';
  const tag = data.tag || 'community-update';

  const showAndBadge = async () => {
    await incrementAndSetBadge();

    if (!hasBuiltInNotification) {
      // Data-only: we must show it ourselves
      await self.registration.showNotification(title, {
        body,
        icon: '/icon-192x192-v3.png',
        badge: '/icon-192x192-v3.png',
        tag,
        data: { link },
      });
    }
    // If built-in notification already exists, Firebase SDK shows it.
    // We still update the badge count above.
  };

  return showAndBadge();
});

// ─── Failsafe raw 'push' listener ────────────────────────────────────────────
// Catches any push event that the Firebase SDK doesn't handle (e.g. malformed
// payloads, iOS quirks). MUST call showNotification() to avoid Safari penalty.

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let title = 'New Message';
      let body = 'You have a new update in Sync.';
      let link = '/';
      let tag = 'community-update';

      try {
        if (event.data) {
          const payload = event.data.json();
          const data = payload.data || {};
          title = data.title || payload.notification?.title || title;
          body = data.body || payload.notification?.body || body;
          link = data.link || link;
          tag = data.tag || tag;
        }
      } catch (e) {
        console.error('[SW] Failed to parse push payload:', e);
      }

      await incrementAndSetBadge();

      // showNotification is idempotent if the Firebase SDK already handled it.
      // Using the tag ensures duplicates collapse automatically.
      return self.registration.showNotification(title, {
        body,
        icon: '/icon-192x192-v3.png',
        badge: '/icon-192x192-v3.png',
        tag,
        data: { link },
        renotify: false,
      });
    })()
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const link = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate.
      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          client.focus();
          return client.navigate(link);
        }
      }
      // Otherwise open a new window.
      return self.clients.openWindow(link);
    })
  );
});
