
"use client";

import { useMemo, useState } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { findTodaysReading } from '@/lib/reading-utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, CheckCircle, BookOpen, ArrowRight } from 'lucide-react';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import type { StructuredPassage } from '@/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';


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
      return passagesToShow.every(p => completedPassages.includes(p.displayText));
  }, [passagesToShow, completedPassages]);

  return (
     <>
      <div className={cn(
        "relative flex flex-col p-6 md:p-8 rounded-[2.5rem] border transition-all duration-500 overflow-hidden h-full min-h-[240px] bg-card border-border/50 shadow-xl",
        isAllComplete && "bg-success/5 border-success/20 shadow-success/5"
      )}>
        <div className="flex items-center justify-between mb-6">
            <div className="min-w-0">
                <h3 className={cn(
                    "text-base font-bold tracking-tight",
                    isAllComplete ? "text-success" : "text-foreground"
                )}>Daily Bread</h3>
                <p className="text-micro-label !opacity-100 text-muted-foreground !tracking-widest">Today's Journey</p>
            </div>
            <div className={cn(
                "p-2.5 rounded-xl transition-all shadow-inner",
                isAllComplete ? "bg-success/20 text-success" : "bg-primary/10 text-primary"
            )}>
                <BookOpen className="h-5 w-5" />
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
                        const isChecked = completedPassages.includes(passage.displayText);
                        return (
                        <motion.div 
                            layout
                            key={passage.displayText} 
                            className={cn(
                                "group flex items-center gap-3 p-3 rounded-2xl transition-all border border-transparent",
                                isChecked ? "opacity-40 hover:opacity-100" : "bg-muted/20 hover:bg-primary cursor-pointer"
                            )}
                        >
                            {currentUser && (
                            <Checkbox
                                id={`today-reading-${passage.displayText}`}
                                checked={isChecked}
                                onCheckedChange={() => togglePassageCompletion(passage.displayText)}
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
                className="h-11 w-full rounded-2xl text-micro-label !opacity-100 !tracking-widest bg-background/50 border-border/50 hover:bg-primary hover:text-primary-foreground transition-all shadow-none group" 
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
