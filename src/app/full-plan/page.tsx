
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { Loader2, Info, BookOpen, Copy } from 'lucide-react';
import BackToTopButton from '@/components/ui/back-to-top-button';
import type { DailyReading } from '@/types';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedReadings = useMemo(() => {
    return plan?.dailyReadings?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [plan]);

  const generatePassageSummary = (reading: DailyReading): string => {
    if (!reading.passages || reading.passages.length === 0) {
      return "No reading assigned.";
    }

    const bookChapters: { [book: string]: number[] } = {};

    reading.passages.forEach(passage => {
        if (passage.book && !passage.book.includes("Error")) {
            if (!bookChapters[passage.book]) {
                bookChapters[passage.book] = [];
            }
            if (!bookChapters[passage.book].includes(passage.chapter)) {
                bookChapters[passage.book].push(passage.chapter);
            }
        }
    });

    return Object.entries(bookChapters)
        .map(([book, chapters]) => {
            if (chapters.length === 0) return '';
            chapters.sort((a, b) => a - b);
            if (chapters.length === 1) return `${book} ${chapters[0]}`;
            // Simple range for now, can be improved for non-consecutive
            return `${book} ${chapters[0]}-${chapters[chapters.length - 1]}`;
        })
        .filter(summary => summary)
        .join(', ');
  };
  
  const planAsText = useMemo(() => {
    if (!sortedReadings) return '';
    return sortedReadings.map(reading => {
      const date = format(parseISO(reading.date), "EEEE, MMMM d, yyyy");
      const summary = generatePassageSummary(reading);
      return `${date}\n${summary}`;
    }).join('\n\n');
  }, [sortedReadings]);

  const handleCopyToClipboard = () => {
    if (planAsText) {
      navigator.clipboard.writeText(planAsText).then(() => {
        toast({ title: 'Plan Copied!', description: 'The full reading plan has been copied to your clipboard.' });
      }).catch(err => {
        toast({ title: 'Copy Failed', description: 'Could not copy the plan to clipboard.', variant: 'destructive' });
        console.error('Failed to copy text: ', err);
      });
    }
  };


  if (!isMounted || planLoading) {
    return null;
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
        <div className="space-y-12">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Full Reading Plan</h1>
                </div>
            </header>
            <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-60">
                <Info className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold">No Plan Available</h3>
                <p className="text-muted-foreground text-sm">No Bible reading plan has been set by the admin.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Full Reading Plan</h1>
          </div>
          <Button variant="outline" onClick={handleCopyToClipboard} disabled={!planAsText} className="w-full sm:w-auto">
            <Copy className="mr-2 h-4 w-4" />
            Copy to Clipboard
          </Button>
      </header>

      <section className="space-y-2">
        {sortedReadings?.map(reading => (
           <div 
              key={reading.date}
              className="p-4 border-b"
           >
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{format(parseISO(reading.date), "EEEE, MMMM d, yyyy")}</p>
                <p className="text-lg font-medium text-foreground">{generatePassageSummary(reading)}</p>
              </div>
           </div>
        ))}
      </section>
      <BackToTopButton />
    </div>
  );
}
