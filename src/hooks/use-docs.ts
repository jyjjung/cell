'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  buildMemberIds,
  DOCS_COLLECTION,
  DOC_COMMENT_MAX,
  DOC_TITLE_MAX,
  mergeAuthorIds,
  normalizeSharedWith,
} from '@/lib/docs-utils';
import type { DocComment, DocNote, DocVisibility } from '@/types';

function docFromSnap(id: string, data: Record<string, unknown>): DocNote {
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

function commentFromSnap(id: string, data: Record<string, unknown>): DocComment {
  return {
    id,
    text: (data.text as string) || '',
    authorId: data.authorId as string,
    createdAt: data.createdAt as DocComment['createdAt'],
    updatedAt: data.updatedAt as DocComment['updatedAt'],
  };
}

export function useDocs(userId: string | undefined) {
  const [docs, setDocs] = useState<DocNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setDocs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, DOCS_COLLECTION),
      where('memberIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => docFromSnap(d.id, d.data() as Record<string, unknown>)));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsub();
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

      const memberIds = buildMemberIds(userId, sharedWith);
      const ref = await addDoc(collection(db, DOCS_COLLECTION), {
        title,
        content: input.content ?? '<p></p>',
        visibility: input.visibility,
        ownerId: userId,
        authorIds: [userId],
        sharedWith,
        memberIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
      return ref.id;
    },
    [userId],
  );

  const deleteDocById = useCallback(async (docId: string) => {
    await deleteDoc(doc(db, DOCS_COLLECTION, docId));
  }, []);

  /** Expand sharing to more people. Only the owner can change ACL (Firestore rules). */
  const shareWithUsers = useCallback(
    async (docId: string, note: DocNote, additionalUids: string[]) => {
      if (!userId) throw new Error('Not signed in');
      if (note.ownerId !== userId) return;
      const merged = Array.from(new Set([...note.sharedWith, ...additionalUids]));
      const sharedWith = normalizeSharedWith('shared', merged, userId);
      if (sharedWith.length === 0) {
        throw new Error('Pick at least one person to share with');
      }
      const memberIds = buildMemberIds(userId, sharedWith);
      await updateDoc(doc(db, DOCS_COLLECTION, docId), {
        visibility: 'shared',
        sharedWith,
        memberIds,
        authorIds: mergeAuthorIds(note.authorIds, userId),
        updatedAt: serverTimestamp(),
        updatedBy: userId,
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
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      doc(db, DOCS_COLLECTION, docId),
      (snap) => {
        if (!snap.exists()) {
          setNote(null);
          setError(new Error('Document not found'));
        } else {
          const data = snap.data() as Record<string, unknown>;
          const parsed = docFromSnap(snap.id, data);
          if (!parsed.memberIds.includes(userId)) {
            setNote(null);
            setError(new Error('You do not have access to this document'));
          } else {
            setNote(parsed);
            setError(null);
          }
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [docId, userId]);

  const saveContent = useCallback(
    async (title: string, content: string) => {
      if (!docId || !userId || !note) return;
      const trimmed = title.trim().slice(0, DOC_TITLE_MAX);
      if (trimmed === note.title && content === note.content) return;

      setSaving(true);
      try {
        await updateDoc(doc(db, DOCS_COLLECTION, docId), {
          title: trimmed,
          content,
          authorIds: mergeAuthorIds(note.authorIds, userId),
          updatedAt: serverTimestamp(),
          updatedBy: userId,
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

      const sharedWith = normalizeSharedWith(visibility, sharedWithInput, userId);
      if (visibility === 'shared' && sharedWith.length === 0) {
        throw new Error('Pick at least one person to share with');
      }
      const memberIds = buildMemberIds(userId, sharedWith);

      setSaving(true);
      try {
        await updateDoc(doc(db, DOCS_COLLECTION, docId), {
          visibility,
          sharedWith,
          memberIds,
          authorIds: mergeAuthorIds(note.authorIds, userId),
          updatedAt: serverTimestamp(),
          updatedBy: userId,
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
    await deleteDoc(doc(db, DOCS_COLLECTION, docId));
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
    let unsub: Unsubscribe | undefined;
    const q = query(
      collection(db, DOCS_COLLECTION, docId, 'comments'),
      orderBy('createdAt', 'asc'),
    );
    unsub = onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs.map((d) => commentFromSnap(d.id, d.data() as Record<string, unknown>)),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsub?.();
  }, [docId, enabled]);

  const addComment = useCallback(
    async (authorId: string, text: string) => {
      if (!docId) return;
      const trimmed = text.trim().slice(0, DOC_COMMENT_MAX);
      if (!trimmed) return;
      await addDoc(collection(db, DOCS_COLLECTION, docId, 'comments'), {
        text: trimmed,
        authorId,
        createdAt: serverTimestamp(),
      });
    },
    [docId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!docId) return;
      await deleteDoc(doc(db, DOCS_COLLECTION, docId, 'comments', commentId));
    },
    [docId],
  );

  return { comments, loading, addComment, deleteComment };
}

/** Standalone helpers for chat flows (avoid hook coupling). */
export async function createSharedDocForChat(input: {
  ownerId: string;
  chatMemberIds: string[];
  title?: string;
  content?: string;
}): Promise<string> {
  const sharedWith = normalizeSharedWith(
    'shared',
    input.chatMemberIds,
    input.ownerId,
  );
  if (sharedWith.length === 0) {
    // Solo chat with self only — keep private
    const ref = await addDoc(collection(db, DOCS_COLLECTION), {
      title: (input.title || '').trim().slice(0, DOC_TITLE_MAX),
      content: input.content ?? '<p></p>',
      visibility: 'private',
      ownerId: input.ownerId,
      authorIds: [input.ownerId],
      sharedWith: [],
      memberIds: [input.ownerId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: input.ownerId,
    });
    return ref.id;
  }
  const memberIds = buildMemberIds(input.ownerId, sharedWith);
  const ref = await addDoc(collection(db, DOCS_COLLECTION), {
    title: (input.title || '').trim().slice(0, DOC_TITLE_MAX),
    content: input.content ?? '<p></p>',
    visibility: 'shared',
    ownerId: input.ownerId,
    authorIds: [input.ownerId],
    sharedWith,
    memberIds,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: input.ownerId,
  });
  return ref.id;
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
  const memberIds = buildMemberIds(input.actorId, sharedWith);
  await updateDoc(doc(db, DOCS_COLLECTION, input.docId), {
    visibility: 'shared',
    sharedWith,
    memberIds,
    authorIds: arrayUnion(input.actorId),
    updatedAt: serverTimestamp(),
    updatedBy: input.actorId,
  });
}
