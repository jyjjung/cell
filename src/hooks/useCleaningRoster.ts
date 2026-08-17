
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CleaningRosterEntry } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useLiveScheduleData } from '@/contexts/schedule-data-context';

const CLEANING_ROSTERS_COLLECTION = 'cleaningRosters';

export function useCleaningRoster(enabled = true) {
  const { currentUser, loadingAuth } = useAuth();
  const schedule = useLiveScheduleData();
  const [localRoster, setLocalRoster] = useState<CleaningRosterEntry[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (schedule || !enabled || loadingAuth) return;

    if (!currentUser?.uid) {
      setLocalRoster([]);
      setLocalLoading(false);
      return;
    }

    setLocalLoading(true);
    const q = query(collection(db, CLEANING_ROSTERS_COLLECTION));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rosterData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CleaningRosterEntry));
      setLocalRoster(rosterData);
      setLocalLoading(false);
    }, (error) => {
      console.error("[useCleaningRoster] Error fetching roster:", error);
      setLocalLoading(false);
    });

    return () => unsubscribe();
  }, [schedule, enabled, loadingAuth, currentUser?.uid]);

  const roster = schedule?.cleaningRoster ?? localRoster;
  const loading = schedule ? schedule.cleaningRosterLoading : localLoading;

  const { createNotification } = useNotifications();

  const upsertEntry = useCallback(async (entryData: Omit<CleaningRosterEntry, 'id' | 'updatedAt' | 'isCompleted' | 'completedAt' | 'completedBy'>) => {
    const docRef = doc(db, CLEANING_ROSTERS_COLLECTION, entryData.date);

    // Smart Notification: Check if this is a new assignment for any of the users
    const existingEntry = roster.find(r => r.date === entryData.date);
    const newUsers = entryData.assignedUserIds.filter(uid => !existingEntry?.assignedUserIds.includes(uid));

    await setDoc(docRef, {
      ...entryData,
      isCompleted: false, // Ensure it's not completed on upsert
      completedAt: null,
      completedBy: null,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Trigger notifications for newly assigned users (await so push isn't dropped on navigation)
    if (newUsers.length > 0) {
      await Promise.all(
        newUsers.map((uid) =>
          createNotification({
            title: "New Cleaning Assignment",
            message: `You've been added to the cleaning roster for ${entryData.date}.`,
            type: 'reminder',
            isGlobal: false,
            userId: uid,
            relatedUrl: '/cleaning-roster'
          }).catch((error) => {
            console.error("[useCleaningRoster] Failed to notify assignee:", uid, error);
          }),
        ),
      );
    }
  }, [roster, createNotification]);
  
  const deleteEntry = useCallback(async (date: string) => {
    const docRef = doc(db, CLEANING_ROSTERS_COLLECTION, date);
    await deleteDoc(docRef);
  }, []);

  const toggleCompletion = useCallback(async (date: string, currentState: boolean) => {
    if (!currentUser) throw new Error("User not logged in");
    const docRef = doc(db, CLEANING_ROSTERS_COLLECTION, date);
    const newState = !currentState;
    await updateDoc(docRef, {
      isCompleted: newState,
      completedAt: newState ? serverTimestamp() : null,
      completedBy: newState ? currentUser.uid : null,
      updatedAt: serverTimestamp()
    });
  }, [currentUser]);

  return { roster, loading, upsertEntry, deleteEntry, toggleCompletion };
}
