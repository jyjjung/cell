
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { RosterDefinition, RosterVisibility } from '@/types';
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
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const ROSTER_DEFINITIONS_COLLECTION = 'rosterDefinitions';

export function useRosterDefinitions() {
  const { isAdmin } = useAuth();
  const [definitions, setDefinitions] = useState<RosterDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, ROSTER_DEFINITIONS_COLLECTION), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const defsData: RosterDefinition[] = [];
      querySnapshot.forEach((doc) => {
        defsData.push({ ...doc.data(), id: doc.id } as RosterDefinition);
      });
      setDefinitions(defsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching roster definitions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addDefinition = useCallback(async (name: string): Promise<string> => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const docRef = await addDoc(collection(db, ROSTER_DEFINITIONS_COLLECTION), {
      name,
      createdAt: serverTimestamp(),
      visibility: {
        type: 'public',
      },
    });
    return docRef.id;
  }, [isAdmin]);

  const updateDefinition = useCallback(async (id: string, name: string) => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, id);
    await updateDoc(docRef, { name });
  }, [isAdmin]);
  
  const updateDefinitionVisibility = useCallback(async (id: string, visibility: RosterVisibility) => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const docRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, id);
    await updateDoc(docRef, { visibility });
  }, [isAdmin]);

  const deleteDefinition = useCallback(async (id: string) => {
    if (!isAdmin) throw new Error("User is not authorized.");
    const batch = writeBatch(db);
    const definitionDocRef = doc(db, ROSTER_DEFINITIONS_COLLECTION, id);
    batch.delete(definitionDocRef);

    const entriesCollectionRef = collection(db, ROSTER_DEFINITIONS_COLLECTION, id, 'entries');
    const entriesSnapshot = await getDocs(entriesCollectionRef);
    entriesSnapshot.forEach((entryDoc) => {
        batch.delete(entryDoc.ref);
    });

    await batch.commit();
  }, [isAdmin]);

  return { definitions, loading, addDefinition, updateDefinition, deleteDefinition, updateDefinitionVisibility };
}
