
"use client";

import { useBiblePlanContext } from '@/contexts/bible-plan-context';

export { BiblePlanProvider } from '@/contexts/bible-plan-context';

export function useBiblePlan() {
  const ctx = useBiblePlanContext();
  if (!ctx) {
    throw new Error('useBiblePlan must be used within BiblePlanProvider');
  }
  return ctx;
}
