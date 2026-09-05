
"use client";

import { useEffect } from 'react';
import {
  isChunkLoadError,
  recoverStaleNextClient,
  scheduleClearClientRecoveryFlag,
} from '@/lib/next-client-recovery';
import { isNonActionableBrowserNoise } from '@/lib/sentry-noise';

/**
 * @fileOverview Global listener to handle ChunkLoadError in Next.js.
 * This commonly occurs when a new deployment replaces old assets and
 * the browser/PWA attempts to load a stale chunk from the old SW cache,
 * or when a chunk download times out on a flaky network.
 *
 * Strategy: shared recoverStaleNextClient (clear caches → activate SW → reload once).
 * Error boundaries also call the same path when React catches the error first.
 */
export function ChunkErrorListener() {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (
        isChunkLoadError({ name: 'Error', message: e.message }) ||
        e.message?.includes('ChunkLoadError')
      ) {
        void recoverStaleNextClient('ChunkLoadError (window error)');
      }
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      if (isChunkLoadError(e.reason)) {
        void recoverStaleNextClient('ChunkLoadError (unhandled rejection)');
        return;
      }

      // Safari reports failed fetch() calls as an unhandled "TypeError: Load failed"
      // (Chromium: "Failed to fetch"). Next.js App Router RSC navigation throws
      // these when the network is unavailable; stacks often point at _next chunks
      // but Safari sometimes omits a usable stack — treat bare "Load failed" as
      // the same noise. Application fetch errors with other messages still reach Sentry.
      const reason = e.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : '';
      const stack =
        reason instanceof Error && typeof reason.stack === 'string' ? reason.stack : '';
      const isSafariLoadFailed = message === 'Load failed';
      const isNextFetchFailed =
        message === 'Failed to fetch' &&
        (stack.includes('/_next/') || stack.includes('webpack'));
      if (isSafariLoadFailed || isNextFetchFailed || isNonActionableBrowserNoise(message)) {
        e.preventDefault();
        console.warn('[ChunkErrorListener] Non-actionable browser/network noise — suppressed.');
      }
    };

    // Also handle CSS/script load failures (net::ERR_ABORTED for missing hashed files).
    // Skip while offline — recovery would wipe the shell cache and reload into a blank page.
    const handleResourceError = (e: Event) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'SCRIPT' || target?.tagName === 'LINK') {
        const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || '';
        if (src.includes('/_next/')) {
          console.warn('[ChunkErrorListener] Next.js resource failed to load:', src);
          void recoverStaleNextClient('Next.js resource failed to load');
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleResourceError, true); // capture phase for resource errors

    const clearFlag = scheduleClearClientRecoveryFlag(5000);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleResourceError, true);
      clearFlag();
    };
  }, []);

  return null;
}
