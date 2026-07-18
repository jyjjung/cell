'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import {
  DOC_COMMENT_MAX,
  DOC_TITLE_MAX,
  normalizeSharedWith,
} from '@/lib/docs-utils';
import type { DocComment, DocNote, DocVisibility } from '@/types';

const LIST_POLL_MS = 4000;
const DOC_POLL_MS = 2500;
const COMMENTS_POLL_MS = 3000;

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

export function useDocs(userId: string | undefined) {
  const [docs, setDocs] = useState<DocNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiJson<{ docs: Array<Record<string, unknown> & { id: string }> }>(
        '/api/docs',
      );
      if (!mounted.current) return;
      setDocs(data.docs.map((d) => docFromData(d.id, d)));
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err : new Error('Failed to load documents'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    void refresh();
    if (!userId) return () => {
      mounted.current = false;
    };
    const id = window.setInterval(() => void refresh(), LIST_POLL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [userId, refresh]);

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
      await refresh();
      return data.id;
    },
    [userId, refresh],
  );

  const deleteDocById = useCallback(
    async (docId: string) => {
      await apiJson(`/api/docs/${docId}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh],
  );

  const shareWithUsers = useCallback(
    async (docId: string, note: DocNote, additionalUids: string[]) => {
      if (!userId) throw new Error('Not signed in');
      if (note.ownerId !== userId) return;
      const merged = Array.from(new Set([...note.sharedWith, ...additionalUids]));
      await apiJson(`/api/docs/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'shared', sharedWith: merged }),
      });
      await refresh();
    },
    [userId, refresh],
  );

  return { docs, loading, error, createDoc, deleteDocById, shareWithUsers, refresh };
}

export function useDoc(docId: string | undefined, userId: string | undefined) {
  const [note, setNote] = useState<DocNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!docId || !userId) {
      setNote(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiJson<Record<string, unknown> & { id: string }>(`/api/docs/${docId}`);
      if (!mounted.current) return;
      setNote(docFromData(data.id, data));
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setNote(null);
      setError(err instanceof Error ? err : new Error('Failed to load document'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [docId, userId]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    void refresh();
    if (!docId || !userId) {
      return () => {
        mounted.current = false;
      };
    }
    const id = window.setInterval(() => void refresh(), DOC_POLL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [docId, userId, refresh]);

  const saveContent = useCallback(
    async (title: string, content: string) => {
      if (!docId || !userId || !note) return;
      const trimmed = title.trim().slice(0, DOC_TITLE_MAX);
      if (trimmed === note.title && content === note.content) return;
      setSaving(true);
      try {
        await apiJson(`/api/docs/${docId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: trimmed, content }),
        });
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [docId, userId, note, refresh],
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
        await refresh();
      } finally {
        setSaving(false);
      }
    },
    [docId, userId, note, refresh],
  );

  const removeDoc = useCallback(async () => {
    if (!docId || !userId || !note) return;
    if (note.ownerId !== userId) throw new Error('Only the owner can delete');
    await apiJson(`/api/docs/${docId}`, { method: 'DELETE' });
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
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!docId || !enabled) {
      setComments([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiJson<{ comments: Array<Record<string, unknown> & { id: string }> }>(
        `/api/docs/${docId}/comments`,
      );
      if (!mounted.current) return;
      setComments(data.comments.map((c) => commentFromData(c.id, c)));
    } catch {
      // keep previous comments on transient errors
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [docId, enabled]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    void refresh();
    if (!docId || !enabled) {
      return () => {
        mounted.current = false;
      };
    }
    const id = window.setInterval(() => void refresh(), COMMENTS_POLL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [docId, enabled, refresh]);

  const addComment = useCallback(
    async (_authorId: string, text: string) => {
      if (!docId) return;
      const trimmed = text.trim().slice(0, DOC_COMMENT_MAX);
      if (!trimmed) return;
      await apiJson(`/api/docs/${docId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: trimmed }),
      });
      await refresh();
    },
    [docId, refresh],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!docId) return;
      await apiJson(`/api/docs/${docId}/comments/${commentId}`, { method: 'DELETE' });
      await refresh();
    },
    [docId, refresh],
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
