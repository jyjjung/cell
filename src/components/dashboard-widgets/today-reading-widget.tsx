
"use client";

import { useMemo, useState } from 'react';
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


export default function TodayReadingWidget() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages } = useUserBibleChecklist();
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
     <>
      <div className={cn(
        "glass-card relative flex flex-col p-6 md:p-8 rounded-[2.5rem] transition-all duration-500 overflow-hidden h-full min-h-[240px]",
        isAllComplete && "ring-1 ring-success/30"
      )}>
        <div className="flex items-center justify-between mb-6">
            <div className="min-w-0">
                <h3 className={cn(
                    "text-base font-bold tracking-tight",
                    isAllComplete ? "text-success" : "text-foreground"
                )}>Daily Bread</h3>
                <p className="text-micro-label !opacity-100 text-muted-foreground !tracking-widest">Today's Journey</p>
            </div>
        </div>

        <div className="flex-grow">
            {planLoading || loadingAuth ? (
                <div className="h-24 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-20" />
                </div>
            ) : !todaysReading ? (
                <div className="flex flex-col items-start gap-2 opacity-40 py-4">
                    <p className="text-micro-label !opacity-100 text-muted-foreground !tracking-widest">Sabbath Rest</p>
                    <p className="text-xs font-medium text-muted-foreground">No assigned readings for today.</p>
                </div>
            ) : isAllComplete ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-start gap-2 text-success py-4"
                >
                    <CheckCircle className="h-10 w-10 mb-2" />
                    <p className="text-2xl font-black tracking-tight leading-none italic">Sustained.</p>
                    <p className="text-micro-label !opacity-100 !tracking-widest opacity-70">Daily readings complete</p>
                </motion.div>
            ) : (
                <div className="space-y-2">
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
                                "group flex items-center gap-3 p-3 rounded-2xl transition-all glass-thin cursor-pointer",
                                isChecked ? "opacity-60 hover:opacity-100 hover:ring-primary/10" : "hover:ring-primary/30"
                            )}
                        >
                            {currentUser && (
                            <Checkbox
                                id={`today-reading-${passage.displayText}`}
                                checked={isChecked}
                                onCheckedChange={() => togglePassageCompletion(passage.displayText, todaysReading?.date)}
                                className="h-5 w-5 rounded-lg border-primary/20 group-hover:border-primary-foreground/50"
                            />
                            )}
                            <button
                                className={cn(
                                    "flex-grow text-left font-bold text-sm truncate transition-colors",
                                    isChecked ? "line-through text-muted-foreground group-hover:text-primary-foreground" : "text-foreground group-hover:text-primary-foreground"
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

        <div className="mt-8">
            <Button 
                variant="outline" 
                size="sm"
                className="h-11 w-full rounded-2xl text-micro-label !opacity-100 !tracking-widest transition-all shadow-none group" 
                onClick={handleGoToPlan}
            >
                Reading Archive
                <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Button>
        </div>
      </div>
    </>
  );
}
