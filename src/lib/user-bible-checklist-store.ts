import { db } from '@/lib/firebase';
import {
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';
import { syncCommunityProgress } from '@/lib/community-progress';
import type { UserBibleChecklist } from '@/types';
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore';

export const USER_BIBLE_CHECKLISTS_COLLECTION = 'userBibleChecklists';

export type UserBibleChecklistState = {
  passages: string[];
  exists: boolean;
  loading: boolean;
};

type ChecklistHandler = (state: UserBibleChecklistState) => void;

type SharedChecklistListener = {
  refCount: number;
  unsub: () => void;
  subscribers: Set<ChecklistHandler>;
  state: UserBibleChecklistState;
  syncTimer: ReturnType<typeof setTimeout> | null;
};

const sharedListeners = new Map<string, SharedChecklistListener>();

export function checklistCacheKey(uid: string) {
  return `user_bible_checklist_v1_${uid}`;
}

export function readCachedPassages(uid: string): string[] | null {
  const cached = readLocalCollectionCacheStale<string[]>(checklistCacheKey(uid));
  return Array.isArray(cached) ? cached : null;
}

export function writeCachedPassages(uid: string, passages: string[]) {
  writeLocalCollectionCache(checklistCacheKey(uid), passages);
}

/**
 * Do not let a persistent-cache miss replace known progress with an empty list.
 * A server-confirmed empty snapshot remains authoritative.
 */
export function shouldAcceptChecklistSnapshot(
  currentPassages: string[],
  snapshot: {
    exists: () => boolean;
    data: () => DocumentData | undefined;
    metadata: { fromCache: boolean };
  },
): boolean {
  const nextPassages = snapshot.exists()
    ? snapshot.data()?.completedPassages
    : [];
  return !(
    snapshot.metadata.fromCache &&
    currentPassages.length > 0 &&
    (!Array.isArray(nextPassages) || nextPassages.length === 0)
  );
}

function emit(entry: SharedChecklistListener, next: UserBibleChecklistState) {
  entry.state = next;
  entry.subscribers.forEach((handler) => handler(next));
}

function scheduleCommunityProgressSync(
  entry: SharedChecklistListener,
  uid: string,
  passages: string[],
) {
  if (entry.syncTimer) clearTimeout(entry.syncTimer);
  entry.syncTimer = setTimeout(() => {
    entry.syncTimer = null;
    void syncCommunityProgress(uid, passages).catch((e) => {
      console.error('[BibleChecklist] communityProgress sync failed:', e);
    });
  }, 800);
}

/**
 * One Firestore listener per uid, shared across every mounted checklist hook
 * (plan page, mark-as-read dialogs, home, bible reader).
 */
export function subscribeUserBibleChecklist(
  uid: string,
  handler: ChecklistHandler,
): () => void {
  let entry = sharedListeners.get(uid);

  if (!entry) {
    const cached = readCachedPassages(uid);
    const subscribers = new Set<ChecklistHandler>();
    const created: SharedChecklistListener = {
      refCount: 0,
      unsub: () => {},
      subscribers,
      state: {
        passages: cached ?? [],
        exists: cached != null && cached.length > 0,
        loading: cached == null,
      },
      syncTimer: null,
    };
    sharedListeners.set(uid, created);

    created.unsub = onSnapshot(
      doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, uid),
      { includeMetadataChanges: true },
      (docSnapshot) => {
        const current = sharedListeners.get(uid);
        if (!current) return;
        if (!shouldAcceptChecklistSnapshot(current.state.passages, docSnapshot)) {
          return;
        }

        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserBibleChecklist;
          const passages = Array.isArray(data.completedPassages) ? data.completedPassages : [];
          writeCachedPassages(uid, passages);
          emit(current, { passages, exists: passages.length > 0, loading: false });
          if (passages.length > 0 || !docSnapshot.metadata.fromCache) {
            scheduleCommunityProgressSync(current, uid, passages);
          }
        } else {
          writeCachedPassages(uid, []);
          emit(current, { passages: [], exists: false, loading: false });
          if (!docSnapshot.metadata.fromCache) {
            scheduleCommunityProgressSync(current, uid, []);
          }
        }
      },
      (error) => {
        console.error('Error fetching user Bible checklist:', error);
        const current = sharedListeners.get(uid);
        if (!current) return;
        const fallback = readCachedPassages(uid);
        emit(current, {
          passages: fallback ?? current.state.passages,
          exists: current.state.exists,
          loading: false,
        });
      },
    );

    entry = created;
  }

  entry.subscribers.add(handler);
  entry.refCount += 1;
  handler(entry.state);

  return () => {
    const current = sharedListeners.get(uid);
    if (!current) return;
    current.subscribers.delete(handler);
    current.refCount -= 1;
    if (current.refCount > 0) return;
    current.unsub();
    if (current.syncTimer) clearTimeout(current.syncTimer);
    sharedListeners.delete(uid);
  };
}
