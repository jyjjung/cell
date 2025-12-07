
"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const HOLIDAY_CHECKLISTS_COLLECTION = 'holidayChecklists';

interface HolidayChecklist {
  userId: string;
  completedChapters: string[];
  updatedAt?: Timestamp;
}

export function useHolidayChecklist() {
  const { currentUser } = useAuth();
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [loadingChecklist, setLoadingChecklist] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setCompletedChapters(new Set());
      setLoadingChecklist(false);
      return;
    }

    setLoadingChecklist(true);
    const checklistDocRef = doc(db, HOLIDAY_CHECKLISTS_COLLECTION, currentUser.uid);

    const unsubscribe = onSnapshot(checklistDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as HolidayChecklist;
        setCompletedChapters(new Set(data.completedChapters || []));
      } else {
        setCompletedChapters(new Set());
      }
      setLoadingChecklist(false);
    }, (error) => {
      console.error("Error fetching holiday checklist:", error);
      setCompletedChapters(new Set());
      setLoadingChecklist(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const toggleChapterCompletion = useCallback(async (chapterId: string) => {
    if (!currentUser?.uid || !chapterId) {
      console.error("User not logged in or chapterId is invalid.");
      throw new Error("User not logged in or invalid chapter data.");
    }
    
    const checklistDocRef = doc(db, HOLIDAY_CHECKLISTS_COLLECTION, currentUser.uid);
    const isCompleted = completedChapters.has(chapterId);

    const updatePayload = {
      completedChapters: isCompleted ? arrayRemove(chapterId) : arrayUnion(chapterId),
      updatedAt: serverTimestamp()
    };
    
    // Use setDoc with merge to create the document if it doesn't exist
    await setDoc(checklistDocRef, updatePayload, { merge: true });

  }, [currentUser, completedChapters]);

  return { completedChapters, toggleChapterCompletion, loadingChecklist };
}
