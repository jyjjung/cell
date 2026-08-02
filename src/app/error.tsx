'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import {
  hasClientRecoveryAlreadyRun,
  isUnrecoverableNextClientError,
  recoverStaleNextClient,
} from '@/lib/next-client-recovery';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const unrecoverable = isUnrecoverableNextClientError(error);
  const [manualReload, setManualReload] = useState(false);

  useEffect(() => {
    console.error('[app/error]', error);
    Sentry.captureException(error, {
      tags: unrecoverable ? { next_client_recovery: 'true' } : undefined,
    });

    if (!unrecoverable) return;

    if (hasClientRecoveryAlreadyRun()) {
      setManualReload(true);
      return;
    }

    void recoverStaleNextClient(error.name || 'unrecoverable Next client error');
  }, [error, unrecoverable]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {manualReload
          ? 'The app could not recover automatically. Reload the page or go back home.'
          : unrecoverable
            ? 'Updating the app… If this stays stuck, reload the page.'
            : 'The page hit an unexpected error. You can try again or go back to the home screen.'}
        {error.digest ? (
          <span className="mt-2 block font-mono text-xs text-muted-foreground/80">
            Reference: {error.digest}
          </span>
        ) : null}
      </p>
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={() => {
            if (unrecoverable) {
              window.location.reload();
              return;
            }
            reset();
          }}
        >
          {unrecoverable ? 'Reload' : 'Try again'}
        </Button>
        <Button type="button" variant="outline" onClick={() => { window.location.href = '/'; }}>
          Go home
        </Button>
      </div>
    </div>
  );
}
