"use client";

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useEvents } from '@/hooks/use-events';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { useAllUsers } from '@/hooks/use-all-users';
import { 
  format, 
  isValid, 
  differenceInDays, 
  startOfDay, 
  isBefore, 
  compareAsc, 
  startOfToday 
} from 'date-fns';
import { nextOccurrenceOnOrAfter, parseDay } from '@/lib/event-occurrences';
import { findTodaysReading, findNextUnreadReading } from '@/lib/reading-utils';

export type InternalTimelineItem = {
    id: string;
    date: Date;
    title: string;
    type: 'event' | 'cleaning' | 'qt';
    category?: string;
    details?: string;
    passage?: string;
    qtTitle?: string;
    assignedNames?: string;
    dayName?: string;
};

export function useDashboardData() {
  const { currentUser } = useAuth();
  const { plan } = useBiblePlan();
  const { completedPassages } = useUserBibleChecklist();
  const { events } = useEvents();
  const { roster: cleaningRoster } = useCleaningRoster();
  const { cleaningDays } = useCleaningDays();
  const { roster: qtRoster } = useQTRoster();
  const { notifications } = useNotifications();
  const { chats } = useChats();
  const { allUsers } = useAllUsers();
  
  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
  const cleaningDaysMap = useMemo(() => new Map(cleaningDays.map(d => [d.id, d.name])), [cleaningDays]);

  const bibleStats = useMemo(() => {
    if (!plan?.dailyReadings || plan.dailyReadings.length === 0) return null;
    const today = startOfDay(new Date());
    const allPassages = plan.dailyReadings.flatMap(day => day.passages || []);
    const uniqueChaptersInPlan = new Set(allPassages.map(p => `${p.book} ${p.chapter}`));
    const completedChapters = new Set<string>();
    completedPassages.forEach(cp => {
      const passage = allPassages.find(p => p.displayText === cp);
      if (passage) completedChapters.add(`${passage.book} ${passage.chapter}`);
    });
    const chaptersLeft = Math.max(0, uniqueChaptersInPlan.size - completedChapters.size);
    const lastReadingDate = parseDay(plan.dailyReadings[plan.dailyReadings.length - 1].date);
    const daysLeft = isValid(lastReadingDate) ? Math.max(0, differenceInDays(lastReadingDate, today)) : 0;
    return { chaptersLeft, daysLeft };
  }, [plan, completedPassages]);

  const todaysReading = useMemo(() => plan?.dailyReadings ? findTodaysReading(plan.dailyReadings) : null, [plan]);
  const nextUnreadReading = useMemo(() => plan?.dailyReadings ? findNextUnreadReading(plan.dailyReadings, completedPassages) : null, [plan, completedPassages]);

  const unreadAnnouncements = useMemo(() => {
    return notifications.filter(n => n.type === 'announcement' && !n.readBy.includes(currentUser?.uid || ''));
  }, [notifications, currentUser?.uid]);

  const recentChats = useMemo(() => chats.slice(0, 3), [chats]);

  const timelineItems = useMemo(() => {
    const today = startOfToday();
    const items: InternalTimelineItem[] = [];
    
    events.forEach(e => {
        const next = nextOccurrenceOnOrAfter(e, today);
        if (!next) return;
        items.push({ id: e.id, date: next, title: e.title, type: 'event', category: e.category, details: e.details });
    });
    
    cleaningRoster.forEach(e => {
        const d = parseDay(e.date);
        if (isValid(d) && !isBefore(d, today)) {
            const names = e.assignedUserIds.map(uid => usersMap.get(uid)?.firstName).filter(Boolean).join(', ');
            items.push({ id: e.id, date: d, title: names || "Cleaning", type: 'cleaning', assignedNames: names, dayName: cleaningDaysMap.get(e.dayId) });
        }
    });
    
    qtRoster.forEach(e => {
        const d = parseDay(e.date);
        if (isValid(d) && !isBefore(d, today)) items.push({ id: e.id, date: d, title: e.personName || "QT", type: 'qt', passage: e.passage, qtTitle: e.title });
    });
    
    return items.sort((a, b) => compareAsc(a.date, b.date)).slice(0, 5);
  }, [events, cleaningRoster, qtRoster, usersMap, cleaningDaysMap]);

  return {
    currentUser,
    bibleStats,
    todaysReading,
    nextUnreadReading,
    unreadAnnouncements,
    recentChats,
    timelineItems,
    usersMap,
  };
}
