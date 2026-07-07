/**
 * Registers firebase-messaging-sw.js and returns its registration.
 *
 * Do not use navigator.serviceWorker.ready — that may resolve to the PWA sw.js.
 * Push subscriptions are bound to the SW that registers them.
 */
export async function getFCMRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/firebase-cloud-messaging-push-scope',
  });

  if (registration.installing) {
    await new Promise<void>((resolve) => {
      registration.installing!.addEventListener('statechange', function onStateChange() {
        if (this.state === 'activated') {
          this.removeEventListener('statechange', onStateChange);
          resolve();
        }
      });
    });
  }

  return registration;
}
