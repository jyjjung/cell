/**
 * Registers firebase-messaging-sw.js and returns its registration.
 *
 * Do not use navigator.serviceWorker.ready — that may resolve to the PWA sw.js.
 * Push subscriptions are bound to the SW that registers them.
 *
 * Returns null when the browser rejects the registration (e.g. Samsung Internet
 * on Android rejecting the SW install due to a CDN fetch failure or browser quirk).
 */
const FCM_SW_URL = '/firebase-messaging-sw.js';
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

function waitForWorker(worker: ServiceWorker | null): Promise<void> {
  if (!worker || worker.state === 'activated') return Promise.resolve();
  return new Promise((resolve) => {
    const onStateChange = () => {
      if (worker.state === 'activated' || worker.state === 'redundant') {
        worker.removeEventListener('statechange', onStateChange);
        resolve();
      }
    };
    worker.addEventListener('statechange', onStateChange);
  });
}

export async function getFCMRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  let registration: ServiceWorkerRegistration | null | undefined;
  try {
    registration = await navigator.serviceWorker.register(FCM_SW_URL, {
      scope: FCM_SW_SCOPE,
      updateViaCache: 'none',
    });
  } catch (err) {
    // Some browsers (e.g. Samsung Internet on Android) reject SW registration with a
    // generic "Rejected" error when the SW script fails to install (e.g. CDN fetch
    // failure for importScripts). Treat this as a non-fatal degradation.
    console.warn('[FCMRegistration] Service worker registration failed — push notifications unavailable:', err);
    return null;
  }

  // Playwright / locked-down browsers may resolve register() with undefined instead of throwing.
  if (!registration) {
    console.warn('[FCMRegistration] Service worker registration returned no registration — push unavailable');
    return null;
  }

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  await waitForWorker(registration.installing);
  await waitForWorker(registration.waiting);

  // Prefer the active messaging worker; if waiting just became active, re-check.
  if (!registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
    await waitForWorker(registration.installing ?? registration.waiting);
  }

  return registration;
}
