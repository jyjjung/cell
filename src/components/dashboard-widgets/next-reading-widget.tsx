
"use client";

import { useMemo, useState } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { findNextUnreadReading } from '@/lib/reading-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, CheckCircle, FastForward, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import type { StructuredPassage } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfDay } from 'date-fns';
import { makePassageKey } from '@/hooks/use-user-bible-checklist';

export default function NextReadingWidget() {
    const { plan, loading: planLoading } = useBiblePlan();
    const { currentUser } = useAuth();
    const { completedPassages, loadingChecklist, togglePassageCompletion, markMultiplePassages } = useUserBibleChecklist();
    const router = useRouter();
    const { setIsPageLoading } = usePageLoading();
    const { openBibleReader } = useGlobalBibleReader();

    const nextUnread = useMemo(() => {
        if (!plan?.dailyReadings || loadingChecklist) return null;
        return findNextUnreadReading(plan.dailyReadings, completedPassages, startOfDay(new Date()));
    }, [plan, completedPassages, loadingChecklist]);
    
    const unreadPassagesToShow = useMemo(() => {
        if (!nextUnread) return [];
        const date = nextUnread.date;
        return nextUnread.passages.filter(p => 
          !completedPassages.includes(makePassageKey(date, p.displayText)) &&
          !completedPassages.includes(p.displayText) // legacy fallback
        );
    }, [nextUnread, completedPassages]);


    const handleGoToPlan = () => {
        setIsPageLoading(true);
        router.push('/bible-checklist');
    };

    const handlePassageClick = (passage: StructuredPassage) => {
        const parsed = parsePassageReferenceForNavigation(passage.displayText);
        if (parsed) openBibleReader(parsed.book, parsed.chapter);
    };

    if (!currentUser) return null;

    return (
        <>
            <div className="relative flex flex-col p-6 md:p-8 rounded-[2.5rem] border bg-card border-border/50 shadow-xl transition-all duration-500 h-full min-h-[240px]">
                <div className="flex items-center justify-between mb-6">
                    <div className="min-w-0">
                        <h3 className="text-lg font-black tracking-tight">Progression</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">On the Horizon</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 shadow-inner">
                        <FastForward className="h-5 w-5" />
                    </div>
                </div>

                <div className="flex-grow">
                    {loadingChecklist || planLoading ? (
                        <div className="h-24 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-20" />
                        </div>
                    ) : !nextUnread ? (
                        <div className="flex flex-col items-start gap-2 text-green-500 py-4">
                            <CheckCircle className="h-10 w-10 mb-2" />
                            <p className="text-2xl font-black tracking-tight leading-none italic">Horizon Clear.</p>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">No more unread passages</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout">
                                {unreadPassagesToShow.slice(0, 3).map(passage => (
                                    <motion.div 
                                        layout
                                        key={passage.displayText} 
                                        className="group flex items-center gap-3 p-3 rounded-2xl bg-muted/20 transition-all border border-transparent hover:bg-primary cursor-pointer"
                                    >
                                        <Checkbox
                                            id={`next-reading-${passage.displayText}`}
                                            onCheckedChange={() => togglePassageCompletion(passage.displayText, nextUnread?.date)}
                                            className="h-5 w-5 rounded-lg border-primary/20 group-hover:border-primary-foreground/50"
                                        />
                                        <button
                                            className="flex-grow text-left font-bold text-sm truncate text-foreground group-hover:text-primary-foreground transition-colors"
                                            onClick={() => handlePassageClick(passage)}
                                        >
                                            {passage.displayText}
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {unreadPassagesToShow.length > 3 && (
                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest pl-2 pt-2">
                                    + {unreadPassagesToShow.length - 3} further passages
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <Button 
                        variant="outline" 
                        className="h-12 w-full rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-background/50 border-border/50 hover:bg-primary hover:text-primary-foreground transition-all shadow-none group" 
                        onClick={handleGoToPlan}
                    >
                        Journey Log
                        <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </>
    );
}
