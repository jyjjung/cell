/**
 * @fileOverview Recover from stale/corrupt Next.js App Router client state.
 *
 * Common triggers:
 * - ChunkLoadError after a deploy (hashed assets gone) or network timeout
 * - Soft `reset()` on an error boundary when the router cache is null
 *   (`TypeError: null is not an object (evaluating 't.parallelRoutes.get')`)
 *
 * Soft React resets cannot rebuild a null router tree — hard reload after
 * clearing app caches (preserving offline media).
 */

import {
  activateWaitingServiceWorkers,
  clearAppCachesPreservingMedia,
} from '@/lib/sw-cache-utils';

export const CLIENT_RECOVERY_FLAG = '__next_client_recovery_reload';

function errorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : '';
}

function errorName(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' ? name : '';
}

/** Webpack/Next failed to download a JS chunk (timeout, 404 after deploy, etc.). */
export function isChunkLoadError(error: unknown): boolean {
  const name = errorName(error);
  const message = errorMessage(error);
  return (
    name === 'ChunkLoadError' ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk')
  );
}

/**
 * Next.js App Router crash when router cache nodes are null.
 * Soft error-boundary reset makes this worse — only a full navigation recovers.
 */
export function isNextRouterCorruptError(error: unknown): boolean {
  return errorMessage(error).includes('parallelRoutes.get');
}

/** Errors that must hard-reload instead of calling React `reset()`. */
export function isUnrecoverableNextClientError(error: unknown): boolean {
  return isChunkLoadError(error) || isNextRouterCorruptError(error);
}

/**
 * Clear stale Next/Workbox caches, activate a waiting SW, and hard-reload once.
 * Returns false when a recovery reload already ran this session (loop guard).
 */
export async function recoverStaleNextClient(reason: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (sessionStorage.getItem(CLIENT_RECOVERY_FLAG)) {
      console.warn('[next-client-recovery] Already recovered this session — skipping.');
      return false;
    }
    sessionStorage.setItem(CLIENT_RECOVERY_FLAG, 'true');
  } catch {
    // sessionStorage unavailable — still attempt a single reload.
  }

  console.warn(`[next-client-recovery] ${reason} — clearing caches and reloading...`);

  try {
    await clearAppCachesPreservingMedia();
    await activateWaitingServiceWorkers();
  } catch (e) {
    console.warn('[next-client-recovery] Cache/SW cleanup failed:', e);
  }

  window.location.reload();
  return true;
}

/** Clear the loop-prevention flag after a successful page load. */
export function scheduleClearClientRecoveryFlag(ms = 5000): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const timer = window.setTimeout(() => {
    try {
      sessionStorage.removeItem(CLIENT_RECOVERY_FLAG);
    } catch {
      // ignore
    }
  }, ms);
  return () => window.clearTimeout(timer);
}

export function hasClientRecoveryAlreadyRun(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(sessionStorage.getItem(CLIENT_RECOVERY_FLAG));
  } catch {
    return false;
  }
}
