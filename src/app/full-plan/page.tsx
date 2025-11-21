
"use client";

import { useState, useEffect } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Info, BookOpen } from 'lucide-react';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { motion } from 'framer-motion';
import type { DailyReading } from '@/types';
import { format, parseISO } from 'date-fns';

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedReadings = plan?.dailyReadings?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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


  if (!isMounted || planLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading Reading Plan...</p>
      </div>
    );
  }

  if (!plan || !plan.dailyReadings || plan.dailyReadings.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mt-6 max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center"><Info className="mr-2 h-5 w-5" /> No Plan Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mt-2">No Bible reading plan has been set by the admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };


  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-2xl">
      <div className="flex items-center space-x-3 mb-6">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Full Reading Plan</h1>
      </div>
      <motion.ul 
        className="space-y-1"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {sortedReadings?.map(reading => (
           <motion.li 
              key={reading.date}
              variants={itemVariants}
              className="py-2 border-b"
           >
              <p className="text-xs font-semibold text-muted-foreground">{format(parseISO(reading.date), "EEEE, MMMM d, yyyy")}</p>
              <p className="text-sm font-medium text-foreground">{generatePassageSummary(reading)}</p>
           </motion.li>
        ))}
      </motion.ul>
      <BackToTopButton />
    </div>
  );
}
