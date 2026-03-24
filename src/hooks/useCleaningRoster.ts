
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

const CLEANING_ROSTERS_COLLECTION = 'cleaningRosters';

export function useCleaningRoster() {
  const { currentUser } = useAuth();
  const [roster, setRoster] = useState<CleaningRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setRoster([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, CLEANING_ROSTERS_COLLECTION));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rosterData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CleaningRosterEntry));
      setRoster(rosterData);
      setLoading(false);
    }, (error) => {
      console.error("[useCleaningRoster] Error fetching roster:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const upsertEntry = useCallback(async (entryData: Omit<CleaningRosterEntry, 'id' | 'updatedAt' | 'isCompleted' | 'completedAt' | 'completedBy'>) => {
    const docRef = doc(db, CLEANING_ROSTERS_COLLECTION, entryData.date);

    await setDoc(docRef, {
      ...entryData,
      isCompleted: false, // Ensure it's not completed on upsert
      completedAt: null,
      completedBy: null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, []);
  
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
