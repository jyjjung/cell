/**
 * Registers firebase-messaging-sw.js and returns its registration.
 *
 * Do not use navigator.serviceWorker.ready — that may resolve to the PWA sw.js.
 * Push subscriptions are bound to the SW that registers them.
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

export async function getFCMRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(FCM_SW_URL, {
    scope: FCM_SW_SCOPE,
    updateViaCache: 'none',
  });

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
