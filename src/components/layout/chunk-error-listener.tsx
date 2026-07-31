
"use client";

import { useEffect } from 'react';
import {
  activateWaitingServiceWorkers,
  clearAppCachesPreservingMedia,
} from '@/lib/sw-cache-utils';

/**
 * @fileOverview Global listener to handle ChunkLoadError in Next.js.
 * This commonly occurs when a new deployment replaces old assets and 
 * the browser/PWA attempts to load a stale chunk from the old SW cache.
 *
 * Strategy:
 * 1. Clear app/Workbox caches (preserve offline media caches).
 * 2. Activate any waiting service worker so the new build's SW is in control.
 * 3. Reload the page once — a sessionStorage flag prevents infinite loops.
 */
export function ChunkErrorListener() {
  useEffect(() => {
    const RELOAD_FLAG = '__chunk_error_reload';

    async function handleChunkError() {
      // Prevent infinite reload loop: only auto-reload once per session.
      if (sessionStorage.getItem(RELOAD_FLAG)) {
        console.warn('[ChunkErrorListener] Already reloaded this session — skipping to prevent loop.');
        return;
      }
      sessionStorage.setItem(RELOAD_FLAG, 'true');

      console.warn('[ChunkErrorListener] ChunkLoadError detected — clearing caches and reloading...');

      try {
        await clearAppCachesPreservingMedia();
        await activateWaitingServiceWorkers();
      } catch (e) {
        console.warn('[ChunkErrorListener] Cache/SW cleanup failed:', e);
      }

      // 3. Hard reload — bypasses browser HTTP cache
      window.location.reload();
    }

    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes('Loading chunk') || e.message?.includes('ChunkLoadError')) {
        handleChunkError();
      }
    };
    
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (e.reason?.name === 'ChunkLoadError' || e.reason?.message?.includes('Loading chunk')) {
        handleChunkError();
        return;
      }

      // Safari reports failed fetch() calls as an unhandled "TypeError: Load failed".
      // Next.js App Router RSC navigation requests throw this when the network is
      // unavailable, and the stack trace originates inside _next/static/chunks.
      // Suppress only those — application-level fetch errors should still reach Sentry.
      if (
        e.reason instanceof TypeError &&
        e.reason.message === 'Load failed' &&
        typeof e.reason.stack === 'string' &&
        e.reason.stack.includes('/_next/static/chunks/')
      ) {
        e.preventDefault();
        console.warn('[ChunkErrorListener] Next.js RSC fetch failed (network unavailable) — suppressed.');
      }
    };

    // Also handle CSS/script load failures (net::ERR_ABORTED for missing hashed files)
    const handleResourceError = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'SCRIPT' || target?.tagName === 'LINK') {
        const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || '';
        if (src.includes('/_next/')) {
          console.warn('[ChunkErrorListener] Next.js resource failed to load:', src);
          handleChunkError();
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleResourceError, true); // capture phase for resource errors
    
    // Clear the reload flag after successful load (the page loaded fine this time)
    const clearFlag = setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
    }, 5000); // If page survives 5 seconds, clear the flag

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleResourceError, true);
      clearTimeout(clearFlag);
    };
  }, []);

  return null;
}
