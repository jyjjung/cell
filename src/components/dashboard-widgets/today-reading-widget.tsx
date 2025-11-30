"use client";

import { useMemo, useState } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { findTodaysReading } from '@/lib/reading-utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, CheckCircle, CalendarX } from 'lucide-react';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import type { StructuredPassage } from '@/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';


export default function TodayReadingWidget() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages } = useUserBibleChecklist();
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


  const handleGoToPlan = () => {
    setIsPageLoading(true);
    router.push('/bible-checklist');
  }

  const handlePassageClick = (passage: StructuredPassage) => {
      setSelectedPassageRef(passage.displayText);
      setIsPassageViewerOpen(true);
  };
    
  const isAllComplete = useMemo(() => {
      if (passagesToShow.length === 0) return false;
      return passagesToShow.every(p => completedPassages.includes(p.displayText));
  }, [passagesToShow, completedPassages]);

  return (
     <>
      <div className="h-full flex flex-col">
        <div className="flex-grow">
          {planLoading || loadingAuth ? (
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
              {passagesToShow.map(passage => {
                const isChecked = completedPassages.includes(passage.displayText);
                return (
                  <div key={passage.displayText} className="flex items-center space-x-2 text-sm p-1.5 rounded-md bg-muted/50 min-w-0">
                    {currentUser && (
                      <Checkbox
                          id={`today-reading-${passage.displayText}`}
                          checked={isChecked}
                          onCheckedChange={() => togglePassageCompletion(passage.displayText)}
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
                        <span className="truncate">{passage.displayText}</span>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="pt-4 border-t mt-4">
          <Button variant="outline" size="sm" className="w-full" onClick={handleGoToPlan}>Go to Checklist</Button>
        </div>
      </div>
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
