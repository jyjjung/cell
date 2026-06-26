
"use client";

import { useMemo } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { findNextUnreadReading } from '@/lib/reading-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import type { StructuredPassage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfDay } from 'date-fns';
import { makePassageKey } from '@/hooks/use-user-bible-checklist';
import { translations } from '@/lib/translations';

export default function NextReadingWidget() {
    const { currentUser } = useAuth();
    const t = translations[currentUser?.preferredLanguage || 'en'];
    const { plan, loading: planLoading } = useBiblePlan();
    const { completedPassages, loadingChecklist, togglePassageCompletion } = useUserBibleChecklist();
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
          !completedPassages.includes(p.displayText)
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
            <div className="widget-surface relative flex flex-col h-full">
                <div className="panel-header">
                    <div className="min-w-0">
                        <h3 className="panel-title">{t.nextMilestone}</h3>
                        <p className="panel-subtitle">{t.onTheHorizon}</p>
                    </div>
                </div>

                <div className="flex-grow">
                    {loadingChecklist || planLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-40" />
                        </div>
                    ) : !nextUnread ? (
                        <div className="flex flex-col items-start gap-1 text-success py-2">
                            <CheckCircle className="h-6 w-6 mb-1" />
                            <p className="text-base font-semibold leading-tight">{t.horizonClear}</p>
                            <p className="text-sm text-muted-foreground">{t.noUnreadPassages}</p>
                        </div>
                    ) : (
                        <div className="stack-gap-sm">
                            <AnimatePresence mode="popLayout">
                                {unreadPassagesToShow.slice(0, 3).map(passage => (
                                    <motion.div 
                                        layout
                                        key={passage.displayText} 
                                        className="surface-row group cursor-pointer"
                                    >
                                        <Checkbox
                                            id={`next-reading-${passage.displayText}`}
                                            onCheckedChange={() => togglePassageCompletion(passage.displayText, nextUnread?.date)}
                                            className="h-4 w-4"
                                        />
                                        <button
                                            type="button"
                                            className="flex-grow text-left text-sm font-medium truncate text-foreground"
                                            onClick={() => handlePassageClick(passage)}
                                        >
                                            {passage.displayText}
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {unreadPassagesToShow.length > 3 && (
                                <p className="text-xs text-muted-foreground pl-1 pt-1">
                                    + {unreadPassagesToShow.length - 3} {t.furtherPassages}
                                </p>
                            )}
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
                        {t.journeyLog}
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
    );
}
