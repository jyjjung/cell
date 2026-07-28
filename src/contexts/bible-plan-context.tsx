"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BibleReadingPlan, DailyReading, StructuredPassage } from '@/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';

const BIBLE_PLAN_COLLECTION = 'config';
const BIBLE_PLAN_DOC_ID = 'biblePlan';
const BIBLE_PLAN_CACHE_KEY = 'bible_plan_v1';

type BiblePlanContextValue = {
  plan: BibleReadingPlan | null;
  loading: boolean;
  saveBiblePlan: (newPlanData: Omit<BibleReadingPlan, 'id' | 'updatedAt'>) => Promise<void>;
};

const BiblePlanContext = createContext<BiblePlanContextValue | null>(null);

function formatPlanFromSnapshot(docSnapshot: { id: string; data: () => Record<string, unknown> }): BibleReadingPlan {
  const data = docSnapshot.data();
  const dailyReadings: DailyReading[] = (Array.isArray(data.dailyReadings) ? data.dailyReadings : []).map((dr: DailyReading) => {
    const sanitizedPassages: StructuredPassage[] = (Array.isArray(dr.passages) ? dr.passages : []).map((p: unknown) => {
      if (typeof p === 'string') {
        const lastSpaceIndex = p.lastIndexOf(' ');
        if (lastSpaceIndex > -1) {
          const book = p.substring(0, lastSpaceIndex).trim();
          const chapterStr = p.substring(lastSpaceIndex + 1).trim();
          const chapter = parseInt(chapterStr, 10);
          if (book && !isNaN(chapter)) {
            return { book, chapter, displayText: p };
          }
        }
        return { book: 'Error', chapter: 0, displayText: `Error: Invalid passage string '${p}'` };
      }
      if (typeof p === 'object' && p !== null && (p as StructuredPassage).displayText) {
        const passage = p as StructuredPassage;
        if (passage.book && passage.chapter) return passage;
        const parsed = parsePassageReferenceForNavigation(passage.displayText);
        if (parsed) return { ...passage, book: parsed.book, chapter: parsed.chapter };
        return passage;
      }
      return { book: 'Error', chapter: 0, displayText: 'Error: Invalid passage format' };
    });

    return {
      ...dr,
      passages: sanitizedPassages,
      date: dr.date
        ? typeof dr.date === 'string'
          ? dr.date
          : (dr.date as Timestamp)?.toDate().toISOString().split('T')[0]
        : '',
    };
  }).filter((dr) => dr.date);

  return {
    id: docSnapshot.id,
    planType: (data.planType as BibleReadingPlan['planType']) || 'canonical',
    planDescription: (data.planDescription as string) || 'Unknown Plan',
    startDate: data.startDate
      ? typeof data.startDate === 'string'
        ? data.startDate
        : (data.startDate as Timestamp)?.toDate().toISOString().split('T')[0]
      : 'Unknown Start Date',
    generatedDate: data.generatedDate
      ? typeof data.generatedDate === 'string'
        ? data.generatedDate
        : (data.generatedDate as Timestamp)?.toDate().toISOString().split('T')[0]
      : 'Unknown Generation Date',
    dailyReadings,
    updatedAt: data.updatedAt as Timestamp,
    readingsPerDay: data.readingsPerDay as number | undefined,
    readingDays: data.readingDays as number[] | undefined,
  };
}

function readCachedPlan(): BibleReadingPlan | null {
  return readLocalCollectionCacheStale<BibleReadingPlan>(BIBLE_PLAN_CACHE_KEY);
}

export function BiblePlanProvider({ children }: { children: ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const [plan, setPlan] = useState<BibleReadingPlan | null>(() => readCachedPlan());
  const [loading, setLoading] = useState(() => !readCachedPlan());

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser?.uid) {
      setPlan(null);
      setLoading(false);
      return;
    }

    const cached = readCachedPlan();
    if (cached) {
      setPlan(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const planDocRef = doc(db, BIBLE_PLAN_COLLECTION, BIBLE_PLAN_DOC_ID);
    const unsubscribe = onSnapshot(
      planDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const next = formatPlanFromSnapshot(docSnapshot);
          setPlan(next);
          // Cache a lighter envelope — skip if huge write fails quietly.
          try {
            writeLocalCollectionCache(BIBLE_PLAN_CACHE_KEY, next);
          } catch {
            /* quota */
          }
        } else {
          setPlan(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('[BiblePlanProvider] Firestore onSnapshot error:', error);
        if (!cached) setPlan(null);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [loadingAuth, currentUser?.uid]);

  const saveBiblePlan = async (newPlanData: Omit<BibleReadingPlan, 'id' | 'updatedAt'>) => {
    const planDocRef = doc(db, BIBLE_PLAN_COLLECTION, BIBLE_PLAN_DOC_ID);
    await setDoc(planDocRef, {
      ...newPlanData,
      updatedAt: serverTimestamp(),
    });
  };

  const value = useMemo(
    () => ({ plan, loading, saveBiblePlan }),
    [plan, loading],
  );

  return <BiblePlanContext.Provider value={value}>{children}</BiblePlanContext.Provider>;
}

export function useBiblePlanContext() {
  return useContext(BiblePlanContext);
}
