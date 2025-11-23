
"use client";

import { useMemo, useState } from 'react';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import WidgetCard from './widget-card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2, BrainCircuit, RefreshCw } from 'lucide-react';
import { startOfDay } from 'date-fns';
import VerseDisplayDialog from '@/components/memorize/verse-display-dialog';
import type { MemoryVerse } from '@/types';

export default function VerseOfTheDayWidget() {
    const { memoryVerses, loading } = useMemoryVerses();
    const router = useRouter();
    const { setIsPageLoading } = usePageLoading();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedVerse, setSelectedVerse] = useState<MemoryVerse | null>(null);

    // Get a deterministic "verse of the day" based on the current date
    const verseOfTheDay = useMemo(() => {
        if (!memoryVerses || memoryVerses.length === 0) return null;
        const dayOfYear = Math.floor((startOfDay(new Date()).getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const index = dayOfYear % memoryVerses.length;
        return memoryVerses[index];
    }, [memoryVerses]);

    const handleViewVerse = () => {
        if (verseOfTheDay) {
            setSelectedVerse(verseOfTheDay);
            setDialogOpen(true);
        }
    };

    const handleGoToMemoryPage = () => {
        setIsPageLoading(true);
        router.push('/memorize');
    }

    return (
        <>
            <WidgetCard
                title="Verse of the Day"
                description={verseOfTheDay ? verseOfTheDay.reference : "No verses available."}
                footer={
                     <Button variant="outline" size="sm" className="w-full" onClick={handleGoToMemoryPage}>
                        Practice All Verses
                    </Button>
                }
            >
                {loading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : !verseOfTheDay ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                        <BrainCircuit className="h-10 w-10 mb-2" />
                        <p className="text-sm font-medium">No memory verses added yet.</p>
                    </div>
                ) : (
                   <div className="h-full flex items-center justify-center">
                        <Button variant="secondary" onClick={handleViewVerse}>
                            View Verse
                        </Button>
                   </div>
                )}
            </WidgetCard>

            <VerseDisplayDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                verse={selectedVerse}
            />
        </>
    );
}
