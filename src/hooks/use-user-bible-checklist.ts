
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
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { syncCommunityProgress } from '@/lib/community-progress';
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER, BOOK_NAME_LOOKUP_MAP } from '@/lib/bible-data';
import { useBiblePlan } from './use-bible-plan'; 
import { useNotifications } from './use-notifications';
import { startOfDay, parseISO, isBefore, isSameDay, isValid } from 'date-fns';

/**
 * Creates a date-scoped unique key for a passage to prevent cross-day collisions
 * in plans like M'Cheyne that repeat the same chapters on multiple days.
 * Format: "yyyy-MM-dd::Book Chapter"  e.g. "2025-01-01::Matthew 1"
 */
export function makePassageKey(date: string, displayText: string): string {
  return `${date}::${displayText}`;
}

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
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCommunityProgressSync = useCallback((passages: string[]) => {
    if (!currentUser?.uid) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void syncCommunityProgress(currentUser.uid, passages).catch((e) => {
        console.error('[BibleChecklist] communityProgress sync failed:', e);
      });
    }, 800);
  }, [currentUser?.uid]);

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
        const passages = data.completedPassages || [];
        setCompletedPassages(passages);
        setChecklistDocExists(true);
        scheduleCommunityProgressSync(passages);
      } else {
        setCompletedPassages([]);
        setChecklistDocExists(false);
        // Do not sync empty progress — that would wipe communityProgress for users
        // who only had leaderboard data or haven't created a checklist yet.
      }
      setLoadingChecklist(false);
    }, (error) => {
      console.error("Error fetching user Bible checklist:", error);
      setCompletedPassages([]);
      setLoadingChecklist(false);
      setChecklistDocExists(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, scheduleCommunityProgressSync]);

  // ── Safe migration: bare keys → date-scoped keys ──────────────────────────
  // Legacy completedPassages stored bare displayText (e.g. "Matthew 1").
  // M'Cheyne repeats the same chapters twice a year, so a bare key causes the
  // second occurrence to appear pre-checked. Migrate matching keys atomically,
  // preserve unmatched keys, and retain a backup of the pre-migration list.
  const migrationRunRef = useRef(false);

  useEffect(() => {
    if (migrationRunRef.current) return;
    if (!currentUser?.uid || !currentGlobalPlan?.dailyReadings || loadingChecklist) return;

    // No bare keys → already migrated or fresh account
    const bareKeys = completedPassages.filter(key => !key.includes('::'));
    if (bareKeys.length === 0) {
      migrationRunRef.current = true;
      return;
    }

    // Mark as run immediately to prevent re-entry on snapshot updates
    migrationRunRef.current = true;

    // Build first-occurrence map: displayText → earliest date in the plan.
    const firstOccurrenceMap = new Map<string, string>();
    for (const day of currentGlobalPlan.dailyReadings) {
      for (const passage of day.passages) {
        if (passage.displayText && !firstOccurrenceMap.has(passage.displayText)) {
          firstOccurrenceMap.set(passage.displayText, day.date);
        }
      }
    }

    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);

    runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(checklistDocRef);
      if (!snapshot.exists()) return;

      const data = snapshot.data() as UserBibleChecklist & {
        legacyCompletedPassagesBackupV2?: string[];
      };
      const currentPassages = data.completedPassages || [];
      const existingKeys = new Set(currentPassages);
      let convertedCount = 0;
      let unmatchedCount = 0;

      const migratedPassages = currentPassages.map((key) => {
        if (key.includes('::')) return key;

        const date = firstOccurrenceMap.get(key);
        if (!date) {
          unmatchedCount += 1;
          return key;
        }

        const scopedKey = makePassageKey(date, key);
        // Never collapse two stored completions into one. Keeping the legacy
        // key is safer than silently reducing a user's reading count.
        if (existingKeys.has(scopedKey)) {
          unmatchedCount += 1;
          return key;
        }

        existingKeys.add(scopedKey);
        convertedCount += 1;
        return scopedKey;
      });

      // Safety invariant: a migration must never reduce recorded progress.
      if (migratedPassages.length < currentPassages.length) {
        throw new Error('Migration aborted because it would reduce reading progress.');
      }

      transaction.set(checklistDocRef, {
        completedPassages: migratedPassages,
        ...(!data.legacyCompletedPassagesBackupV2
          ? { legacyCompletedPassagesBackupV2: currentPassages }
          : {}),
        legacyMigrationVersion: 2,
        legacyMigratedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log(
        `[BibleChecklist] Safe migration complete — ${convertedCount} converted, ${unmatchedCount} preserved.`,
      );
    })
      .catch(e => {
        console.error('[BibleChecklist] Migration failed:', e);
        migrationRunRef.current = false; // allow retry on next render
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, currentGlobalPlan?.dailyReadings, loadingChecklist]);
  // NOTE: completedPassages intentionally excluded — we only want to run once
  // after initial load, not on every Firestore update.

  const updateChecklistDocument = useCallback((updatePayload: Record<string, unknown>) => {
    if (!currentUser?.uid) throw new Error("User not logged in.");
    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);
    
    const dataToSet: Partial<UserBibleChecklist> & { updatedAt: Timestamp } = {
      ...updatePayload,
      updatedAt: serverTimestamp() as Timestamp,
    };

    if (!checklistDocExists && updatePayload.completedPassages) {
      setDoc(checklistDocRef, {
        userId: currentUser.uid,
        ...dataToSet
      }).catch(e => console.error("Error initializing checklist:", e));
    } else {
      setDoc(checklistDocRef, dataToSet, { merge: true }).catch(e => console.error("Error updating checklist:", e));
    }
  }, [currentUser?.uid, checklistDocExists]);

  const togglePassageCompletion = useCallback(async (passageDisplayText: string, date?: string) => {
    if (!currentUser?.uid || !passageDisplayText) {
      throw new Error("User not logged in or invalid passage data.");
    }

    // Use date-scoped key when date is provided; fall back to bare displayText for legacy callers.
    const key = date ? makePassageKey(date, passageDisplayText) : passageDisplayText;
    // Also check legacy bare key for backward compatibility with existing Firestore data.
    const isCompleted = completedPassages.includes(key) || (!date && completedPassages.includes(passageDisplayText));
    const updatePayload = {
      completedPassages: isCompleted ? arrayRemove(key) : arrayUnion(key)
    };
    updateChecklistDocument(updatePayload);

  }, [currentUser?.uid, completedPassages, updateChecklistDocument]);


  /**
   * Mark multiple passages as complete/incomplete.
   * Pass pre-scoped keys (from makePassageKey) or bare displayTexts.
   */
  const markMultiplePassages = useCallback(async (passageKeys: string[], markAsComplete: boolean) => {
    if (!currentUser?.uid || passageKeys.length === 0) {
        throw new Error("User not logged in or no passages to update.");
    }

    const updatePayload = {
      completedPassages: markAsComplete ? arrayUnion(...passageKeys) : arrayRemove(...passageKeys)
    };
    updateChecklistDocument(updatePayload);
  }, [currentUser?.uid, updateChecklistDocument]);

  /**
   * Mark one scoped passage complete while removing an old bare key that would
   * otherwise match every repeated occurrence in the plan.
   */
  const markPassageCompleteWithLegacyCleanup = useCallback(async (
    passageKey: string,
    legacyKeyToRemove?: string,
  ) => {
    if (!currentUser?.uid || !passageKey) {
      throw new Error("User not logged in or no passage to update.");
    }

    const checklistDocRef = doc(db, USER_BIBLE_CHECKLISTS_COLLECTION, currentUser.uid);

    if (legacyKeyToRemove && completedPassages.includes(legacyKeyToRemove)) {
      await setDoc(checklistDocRef, {
        completedPassages: arrayRemove(legacyKeyToRemove),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    await setDoc(checklistDocRef, {
      ...(checklistDocExists ? {} : { userId: currentUser.uid }),
      completedPassages: arrayUnion(passageKey),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [currentUser?.uid, completedPassages, checklistDocExists]);


  const markReadRange = useCallback(async (
    fromBook: string, fromChapter: number, fromVerse?: number,
    toBook?: string, toChapter?: number, toVerse?: number
  ) => {
    if (!currentUser?.uid) throw new Error("User not logged in.");
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
          const legacyKey = passage.displayText;
          if (!completedPassages.includes(key) && !completedPassages.includes(legacyKey)) {
            passagesToComplete.push(key);
          }
        }
      }
    }
    
    if (passagesToComplete.length === 0) {
        return { markedCount: 0 };
    }

    updateChecklistDocument({ completedPassages: arrayUnion(...passagesToComplete) });
    return { markedCount: passagesToComplete.length };

  }, [currentUser?.uid, currentGlobalPlan?.dailyReadings, completedPassages, updateChecklistDocument]);


  return {
    completedPassages,
    togglePassageCompletion,
    markReadRange,
    markMultiplePassages,
    markPassageCompleteWithLegacyCleanup,
    loadingChecklist
  };
}
