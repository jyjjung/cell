'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import {
  DOC_COMMENT_MAX,
  DOC_TITLE_MAX,
  buildMemberIds,
  normalizeSharedWith,
} from '@/lib/docs-utils';
import { toMillisSafe } from '@/lib/firestore-timestamp';
import {
  filterOutLocallyDeletedDocs,
  isDocDeletedLocally,
  markDocDeletedLocally,
  subscribeLocalDocDeletes,
  unmarkDocDeletedLocally,
} from '@/lib/docs-deleted';
import {
  getCachedDoc,
  getCachedDocsList,
  removeDocCache,
  removeDocFromListCache,
  writeDocCache,
  writeDocsListCache,
  upsertDocInListCache,
} from '@/lib/docs-directory';
import type { DocComment, DocNote, DocVisibility } from '@/types';

function docFromData(id: string, data: Record<string, unknown>): DocNote {
  const ownerId = data.ownerId as string;
  const authorIds = Array.isArray(data.authorIds)
    ? (data.authorIds as string[])
    : ownerId
      ? [ownerId]
      : [];
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    content: (data.content as string) || '',
    visibility: (data.visibility as DocVisibility) || 'private',
    ownerId,
    authorIds,
    sharedWith: Array.isArray(data.sharedWith) ? (data.sharedWith as string[]) : [],
    memberIds: Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [],
    sourceChatIds: Array.isArray(data.sourceChatIds) ? (data.sourceChatIds as string[]) : [],
    createdAt: data.createdAt as DocNote['createdAt'],
    updatedAt: data.updatedAt as DocNote['updatedAt'],
    updatedBy: (data.updatedBy as string) || '',
  };
}

function commentFromData(id: string, data: Record<string, unknown>): DocComment {
  return {
    id,
    text: (data.text as string) || '',
    authorId: data.authorId as string,
    createdAt: data.createdAt as DocComment['createdAt'],
    updatedAt: data.updatedAt as DocComment['updatedAt'],
  };
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if ('status' in error && typeof (error as { status?: unknown }).status === 'number') {
    return (error as { status: number }).status;
  }
  return undefined;
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  return 'code' in error ? String((error as { code?: string }).code || '') : '';
}

function isAlreadyGoneError(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 404) return true;
  const code = errorCode(error);
  if (code === 'not-found') return true;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message === 'not found' || message.includes('document not found');
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = await getClientAuthHeaders(
    init?.headers as Record<string, string> | undefined,
  );
  const res = await fetch(url, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string }).error || `Request failed (${res.status})`;
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.status = res.status;
    // Only bare auth failures map to permission-denied (avoids "deploy rules" for 404/owner checks).
    if (res.status === 401) {
      err.code = 'permission-denied';
    }
    throw err;
  }
  return body as T;
}

async function deleteDocViaClient(docId: string): Promise<void> {
  await deleteDoc(doc(db, 'docs', docId));
}

/** True when the doc is already gone on the server (or we cannot see it anymore). */
async function isDocGoneOnServer(docId: string): Promise<boolean> {
  try {
    const snap = await getDocFromServer(doc(db, 'docs', docId));
    return !snap.exists();
  } catch (err) {
    // Missing docs often surface as permission-denied under security rules.
    const code = errorCode(err);
    return code === 'permission-denied' || code === 'not-found' || isAlreadyGoneError(err);
  }
}

async function deleteDocBestEffort(docId: string): Promise<void> {
  try {
    await apiJson(`/api/docs/${docId}`, { method: 'DELETE' });
    return;
  } catch (apiErr) {
    if (isAlreadyGoneError(apiErr)) return;
    try {
      await deleteDocViaClient(docId);
      return;
    } catch (clientErr) {
      if (isAlreadyGoneError(clientErr)) return;
      // Client delete of an already-removed doc fails rules (no resource) with permission-denied.
      if (await isDocGoneOnServer(docId)) return;
      throw apiErr;
    }
  }
}

function firestoreError(err: FirestoreError): Error {
  const e = new Error(err.message) as Error & { code?: string };
  e.code = err.code;
  return e;
}

export function useDocs(
  userId: string | undefined,
  options?: { /** When true, also load owner/sharedWith docs via Admin API (Docs page). */ authoritativeList?: boolean },
) {
  const authoritativeList = options?.authoritativeList === true;
  const [docs, setDocs] = useState<DocNote[]>(() =>
    userId ? filterOutLocallyDeletedDocs(getCachedDocsList(userId)) : [],
  );
  const [loading, setLoading] = useState(() => !(userId && getCachedDocsList(userId).length > 0));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setDocs([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = filterOutLocallyDeletedDocs(getCachedDocsList(userId));
    if (cached.length > 0) {
      setDocs(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;
    let hasServerSnapshot = false;
    let cacheFallback: ReturnType<typeof setTimeout> | undefined;
    let pendingCacheDocs: DocNote[] | null = null;
    /** Docs discovered via API (owner / sharedWith) that memberIds query may miss. */
    let apiExtras: DocNote[] = cached;

    const publish = (memberDocs: DocNote[]) => {
      const byId = new Map<string, DocNote>();
      for (const d of apiExtras) byId.set(d.id, d);
      for (const d of memberDocs) byId.set(d.id, d);
      const next = filterOutLocallyDeletedDocs(
        Array.from(byId.values()).sort(
          (a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt),
        ),
      );
      writeDocsListCache(userId, next);
      setDocs(next);
      setError(null);
      setLoading(false);
    };

    const loadFromApi = async () => {
      if (!authoritativeList) return;
      try {
        const data = await apiJson<{ docs: Array<Record<string, unknown> & { id: string }> }>(
          '/api/docs',
        );
        if (cancelled) return;
        apiExtras = data.docs.map((d) => docFromData(d.id, d));
        // Seed list immediately from authoritative server union query.
        publish(apiExtras);
      } catch (err) {
        if (cancelled) return;
        // Keep cached list visible; only surface error if we have nothing.
        if (cached.length === 0) {
          setError((prev) => prev ?? (err instanceof Error ? err : new Error('Failed to load documents')));
        }
      }
    };

    void loadFromApi();

    const docsQuery = query(
      collection(db, 'docs'),
      where('memberIds', 'array-contains', userId),
    );

    const unsubscribe = onSnapshot(
      docsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const memberDocs = snapshot.docs
          .map((d) => docFromData(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt));

        if (!snapshot.metadata.fromCache) {
          hasServerSnapshot = true;
          if (cacheFallback) {
            clearTimeout(cacheFallback);
            cacheFallback = undefined;
          }
          pendingCacheDocs = null;
          publish(memberDocs);
          return;
        }

        // Cache can still contain deleted docs. Wait briefly for the server.
        if (hasServerSnapshot) return;
        pendingCacheDocs = memberDocs;
        if (!cacheFallback) {
          cacheFallback = setTimeout(() => {
            if (hasServerSnapshot || !pendingCacheDocs) return;
            publish(pendingCacheDocs);
          }, 1200);
        }
      },
      (err) => {
        if (cacheFallback) clearTimeout(cacheFallback);
        setError(firestoreError(err));
        setLoading(false);
      },
    );

    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadFromApi();
    };
    if (authoritativeList) {
      document.addEventListener('visibilitychange', onVisible);
    }

    const unsubscribeLocalDeletes = subscribeLocalDocDeletes(() => {
      setDocs((prev) => filterOutLocallyDeletedDocs(prev));
    });

    return () => {
      cancelled = true;
      if (cacheFallback) clearTimeout(cacheFallback);
      unsubscribe();
      unsubscribeLocalDeletes();
      if (authoritativeList) {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [userId, authoritativeList]);

  const createDoc = useCallback(
    async (input: {
      title?: string;
      visibility: DocVisibility;
      sharedWith: string[];
      content?: string;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const title = (input.title || '').trim().slice(0, DOC_TITLE_MAX);
      const sharedWith = normalizeSharedWith(input.visibility, input.sharedWith, userId);
      if (input.visibility === 'shared' && sharedWith.length === 0) {
        throw new Error('Pick at least one person to share with');
      }
      const data = await apiJson<{ id: string }>('/api/docs', {
        method: 'POST',
        body: JSON.stringify({
          title,
          visibility: input.visibility,
          sharedWith,
          content: input.content ?? '<p></p>',
        }),
      });
      const created: DocNote = {
        id: data.id,
        title,
        content: input.content ?? '<p></p>',
        visibility: input.visibility,
        ownerId: userId,
        authorIds: [userId],
        sharedWith,
        memberIds: buildMemberIds(userId, sharedWith),
        sourceChatIds: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };
      upsertDocInListCache(userId, created);
      setDocs((prev) => {
        const byId = new Map(prev.map((d) => [d.id, d]));
        byId.set(created.id, created);
        return Array.from(byId.values()).sort(
          (a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt),
        );
      });
      return data.id;
    },
    [userId],
  );

  const deleteDocById = useCallback(async (docId: string) => {
    markDocDeletedLocally(docId);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    if (userId) removeDocFromListCache(userId, docId);
    else removeDocCache(docId);
    try {
      await deleteDocBestEffort(docId);
    } catch (err) {
      unmarkDocDeletedLocally(docId);
      throw err;
    }
  }, [userId]);

  const shareWithUsers = useCallback(
    async (docId: string, note: DocNote, additionalUids: string[]) => {
      if (!userId) throw new Error('Not signed in');
      if (note.ownerId !== userId) return;
      const merged = Array.from(new Set([...note.sharedWith, ...additionalUids]));
      await apiJson(`/api/docs/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'shared', sharedWith: merged }),
      });
    },
    [userId],
  );

  return { docs, loading, error, createDoc, deleteDocById, shareWithUsers };
}

export function useDoc(docId: string | undefined, userId: string | undefined) {
  const [note, setNote] = useState<DocNote | null>(() => {
    if (!docId || !userId || isDocDeletedLocally(docId)) return null;
    return getCachedDoc(docId);
  });
  const [loading, setLoading] = useState(() => {
    if (!docId || !userId) return false;
    if (isDocDeletedLocally(docId)) return false;
    return !getCachedDoc(docId);
  });
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!docId || !userId) {
      setNote(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (isDocDeletedLocally(docId)) {
      setNote(null);
      setError(new Error('Document not found'));
      setLoading(false);
      return;
    }

    const cached = getCachedDoc(docId);
    if (cached) {
      setNote(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let hasServerSnapshot = false;
    let pendingCacheNote: DocNote | null = null;
    let cacheFallback: ReturnType<typeof setTimeout> | undefined;

    const showMissing = () => {
      if (cacheFallback) {
        clearTimeout(cacheFallback);
        cacheFallback = undefined;
      }
      pendingCacheNote = null;
      removeDocCache(docId);
      if (userId) removeDocFromListCache(userId, docId);
      setNote(null);
      setError(new Error('Document not found'));
      setLoading(false);
    };

    const showNote = (next: DocNote) => {
      if (cacheFallback) {
        clearTimeout(cacheFallback);
        cacheFallback = undefined;
      }
      pendingCacheNote = null;
      writeDocCache(next);
      if (userId) upsertDocInListCache(userId, next);
      setNote(next);
      setError(null);
      setLoading(false);
    };

    const unsubscribe = onSnapshot(
      doc(db, 'docs', docId),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (isDocDeletedLocally(docId)) {
          showMissing();
          return;
        }

        if (!snapshot.exists()) {
          hasServerSnapshot = !snapshot.metadata.fromCache || hasServerSnapshot;
          showMissing();
          return;
        }

        const next = docFromData(snapshot.id, snapshot.data() as Record<string, unknown>);

        if (!snapshot.metadata.fromCache) {
          hasServerSnapshot = true;
          showNote(next);
          return;
        }

        // Cache-only: wait briefly for server so deleted docs don't flash back.
        // Prefer showing localStorage / Firestore persistent cache immediately.
        if (!cached) {
          pendingCacheNote = next;
          if (!cacheFallback) {
            cacheFallback = setTimeout(() => {
              if (hasServerSnapshot || isDocDeletedLocally(docId) || !pendingCacheNote) return;
              showNote(pendingCacheNote);
            }, 1500);
          }
        } else {
          // Already painted from device cache; refresh when server confirms.
          pendingCacheNote = next;
        }
      },
      (err) => {
        // Deleted / inaccessible docs often arrive as permission-denied, not not-found.
        if (err.code === 'permission-denied' || err.code === 'not-found') {
          // Keep device-cached note if we have one (offline / transient deny).
          if (cached && !hasServerSnapshot) {
            setLoading(false);
            return;
          }
          showMissing();
          return;
        }
        if (cacheFallback) clearTimeout(cacheFallback);
        if (cached) {
          setLoading(false);
          return;
        }
        setNote(null);
        setError(firestoreError(err));
        setLoading(false);
      },
    );

    return () => {
      if (cacheFallback) clearTimeout(cacheFallback);
      unsubscribe();
    };
  }, [docId, userId]);

  const saveContent = useCallback(
    async (
      title: string,
      content: string,
      options?: { allowEmpty?: boolean },
    ) => {
      if (!docId || !userId || !note) return;
      const trimmed = title.trim().slice(0, DOC_TITLE_MAX);
      if (trimmed === note.title && content === note.content) return;
      setSaving(true);
      try {
        await apiJson(`/api/docs/${docId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: trimmed,
            content,
            ...(options?.allowEmpty ? { allowEmpty: true } : {}),
          }),
        });
        // Optimistic local update so soft-sync does not briefly revert after save.
        setNote((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            title: trimmed,
            content,
            updatedBy: userId,
            updatedAt: Timestamp.now(),
          };
          writeDocCache(next);
          upsertDocInListCache(userId, next);
          return next;
        });
      } finally {
        setSaving(false);
      }
    },
    [docId, userId, note],
  );

  const updateSharing = useCallback(
    async (visibility: DocVisibility, sharedWithInput: string[]) => {
      if (!docId || !userId || !note) return;
      if (note.ownerId !== userId) throw new Error('Only the owner can change sharing');
      setSaving(true);
      try {
        await apiJson(`/api/docs/${docId}`, {
          method: 'PATCH',
          body: JSON.stringify({ visibility, sharedWith: sharedWithInput }),
        });
        const sharedWith = normalizeSharedWith(visibility, sharedWithInput, userId);
        const next: DocNote = {
          ...note,
          visibility,
          sharedWith,
          memberIds: buildMemberIds(userId, sharedWith),
          updatedBy: userId,
          updatedAt: Timestamp.now(),
        };
        writeDocCache(next);
        upsertDocInListCache(userId, next);
        setNote(next);
      } finally {
        setSaving(false);
      }
    },
    [docId, userId, note],
  );

  const removeDoc = useCallback(async () => {
    if (!docId || !userId || !note) return;
    if (note.ownerId !== userId) throw new Error('Only the owner can delete');
    markDocDeletedLocally(docId);
    removeDocFromListCache(userId, docId);
    setNote(null);
    try {
      await deleteDocBestEffort(docId);
    } catch (err) {
      unmarkDocDeletedLocally(docId);
      setNote(note);
      throw err;
    }
  }, [docId, userId, note]);

  const isOwner = useMemo(
    () => !!note && !!userId && note.ownerId === userId,
    [note, userId],
  );

  return {
    note,
    loading,
    error,
    saving,
    isOwner,
    saveContent,
    updateSharing,
    removeDoc,
  };
}

export function useDocComments(docId: string | undefined, enabled: boolean) {
  const [comments, setComments] = useState<DocComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId || !enabled) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const commentsQuery = query(
      collection(db, 'docs', docId, 'comments'),
      orderBy('createdAt', 'asc'),
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        setComments(
          snapshot.docs.map((d) =>
            commentFromData(d.id, d.data() as Record<string, unknown>),
          ),
        );
        setLoading(false);
      },
      () => {
        // Keep previous comments on transient listener errors.
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [docId, enabled]);

  const addComment = useCallback(
    async (_authorId: string, text: string) => {
      if (!docId) return;
      const trimmed = text.trim().slice(0, DOC_COMMENT_MAX);
      if (!trimmed) return;
      await apiJson(`/api/docs/${docId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: trimmed }),
      });
    },
    [docId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!docId) return;
      await apiJson(`/api/docs/${docId}/comments/${commentId}`, { method: 'DELETE' });
    },
    [docId],
  );

  return { comments, loading, addComment, deleteComment };
}

/** Chat helpers — create/share via admin API; server resolves chat members. */
export async function createSharedDocForChat(input: {
  ownerId: string;
  chatId: string;
  chatMemberIds?: string[];
  title?: string;
  content?: string;
}): Promise<string> {
  const data = await apiJson<{ id: string }>('/api/docs', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title || '',
      content: input.content ?? '<p></p>',
      chatId: input.chatId,
      // Fallback for older servers; preferred path is chatId resolution.
      visibility: 'shared',
      sharedWith: (input.chatMemberIds || []).filter((id) => id && id !== input.ownerId),
    }),
  });
  return data.id;
}

export async function shareDocWithChatMembers(input: {
  docId: string;
  note?: DocNote;
  actorId: string;
  chatId: string;
  chatMemberIds?: string[];
}): Promise<void> {
  await apiJson(`/api/docs/${input.docId}`, {
    method: 'PATCH',
    body: JSON.stringify({ shareWithChatId: input.chatId }),
  });
}

/** Heal ACL for docs already visible to the caller in this chat. */
export async function ensureDocsSharedWithChat(input: {
  chatId: string;
  docIds: string[];
}): Promise<void> {
  const docIds = Array.from(new Set(input.docIds.filter(Boolean)));
  if (!input.chatId || docIds.length === 0) return;
  await apiJson('/api/docs/ensure-chat-share', {
    method: 'POST',
    body: JSON.stringify({ chatId: input.chatId, docIds }),
  });
}

/** After chat members change, sync docs previously shared into the chat. */
export async function syncChatDocMembers(chatId: string): Promise<void> {
  if (!chatId) return;
  await apiJson('/api/docs/sync-chat-members', {
    method: 'POST',
    body: JSON.stringify({ chatId }),
  });
}
