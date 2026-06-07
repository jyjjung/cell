
"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { QTRosterEntry } from '@/types';

import { useNotifications } from '@/hooks/use-notifications';

const QT_ROSTERS_COLLECTION = 'qtRosters';

export function useQTRoster(enabled = true) {
  const [roster, setRoster] = useState<QTRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { createNotification } = useNotifications();

  useEffect(() => {
    if (!enabled) {
      setRoster([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, QT_ROSTERS_COLLECTION), orderBy('date', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rosterData: QTRosterEntry[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as QTRosterEntry));
      setRoster(rosterData);
      setLoading(false);
    }, (error) => {
      console.error("[useQTRoster] Error fetching roster:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled]);

  const upsertEntry = useCallback(async (entryData: Omit<QTRosterEntry, 'id'>) => {
    const docId = entryData.date; // Use YYYY-MM-DD as the document ID
    const docRef = doc(db, QT_ROSTERS_COLLECTION, docId);

    // Smart Notification: Check if this is a new assignment
    const existingEntry = roster.find(r => r.date === entryData.date);
    const isNewUser = entryData.userId && entryData.userId !== existingEntry?.userId;

    try {
      await setDoc(docRef, { ...entryData, updatedAt: serverTimestamp() }, { merge: true });

      if (isNewUser && entryData.userId) {
        createNotification({
          title: "New QT Assignment",
          message: `You've been assigned for ${entryData.date}: "${entryData.title}" (${entryData.passage}).`,
          type: 'reminder',
          isGlobal: false,
          userId: entryData.userId,
          relatedUrl: '/qt'
        });
      }
    } catch (error) {
      console.error("[useQTRoster] Error upserting entry:", error);
      throw error;
    }
  }, [roster, createNotification]);

  const deleteEntry = useCallback(async (date: string) => {
    const docRef = doc(db, QT_ROSTERS_COLLECTION, date);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      console.error("[useQTRoster] Error deleting entry:", error);
      throw error;
    }
  }, []);

  return { roster, loading, upsertEntry, deleteEntry };
}
