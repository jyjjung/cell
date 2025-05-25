
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { UserBibleChecklist, BibleReadingPlan, StructuredPassage } from '@/types';
import { db } from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { BIBLE_BOOKS_DATA } from '@/lib/bible-data';
import { useBiblePlan } from './use-bible-plan'; // To get the current plan

const USER_BIBLE_CHECKLISTS_COLLECTION = 'userBibleChecklists';

export function useUserBibleChecklist() {
  const { currentUser } = useAuth();
  const { plan: currentGlobalPlan } = useBiblePlan(); // Fetch the global plan
  const [completedPassages, setCompletedPassages] = useState<string[]>([]); // Stores displayText
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

  const togglePassageCompletion = useCallback(async (passageDisplayText: string) => {
    if (!currentUser) {
      console.error("User not logged in. Cannot update checklist.");
      throw new Error("User not logged in.");
    }

    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);
    const isCompleted = completedPassages.includes(passageDisplayText);

    try {
      const updateData: Partial<UserBibleChecklist> & { updatedAt: Timestamp } = {
        updatedAt: serverTimestamp() as Timestamp,
      };

      if (isCompleted) {
        updateData.completedPassages = arrayRemove(passageDisplayText) as any;
      } else {
        updateData.completedPassages = arrayUnion(passageDisplayText) as any;
      }
      
      if (!checklistDocExists && !isCompleted) {
         await setDoc(checklistDocRef, { 
            userId: currentUser.uid,
            completedPassages: arrayUnion(passageDisplayText),
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

  const markReadUpTo = useCallback(async (targetBookFullName: string, targetChapter: number, targetVerse?: number) => {
    if (!currentUser) {
      console.error("User not logged in. Cannot update checklist.");
      throw new Error("User not logged in.");
    }
    if (!currentGlobalPlan || !currentGlobalPlan.dailyReadings) {
      console.error("Bible plan not loaded. Cannot mark read up to.");
      throw new Error("Bible plan not loaded.");
    }

    const targetBookMeta = BIBLE_BOOKS_DATA[targetBookFullName];
    if (!targetBookMeta) {
      console.error("Invalid target book name:", targetBookFullName);
      throw new Error("Invalid target book name.");
    }

    const passagesToComplete: string[] = [];

    for (const dailyReading of currentGlobalPlan.dailyReadings) {
      for (const passage of dailyReading.passages) {
        const passageBookMeta = BIBLE_BOOKS_DATA[passage.book];
        if (!passageBookMeta) continue; // Should not happen if plan is well-formed

        let shouldComplete = false;

        if (passageBookMeta.order < targetBookMeta.order) {
          shouldComplete = true;
        } else if (passageBookMeta.order === targetBookMeta.order) {
          // Same book, compare chapter
          if (passage.chapter < targetChapter) {
            shouldComplete = true;
          } else if (passage.chapter === targetChapter) {
            // Same chapter, compare verse
            if (targetVerse === undefined) { // Target is whole chapter
              shouldComplete = true;
            } else {
              // Target has a specific verse.
              // Passage is completed if its start verse is <= targetVerse.
              // (Covers full chapter passages, start-to-end, or specific verse ranges starting before/at target)
              const passageStartVerse = passage.startVerse || 1;
               shouldComplete = passageStartVerse <= targetVerse;
            }
          }
        }
        
        if (shouldComplete) {
          if (!completedPassages.includes(passage.displayText)) {
            passagesToComplete.push(passage.displayText);
          }
        }
      }
    }
    
    if (passagesToComplete.length === 0) {
        console.log("No new passages to mark as completed up to the specified point.");
        return { markedCount: 0 };
    }

    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);
    try {
      // Batch update for arrayUnion can be tricky. It's often safer to read, merge, then write.
      // However, for arrayUnion, Firestore handles atomicity if we union multiple items.
      // Let's try direct arrayUnion. If it becomes too large (over 500 elements in total for the argument),
      // we might need to batch writes or a different strategy.
      // For now, assume passagesToComplete will be a reasonable size.
      
      const currentDoc = await getDoc(checklistDocRef);
      if (currentDoc.exists()) {
        await setDoc(checklistDocRef, {
          completedPassages: arrayUnion(...passagesToComplete),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await setDoc(checklistDocRef, {
          userId: currentUser.uid,
          completedPassages: passagesToComplete, // Firestore arrayUnion needs existing array to union with. For new doc, just set.
          updatedAt: serverTimestamp(),
        });
      }
      return { markedCount: passagesToComplete.length };
    } catch (error) {
      console.error("Error marking passages read up to:", error);
      throw error;
    }

  }, [currentUser, currentGlobalPlan, completedPassages]);


  return { completedPassages, togglePassageCompletion, markReadUpTo, loadingChecklist };
}
