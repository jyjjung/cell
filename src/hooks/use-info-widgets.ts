"use client";

import { useState, useEffect, useCallback } from 'react';
import type { InfoWidget, InfoWidgetItem } from '@/types';
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
  items: Omit<InfoWidgetItem, 'id' | 'order'>[];
};

function normalizeItems(
  items: Array<Partial<InfoWidgetItem> & { label?: string; value?: string }>,
): InfoWidgetItem[] {
  return items
    .map((item, index) => ({
      id: item.id || `item-${index}-${Date.now()}`,
      label: (item.label || '').trim(),
      labelKo: item.labelKo?.trim() || undefined,
      value: (item.value || '').trim(),
      detail: item.detail?.trim() || undefined,
      order: typeof item.order === 'number' ? item.order : index,
    }))
    .filter((item) => item.label && item.value)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

/** Firestore rejects `undefined` — only include optional fields when set. */
function serializeItems(
  items: Omit<InfoWidgetItem, 'id' | 'order'>[],
): Array<Record<string, string | number>> {
  return items.map((item, index) => {
    const labelKo = item.labelKo?.trim();
    const detail = item.detail?.trim();
    return {
      id: `item-${Date.now()}-${index}`,
      label: item.label.trim(),
      value: item.value.trim(),
      order: index,
      ...(labelKo ? { labelKo } : {}),
      ...(detail ? { detail } : {}),
    };
  });
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
        const data: InfoWidget[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            title: raw.title || '',
            titleKo: raw.titleKo || undefined,
            order: typeof raw.order === 'number' ? raw.order : 0,
            items: normalizeItems(Array.isArray(raw.items) ? raw.items : []),
            createdAt: raw.createdAt as Timestamp,
            updatedAt: raw.updatedAt as Timestamp | undefined,
            createdBy: raw.createdBy,
          };
        });
        setWidgets(data);
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
      if (!title) throw new Error('Title is required.');
      const titleKo = input.titleKo?.trim();

      await addDoc(collection(db, INFO_WIDGETS_COLLECTION), {
        title,
        ...(titleKo ? { titleKo } : {}),
        order: nextOrder(),
        items: serializeItems(input.items),
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
      if (!title) throw new Error('Title is required.');
      const titleKo = input.titleKo?.trim();

      await updateDoc(doc(db, INFO_WIDGETS_COLLECTION, id), {
        title,
        titleKo: titleKo || null,
        items: serializeItems(input.items),
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
