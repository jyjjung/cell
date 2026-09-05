'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    workbox?: {
      register: (options?: { immediate?: boolean }) => Promise<unknown>;
    };
  }
}

const PWA_SW_URL = '/sw.js';

/**
 * Registers the next-pwa Workbox service worker (offline shell + media cache).
 *
 * next-pwa auto-register (`register: true`) crashes when
 * `navigator.serviceWorker.register()` resolves undefined (Playwright /
 * locked-down browsers), so we keep `register: false` and register here.
 *
 * Prefer `window.workbox` when next-pwa's sw-entry is in the bundle; otherwise
 * register `/sw.js` directly. Next 15 App Router production builds often omit
 * sw-entry, which left offline mode silently dead after the manual-register switch.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const wb = window.workbox;
        if (wb?.register) {
          await Promise.resolve(wb.register());
          return;
        }
        await navigator.serviceWorker.register(PWA_SW_URL, { scope: '/' });
      } catch (err) {
        console.warn(
          '[PwaRegister] Service worker registration failed — offline cache unavailable:',
          err,
        );
      }
    };

    void register();
  }, []);

  return null;
}
