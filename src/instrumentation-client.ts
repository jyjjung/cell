import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  // Low sample rate keeps free student quotas healthy as membership grows.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.05,
  // No session replay — privacy-friendly for a private cell group app.
});
