
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

interface ScripturePoint {
  bookFullName: string;
  chapter: number;
  verse?: number; // if undefined, implies whole chapter for comparison start/end
}

// Helper function to compare two scripture points
// Returns -1 if p1 < p2, 0 if p1 == p2, 1 if p1 > p2
function comparePoints(p1: ScripturePoint, p2: ScripturePoint): number {
  const bookMeta1 = BIBLE_BOOKS_DATA[p1.bookFullName];
  const bookMeta2 = BIBLE_BOOKS_DATA[p2.bookFullName];

  if (!bookMeta1 || !bookMeta2) {
    // This case should ideally not happen if inputs are validated
    console.error("Invalid book name in comparePoints", p1, p2);
    return 0; 
  }

  if (bookMeta1.order < bookMeta2.order) return -1;
  if (bookMeta1.order > bookMeta2.order) return 1;

  // Same book
  if (p1.chapter < p2.chapter) return -1;
  if (p1.chapter > p2.chapter) return 1;

  // Same chapter, compare verses
  // Treat undefined verse as covering the whole chapter for comparison logic
  // (e.g. start of chapter for start points, end of chapter for end points)
  const v1 = p1.verse === undefined ? 1 : p1.verse; // For a start point, undefined verse means start of chapter
  const v2 = p2.verse === undefined ? 1 : p2.verse; // For comparing against another start point
  
  // If p1 is an end point and verse is undefined, it effectively means end of chapter.
  // If p2 is an end point and verse is undefined, it effectively means end of chapter.
  // This basic comparison treats undefined as verse 1. More nuanced logic applied in markReadRange.

  if (v1 < v2) return -1;
  if (v1 > v2) return 1;
  
  return 0; // Points are effectively equal at this level of detail
}


export function useUserBibleChecklist() {
  const { currentUser } = useAuth();
  const { plan: currentGlobalPlan } = useBiblePlan(); 
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

  const markReadRange = useCallback(async (
    fromBook: string, fromChapter: number, fromVerse?: number,
    toBook?: string, toChapter?: number, toVerse?: number
  ) => {
    if (!currentUser) throw new Error("User not logged in.");
    if (!currentGlobalPlan?.dailyReadings) throw new Error("Bible plan not loaded.");
    if (!toBook || toChapter === undefined) { // Ensure 'To' point is valid if provided
        toBook = fromBook;
        toChapter = fromChapter;
        toVerse = fromVerse; // If toBook/toChapter not given, mark up to 'from' point only
    }


    const userStartPoint: ScripturePoint = { bookFullName: fromBook, chapter: fromChapter, verse: fromVerse };
    const userEndPoint: ScripturePoint = { bookFullName: toBook, chapter: toChapter, verse: toVerse };

    const passagesToComplete: string[] = [];

    for (const dailyReading of currentGlobalPlan.dailyReadings) {
      for (const passage of dailyReading.passages) {
        const passageStartPoint: ScripturePoint = { 
          bookFullName: passage.book, 
          chapter: passage.chapter, 
          verse: passage.startVerse || 1 
        };
        
        // Effective end verse for the passage (if passage is Gen 1, endVerse is end of Gen 1)
        // For comparison, treat undefined endVerse or 'end' as a very high number within that chapter.
        const passageEffectiveEndVerse = (passage.endVerse === 'end' || passage.endVerse === undefined) 
                                        ? 9999 // Represents end of chapter for comparison
                                        : passage.endVerse;
        const passageEndPoint: ScripturePoint = {
            bookFullName: passage.book,
            chapter: passage.chapter,
            verse: passageEffectiveEndVerse
        };

        // Check if passage starts at or after userStartPoint
        const startsAfterOrAtUserStart = comparePoints(passageStartPoint, userStartPoint) >= 0;
        
        // Check if passage ends at or before userEndPoint
        // For userEndPoint, if verse is undefined, it implies end of that chapter.
        const userEffectiveEndVerse = userEndPoint.verse === undefined ? 9999 : userEndPoint.verse;
        const tempUserEndPointForComparison: ScripturePoint = {...userEndPoint, verse: userEffectiveEndVerse};
        const endsBeforeOrAtUserEnd = comparePoints(passageEndPoint, tempUserEndPointForComparison) <= 0;

        if (startsAfterOrAtUserStart && endsBeforeOrAtUserEnd) {
          if (!completedPassages.includes(passage.displayText)) {
            passagesToComplete.push(passage.displayText);
          }
        }
      }
    }
    
    if (passagesToComplete.length === 0) {
        return { markedCount: 0 };
    }

    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);
    try {
      const currentDoc = await getDoc(checklistDocRef);
      if (currentDoc.exists()) {
        await setDoc(checklistDocRef, {
          completedPassages: arrayUnion(...passagesToComplete),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await setDoc(checklistDocRef, {
          userId: currentUser.uid,
          completedPassages: passagesToComplete,
          updatedAt: serverTimestamp(),
        });
      }
      return { markedCount: passagesToComplete.length };
    } catch (error) {
      console.error("Error marking passages read in range:", error);
      throw error;
    }

  }, [currentUser, currentGlobalPlan, completedPassages]);


  return { completedPassages, togglePassageCompletion, markReadRange, loadingChecklist };
}

