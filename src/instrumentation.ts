function skipSentryInstrumentation() {
  return (
    process.env.SKIP_SENTRY === '1' ||
    process.env.NODE_ENV === 'development' ||
    process.env.npm_lifecycle_event === 'dev'
  );
}

export async function register() {
  if (skipSentryInstrumentation()) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(
  ...args: Parameters<(typeof import('@sentry/nextjs'))['captureRequestError']>
) {
  if (skipSentryInstrumentation()) return;
  const Sentry = await import('@sentry/nextjs');
  return Sentry.captureRequestError(...args);
}
