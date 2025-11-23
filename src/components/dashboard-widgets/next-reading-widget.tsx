
"use client";

import { useMemo, useState } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { findNextUnreadReading } from '@/lib/reading-utils';
import WidgetCard from './widget-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, BookUp, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import BiblePassageViewerDialog from '@/components/bible/bible-passage-viewer-dialog';
import type { StructuredPassage } from '@/types';
import { cn } from '@/lib/utils';

export default function NextReadingWidget() {
    const { plan, loading: planLoading } = useBiblePlan();
    const { currentUser } = useAuth();
    const { completedPassages, loadingChecklist, togglePassageCompletion, markMultiplePassages } = useUserBibleChecklist();
    const router = useRouter();
    const { setIsPageLoading } = usePageLoading();
    const [isPassageViewerOpen, setIsPassageViewerOpen] = useState(false);
    const [selectedPassageRef, setSelectedPassageRef] = useState<string | null>(null);

    const nextUnread = useMemo(() => {
        if (!plan?.dailyReadings || loadingChecklist) return null;
        return findNextUnreadReading(plan.dailyReadings, completedPassages);
    }, [plan, completedPassages, loadingChecklist]);
    
    const unreadPassagesToShow = useMemo(() => {
        if (!nextUnread) return [];
        return nextUnread.passages.filter(p => !completedPassages.includes(p.displayText)).slice(0, 4);
    }, [nextUnread, completedPassages]);


    const handleGoToPlan = () => {
        setIsPageLoading(true);
        router.push('/bible-checklist');
    };

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


    if (!currentUser) return null; // This widget is only for logged-in users

    return (
        <>
            <WidgetCard
                title="Next Reading"
                description={nextUnread ? `From ${nextUnread.date}` : "You're all caught up!"}
                footer={
                    <Button variant="outline" size="sm" className="w-full" onClick={handleGoToPlan}>
                        Open Checklist
                    </Button>
                }
            >
                {loadingChecklist || planLoading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : !nextUnread ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-green-600 dark:text-green-400 p-4">
                        <CheckCircle className="h-10 w-10 mb-2" />
                        <p className="text-sm font-medium">All readings completed!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {unreadPassagesToShow.map(passage => (
                             <div key={passage.displayText} className="flex items-center space-x-2 text-sm p-1.5 rounded-md bg-muted/50 min-w-0">
                                 <Checkbox
                                     id={`next-reading-${passage.displayText}`}
                                     onCheckedChange={() => handleCheckboxToggle(passage.displayText)}
                                     aria-label={`Mark ${passage.displayText} as read`}
                                     className="h-4 w-4"
                                 />
                                 <Button
                                     variant="link"
                                     className={cn(
                                         "p-0 h-auto font-medium text-left justify-start hover:no-underline truncate flex-grow text-foreground hover:text-primary"
                                     )}
                                     onClick={() => handlePassageClick(passage)}
                                     title={`View '${passage.displayText}'`}
                                >
                                    <BookUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mr-2" />
                                    <span className="truncate">{passage.displayText}</span>
                                 </Button>
                            </div>
                        ))}
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

