'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
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
  normalizeSharedWith,
} from '@/lib/docs-utils';
import type { DocComment, DocNote, DocVisibility } from '@/types';

function docFromSnap(id: string, data: Record<string, unknown>): DocNote {
  return {
    id,
    title: (data.title as string) || '',
    content: (data.content as string) || '',
    visibility: (data.visibility as DocVisibility) || 'private',
    ownerId: data.ownerId as string,
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
      title: string;
      visibility: DocVisibility;
      sharedWith: string[];
      content?: string;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const title = input.title.trim().slice(0, DOC_TITLE_MAX);
      if (!title) throw new Error('Title required');

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

  return { docs, loading, error, createDoc, deleteDocById };
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
      if (!trimmed) throw new Error('Title required');
      if (trimmed === note.title && content === note.content) return;

      setSaving(true);
      try {
        await updateDoc(doc(db, DOCS_COLLECTION, docId), {
          title: trimmed,
          content,
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
