'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import {
  hasClientRecoveryAlreadyRun,
  isUnrecoverableNextClientError,
  recoverStaleNextClient,
} from '@/lib/next-client-recovery';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const unrecoverable = isUnrecoverableNextClientError(error);
  const [manualReload, setManualReload] = useState(false);

  useEffect(() => {
    console.error('[app/global-error]', error);
    Sentry.captureException(error, {
      tags: unrecoverable ? { next_client_recovery: 'true' } : undefined,
    });

    if (!unrecoverable) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setManualReload(true);
      return;
    }

    // Soft React reset cannot rebuild a null App Router tree after a chunk
    // timeout — hard-reload once. If we already tried this session, show UI.
    if (hasClientRecoveryAlreadyRun()) {
      setManualReload(true);
      return;
    }

    void recoverStaleNextClient(error.name || 'unrecoverable Next client error');
  }, [error, unrecoverable]);

  const handleTryAgain = () => {
    if (unrecoverable) {
      window.location.reload();
      return;
    }
    reset();
  };

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#0a0a0a',
          color: '#fafafa',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>
            {offline ? 'You are offline' : 'Something went wrong'}
          </h2>
          <p style={{ fontSize: 14, opacity: 0.75, maxWidth: 420, margin: '0 auto 20px' }}>
            {offline
              ? 'This screen is not available offline yet. Reconnect and try again.'
              : manualReload
                ? 'The app could not recover automatically. Reload the page or go home.'
                : unrecoverable
                  ? 'Updating the app… If this stays stuck, reload the page.'
                  : 'The app hit an unexpected error. You can try again or reload the page.'}
            {error.digest ? (
              <span style={{ display: 'block', marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>
                Reference: {error.digest}
              </span>
            ) : null}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleTryAgain}
              className="hit-min"
              style={{
                padding: '8px 14px',
                minHeight: 44,
                borderRadius: 8,
                border: 'none',
                background: '#fafafa',
                color: '#0a0a0a',
                cursor: 'pointer',
              }}
            >
              {unrecoverable ? 'Reload' : 'Try again'}
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="hit-min"
              style={{
                padding: '8px 14px',
                minHeight: 44,
                border: '1px solid #444',
                background: 'transparent',
                color: '#fafafa',
                cursor: 'pointer',
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
