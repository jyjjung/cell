
"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { QTRosterEntry } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useScheduleData } from '@/contexts/schedule-data-context';
import { useNotifications } from '@/hooks/use-notifications';

const QT_ROSTERS_COLLECTION = 'qtRosters';

export function useQTRoster(enabled = true) {
  const { currentUser, loadingAuth } = useAuth();
  const schedule = useScheduleData();
  const [localRoster, setLocalRoster] = useState<QTRosterEntry[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const { createNotification } = useNotifications();

  useEffect(() => {
    if (schedule || !enabled || loadingAuth) return;

    if (!currentUser?.uid) {
      setLocalRoster([]);
      setLocalLoading(false);
      return;
    }

    setLocalLoading(true);
    const q = query(collection(db, QT_ROSTERS_COLLECTION), orderBy('date', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rosterData: QTRosterEntry[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as QTRosterEntry));
      setLocalRoster(rosterData);
      setLocalLoading(false);
    }, (error) => {
      console.error("[useQTRoster] Error fetching roster:", error);
      setLocalLoading(false);
    });

    return () => unsubscribe();
  }, [schedule, enabled, loadingAuth, currentUser?.uid]);

  const roster = schedule?.qtRoster ?? localRoster;
  const loading = schedule ? schedule.qtRosterLoading : localLoading;

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
