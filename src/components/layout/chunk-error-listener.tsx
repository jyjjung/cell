
"use client";

import { useEffect } from 'react';
import {
  isChunkLoadError,
  recoverStaleNextClient,
  scheduleClearClientRecoveryFlag,
} from '@/lib/next-client-recovery';

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
