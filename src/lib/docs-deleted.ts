/**
 * Client-side tombstones for docs deleted in this session.
 * Firestore persistent cache can briefly re-emit deleted docs in query
 * snapshots and single-doc listeners; these ids are filtered until the
 * server-confirmed removal sticks.
 */
const locallyDeletedDocIds = new Set<string>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function markDocDeletedLocally(docId: string): void {
  if (!docId || locallyDeletedDocIds.has(docId)) return;
  locallyDeletedDocIds.add(docId);
  notifyListeners();
}

export function unmarkDocDeletedLocally(docId: string): void {
  if (!locallyDeletedDocIds.delete(docId)) return;
  notifyListeners();
}

export function isDocDeletedLocally(docId: string): boolean {
  return locallyDeletedDocIds.has(docId);
}

export function filterOutLocallyDeletedDocs<T extends { id: string }>(docs: T[]): T[] {
  if (locallyDeletedDocIds.size === 0) return docs;
  return docs.filter((d) => !locallyDeletedDocIds.has(d.id));
}

/** Subscribe to local delete tombstone changes (all useDocs instances stay in sync). */
export function subscribeLocalDocDeletes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
