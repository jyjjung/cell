"use client";

import { useState } from 'react';
import EventList from '@/components/events/event-list';
import BiblePlanForm from '@/components/bible-plan/bible-plan-form';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import type { BibleReadingPlan as BibleReadingPlanType } from '@/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, BookHeart } from 'lucide-react';

const BIBLE_PLAN_STORAGE_KEY = 'cell_dates_bible_plan';

export default function HomePage() {
  const [biblePlan, setBiblePlan] = useLocalStorage<BibleReadingPlanType | null>(BIBLE_PLAN_STORAGE_KEY, null);

  const handlePlanGenerated = (newPlan: BibleReadingPlanType) => {
    setBiblePlan(newPlan);
  };

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-center space-x-3 mb-6">
          <CalendarCheck className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Upcoming Dates</h2>
        </div>
        <EventList />
      </section>

      <Separator className="my-12" />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
           <div className="flex items-center space-x-3 mb-6">
             <BookHeart className="h-8 w-8 text-accent" />
             <h2 className="text-3xl font-bold tracking-tight">Bible Reading Plan</h2>
           </div>
          <BiblePlanForm onPlanGenerated={handlePlanGenerated} />
        </div>
        <div className="lg:sticky lg:top-20"> {/* Make plan display sticky on larger screens */}
          <BiblePlanDisplay plan={biblePlan} />
        </div>
      </section>
    </div>
  );
}
