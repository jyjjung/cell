
"use client";

import { useMemo } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { findNextUnreadReading } from '@/lib/reading-utils';
import WidgetCard from './widget-card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, BookUp, BookCheck, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function NextReadingWidget() {
    const { plan, loading: planLoading } = useBiblePlan();
    const { currentUser } = useAuth();
    const { completedPassages, loadingChecklist } = useUserBibleChecklist();
    const router = useRouter();
    const { setIsPageLoading } = usePageLoading();

    const nextUnread = useMemo(() => {
        if (!plan?.dailyReadings || loadingChecklist) return null;
        return findNextUnreadReading(plan.dailyReadings, completedPassages);
    }, [plan, completedPassages, loadingChecklist]);

    const handleGoToPlan = () => {
        setIsPageLoading(true);
        router.push('/bible-checklist');
    };

    if (!currentUser) return null; // This widget is only for logged-in users

    return (
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
                    {nextUnread.passages.filter(p => !completedPassages.includes(p.displayText)).slice(0,3).map(passage => (
                        <div key={passage.displayText} className="flex items-center space-x-3 text-sm p-2 rounded-md bg-muted/50">
                             <BookUp className="h-4 w-4 text-muted-foreground" />
                             <span className="font-medium">{passage.displayText}</span>
                        </div>
                    ))}
                </div>
            )}
        </WidgetCard>
    );
}
