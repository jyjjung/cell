
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER, BOOK_NAME_LOOKUP_MAP } from '@/lib/bible-data';
import { useBiblePlan } from './use-bible-plan'; 
import { useNotifications } from './use-notifications';
import { startOfDay, parseISO, isBefore, isSameDay, isValid } from 'date-fns';

const USER_BIBLE_CHECKLISTS_COLLECTION = 'userBibleChecklists';

interface ScripturePoint {
  bookFullName: string;
  chapter: number;
  verse?: number; 
}

function comparePoints(p1: ScripturePoint, p2: ScripturePoint): number {
  const bookMeta1 = BIBLE_BOOKS_DATA[p1.bookFullName];
  const bookMeta2 = BIBLE_BOOKS_DATA[p2.bookFullName];

  if (!bookMeta1 || !bookMeta2) {
    console.error("Invalid book name in comparePoints", p1, p2);
    return 0; 
  }

  if (bookMeta1.order < bookMeta2.order) return -1;
  if (bookMeta1.order > bookMeta2.order) return 1;

  if (p1.chapter < p2.chapter) return -1;
  if (p1.chapter > p2.chapter) return 1;
  
  const v1 = p1.verse === undefined ? 1 : p1.verse; 
  const v2 = p2.verse === undefined ? 1 : p2.verse; 

  if (v1 < v2) return -1;
  if (v1 > v2) return 1;
  
  return 0;
}


export function useUserBibleChecklist() {
  const { currentUser } = useAuth();
  const [completedPassages, setCompletedPassages] = useState<string[]>([]); 
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [checklistDocExists, setChecklistDocExists] = useState(false);
  const { plan: currentGlobalPlan } = useBiblePlan(); 

  useEffect(() => {
    if (!currentUser?.uid) {
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

  const updateChecklistDocument = async (updatePayload: any) => {
    if (!currentUser?.uid) throw new Error("User not logged in.");
    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);
    
    const dataToSet: Partial<UserBibleChecklist> & { updatedAt: Timestamp } = {
      ...updatePayload,
      updatedAt: serverTimestamp() as Timestamp,
    };

    if (!checklistDocExists && updatePayload.completedPassages) { // Specifically for initial creation with items
      await setDoc(checklistDocRef, {
        userId: currentUser.uid,
        ...dataToSet
      });
    } else {
      await setDoc(checklistDocRef, dataToSet, { merge: true });
    }
  };

  const togglePassageCompletion = useCallback(async (passageDisplayText: string) => {
    if (!currentUser?.uid || !passageDisplayText) {
      console.error("User not logged in or passageDisplayText is invalid. Cannot update checklist.", {currentUser, passageDisplayText});
      throw new Error("User not logged in or invalid passage data.");
    }
    
    const isCompleted = completedPassages.includes(passageDisplayText);
    const updatePayload = {
      completedPassages: isCompleted ? arrayRemove(passageDisplayText) : arrayUnion(passageDisplayText)
    };
    await updateChecklistDocument(updatePayload);

  }, [currentUser, completedPassages, checklistDocExists]);


  const markMultiplePassages = useCallback(async (passageDisplayTexts: string[], markAsComplete: boolean) => {
    if (!currentUser?.uid || passageDisplayTexts.length === 0) {
        console.error("User not logged in or no passages to update.", {currentUser, passageDisplayTexts});
        throw new Error("User not logged in or no passages to update.");
    }

    // Firestore batch writes are limited to 500 operations.
    // We use arrayUnion/arrayRemove which are single operations on the document, but
    // the number of elements in the array passed to arrayUnion/Remove also has limits.
    // For simplicity and robustness with potentially large arrays, we fetch, modify locally, then set.
    
    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);
    try {
        const docSnap = await getDoc(checklistDocRef);
        let currentCompleted = docSnap.exists() ? (docSnap.data().completedPassages || []) : [];
        let newCompletedSet = new Set(currentCompleted);

        if (markAsComplete) {
            passageDisplayTexts.forEach(text => newCompletedSet.add(text));
        } else {
            passageDisplayTexts.forEach(text => newCompletedSet.delete(text));
        }
        
        await updateChecklistDocument({ completedPassages: Array.from(newCompletedSet) });

    } catch (error) {
        console.error("Error in markMultiplePassages:", error);
        throw error;
    }
  }, [currentUser, checklistDocExists]);


  const markReadRange = useCallback(async (
    fromBook: string, fromChapter: number, fromVerse?: number,
    toBook?: string, toChapter?: number, toVerse?: number
  ) => {
    if (!currentUser?.uid) throw new Error("User not logged in.");
    if (!currentGlobalPlan?.dailyReadings) throw new Error("Bible plan not loaded.");
    
    let effectiveToBook = toBook || fromBook;
    let effectiveToChapter = toChapter === undefined ? fromChapter : toChapter;
    let effectiveToVerse = toVerse; // Can be undefined

    const fromBookResolved = BOOK_NAME_LOOKUP_MAP.get(fromBook.toLowerCase().trim());
    const toBookResolved = BOOK_NAME_LOOKUP_MAP.get(effectiveToBook.toLowerCase().trim());

    if (!fromBookResolved) throw new Error(`Could not recognize the starting book: "${fromBook}"`);
    if (!toBookResolved) throw new Error(`Could not recognize the ending book: "${effectiveToBook}"`);

    const userStartPoint: ScripturePoint = { bookFullName: fromBookResolved, chapter: fromChapter, verse: fromVerse };
    const userEndPoint: ScripturePoint = { bookFullName: toBookResolved, chapter: effectiveToChapter, verse: effectiveToVerse };

    const passagesToComplete: string[] = [];

    for (const dailyReading of currentGlobalPlan.dailyReadings) {
      for (const passage of dailyReading.passages) {
        if (!passage.book || passage.chapter <= 0 || !passage.displayText) continue;

        const passageStartPoint: ScripturePoint = { 
          bookFullName: passage.book, 
          chapter: passage.chapter, 
          verse: passage.startVerse || 1 
        };
        
        const passageEffectiveEndVerse = (passage.endVerse === 'end' || passage.endVerse === undefined) 
                                        ? BIBLE_BOOKS_DATA[passage.book]?.chapters === passage.chapter ? 9999 : (BIBLE_BOOKS_DATA[passage.book]?.chapters || 0) * 100 + 99 // Arbitrary large number for end of chapter within book context
                                        : passage.endVerse;
        const passageEndPoint: ScripturePoint = {
            bookFullName: passage.book,
            chapter: passage.chapter,
            verse: passageEffectiveEndVerse
        };

        const startsAfterOrAtUserStart = comparePoints(passageStartPoint, userStartPoint) >= 0;
        
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

    await updateChecklistDocument({ completedPassages: arrayUnion(...passagesToComplete) });
    return { markedCount: passagesToComplete.length };

  }, [currentUser?.uid, currentGlobalPlan?.dailyReadings, completedPassages]);


  return { completedPassages, togglePassageCompletion, markReadRange, markMultiplePassages, loadingChecklist };
}
    

    
