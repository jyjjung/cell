
"use client";

import { useEffect } from 'react';

/**
 * @fileOverview Global listener to handle ChunkLoadError in Next.js.
 * This commonly occurs when a new deployment replaces old assets and 
 * the browser/PWA attempts to load a stale chunk.
 */
export function ChunkErrorListener() {
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      if (e.message.includes('Loading chunk') || e.message.includes('ChunkLoadError')) {
        console.warn('ChunkLoadError detected, reloading page to fetch fresh assets...', e);
        window.location.reload();
      }
    };
    
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (e.reason?.name === 'ChunkLoadError' || (e.reason?.message && e.reason.message.includes('Loading chunk'))) {
        console.warn('Unhandled ChunkLoadError detected, reloading page...', e.reason);
        window.location.reload();
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
