import * as Sentry from '@sentry/nextjs';
import { shouldDropSentryEvent } from '@/lib/sentry-noise';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.05,
  beforeSend(event) {
    if (shouldDropSentryEvent(event)) return null;
    return event;
  },
});
