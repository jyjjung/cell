"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BibleReadingPlan, DailyReading, StructuredPassage } from '@/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import {
  COLLECTION_CACHE_TTL_MS,
  readLocalCollectionCache,
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

function sanitizePassage(p: unknown): StructuredPassage {
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
}

function toIsoDate(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString().split('T')[0];
  }
  return '';
}

function formatPlanFromSnapshot(docSnapshot: { id: string; data: () => Record<string, unknown> }): BibleReadingPlan {
  const data = docSnapshot.data();
  const rawReadings = Array.isArray(data.dailyReadings) ? data.dailyReadings : [];
  const dailyReadings: DailyReading[] = [];

  for (const dr of rawReadings as DailyReading[]) {
    const date = toIsoDate(dr.date);
    if (!date) continue;
    const passages = Array.isArray(dr.passages) ? dr.passages.map(sanitizePassage) : [];
    dailyReadings.push({ ...dr, date, passages });
  }

  return {
    id: docSnapshot.id,
    planType: (data.planType as BibleReadingPlan['planType']) || 'canonical',
    planDescription: (data.planDescription as string) || 'Unknown Plan',
    startDate: toIsoDate(data.startDate) || 'Unknown Start Date',
    generatedDate: toIsoDate(data.generatedDate) || 'Unknown Generation Date',
    dailyReadings,
    updatedAt: data.updatedAt as Timestamp,
    readingsPerDay: data.readingsPerDay as number | undefined,
    readingDays: data.readingDays as number[] | undefined,
  };
}

function readCachedPlan(): BibleReadingPlan | null {
  const fresh = readLocalCollectionCache<BibleReadingPlan>(BIBLE_PLAN_CACHE_KEY, COLLECTION_CACHE_TTL_MS);
  if (fresh?.dailyReadings?.length) return fresh;
  const stale = readLocalCollectionCacheStale<BibleReadingPlan>(BIBLE_PLAN_CACHE_KEY);
  if (stale?.dailyReadings?.length) return stale;
  return null;
}

export function BiblePlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<BibleReadingPlan | null>(() => readCachedPlan());
  const [loading, setLoading] = useState(() => !readCachedPlan());

  useEffect(() => {
    const planDocRef = doc(db, BIBLE_PLAN_COLLECTION, BIBLE_PLAN_DOC_ID);
    const unsubscribe = onSnapshot(
      planDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const next = formatPlanFromSnapshot(docSnapshot);
          setPlan(next);
          writeLocalCollectionCache(BIBLE_PLAN_CACHE_KEY, next);
        } else {
          setPlan(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('[BiblePlanProvider] Firestore onSnapshot error:', error);
        // Keep any cached plan visible on transient errors.
        if (!readCachedPlan()) setPlan(null);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

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
