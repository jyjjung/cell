'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/global-error]', error);
    Sentry.captureException(error);
  }, [error]);

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
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, opacity: 0.75, maxWidth: 420, margin: '0 auto 20px' }}>
            The app hit an unexpected error. You can try again or reload the page.
            {error.digest ? (
              <span style={{ display: 'block', marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>
                Reference: {error.digest}
              </span>
            ) : null}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#fafafa',
                color: '#0a0a0a',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
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
