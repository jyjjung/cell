/**
 * @fileOverview sw-master.js — Legacy shim / no-op
 *
 * The real push notification service worker is now firebase-messaging-sw.js.
 * This file is kept to avoid 404 errors from any cached registrations but does
 * nothing except forward lifecycle events.
 *
 * Active SW: /firebase-messaging-sw.js (registered by use-fcm-token.ts)
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
