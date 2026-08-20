import * as Sentry from '@sentry/nextjs';
import { shouldDropSentryEvent } from '@/lib/sentry-noise';

const skipSentry =
  process.env.SKIP_SENTRY === '1' ||
  process.env.NODE_ENV === 'development' ||
  process.env.npm_lifecycle_event === 'dev';

if (!skipSentry) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,
    integrations: [Sentry.replayIntegration()],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      'Hydration Error',
      /Minified React error #(418|419|422|423|425)/,
      'The client has already been terminated',
    ],
    beforeSend(event) {
      if (shouldDropSentryEvent(event)) return null;
      return event;
    },
  });
}

export const onRouterTransitionStart = skipSentry
  ? () => {}
  : Sentry.captureRouterTransitionStart;
