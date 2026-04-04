
/**
 * @fileOverview Firebase Messaging Service Worker.
 * Handles background push notifications when the app is closed or in the background.
 */

// Import and configure the Firebase SDK
// Lifecycle events (install/activate) are handled by the main sw.js file.
// We only include the messaging logic here.

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase app for common background logic (badge/storage)
firebase.initializeApp({
  apiKey: "AIzaSyBjpGl-kwbFgnQ1hGA8dg23K2aGxT1f8jo",
  authDomain: "cell-abca4.firebaseapp.com",
  projectId: "cell-abca4",
  storageBucket: "cell-abca4.firebasestorage.app",
  messagingSenderId: "942477536312",
  appId: "1:942477536312:web:9487c6359a19a4c0e7cacd",
});


const messaging = firebase.messaging();

/**
 * Official Firebase Background Message Handler.
 * This is triggered for 'data' messages or when the app is in the background.
 */
messaging.setBackgroundMessageHandler((payload) => {
    console.log('[SW] Background Message received:', payload);

    const origin = self.location.origin;
    const data = payload.data || {};
    
    const title = data.title || 'em.';
    const options = {
        body: data.body || 'New update received.',
        icon: `${origin}/icon-192x192-v3.png`,
        badge: `${origin}/icon-192x192-v3.png`,
        tag: data.tag || 'em-notification-sync',
        data: { link: data.link || '/' },
    };

    // 1. OS-Level Badging (Chrome 116+, Safari 16.4+)
    if (data.badge && 'setAppBadge' in self.navigator) {
        const count = parseInt(data.badge, 10);
        if (!isNaN(count)) {
            console.log('[SW] Updating OS badge:', count);
            self.navigator.setAppBadge(count).catch(e => console.warn('Badge Error:', e));
        }
    }

    // 2. Show the Notification
    return self.registration.showNotification(title, options);
});


/**
 * Handle Notification Click: 
 * Opens the app or focuses an existing window and navigates to the target link.
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag);
    event.notification.close();

    const urlToOpen = event.notification.data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // 1. If a window is already open at this origin, focus it and navigate
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus().then((focusedClient) => {
                        return focusedClient.navigate(urlToOpen);
                    });
                }
            }
            // 2. If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

