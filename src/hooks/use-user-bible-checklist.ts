
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { UserBibleChecklist } from '@/types';
import { db } from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const USER_BIBLE_CHECKLISTS_COLLECTION = 'userBibleChecklists';

export function useUserBibleChecklist() {
  const { currentUser } = useAuth();
  const [completedPassages, setCompletedPassages] = useState<string[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [checklistDocExists, setChecklistDocExists] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setCompletedPassages([]);
      setLoadingChecklist(false);
      setChecklistDocExists(false);
      return;
    }

    setLoadingChecklist(true);
    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);

    const unsubscribe = onSnapshot(checklistDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as UserBibleChecklist;
        setCompletedPassages(data.completedPassages || []);
        setChecklistDocExists(true);
      } else {
        setCompletedPassages([]);
        setChecklistDocExists(false);
      }
      setLoadingChecklist(false);
    }, (error) => {
      console.error("Error fetching user Bible checklist:", error);
      setCompletedPassages([]);
      setLoadingChecklist(false);
      setChecklistDocExists(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const togglePassageCompletion = useCallback(async (passage: string) => {
    if (!currentUser) {
      console.error("User not logged in. Cannot update checklist.");
      throw new Error("User not logged in.");
    }

    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);
    const isCompleted = completedPassages.includes(passage);

    try {
      const updateData: Partial<UserBibleChecklist> & { updatedAt: Timestamp } = {
        updatedAt: serverTimestamp() as Timestamp,
      };

      if (isCompleted) {
        updateData.completedPassages = arrayRemove(passage) as any; // Firestore specific type
      } else {
        updateData.completedPassages = arrayUnion(passage) as any; // Firestore specific type
      }
      
      // If the document doesn't exist, setDoc will create it.
      // We merge to avoid overwriting other fields if they were to be added later.
      // If it's the first passage being added, we also initialize userId.
      if (!checklistDocExists && !isCompleted) {
         await setDoc(checklistDocRef, { 
            userId: currentUser.uid,
            completedPassages: arrayUnion(passage),
            updatedAt: serverTimestamp() 
        }, { merge: true });
      } else {
        await setDoc(checklistDocRef, updateData, { merge: true });
      }

    } catch (error) {
      console.error("Error updating passage completion:", error);
      throw error;
    }
  }, [currentUser, completedPassages, checklistDocExists]);

  return { completedPassages, togglePassageCompletion, loadingChecklist };
}
