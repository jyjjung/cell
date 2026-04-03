
/**
 * @fileOverview Firebase Cloud Messaging Service Worker
 *
 * Registered with scope '/firebase-cloud-messaging-push-scope' so it
 * does NOT conflict with the Next.js / Workbox service worker (sw.js),
 * which controls the page. This SW only handles push delivery, badge
 * updates, and notification clicks.
 *
 * NO skipWaiting / clients.claim — we never need to control any page.
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
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('badgeStore');
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getBadgeCount() {
  try {
    const db = await openBadgeDB();
    return new Promise((resolve) => {
      const tx = db.transaction('badgeStore', 'readonly');
      const req = tx.objectStore('badgeStore').get('count');
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

async function setBadgeCount(count) {
  try {
    const db = await openBadgeDB();
    await new Promise((resolve) => {
      const tx = db.transaction('badgeStore', 'readwrite');
      tx.objectStore('badgeStore').put(count, 'count');
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch { /* badge is cosmetic */ }
}

async function incrementAndSetBadge() {
  const next = (await getBadgeCount()) + 1;
  await setBadgeCount(next);
  if (self.navigator && 'setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(next).catch(() => {});
  }
}

// ─── SYNC_BADGE from main thread ─────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SYNC_BADGE') return;
  event.waitUntil((async () => {
    const count = event.data.count ?? 0;
    await setBadgeCount(count);
    if (self.navigator && 'setAppBadge' in self.navigator) {
      if (count > 0) self.navigator.setAppBadge(count).catch(() => {});
      else           self.navigator.clearAppBadge().catch(() => {});
    }
  })());
});

// ─── Background Push Handler ──────────────────────────────────────────────────
// Called by the Firebase SDK for every push when the app is backgrounded/closed.
// We MUST show a notification here — returning without one gets penalised by
// Safari's silent-push blacklist.

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || 'New Message';
  const body  = data.body  || payload.notification?.body  || 'You have a new update.';
  const link  = data.link  || '/';
  const tag   = data.tag   || 'community-update';

  return (async () => {
    await incrementAndSetBadge();
    // Always show — the tag deduplicates if Firebase SDK already showed one.
    await self.registration.showNotification(title, {
      body,
      icon:  '/icon-192x192-v3.png',
      badge: '/icon-192x192-v3.png',
      tag,
      data: { link },
      renotify: false,
    });
  })();
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    // includeUncontrolled: true → finds windows even if Workbox SW controls them
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(link);
            return;
          }
        }
        return self.clients.openWindow(link);
      })
  );
});
