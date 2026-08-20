"use client";

import { useBiblePlanContext } from '@/contexts/bible-plan-context';
import type { BibleReadingPlan } from '@/types';

const emptyBiblePlan: {
  plan: BibleReadingPlan | null;
  loading: boolean;
  saveBiblePlan: (newPlanData: Omit<BibleReadingPlan, 'id' | 'updatedAt'>) => Promise<void>;
} = {
  plan: null,
  loading: false,
  saveBiblePlan: async () => {
    console.warn('[useBiblePlan] save ignored until BiblePlanProvider mounts');
  },
};

/**
 * Safe outside BiblePlanProvider (guest / pre-session SSR) — returns an empty
 * plan until AppDataProviders mounts after a session exists.
 */
export function useBiblePlan() {
  const ctx = useBiblePlanContext();
  return ctx ?? emptyBiblePlan;
}
