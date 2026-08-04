import { describe, expect, it } from 'vitest';
import {
  getFirestoreErrorMessage,
  isIndexedDbPersistenceError,
} from '@/lib/firestore-idb-errors';

describe('getFirestoreErrorMessage', () => {
  it('reads Error messages and plain strings', () => {
    expect(getFirestoreErrorMessage(new Error('boom'))).toBe('boom');
    expect(getFirestoreErrorMessage('plain')).toBe('plain');
    expect(getFirestoreErrorMessage({ message: 'wrapped' })).toBe('wrapped');
    expect(getFirestoreErrorMessage(null)).toBe('');
  });
});

describe('isIndexedDbPersistenceError', () => {
  it('matches classic IndexedDB corruption strings', () => {
    expect(
      isIndexedDbPersistenceError(
        new Error('Firestore: Failed to obtain exclusive access to the persistence layer. refusing to open IndexedDB'),
      ),
    ).toBe(true);
    expect(
      isIndexedDbPersistenceError(
        new Error('IndexedDB transaction failed AbortError code=unavailable'),
      ),
    ).toBe(true);
  });

  it('matches Safari/WebKit in-progress transaction failures from Sentry', () => {
    expect(
      isIndexedDbPersistenceError(
        new Error(
          'FIRESTORE (11.7.3) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {"ec":"Attempt to get all index records from database without an in-progress transaction"}',
        ),
      ),
    ).toBe(true);
    expect(
      isIndexedDbPersistenceError(
        'UnknownError: Attempt to get all index records from database without an in-progress transaction',
      ),
    ).toBe(true);
    expect(
      isIndexedDbPersistenceError(
        new Error('Connection to Indexed Database server lost. Refresh the page to try again'),
      ),
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isIndexedDbPersistenceError(new Error('Network request failed'))).toBe(false);
    expect(isIndexedDbPersistenceError(new Error('INTERNAL ASSERTION FAILED: Unexpected state'))).toBe(
      false,
    );
    expect(isIndexedDbPersistenceError(undefined)).toBe(false);
  });
});
