'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    workbox?: {
      register: (options?: { immediate?: boolean }) => Promise<unknown>;
    };
  }
}

/**
 * Registers the next-pwa Workbox worker with a catch.
 *
 * next-pwa's auto-register calls `registration.waiting` even when
 * `navigator.serviceWorker.register()` resolves undefined (Playwright / locked-down
 * browsers), which becomes an unhandled TypeError.
 */
export function PwaRegister() {
  useEffect(() => {
    const wb = window.workbox;
    if (!wb?.register) return;
    void Promise.resolve(wb.register()).catch((err) => {
      console.warn('[PwaRegister] Service worker registration failed — offline cache unavailable:', err);
    });
  }, []);

  return null;
}
