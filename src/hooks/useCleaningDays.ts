
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
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const CLEANING_DAYS_COLLECTION = 'cleaningDays';

export function useCleaningDays(enabled = true) {
  const { isAdmin } = useAuth();
  const [cleaningDays, setCleaningDays] = useState<CleaningDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setCleaningDays([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, CLEANING_DAYS_COLLECTION), orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const days = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CleaningDay));
      setCleaningDays(days);
      setLoading(false);
    }, (error) => {
      console.error("[useCleaningDays] Error fetching cleaning days:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled]);

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
    // TODO: Add logic to check if day is in use before deleting
    const docRef = doc(db, CLEANING_DAYS_COLLECTION, id);
    await deleteDoc(docRef);
  }, [isAdmin]);

  return { cleaningDays, loading, addCleaningDay, updateCleaningDay, deleteCleaningDay };
}
