import {
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';
import { toMillisSafe } from '@/lib/firestore-timestamp';
import type { DocNote } from '@/types';

const LIST_KEY_PREFIX = 'docs_list_v1_';
const DOC_KEY_PREFIX = 'docs_note_v1_';

export type CachedDocNote = Omit<DocNote, 'createdAt' | 'updatedAt'> & {
  createdAt: number | null;
  updatedAt: number | null;
};

function listKey(userId: string): string {
  return `${LIST_KEY_PREFIX}${userId}`;
}

function docKey(docId: string): string {
  return `${DOC_KEY_PREFIX}${docId}`;
}

export function serializeDocForCache(note: DocNote): CachedDocNote {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    visibility: note.visibility,
    ownerId: note.ownerId,
    authorIds: note.authorIds ?? [],
    sharedWith: note.sharedWith ?? [],
    memberIds: note.memberIds ?? [],
    sourceChatIds: note.sourceChatIds ?? [],
    createdAt: toMillisSafe(note.createdAt) || null,
    updatedAt: toMillisSafe(note.updatedAt) || null,
    updatedBy: note.updatedBy || '',
  };
}

export function deserializeCachedDoc(cached: CachedDocNote): DocNote {
  return {
    ...cached,
    createdAt: cached.createdAt as unknown as DocNote['createdAt'],
    updatedAt: cached.updatedAt as unknown as DocNote['updatedAt'],
  };
}

export function getCachedDocsList(userId: string): DocNote[] {
  const cached = readLocalCollectionCacheStale<CachedDocNote[]>(listKey(userId));
  if (!cached?.length) return [];
  return cached.map(deserializeCachedDoc);
}

export function writeDocsListCache(userId: string, docs: DocNote[]): void {
  writeLocalCollectionCache(
    listKey(userId),
    docs.map(serializeDocForCache),
  );
  // Keep per-doc detail cache warm for instant open (best-effort; quota may skip some).
  for (const note of docs) {
    writeDocCache(note);
  }
}

export function upsertDocInListCache(userId: string, note: DocNote): void {
  const existing = getCachedDocsList(userId);
  const byId = new Map(existing.map((d) => [d.id, d]));
  byId.set(note.id, note);
  const next = Array.from(byId.values()).sort(
    (a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt),
  );
  writeDocsListCache(userId, next);
}

export function removeDocFromListCache(userId: string, docId: string): void {
  const next = getCachedDocsList(userId).filter((d) => d.id !== docId);
  writeLocalCollectionCache(listKey(userId), next.map(serializeDocForCache));
  removeDocCache(docId);
}

export function getCachedDoc(docId: string): DocNote | null {
  const cached = readLocalCollectionCacheStale<CachedDocNote>(docKey(docId));
  if (!cached?.id) return null;
  return deserializeCachedDoc(cached);
}

export function writeDocCache(note: DocNote): void {
  writeLocalCollectionCache(docKey(note.id), serializeDocForCache(note));
}

export function removeDocCache(docId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(docKey(docId));
  } catch {
    /* private mode */
  }
}

/** Clear per-user list caches and known note keys when signing out. */
export function clearDocsCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(LIST_KEY_PREFIX) || key.startsWith(DOC_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}
