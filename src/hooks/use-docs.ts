'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
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

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = await getClientAuthHeaders(
    init?.headers as Record<string, string> | undefined,
  );
  const res = await fetch(url, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((body as { error?: string }).error || `Request failed (${res.status})`);
    (err as Error & { code?: string }).code =
      res.status === 403 || res.status === 401 ? 'permission-denied' : undefined;
    throw err;
  }
  return body as T;
}

function firestoreError(err: FirestoreError): Error {
  const e = new Error(err.message);
  (e as Error & { code?: string }).code = err.code;
  return e;
}

export function useDocs(userId: string | undefined) {
  const [docs, setDocs] = useState<DocNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setDocs([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const docsQuery = query(
      collection(db, 'docs'),
      where('memberIds', 'array-contains', userId),
    );

    const unsubscribe = onSnapshot(
      docsQuery,
      (snapshot) => {
        const next = filterOutLocallyDeletedDocs(
          snapshot.docs
            .map((d) => docFromData(d.id, d.data() as Record<string, unknown>))
            .sort((a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt)),
        );
        setDocs(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(firestoreError(err));
        setLoading(false);
      },
    );

    const unsubscribeLocalDeletes = subscribeLocalDocDeletes(() => {
      setDocs((prev) => filterOutLocallyDeletedDocs(prev));
    });

    return () => {
      unsubscribe();
      unsubscribeLocalDeletes();
    };
  }, [userId]);

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
      return data.id;
    },
    [userId],
  );

  const deleteDocById = useCallback(async (docId: string) => {
    markDocDeletedLocally(docId);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    try {
      await apiJson(`/api/docs/${docId}`, { method: 'DELETE' });
    } catch (err) {
      unmarkDocDeletedLocally(docId);
      throw err;
    }
  }, []);

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
  const [note, setNote] = useState<DocNote | null>(null);
  const [loading, setLoading] = useState(true);
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

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'docs', docId),
      (snapshot) => {
        if (!snapshot.exists() || isDocDeletedLocally(docId)) {
          setNote(null);
          setError(new Error('Document not found'));
          setLoading(false);
          return;
        }
        setNote(docFromData(snapshot.id, snapshot.data() as Record<string, unknown>));
        setError(null);
        setLoading(false);
      },
      (err) => {
        setNote(null);
        setError(firestoreError(err));
        setLoading(false);
      },
    );

    return () => unsubscribe();
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
        setNote((prev) =>
          prev
            ? {
                ...prev,
                title: trimmed,
                content,
                updatedBy: userId,
                updatedAt: Timestamp.now(),
              }
            : prev,
        );
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
    setNote(null);
    try {
      await apiJson(`/api/docs/${docId}`, { method: 'DELETE' });
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

/** Chat helpers — create/share via admin API so this works before rules deploy. */
export async function createSharedDocForChat(input: {
  ownerId: string;
  chatMemberIds: string[];
  title?: string;
  content?: string;
}): Promise<string> {
  const sharedWith = normalizeSharedWith('shared', input.chatMemberIds, input.ownerId);
  const visibility: DocVisibility = sharedWith.length > 0 ? 'shared' : 'private';
  const data = await apiJson<{ id: string }>('/api/docs', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title || '',
      visibility,
      sharedWith,
      content: input.content ?? '<p></p>',
    }),
  });
  return data.id;
}

export async function shareDocWithChatMembers(input: {
  docId: string;
  note: DocNote;
  actorId: string;
  chatMemberIds: string[];
}): Promise<void> {
  if (input.note.ownerId !== input.actorId) return;
  const merged = Array.from(new Set([...input.note.sharedWith, ...input.chatMemberIds]));
  const sharedWith = normalizeSharedWith('shared', merged, input.actorId);
  if (sharedWith.length === 0) return;
  await apiJson(`/api/docs/${input.docId}`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility: 'shared', sharedWith }),
  });
}
