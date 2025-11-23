
"use client";

import { useMemo, useState } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { findTodaysReading } from '@/lib/reading-utils';
import WidgetCard from './widget-card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, BookUp, CheckCircle, CalendarX } from 'lucide-react';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import type { StructuredPassage } from '@/types';
import { cn } from '@/lib/utils';
import type { Layout } from 'react-grid-layout';
import { Checkbox } from '@/components/ui/checkbox';

// Approximate heights for calculation
const WIDGET_HEADER_HEIGHT = 60; // px
const WIDGET_FOOTER_HEIGHT = 50; // px
const PASSAGE_ITEM_HEIGHT = 42;  // px


export default function TodayReadingWidget(props: Partial<Layout>) {
  const { plan, loading: planLoading } = useBiblePlan();
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isPassageViewerOpen, setIsPassageViewerOpen] = useState(false);
  const [selectedPassageRef, setSelectedPassageRef] = useState<string | null>(null);

  const todaysReading = useMemo(() => {
    if (!plan?.dailyReadings) return null;
    return findTodaysReading(plan.dailyReadings);
  }, [plan]);
  
  const passagesToShow = useMemo(() => {
    if (!todaysReading) return [];
    return todaysReading.passages.filter(p => p.displayText && !p.displayText.startsWith("Error:"));
  }, [todaysReading]);

  const maxItemsToShow = useMemo(() => {
      if (!props.h) return 4; // Default if height is not provided
      const widgetHeight = props.h * 1; // rowHeight is 1
      const contentHeight = widgetHeight - WIDGET_HEADER_HEIGHT - WIDGET_FOOTER_HEIGHT;
      return Math.max(1, Math.floor(contentHeight / PASSAGE_ITEM_HEIGHT));
  }, [props.h]);


  const handleGoToPlan = () => {
    setIsPageLoading(true);
    router.push('/bible-checklist');
  }

  const handlePassageClick = (passage: StructuredPassage) => {
      setSelectedPassageRef(passage.displayText);
      setIsPassageViewerOpen(true);
  };
    
  const handleCheckboxToggle = async (passageText: string) => {
      try {
          await togglePassageCompletion(passageText);
      } catch (error) {
          console.error("Failed to toggle passage completion:", error);
      }
  };

  const isAllComplete = useMemo(() => {
      if (passagesToShow.length === 0) return false;
      return passagesToShow.every(p => completedPassages.includes(p.displayText));
  }, [passagesToShow, completedPassages]);

  return (
     <>
      <WidgetCard
        title="Today's Reading"
        description={todaysReading ? `For ${todaysReading.date}` : "No reading scheduled"}
        footer={<Button variant="outline" size="sm" className="w-full" onClick={handleGoToPlan}>Go to Checklist</Button>}
      >
        {planLoading || loadingChecklist || loadingAuth ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !todaysReading ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
              <CalendarX className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">No reading for today.</p>
          </div>
        ) : isAllComplete ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-green-600 dark:text-green-400 p-4">
              <CheckCircle className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Today's reading complete!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {passagesToShow.slice(0, maxItemsToShow).map(passage => {
              const isChecked = completedPassages.includes(passage.displayText);
              return (
                <div key={passage.displayText} className="flex items-center space-x-2 text-sm p-1.5 rounded-md bg-muted/50 min-w-0">
                   {currentUser && (
                    <Checkbox
                        id={`today-reading-${passage.displayText}`}
                        checked={isChecked}
                        onCheckedChange={() => handleCheckboxToggle(passage.displayText)}
                        aria-label={`Mark ${passage.displayText} as read`}
                        className="h-4 w-4"
                    />
                   )}
                   <Button
                       variant="link"
                       className={cn(
                           "p-0 h-auto font-medium text-left justify-start hover:no-underline truncate flex-grow",
                           isChecked ? "text-muted-foreground hover:text-muted-foreground/80 line-through" : "text-foreground hover:text-primary",
                           !currentUser && "pl-2"
                       )}
                       onClick={() => handlePassageClick(passage)}
                       title={`View '${passage.displayText}'`}
                   >
                       <BookUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mr-2" />
                       <span className="truncate">{passage.displayText}</span>
                   </Button>
                </div>
              )
            })}
          </div>
        )}
      </WidgetCard>
      <BiblePassageViewerDialog
          isOpen={isPassageViewerOpen}
          onOpenChange={setIsPassageViewerOpen}
          passageReference={selectedPassageRef}
          completedPassages={completedPassages}
          markMultiplePassages={markMultiplePassages}
      />
    </>
  );
}
