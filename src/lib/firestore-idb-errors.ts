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
 * Detects Firestore IndexedDB failures that leave the client unusable until reload.
 * Covers classic corruption ("refusing to open IndexedDB") and Safari/WebKit aborts
 * that surface as UnknownError / INTERNAL ASSERTION FAILED (e.g. after backgrounding).
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
    (msg.includes('INTERNAL ASSERTION FAILED') &&
      (msg.includes('Indexed') || msg.includes('transaction') || msg.includes('b815')))
  );
}
