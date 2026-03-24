
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { CustomRosterEntry, RosterAssignment } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  updateDoc
} from 'firebase/firestore';

const ROSTER_DEFINITIONS_COLLECTION = 'rosterDefinitions';
const ENTRIES_SUBCOLLECTION = 'entries';

type NewEntryData = {
  date: string;
  time?: string;
  assignments: RosterAssignment[];
};

export function useCustomRoster(rosterDefId: string | null) {
  const [roster, setRoster] = useState<CustomRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rosterDefId) {
      setRoster([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, ROSTER_DEFINITIONS_COLLECTION, rosterDefId, ENTRIES_SUBCOLLECTION));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rosterData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomRosterEntry));
      setRoster(rosterData);
      setLoading(false);
    }, (error) => {
      console.error("[useCustomRoster] Error fetching roster entries:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [rosterDefId]);

  const addEntry = useCallback(async (entryData: NewEntryData, rosterName: string) => {
    if (!rosterDefId) throw new Error("No roster definition selected.");
    const collectionRef = collection(db, ROSTER_DEFINITIONS_COLLECTION, rosterDefId, ENTRIES_SUBCOLLECTION);
    await addDoc(collectionRef, { ...entryData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }, [rosterDefId]);
  
  const updateEntry = useCallback(async (entryId: string, entryData: NewEntryData, rosterName: string) => {
    if (!rosterDefId) throw new Error("No roster definition selected.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, rosterDefId, ENTRIES_SUBCOLLECTION, entryId);
    await updateDoc(docRef, { ...entryData, updatedAt: serverTimestamp() });
  }, [rosterDefId]);

  const deleteEntry = useCallback(async (entryId: string) => {
    if (!rosterDefId) throw new Error("No roster definition selected.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, rosterDefId, ENTRIES_SUBCOLLECTION, entryId);
    await deleteDoc(docRef);
  }, [rosterDefId]);

  return { roster, loading, addEntry, updateEntry, deleteEntry };
}
