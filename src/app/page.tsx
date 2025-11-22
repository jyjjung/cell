
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
import { motion, useInView } from 'framer-motion';
import type { AppEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EventListView from '@/components/calendar/event-list-view';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import { useAllUserChecklists } from '@/hooks/use-all-user-checklists';
import { useAllUsers } from '@/hooks/use-all-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import DashboardCards from '@/components/homepage/dashboard-cards';


interface UserProgressDisplay {
  userId: string;
  userDisplayName: string | null;
  completedCount: number;
  progressPercentage: number;
  totalPassagesToDate: number;
}

const Section = ({ children, title, id }: { children: React.ReactNode, title: string, id: string }) => (
    <section id={id} className="py-8 md:py-12">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 md:mb-8 text-center md:text-left">
            {title}
        </h2>
        {children}
    </section>
);


export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [isMounted, setIsMounted] = useState(false);
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { memoryVerses, loading: memoryVersesLoading } = useMemoryVerses();
  const { allChecklists, loading: checklistsLoading } = useAllUserChecklists();
  const { allUsers, loading: usersLoading } = useAllUsers();

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        <CardContent className="p-0 max-h-[45vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] sm:w-[150px] px-4">Person</TableHead>
                <TableHead className="text-right px-4">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userProgressData.map((progressItem) => (
                <TableRow key={progressItem.userId}>
                  <TableCell className="font-medium text-sm truncate max-w-[100px] sm:max-w-xs px-4 py-2">{progressItem.userDisplayName}</TableCell>
                  <TableCell className="text-right px-4 py-2">
                     <div className="flex items-baseline justify-end gap-x-2">
                      <span className="font-semibold text-foreground text-sm tabular-nums">{progressItem.completedCount} / {progressItem.totalPassagesToDate}</span>
                      <span className="text-muted-foreground text-base tabular-nums">({progressItem.progressPercentage}%)</span>
                    </div>
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
    <div className="space-y-8">
      <Section id="dashboard-section" title="Dashboard">
         <DashboardCards
            currentUser={currentUser}
            loadingAuth={loadingAuth}
            eventsLoading={eventsLoading}
            allEvents={allEvents}
            loadingChecklist={loadingChecklist}
            planLoading={planLoading}
            totalPassagesUpToToday={totalPassagesUpToToday}
            completedPassagesCount={completedPassages.length}
            memoryVersesLoading={memoryVersesLoading}
            memoryVersesCount={memoryVerses.length}
        />
      </Section>

      {currentUser && (
        <Section id="event-calendar-section" title="Upcoming Events">
          <EventListView eventsByDate={eventsByDate} />
        </Section>
      )}

      <Section id="todays-reading-section" title="Today's Bible Reading">
        <div className="max-w-2xl mx-auto">
          <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
              <BiblePlanDisplay 
                readingToDisplay={todaysReadingForDisplay} 
                currentUser={currentUser} 
                completedPassages={completedPassages} 
                togglePassageCompletion={togglePassageCompletion} 
                onToggleAllToday={markMultiplePassages} 
                allPassageTextsForDay={allTodaysPassageTexts} 
                loading={planLoading || loadingChecklist} 
                planAvailable={!!plan && !!plan.dailyReadings && plan.dailyReadings.length > 0} 
                hidePlanMeta={true} 
                defaultOpen={true} 
                isStandalone={true} 
              />
          </motion.div>
        </div>
      </Section>
      
      {currentUser && (currentUser.showInCommunityProgress ?? true) && (
        <Section id="community-progress-section" title="Community Progress">
          <div className="max-w-4xl mx-auto">
            <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
              <Card className="shadow-lg overflow-hidden">
                  <CardHeader className="py-4">
                      <div className="flex items-center space-x-3">
                          <Users className="h-6 w-6 text-primary" />
                          <CardTitle className="text-xl font-semibold tracking-tight">Leaderboard</CardTitle>
                      </div>
                  </CardHeader>
                  <CommunityProgressContent />
              </Card>
            </motion.div>
          </div>
        </Section>
      )}
    </div>
  );
}
