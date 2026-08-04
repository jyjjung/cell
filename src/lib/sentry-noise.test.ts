import { describe, expect, it } from 'vitest';
import { shouldDropSentryEvent } from './sentry-noise';

describe('shouldDropSentryEvent', () => {
  it('drops Safari Load failed from Next chunks', () => {
    expect(
      shouldDropSentryEvent({
        exception: {
          values: [
            {
              type: 'TypeError',
              value: 'Load failed',
              stacktrace: {
                frames: [{ filename: 'app:///_next/static/chunks/887-abc.js' }],
              },
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('drops Firebase unsupported-browser messaging errors', () => {
    expect(
      shouldDropSentryEvent({
        exception: {
          values: [
            {
              type: 'FirebaseError',
              value:
                "Messaging: This browser doesn't support the API's required to use the Firebase SDK. (messaging/unsupported-browser).",
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('drops YouTube API script failures', () => {
    expect(
      shouldDropSentryEvent({
        exception: {
          values: [{ type: 'Error', value: 'YouTube API script failed' }],
        },
      }),
    ).toBe(true);
  });

  it('drops IndexedDB corruption noise', () => {
    expect(
      shouldDropSentryEvent({
        exception: {
          values: [
            {
              type: 'Error',
              value:
                'refusing to open IndexedDB database due to potential corruption of the IndexedDB database data',
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('drops Firestore ca9/b815 bricks and mis-ordered persistence clears', () => {
    expect(
      shouldDropSentryEvent({
        exception: {
          values: [
            {
              type: 'Error',
              value:
                'FIRESTORE (11.7.3) INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9) CONTEXT: {"Fe":-1}',
            },
          ],
        },
      }),
    ).toBe(true);
    expect(
      shouldDropSentryEvent({
        exception: {
          values: [
            {
              type: 'FirebaseError',
              value:
                'Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.',
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('keeps real application errors', () => {
    expect(
      shouldDropSentryEvent({
        exception: {
          values: [
            {
              type: 'TypeError',
              value: "Cannot read properties of undefined (reading 'uid')",
              stacktrace: {
                frames: [{ filename: 'app:///_next/static/chunks/app/page.js' }],
              },
            },
          ],
        },
      }),
    ).toBe(false);
  });
});
