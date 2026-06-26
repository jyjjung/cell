
"use client";

import { useMemo } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { findTodaysReading } from '@/lib/reading-utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import type { StructuredPassage } from '@/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { makePassageKey } from '@/hooks/use-user-bible-checklist';
import { translations } from '@/lib/translations';


export default function TodayReadingWidget() {
  const { currentUser, loadingAuth } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion } = useUserBibleChecklist();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const { openBibleReader } = useGlobalBibleReader();

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
      const parsed = parsePassageReferenceForNavigation(passage.displayText);
      if (parsed) openBibleReader(parsed.book, parsed.chapter);
  };
    
  const isAllComplete = useMemo(() => {
      if (passagesToShow.length === 0) return false;
      const date = todaysReading?.date;
      return passagesToShow.every(p => {
        if (date) {
          return completedPassages.includes(makePassageKey(date, p.displayText)) || completedPassages.includes(p.displayText);
        }
        return completedPassages.includes(p.displayText);
      });
  }, [passagesToShow, completedPassages, todaysReading?.date]);

  return (
      <div className={cn(
        "widget-surface relative flex flex-col h-full",
        isAllComplete && "ring-1 ring-success/25"
      )}>
        <div className="panel-header">
            <div className="min-w-0">
                <h3 className={cn(
                    "panel-title",
                    isAllComplete && "text-success"
                )}>{t.dailyBread}</h3>
                <p className="panel-subtitle">{t.todaysReading}</p>
            </div>
        </div>

        <div className="flex-grow">
            {planLoading || loadingAuth ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-40" />
                </div>
            ) : !todaysReading ? (
                <div className="flex flex-col items-start gap-1 py-2">
                    <p className="text-sm font-medium text-foreground">{t.sabbathRest}</p>
                    <p className="text-sm text-muted-foreground">{t.noReadingsToday}</p>
                </div>
            ) : isAllComplete ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-start gap-1 text-success py-2"
                >
                    <CheckCircle className="h-6 w-6 mb-1" />
                    <p className="text-base font-semibold leading-tight">{t.sustained}</p>
                    <p className="text-sm text-muted-foreground">{t.dailyReadingsComplete}</p>
                </motion.div>
            ) : (
                <div className="stack-gap-sm">
                <AnimatePresence mode="popLayout">
                    {passagesToShow.map(passage => {
                        const date = todaysReading?.date;
                        const isChecked = date
                          ? completedPassages.includes(makePassageKey(date, passage.displayText)) || completedPassages.includes(passage.displayText)
                          : completedPassages.includes(passage.displayText);
                        return (
                        <motion.div 
                            layout
                            key={passage.displayText} 
                            className={cn(
                                "surface-row group cursor-pointer",
                                isChecked && "opacity-70"
                            )}
                        >
                            {currentUser && (
                            <Checkbox
                                id={`today-reading-${passage.displayText}`}
                                checked={isChecked}
                                onCheckedChange={() => togglePassageCompletion(passage.displayText, todaysReading?.date)}
                                className="h-4 w-4"
                            />
                            )}
                            <button
                                type="button"
                                className={cn(
                                    "flex-grow text-left text-sm truncate transition-colors",
                                    isChecked ? "line-through text-muted-foreground" : "text-foreground font-medium"
                                )}
                                onClick={() => handlePassageClick(passage)}
                            >
                                {passage.displayText}
                            </button>
                        </motion.div>
                        )
                    })}
                </AnimatePresence>
                </div>
            )}
        </div>

        <div className="mt-3">
            <Button 
                variant="outline" 
                size="sm"
                className="w-full" 
                onClick={handleGoToPlan}
            >
                {t.readingArchive}
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
        </div>
      </div>
  );
}
