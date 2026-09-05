import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLIENT_RECOVERY_FLAG,
  isChunkLoadError,
  isNextRouterCorruptError,
  isUnrecoverableNextClientError,
  recoverStaleNextClient,
} from './next-client-recovery';

describe('next-client-recovery error detection', () => {
  it('detects ChunkLoadError by name and message', () => {
    expect(
      isChunkLoadError({
        name: 'ChunkLoadError',
        message: 'Loading chunk 8291 failed.\n(timeout: https://example.com/_next/static/chunks/8291.js)',
      }),
    ).toBe(true);

    expect(
      isChunkLoadError(new Error('Loading chunk 12 failed.\n(error: https://example.com/x.js)')),
    ).toBe(true);

    expect(isChunkLoadError(new TypeError('null is not an object'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('detects null parallelRoutes.get router corruption', () => {
    expect(
      isNextRouterCorruptError(
        new TypeError("null is not an object (evaluating 't.parallelRoutes.get')"),
      ),
    ).toBe(true);

    expect(
      isNextRouterCorruptError(
        new TypeError("Cannot read properties of null (reading 'parallelRoutes')"),
      ),
    ).toBe(false);

    expect(isNextRouterCorruptError({ message: 'something parallelRoutes.get else' })).toBe(true);
  });

  it('marks both as unrecoverable for soft reset', () => {
    expect(
      isUnrecoverableNextClientError({
        name: 'ChunkLoadError',
        message: 'Loading chunk 1 failed.',
      }),
    ).toBe(true);

    expect(
      isUnrecoverableNextClientError(
        new TypeError("null is not an object (evaluating 't.parallelRoutes.get')"),
      ),
    ).toBe(true);

    expect(isUnrecoverableNextClientError(new Error('permission-denied'))).toBe(false);
  });
});

describe('recoverStaleNextClient offline guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips cache wipe and reload while offline', async () => {
    const reload = vi.fn();
    const store: Record<string, string> = {};
    const sessionStorageMock = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };

    vi.stubGlobal('navigator', { onLine: false, serviceWorker: undefined });
    vi.stubGlobal('window', {
      location: { reload },
      sessionStorage: sessionStorageMock,
    });
    vi.stubGlobal('sessionStorage', sessionStorageMock);

    const recovered = await recoverStaleNextClient('ChunkLoadError while offline');
    expect(recovered).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorageMock.getItem(CLIENT_RECOVERY_FLAG)).toBeNull();
  });
});
