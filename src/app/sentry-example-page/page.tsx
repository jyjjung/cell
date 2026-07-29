'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';

class SentryExampleFrontendError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'SentryExampleFrontendError';
  }
}

/**
 * Temporary verification page from the Sentry Next.js setup flow.
 * Safe to delete once Issues show a sample error in your Sentry project.
 */
export default function SentryExamplePage() {
  const [hasSentError, setHasSentError] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    void Sentry.diagnoseSdkConnectivity?.().then((result) => {
      setIsConnected(result !== 'sentry-unreachable');
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
      <div>
        <p className="text-sm text-muted-foreground">Sentry</p>
        <h1 className="text-2xl font-semibold tracking-tight">Example page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Click the button below to throw a sample error and verify capture in your Sentry project.
        </p>
      </div>

      <button
        type="button"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        disabled={!isConnected}
        onClick={async () => {
          await Sentry.startSpan(
            { name: 'Example Frontend/Backend Span', op: 'test' },
            async () => {
              const res = await fetch('/api/sentry-example-api');
              if (!res.ok) setHasSentError(true);
            },
          );
          throw new SentryExampleFrontendError(
            'This error is raised on the frontend of the example page.',
          );
        }}
      >
        Throw Sample Error
      </button>

      {!isConnected && (
        <p className="text-sm text-destructive">
          Sentry looks unreachable from this browser (DSN / network / ad blocker).
        </p>
      )}
      {hasSentError && (
        <p className="text-sm text-muted-foreground">
          Sample error sent — check Issues in Sentry (it can take a few seconds).
        </p>
      )}
    </main>
  );
}
