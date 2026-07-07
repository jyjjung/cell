
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CleaningDay } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  where,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useScheduleData } from '@/contexts/schedule-data-context';

const CLEANING_DAYS_COLLECTION = 'cleaningDays';

export function useCleaningDays(enabled = true) {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const schedule = useScheduleData();
  const [localCleaningDays, setLocalCleaningDays] = useState<CleaningDay[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (schedule || !enabled || loadingAuth) return;

    if (!currentUser) {
      setLocalCleaningDays([]);
      setLocalLoading(false);
      return;
    }

    setLocalLoading(true);
    const q = query(collection(db, CLEANING_DAYS_COLLECTION), orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const days = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CleaningDay));
      setLocalCleaningDays(days);
      setLocalLoading(false);
    }, (error) => {
      console.error("[useCleaningDays] Error fetching cleaning days:", error);
      setLocalLoading(false);
    });

    return () => unsubscribe();
  }, [schedule, enabled, loadingAuth, currentUser?.uid]);

  const cleaningDays = schedule?.cleaningDays ?? localCleaningDays;
  const loading = schedule ? schedule.cleaningDaysLoading : localLoading;

  const addCleaningDay = useCallback(async (name: string) => {
    if (!isAdmin) throw new Error("Not authorized");
    const newOrder = cleaningDays.length > 0 ? Math.max(...cleaningDays.map(d => d.order)) + 1 : 1;
    await addDoc(collection(db, CLEANING_DAYS_COLLECTION), {
      name,
      order: newOrder,
    });
  }, [isAdmin, cleaningDays]);

  const updateCleaningDay = useCallback(async (id: string, name: string) => {
    if (!isAdmin) throw new Error("Not authorized");
    const docRef = doc(db, CLEANING_DAYS_COLLECTION, id);
    await updateDoc(docRef, { name });
  }, [isAdmin]);

  const deleteCleaningDay = useCallback(async (id: string) => {
    if (!isAdmin) throw new Error("Not authorized");
    const rosterQuery = query(
      collection(db, 'cleaningRosters'),
      where('dayId', '==', id),
    );
    const rosterSnap = await getDocs(rosterQuery);
    if (!rosterSnap.empty) {
      throw new Error("This cleaning day is assigned on the roster. Reassign those entries before deleting.");
    }
    const docRef = doc(db, CLEANING_DAYS_COLLECTION, id);
    await deleteDoc(docRef);
  }, [isAdmin]);

  return { cleaningDays, loading, addCleaningDay, updateCleaningDay, deleteCleaningDay };
}
