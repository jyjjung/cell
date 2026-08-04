/**
 * Pure helpers for detecting Firestore IndexedDB / WebKit persistence failures.
 * Kept separate from firebase.ts so detection can be unit-tested without initializing Firebase.
 */

export function getFirestoreErrorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message ?? '';
  if (typeof reason === 'string') return reason;
  if (reason && typeof reason === 'object' && 'message' in reason) {
    return String((reason as { message: unknown }).message);
  }
  return '';
}

/**
 * Detects Firestore IndexedDB / AsyncQueue failures that leave the client unusable
 * until reload. Covers:
 * - Classic corruption ("refusing to open IndexedDB")
 * - Safari/WebKit aborts after backgrounding
 * - Known SDK assertion bricks: ca9 (target state) → b815 (dead AsyncQueue)
 */
export function isIndexedDbPersistenceError(reason: unknown): boolean {
  const msg = getFirestoreErrorMessage(reason);
  if (!msg) return false;

  return (
    msg.includes('refusing to open IndexedDB') ||
    msg.includes('without an in-progress transaction') ||
    msg.includes('Connection to Indexed Database server lost') ||
    msg.includes('An internal error was encountered in the Indexed Database server') ||
    (msg.includes('IndexedDB transaction') &&
      (msg.includes('AbortError') || msg.includes('code=unavailable'))) ||
    // Firestore SDK bricks the client after these assertions (see firebase-js-sdk#8856, #9267).
    (msg.includes('INTERNAL ASSERTION FAILED') &&
      (msg.includes('Indexed') ||
        msg.includes('transaction') ||
        msg.includes('b815') ||
        msg.includes('ca9') ||
        msg.includes('"Fe":-1') ||
        msg.includes('"ve":-1') ||
        msg.includes('pendingResponses":-1') ||
        msg.includes('outstandingResponses')))
  );
}

/** Mis-ordered clearIndexedDbPersistence — secondary noise from a bad recovery path. */
export function isFirestorePersistenceClearOrderError(reason: unknown): boolean {
  const msg = getFirestoreErrorMessage(reason);
  return msg.includes('Persistence can only be cleared before a Firestore instance');
}
