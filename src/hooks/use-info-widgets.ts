"use client";

import { useState, useEffect, useCallback } from 'react';
import type { InfoWidget } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const INFO_WIDGETS_COLLECTION = 'infoWidgets';

export type InfoWidgetInput = {
  title: string;
  titleKo?: string;
  body: string;
  bodyKo?: string;
};

function normalizeWidget(
  id: string,
  raw: Record<string, unknown>,
): InfoWidget {
  const body = typeof raw.body === 'string' ? raw.body : '';
  const bodyKo = typeof raw.bodyKo === 'string' && raw.bodyKo.trim()
    ? raw.bodyKo
    : undefined;

  return {
    id,
    title: typeof raw.title === 'string' ? raw.title : '',
    titleKo: typeof raw.titleKo === 'string' && raw.titleKo ? raw.titleKo : undefined,
    body,
    bodyKo,
    order: typeof raw.order === 'number' ? raw.order : 0,
    createdAt: raw.createdAt as Timestamp,
    updatedAt: raw.updatedAt as Timestamp | undefined,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : undefined,
  };
}

export function useInfoWidgets() {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const [widgets, setWidgets] = useState<InfoWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser?.uid) {
      setWidgets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, INFO_WIDGETS_COLLECTION), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setWidgets(
          snapshot.docs.map((d) =>
            normalizeWidget(d.id, d.data() as Record<string, unknown>),
          ),
        );
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching info widgets:', error);
        setWidgets([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [loadingAuth, currentUser?.uid]);

  const nextOrder = useCallback(() => {
    if (widgets.length === 0) return 0;
    return Math.max(...widgets.map((w) => w.order)) + 1;
  }, [widgets]);

  const addWidget = useCallback(
    async (input: InfoWidgetInput) => {
      if (!isAdmin) throw new Error('Not authorized to add info widgets.');
      const title = input.title.trim();
      const body = input.body.trim();
      if (!title) throw new Error('Title is required.');
      if (!body) throw new Error('Body is required.');
      const titleKo = input.titleKo?.trim();
      const bodyKo = input.bodyKo?.trim();

      await addDoc(collection(db, INFO_WIDGETS_COLLECTION), {
        title,
        body,
        ...(titleKo ? { titleKo } : {}),
        ...(bodyKo ? { bodyKo } : {}),
        order: nextOrder(),
        ...(currentUser?.uid ? { createdBy: currentUser.uid } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [isAdmin, nextOrder, currentUser?.uid],
  );

  const updateWidget = useCallback(
    async (id: string, input: InfoWidgetInput) => {
      if (!isAdmin) throw new Error('Not authorized to update info widgets.');
      const title = input.title.trim();
      const body = input.body.trim();
      if (!title) throw new Error('Title is required.');
      if (!body) throw new Error('Body is required.');
      const titleKo = input.titleKo?.trim();
      const bodyKo = input.bodyKo?.trim();

      await updateDoc(doc(db, INFO_WIDGETS_COLLECTION, id), {
        title,
        body,
        titleKo: titleKo || null,
        bodyKo: bodyKo || null,
        updatedAt: serverTimestamp(),
      });
    },
    [isAdmin],
  );

  const deleteWidget = useCallback(
    async (id: string) => {
      if (!isAdmin) throw new Error('Not authorized to delete info widgets.');
      await deleteDoc(doc(db, INFO_WIDGETS_COLLECTION, id));
    },
    [isAdmin],
  );

  const moveWidget = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      if (!isAdmin) throw new Error('Not authorized to reorder info widgets.');
      const index = widgets.findIndex((w) => w.id === id);
      if (index < 0) return;

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= widgets.length) return;

      const reordered = [...widgets];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(swapIndex, 0, moved);

      const batch = writeBatch(db);
      reordered.forEach((widget, order) => {
        batch.update(doc(db, INFO_WIDGETS_COLLECTION, widget.id), {
          order,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    },
    [isAdmin, widgets],
  );

  return {
    widgets,
    loading,
    addWidget,
    updateWidget,
    deleteWidget,
    moveWidget,
  };
}
