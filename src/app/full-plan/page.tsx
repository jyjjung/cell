"use client";

import { useState, useEffect, useMemo } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { parseDay } from '@/lib/event-occurrences';
import { Loader2, Info, BookOpen, Copy } from 'lucide-react';
import BackToTopButton from '@/components/ui/back-to-top-button';
import type { DailyReading } from '@/types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import ReadingsHubTabs from '@/components/readings/readings-hub-tabs';

import { RosterCard } from '@/components/ui/roster-card';

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
            return `${book} ${chapters[0]}-${chapters[chapters.length - 1]}`;
        })
        .filter(summary => summary)
        .join(', ');
  };
  
  const planAsText = useMemo(() => {
    if (!sortedReadings) return '';
    return sortedReadings.map(reading => {
      const date = format(parseDay(reading.date), "EEEE, MMMM d, yyyy");
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

  if (!isMounted) return null;

  return (
    <div className="page-container space-y-8 pb-32">
      <PageHeader 
        title="Full Plan" 
        action={
          <Button variant="outline" size="sm" onClick={handleCopyToClipboard} disabled={!planAsText || planLoading} className="rounded-xl font-bold">
            <Copy className="mr-2 h-4 w-4" />
            Copy to Clipboard
          </Button>
        }
      />
      <ReadingsHubTabs />

      {planLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-micro-label text-primary !opacity-100">Downloading Sacred Data...</p>
          </div>
      ) : (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) ? (
          <EmptyState 
              icon={Info} 
              title="No Plan Available" 
              description="No Bible reading plan has been set by the admin." 
          />
      ) : (
          <section className="space-y-4">
            {sortedReadings?.map((reading, idx) => (
                <RosterCard 
                    key={reading.date}
                    index={idx}
                    date={parseDay(reading.date)}
                    title={generatePassageSummary(reading)}
                    subtitle={format(parseDay(reading.date), "EEEE, MMMM d, yyyy")}
                    accentColor="text-primary"
                    accentBg="bg-muted"
                    showLine={false}
                    hideAvatars={true}
                    rightElement={<BookOpen className="h-5 w-5 text-primary" />}
                />
            ))}
          </section>
      )}
      <BackToTopButton />
    </div>
  );
}
