
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { MemoryVerse } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  where,
  getDocs
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const MEMORY_VERSES_COLLECTION = 'memoryVerses';
const LORDS_PRAYER_REFS = [
  "Matthew 6:9",
  "Matthew 6:10",
  "Matthew 6:11",
  "Matthew 6:12",
  "Matthew 6:13"
];

export function useMemoryVerses() {
  const { isAdmin } = useAuth(); // Ensure only admin can modify
  const [memoryVerses, setMemoryVerses] = useState<MemoryVerse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, MEMORY_VERSES_COLLECTION), orderBy("addedAt", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const versesData: MemoryVerse[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        versesData.push({
          id: doc.id,
          reference: data.reference,
          addedAt: data.addedAt as Timestamp,
          order: data.order,
          isLordsPrayerChunk: data.isLordsPrayerChunk || false,
        } as MemoryVerse);
      });
      setMemoryVerses(versesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching memory verses:", error);
      setMemoryVerses([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addMemoryVerse = useCallback(async (reference: string, isLordsPrayerChunk = false): Promise<string> => {
    if (!isAdmin) throw new Error("User is not authorized to add memory verses.");
    try {
      // Check if verse already exists to prevent duplicates
      const q = query(collection(db, MEMORY_VERSES_COLLECTION), where("reference", "==", reference));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty && !isLordsPrayerChunk) { // Allow Lord's Prayer to be re-added if deleted, simpler logic
         throw new Error(`Verse "${reference}" already exists.`);
      }

      const docRef = await addDoc(collection(db, MEMORY_VERSES_COLLECTION), {
        reference,
        addedAt: serverTimestamp(),
        isLordsPrayerChunk,
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding memory verse:", error);
      throw error;
    }
  }, [isAdmin]);

  const addLordsPrayer = useCallback(async () => {
    if (!isAdmin) throw new Error("User is not authorized to add memory verses.");
    const batch = writeBatch(db);
    const existingRefs = new Set(memoryVerses.map(v => v.reference));
    let addedCount = 0;

    LORDS_PRAYER_REFS.forEach(ref => {
      if (!existingRefs.has(ref)) {
        const docRef = doc(collection(db, MEMORY_VERSES_COLLECTION));
        batch.set(docRef, {
          reference: ref,
          addedAt: serverTimestamp(),
          isLordsPrayerChunk: true,
        });
        addedCount++;
      }
    });

    if (addedCount === 0) {
        throw new Error("The Lord's Prayer verses already exist or no new verses to add.");
    }

    try {
      await batch.commit();
      return { addedCount };
    } catch (error) {
      console.error("Error adding The Lord's Prayer:", error);
      throw error;
    }
  }, [isAdmin, memoryVerses]);

  const deleteMemoryVerse = useCallback(async (verseId: string) => {
    if (!isAdmin) throw new Error("User is not authorized to delete memory verses.");
    const verseDocRef = doc(db, MEMORY_VERSES_COLLECTION, verseId);
    try {
      await deleteDoc(verseDocRef);
    } catch (error) {
      console.error("Error deleting memory verse:", error);
      throw error;
    }
  }, [isAdmin]);

  return { memoryVerses, addMemoryVerse, addLordsPrayer, deleteMemoryVerse, loading };
}
