"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BibleReadingPlan, DailyReading, StructuredPassage } from '@/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
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

function serializePlanForCache(plan: BibleReadingPlan): Record<string, unknown> {
  return {
    ...plan,
    updatedAt: plan.updatedAt?.toMillis?.() ?? null,
  };
}

function planFromCache(raw: Record<string, unknown> | null): BibleReadingPlan | null {
  if (!raw || !Array.isArray(raw.dailyReadings)) return null;
  return {
    ...(raw as unknown as BibleReadingPlan),
    updatedAt: undefined as unknown as Timestamp,
  };
}

export function BiblePlanProvider({ children }: { children: ReactNode }) {
  const seeded = planFromCache(
    readLocalCollectionCacheStale<Record<string, unknown>>(BIBLE_PLAN_CACHE_KEY),
  );
  const [plan, setPlan] = useState<BibleReadingPlan | null>(seeded);
  const [loading, setLoading] = useState(!seeded);

  useEffect(() => {
    const planDocRef = doc(db, BIBLE_PLAN_COLLECTION, BIBLE_PLAN_DOC_ID);
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const attach = () => {
      unsubscribe?.();
      unsubscribe = onSnapshot(
        planDocRef,
        (docSnapshot) => {
          if (cancelled) return;
          if (docSnapshot.exists()) {
            const next = formatPlanFromSnapshot(docSnapshot);
            setPlan(next);
            writeLocalCollectionCache(BIBLE_PLAN_CACHE_KEY, serializePlanForCache(next));
          } else {
            setPlan(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error('[BiblePlanProvider] Firestore onSnapshot error:', error);
          // Keep cached plan on transient errors; retry shortly for new-device sign-in races.
          setLoading(false);
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            if (!cancelled) attach();
          }, 1500);
        },
      );
    };

    attach();

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (retryTimer) clearTimeout(retryTimer);
    };
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
