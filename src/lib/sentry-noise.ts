/**
 * Shared filters for expected / non-actionable browser noise that should not
 * consume Sentry quota or reopen already-hardened issues.
 */

import {
  isFirestorePersistenceClearOrderError,
  isIndexedDbPersistenceError,
} from '@/lib/firestore-idb-errors';

function eventExceptionValues(event: {
  exception?: { values?: Array<{ type?: string; value?: string; stacktrace?: { frames?: Array<{ filename?: string }> } }> };
}): Array<{ type?: string; value?: string; frames: string[] }> {
  const values = event.exception?.values ?? [];
  return values.map((v) => ({
    type: v.type,
    value: v.value,
    frames: (v.stacktrace?.frames ?? [])
      .map((f) => f.filename ?? '')
      .filter(Boolean),
  }));
}

function combinedMessage(event: {
  message?: string;
  exception?: { values?: Array<{ type?: string; value?: string }> };
}): string {
  const parts = [event.message ?? ''];
  for (const v of event.exception?.values ?? []) {
    if (v.type) parts.push(v.type);
    if (v.value) parts.push(v.value);
  }
  return parts.join(' ');
}

/** True when this event is known noise and should be dropped. */
export function shouldDropSentryEvent(event: {
  message?: string;
  environment?: string;
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: { frames?: Array<{ filename?: string }> };
    }>;
  };
}): boolean {
  const message = combinedMessage(event);
  const values = eventExceptionValues(event);
  const frames = values.flatMap((v) => v.frames);
  const inNextChunks = frames.some(
    (f) => f.includes('/_next/') || f.includes('app:///_next/'),
  );

  // Local / Electron tooling noise
  if (event.environment === 'development') {
    if (message.includes('ENOENT: no such file or directory, stat')) return true;
    if (message.includes('Event `Event` (type=error) captured as promise rejection')) {
      return true;
    }
  }

  // Safari RSC / navigation fetch failures (Next.js App Router)
  if (
    (message.includes('Load failed') || message.includes('Failed to fetch')) &&
    (inNextChunks || values.some((v) => v.type === 'TypeError' && v.value === 'Load failed'))
  ) {
    return true;
  }

  // Firebase Messaging on browsers without Push / SW APIs
  if (
    message.includes('messaging/unsupported-browser') ||
    message.includes("This browser doesn't support the API's required to use the Firebase SDK")
  ) {
    return true;
  }

  // FCM service worker registration rejection (benign when SW is blocked)
  if (
    values.some((v) => v.type === 'Error' && v.value === 'Rejected') &&
    frames.some((f) => f.includes('ServiceWorker') || f === '<anonymous>')
  ) {
    return true;
  }

  // YouTube iframe API blocked / offline — callers degrade gracefully
  if (
    message.includes('YouTube API script failed') ||
    message.includes('YouTube API failed to load')
  ) {
    return true;
  }

  // Firestore IndexedDB / AsyncQueue bricks — recovered via terminate+clear+reload
  if (isIndexedDbPersistenceError(message) || isFirestorePersistenceClearOrderError(message)) {
    return true;
  }

  // Transient client network / auth offline noise
  if (
    message.includes('auth/network-request-failed') ||
    message.includes('Firebase: Error (auth/network-request-failed)')
  ) {
    return true;
  }

  // Service worker register aborted / script load failed (nav away, legacy host, blocked SW)
  if (
    message.includes('Failed to register a ServiceWorker') ||
    message.includes('sw.js load failed') ||
    (message.includes('AbortError') && message.includes('ServiceWorker'))
  ) {
    return true;
  }

  // Firestore ACL denials during auth races / guest listeners — not actionable crashes
  if (
    message.includes('Missing or insufficient permissions') ||
    message.includes('permission-denied')
  ) {
    return true;
  }

  // Stale Next.js App Router after chunk timeout — recovered via hard reload
  if (message.includes('parallelRoutes.get') || message.includes('parallelRoutes')) {
    return true;
  }

  return false;
}
