
"use client";

import { useState, useEffect } from 'react';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useAuth } from '@/contexts/auth-context';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Info, BookOpen } from 'lucide-react';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { motion } from 'framer-motion';

export default function FullBiblePlanPage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, loadingChecklist } = useUserBibleChecklist();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedReadings = plan?.dailyReadings?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (!isMounted || planLoading || loadingAuth) {
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
        staggerChildren: 0.05,
      },
    },
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center space-x-3 mb-4">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Full Reading Plan</h1>
      </div>
      <motion.div 
        className="space-y-2"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {sortedReadings?.map(reading => (
            <BiblePlanDisplay
                key={reading.date}
                readingToDisplay={reading}
                currentUser={currentUser}
                completedPassages={completedPassages}
                togglePassageCompletion={togglePassageCompletion}
                allPassageTextsForDay={reading.passages.map(p => p.displayText).filter(Boolean) as string[]}
                loading={loadingChecklist}
                planAvailable={true}
                hidePlanMeta={true}
                isStandalone={true}
            />
        ))}
      </motion.div>
      <BackToTopButton />
    </div>
  );
}
