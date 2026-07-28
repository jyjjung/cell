
"use client";

import { useAuth } from '@/contexts/auth-context';
import { BIBLE_BOOKS_DATA, BOOK_NAME_LOOKUP_MAP } from '@/lib/bible-data';
import { syncCommunityProgress } from '@/lib/community-progress';
import {
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';
import { db } from '@/lib/firebase';
import { makePassageKey } from '@/lib/passage-keys';
import type { UserBibleChecklist } from '@/types';
import {
    arrayRemove, arrayUnion, doc,
    onSnapshot, serverTimestamp, setDoc, Timestamp
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBiblePlan } from './use-bible-plan';

const USER_BIBLE_CHECKLISTS_COLLECTION = 'userBibleChecklists';

function checklistCacheKey(uid: string) {
  return `bible_checklist_${uid}`;
}

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
  const { currentUser, loadingAuth } = useAuth();
  const uid = currentUser?.uid;
  const seeded = uid
    ? readLocalCollectionCacheStale<string[]>(checklistCacheKey(uid))
    : null;
  const [completedPassages, setCompletedPassages] = useState<string[]>(() => seeded ?? []); 
  const [loadingChecklist, setLoadingChecklist] = useState(() => !seeded);
  const [checklistDocExists, setChecklistDocExists] = useState(false);
  const { plan: currentGlobalPlan } = useBiblePlan(); 
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCommunityProgressSync = useCallback((passages: string[]) => {
    if (!uid) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void syncCommunityProgress(uid, passages).catch((e) => {
        console.error('[BibleChecklist] communityProgress sync failed:', e);
      });
    }, 800);
  }, [uid]);

  useEffect(() => {
    if (loadingAuth) return;

    if (!uid) {
      setCompletedPassages([]);
      setLoadingChecklist(false);
      setChecklistDocExists(false);
      return;
    }

    const cached = readLocalCollectionCacheStale<string[]>(checklistCacheKey(uid));
    if (cached) {
      setCompletedPassages(cached);
      setLoadingChecklist(false);
    } else {
      setLoadingChecklist(true);
    }

    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, uid);
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const attach = () => {
      unsubscribe?.();
      unsubscribe = onSnapshot(checklistDocRef, (docSnapshot) => {
        if (cancelled) return;
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserBibleChecklist;
          const passages = data.completedPassages || [];
          setCompletedPassages(passages);
          setChecklistDocExists(true);
          writeLocalCollectionCache(checklistCacheKey(uid), passages);
          scheduleCommunityProgressSync(passages);
        } else {
          setCompletedPassages([]);
          setChecklistDocExists(false);
          writeLocalCollectionCache(checklistCacheKey(uid), []);
        }
        setLoadingChecklist(false);
      }, (error) => {
        console.error("Error fetching user Bible checklist:", error);
        // Keep cached passages on transient permission races; retry shortly.
        setLoadingChecklist(false);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          if (!cancelled) attach();
        }, 1500);
      });
    };

    attach();

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [uid, loadingAuth, scheduleCommunityProgressSync]);

  const updateChecklistDocument = useCallback((updatePayload: Record<string, unknown>) => {
    if (!uid) throw new Error("User not logged in.");
    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, uid);
    
    const dataToSet: Partial<UserBibleChecklist> & { updatedAt: Timestamp } = {
      ...updatePayload,
      updatedAt: serverTimestamp() as Timestamp,
    };

    if (!checklistDocExists && updatePayload.completedPassages) {
      setDoc(checklistDocRef, {
        userId: uid,
        ...dataToSet
      }).catch(e => console.error("Error initializing checklist:", e));
    } else {
      setDoc(checklistDocRef, dataToSet, { merge: true }).catch(e => console.error("Error updating checklist:", e));
    }
  }, [uid, checklistDocExists]);

  const togglePassageCompletion = useCallback(async (passageDisplayText: string, date?: string) => {
    if (!uid || !passageDisplayText) {
      throw new Error("User not logged in or invalid passage data.");
    }

    if (!date) throw new Error('A reading date is required.');
    const key = makePassageKey(date, passageDisplayText);
    const isCompleted = completedPassages.includes(key);
    const next = isCompleted
      ? completedPassages.filter((p) => p !== key)
      : [...completedPassages, key];
    setCompletedPassages(next);
    writeLocalCollectionCache(checklistCacheKey(uid), next);
    const updatePayload = {
      completedPassages: isCompleted ? arrayRemove(key) : arrayUnion(key)
    };
    updateChecklistDocument(updatePayload);

  }, [uid, completedPassages, updateChecklistDocument]);


  /**
   * Mark multiple passages as complete/incomplete.
   * Pass date-scoped keys produced by makePassageKey.
   */
  const markMultiplePassages = useCallback(async (passageKeys: string[], markAsComplete: boolean) => {
    if (!uid || passageKeys.length === 0) {
        throw new Error("User not logged in or no passages to update.");
    }

    const keySet = new Set(passageKeys);
    const next = markAsComplete
      ? Array.from(new Set([...completedPassages, ...passageKeys]))
      : completedPassages.filter((p) => !keySet.has(p));
    setCompletedPassages(next);
    writeLocalCollectionCache(checklistCacheKey(uid), next);

    const updatePayload = {
      completedPassages: markAsComplete ? arrayUnion(...passageKeys) : arrayRemove(...passageKeys)
    };
    updateChecklistDocument(updatePayload);
  }, [uid, completedPassages, updateChecklistDocument]);

  const markReadRange = useCallback(async (
    fromBook: string, fromChapter: number, fromVerse?: number,
    toBook?: string, toChapter?: number, toVerse?: number
  ) => {
    if (!uid) throw new Error("User not logged in.");
    if (!currentGlobalPlan?.dailyReadings) throw new Error("Bible plan not loaded.");
    
    let effectiveToBook = toBook || fromBook;
    let effectiveToChapter = toChapter === undefined ? fromChapter : toChapter;
    let effectiveToVerse = toVerse; 

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
                                        ? BIBLE_BOOKS_DATA[passage.book]?.chapters === passage.chapter ? 9999 : (BIBLE_BOOKS_DATA[passage.book]?.chapters || 0) * 100 + 99 
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
          const key = makePassageKey(dailyReading.date, passage.displayText);
          if (!completedPassages.includes(key)) {
            passagesToComplete.push(key);
          }
        }
      }
    }
    
    if (passagesToComplete.length === 0) {
        return { markedCount: 0 };
    }

    const next = Array.from(new Set([...completedPassages, ...passagesToComplete]));
    setCompletedPassages(next);
    writeLocalCollectionCache(checklistCacheKey(uid), next);
    updateChecklistDocument({ completedPassages: arrayUnion(...passagesToComplete) });
    return { markedCount: passagesToComplete.length };

  }, [uid, currentGlobalPlan?.dailyReadings, completedPassages, updateChecklistDocument]);


  return {
    completedPassages,
    togglePassageCompletion,
    markReadRange,
    markMultiplePassages,
    loadingChecklist
  };
}
