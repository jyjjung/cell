import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const isDev = process.env.NODE_ENV === 'development';

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  // Low sample rate keeps free student quotas healthy as membership grows.
  tracesSampleRate: isDev ? 1.0 : 0.05,
  integrations: [Sentry.replayIntegration()],
  // Session Replay — client only (Replay needs Browser APIs).
  // Dev: capture all sessions while testing. Prod: 10% of sessions; 100% of error sessions.
  replaysSessionSampleRate: isDev ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
});
