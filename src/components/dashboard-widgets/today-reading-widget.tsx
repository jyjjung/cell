
"use client";

import { useMemo } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { findTodaysReading } from '@/lib/reading-utils';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import WidgetCard from './widget-card';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function TodayReadingWidget() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const todaysReadingForDisplay = useMemo(() => {
    if (!plan?.dailyReadings) return null;
    return findTodaysReading(plan.dailyReadings);
  }, [plan]);

  const allTodaysPassageTexts = useMemo(() => {
    return todaysReadingForDisplay?.passages.map(p => p.displayText).filter(Boolean).filter(text => typeof text === 'string' && text.trim() !== '' && !text.startsWith("Error:")) as string[] || [];
  }, [todaysReadingForDisplay]);

  const handleGoToPlan = () => {
    setIsPageLoading(true);
    router.push('/bible-checklist');
  }

  return (
    <WidgetCard
      title="Today's Reading"
      description={todaysReadingForDisplay ? `For ${todaysReadingForDisplay.date}` : "No reading scheduled"}
      footer={<Button variant="outline" size="sm" className="w-full" onClick={handleGoToPlan}>Go to Full Plan</Button>}
    >
      <div className="h-full">
         <BiblePlanDisplay 
          readingToDisplay={todaysReadingForDisplay} 
          currentUser={currentUser} 
          completedPassages={completedPassages} 
          togglePassageCompletion={togglePassageCompletion} 
          onToggleAllToday={markMultiplePassages} 
          allPassageTextsForDay={allTodaysPassageTexts} 
          loading={planLoading || loadingChecklist || loadingAuth} 
          planAvailable={!!plan && !!plan.dailyReadings && plan.dailyReadings.length > 0} 
          hidePlanMeta={true} 
          defaultOpen={true} 
          isStandalone={true} 
        />
      </div>
    </WidgetCard>
  );
}
