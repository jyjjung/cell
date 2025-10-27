
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import StatCard from '@/components/homepage/stat-card';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useEvents } from '@/hooks/use-events';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import { CalendarCheck, BookCheck, BrainCircuit, Loader2, Users } from 'lucide-react';
import { startOfDay, parseISO, isValid, isBefore, isSameDay } from 'date-fns';
import { findTodaysReading } from '@/lib/reading-utils';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import type { AppEvent } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EventListView from '@/components/calendar/event-list-view';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import { useAllUserChecklists } from '@/hooks/use-all-user-checklists';
import { useAllUsers } from '@/hooks/use-all-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import SectionIndicator from '@/components/layout/section-indicator';


interface UserProgressDisplay {
  userId: string;
  userDisplayName: string | null;
  completedCount: number;
  progressPercentage: number;
  totalPassagesToDate: number;
}

const SectionWrapper = ({ children, id, className }: { children: React.ReactNode, id: string, className?: string }) => (
    <section id={id} className={cn("scroll-snap-section w-full flex flex-col items-center justify-center p-4 sm:p-8 relative", className)}>
        <div className="container mx-auto">
            {children}
        </div>
    </section>
);

const AnimatedTitle = ({ text }: { text: string }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });

    return (
        <div ref={ref} className="relative mb-8 md:mb-12 text-center overflow-hidden">
             <motion.div
                className="absolute inset-0 bg-primary z-10"
                initial={{ x: "-100%" }}
                animate={{ x: isInView ? "101%" : "-100%" }}
                transition={{ duration: 1.2, ease: [0.2, 0.65, 0.3, 0.9] }}
            />
            <motion.h2
                className="text-4xl md:text-5xl font-bold tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: isInView ? 1 : 0 }}
                transition={{ duration: 0.1, delay: 0.4 }}
            >
                {text}
            </motion.h2>
        </div>
    );
};

const HorizontalScrollSection = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const targetRef = useRef<HTMLDivElement | null>(null);
    const { scrollYProgress } = useScroll({
      target: targetRef,
    });
  
    const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);
  
    return (
      <section ref={targetRef} className={cn("relative h-[300vh]", className)}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <motion.div style={{ x }} className="flex gap-4">
            {children}
          </motion.div>
        </div>
      </section>
    );
};

export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [isMounted, setIsMounted] = useState(false);
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { memoryVerses, loading: memoryVersesLoading } = useMemoryVerses();
  const { allChecklists, loading: checklistsLoading } = useAllUserChecklists();
  const { allUsers, loading: usersLoading } = useAllUsers();

  const sections = ['dashboard-section', 'event-calendar-section', 'todays-reading-section', 'community-progress-section'];
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress: dashboardScrollProgress } = useScroll({
    target: dashboardRef,
    offset: ['start start', 'end start']
  });
  const dashboardX = useTransform(dashboardScrollProgress, [0, 1], ["1%", currentUser ? "-100%" : "1%"]);


  const eventsRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress: eventsScrollProgress } = useScroll({
      target: eventsRef,
      offset: ['start start', 'end start']
  });
  const eventsX = useTransform(eventsScrollProgress, [0, 1], ["1%", "-50%"]);

  const todaysReadingForDisplay = useMemo(() => {
    if (!isMounted || !plan?.dailyReadings) return null;
    return findTodaysReading(plan.dailyReadings);
  }, [plan, isMounted]);

  const allTodaysPassageTexts = useMemo(() => {
    return todaysReadingForDisplay?.passages.map(p => p.displayText).filter(Boolean).filter(text => typeof text === 'string' && text.trim() !== '' && !text.startsWith("Error:")) as string[] || [];
  }, [todaysReadingForDisplay]);

  const totalPassagesUpToToday = useMemo(() => {
    if (!isMounted || !plan?.dailyReadings) return 0;
    const today = startOfDay(new Date());
    
    const relevantReadings = plan.dailyReadings.filter(reading => {
      try {
        const readingDate = parseISO(reading.date);
        return isValid(readingDate) && (isBefore(readingDate, today) || isSameDay(readingDate, today));
      } catch (e) {
        console.error("Error parsing reading date for progress calculation:", reading.date, e);
        return false;
      }
    });

    return relevantReadings.reduce((acc, day) => {
        if (!day || !Array.isArray(day.passages)) return acc;
        const validDayPassages = day.passages.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '' && !p.displayText.startsWith("Error:"));
        return acc + validDayPassages.length;
    }, 0);
  }, [plan, isMounted]);

  const readingsLoggedStatValue = useMemo(() => {
    if (loadingChecklist || planLoading || !isMounted) return null;
    const passagesToRead = totalPassagesUpToToday - completedPassages.length;

    if (passagesToRead <= 0) {
      if (totalPassagesUpToToday > 0) {
        return "All Caught Up!";
      } else {
        return "No readings yet";
      }
    }
    return `${passagesToRead} Passages to read`;
  }, [completedPassages.length, totalPassagesUpToToday, loadingChecklist, planLoading, isMounted]);
  
  const upcomingEventsCount = useMemo(() => {
    if (!isMounted) return 0;
    const today = startOfDay(new Date());
    return allEvents.filter(event => {
        try {
          const eventDate = parseISO(event.date);
          return isValid(eventDate) && !isBefore(eventDate, today);
        } catch(e) { return false; }
    }).length;
  }, [allEvents, isMounted]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AppEvent[]>();
    if (!allEvents) return map;
    allEvents.forEach(event => {
      try {
        const eventDateStr = parseISO(event.date).toISOString().split('T')[0];
        if (!map.has(eventDateStr)) {
          map.set(eventDateStr, []);
        }
        map.get(eventDateStr)!.push(event);
      } catch (e) {
        console.error("Error parsing event date for calendar:", event.date, e);
      }
    });
    map.forEach((dayEvents) => {
        dayEvents.sort((a,b) => a.category.localeCompare(b.category));
    });
    return map;
  }, [allEvents]);

  const userProgressData = useMemo(() => {
    if (checklistsLoading || usersLoading || totalPassagesUpToToday === 0 || !allChecklists || !allUsers) {
      return [];
    }
  
    const visibleUsers = new Set(allUsers.filter(u => u.showInCommunityProgress ?? true).map(u => u.uid));
    const usersMap = new Map(allUsers.map(user => [user.uid, user]));
  
    return allChecklists
      .filter(checklist => visibleUsers.has(checklist.userId))
      .map(checklist => {
        const user = usersMap.get(checklist.userId);
        if (!user) return null;
  
        const completedCount = checklist.completedPassages.length;
        const progressPercentage = totalPassagesUpToToday > 0 ? parseFloat(((completedCount / totalPassagesUpToToday) * 100).toFixed(1)) : 0;
        
        return {
          userId: checklist.userId,
          userDisplayName: user.displayName || user.email?.split('@')[0] || 'User',
          completedCount,
          progressPercentage,
          totalPassagesToDate: totalPassagesUpToToday,
        };
      })
      .filter((item): item is UserProgressDisplay => item !== null)
      .sort((a, b) => b.progressPercentage - a.progressPercentage);
  }, [allChecklists, allUsers, totalPassagesUpToToday, checklistsLoading, usersLoading]);

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80, damping: 15 } },
  };

  const CommunityProgressContent = () => {
    if (planLoading || checklistsLoading || usersLoading) {
        return <div className="flex items-center justify-center p-6"><Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" /></div>;
    }
    if (userProgressData.length === 0) {
        return <div className="p-6 text-center text-muted-foreground">No community progress to show yet.</div>;
    }

    return (
        <CardContent className="p-0 max-h-[50vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] sm:w-[150px]">Person</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userProgressData.map((progressItem, index) => (
                <TableRow key={progressItem.userId}>
                  <TableCell className="font-medium text-sm truncate max-w-[100px] sm:max-w-xs">{progressItem.userDisplayName}</TableCell>
                  <TableCell>
                    <motion.div initial={{ width: "0%" }} whileInView={{ width: "100%" }} transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}>
                      <Progress value={progressItem.progressPercentage} className="h-3" />
                    </motion.div>
                    <span className="text-xs text-muted-foreground mt-1 block">{progressItem.completedCount} / {progressItem.totalPassagesToDate}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
    )
  }

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0">
        <section id="dashboard-section" ref={dashboardRef} className="relative h-[300vh]">
            <div className="sticky top-0 flex h-screen items-center overflow-hidden">
                <motion.div style={{ x: dashboardX }} className="flex items-center gap-8 pl-12">
                    <div className="w-screen max-w-lg shrink-0">
                         <AnimatedTitle text="Dashboard" />
                    </div>
                    {currentUser && (
                        <div className="w-80 shrink-0">
                            <StatCard title="Upcoming Events" value={eventsLoading ? null : upcomingEventsCount} isLoading={eventsLoading} buttonText="View Events" buttonLink="#event-calendar-section" IconComponent={CalendarCheck} />
                        </div>
                    )}
                    {currentUser && (
                        <div className="w-80 shrink-0">
                            <StatCard title="Reading Progress" value={readingsLoggedStatValue} isLoading={loadingAuth || loadingChecklist || planLoading} buttonText="My Checklist" buttonLink="/bible-checklist" IconComponent={BookCheck} buttonDisabled={(loadingChecklist || planLoading) ? false : totalPassagesUpToToday === 0} />
                        </div>
                    )}
                    <div className="w-80 shrink-0">
                        <StatCard title="Memory Verses" value={memoryVersesLoading ? null : memoryVerses.length} isLoading={memoryVersesLoading} buttonText="Practice Verses" buttonLink="/memorize" IconComponent={BrainCircuit} />
                    </div>
                </motion.div>
            </div>
        </section>
        
        {currentUser && (
          <section id="event-calendar-section" ref={eventsRef} className="relative h-[300vh]">
              <div className="sticky top-0 h-screen overflow-hidden">
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full">
                      <div className="container mx-auto px-4 sm:px-8">
                           <AnimatedTitle text="Upcoming Events" />
                      </div>
                      <motion.div style={{ x: eventsX }}>
                          {eventsLoading ? <Skeleton className="w-full h-[400px]" /> : <EventListView eventsByDate={eventsByDate} />}
                      </motion.div>
                  </div>
              </div>
          </section>
        )}

        <SectionWrapper id="todays-reading-section" className="min-h-screen">
          <div className="w-full max-w-2xl mx-auto">
            <AnimatedTitle text="Today's Bible Reading" />
            <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
                <BiblePlanDisplay readingToDisplay={todaysReadingForDisplay} currentUser={currentUser} completedPassages={completedPassages} togglePassageCompletion={togglePassageCompletion} onToggleAllToday={markMultiplePassages} allPassageTextsForDay={allTodaysPassageTexts} loading={planLoading || loadingChecklist} planAvailable={!!plan && !!plan.dailyReadings && plan.dailyReadings.length > 0} hidePlanMeta={true} defaultOpen={true} isStandalone={true} />
            </motion.div>
          </div>
        </SectionWrapper>
        
        {currentUser && (currentUser.showInCommunityProgress ?? true) && (
            <SectionWrapper id="community-progress-section" className="min-h-screen">
              <div className="w-full max-w-4xl mx-auto">
                  <AnimatedTitle text="Community Progress" />
                  <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
                    <Card className="shadow-lg overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center space-x-3">
                                <Users className="h-6 w-6 text-primary" />
                                <CardTitle className="text-xl font-semibold tracking-tight">Leaderboard</CardTitle>
                            </div>
                        </CardHeader>
                        <CommunityProgressContent />
                    </Card>
                  </motion.div>
              </div>
            </SectionWrapper>
        )}
      </div>
      <SectionIndicator sections={currentUser ? sections : sections.filter(s => s !== 'event-calendar-section' && s !== 'community-progress-section')} />
    </>
  );
}
