
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
const LORDS_PRAYER_TEXT = "Our Father in heaven,\nhallowed be your name.\nYour kingdom come,\nyour will be done,\non earth as it is in heaven.\nGive us this day our daily bread,\nand forgive us our debts,\nas we also have forgiven our debtors.\nAnd lead us not into temptation,\nbut deliver us from evil.\nFor yours is the kingdom,\nand the power, and the glory,\nforever. Amen.";
const LORDS_PRAYER_REFERENCE_TITLE = "The Lord's Prayer";

export function useMemoryVerses() {
  const { isAdmin } = useAuth();
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
          textOverride: data.textOverride,
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

  const addMemoryVerse = useCallback(async (reference: string): Promise<string> => {
    if (!isAdmin) throw new Error("User is not authorized to add memory verses.");
    try {
      const q = query(collection(db, MEMORY_VERSES_COLLECTION), where("reference", "==", reference));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
         throw new Error(`Verse "${reference}" already exists.`);
      }

      const docRef = await addDoc(collection(db, MEMORY_VERSES_COLLECTION), {
        reference,
        addedAt: serverTimestamp(),
        isLordsPrayerChunk: false, // Standard verses are not LP chunks
        textOverride: null, // Standard verses use API
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding memory verse:", error);
      throw error;
    }
  }, [isAdmin]);

  const addLordsPrayer = useCallback(async () => {
    if (!isAdmin) throw new Error("User is not authorized to add memory verses.");
    
    const q = query(collection(db, MEMORY_VERSES_COLLECTION), where("reference", "==", LORDS_PRAYER_REFERENCE_TITLE));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`"${LORDS_PRAYER_REFERENCE_TITLE}" already exists.`);
    }

    try {
      await addDoc(collection(db, MEMORY_VERSES_COLLECTION), {
        reference: LORDS_PRAYER_REFERENCE_TITLE,
        textOverride: LORDS_PRAYER_TEXT,
        addedAt: serverTimestamp(),
        isLordsPrayerChunk: true, 
      });
      return { addedCount: 1 }; // Signifies one entry added
    } catch (error) {
      console.error("Error adding The Lord's Prayer:", error);
      throw error;
    }
  }, [isAdmin]);

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
