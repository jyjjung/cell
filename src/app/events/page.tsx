"use client";

import { useMemo, useState, useEffect } from 'react';
import { useEvents } from '@/hooks/use-events';
import { format, isBefore, startOfToday, compareAsc, subYears, addYears } from 'date-fns';
import { CalendarOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { expandEventsToOccurrenceRows, type EventOccurrenceRow } from '@/lib/event-occurrences';
import { userCanSeeEvent } from '@/lib/event-visibility';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import EventOccurrenceCard from '@/components/events/event-occurrence-card';
import { ScheduleListSkeleton, ScheduleMonthGroup } from '@/components/schedule/schedule-occurrence-row';

function MonthGroup({ month, rows }: { month: string; rows: EventOccurrenceRow[] }) {
  return (
    <ScheduleMonthGroup month={month}>
      {rows.map((row, i) => (
        <EventOccurrenceCard key={row.occurrenceKey} row={row} index={i} />
      ))}
    </ScheduleMonthGroup>
  );
}

export default function EventsPage() {
  const { events, loading } = useEvents();
  const { currentUser, isAdmin } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  const { upcomingEventsByMonth, pastEventsByMonth } = useMemo(() => {
    const today = startOfToday();
    if (!events?.length) return { upcomingEventsByMonth: [] as [string, EventOccurrenceRow[]][], pastEventsByMonth: [] as [string, EventOccurrenceRow[]][] };

    const filteredEvents = (events || []).filter((e) => {
      if (isAdmin) return true;
      if (!currentUser) return !e.allowedRoleIds?.length;
      return userCanSeeEvent(currentUser, e);
    });

    const rows = expandEventsToOccurrenceRows(filteredEvents, {
      from: subYears(today, 1),
      until: addYears(today, 1),
    });

    const upcomingRows = rows.filter((r) => !isBefore(r.occurrenceDate, today));
    const pastRows = rows.filter((r) => isBefore(r.occurrenceDate, today));

    const groupRows = (list: EventOccurrenceRow[], ascendingMonth: boolean) => {
      const map = new Map<string, EventOccurrenceRow[]>();
      list.forEach((row) => {
        const key = format(row.occurrenceDate, 'MMMM yyyy');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row);
      });
      map.forEach((listInMonth) => {
        listInMonth.sort((a, b) =>
          ascendingMonth
            ? compareAsc(a.occurrenceDate, b.occurrenceDate)
            : compareAsc(b.occurrenceDate, a.occurrenceDate)
        );
      });
      const entries = Array.from(map.entries());
      entries.sort((a, b) => {
        const da = a[1][0].occurrenceDate;
        const db = b[1][0].occurrenceDate;
        return ascendingMonth ? compareAsc(da, db) : compareAsc(db, da);
      });
      return entries;
    };

    return {
      upcomingEventsByMonth: groupRows(upcomingRows, true),
      pastEventsByMonth: groupRows(pastRows, false),
    };
  }, [events, currentUser, isAdmin]);

  if (!isMounted || loading) {
    return (
      <div className="page-container">
        <NavPageHeader />
        <ScheduleListSkeleton />
      </div>
    );
  }

  return (
    <div className="page-container">
      <NavPageHeader />

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="upcoming" className="rounded-md text-sm">{t.upcoming}</TabsTrigger>
          <TabsTrigger value="past" className="rounded-md text-sm">{t.past}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 stack-gap-sm">
          {upcomingEventsByMonth.length > 0
            ? upcomingEventsByMonth.map(([month, evs]) => <MonthGroup key={`up-${month}`} month={month} rows={evs} />)
            : <EmptyState icon={CalendarOff} title={t.noUpcomingEvents} description={t.checkBackLater} />}
        </TabsContent>

        <TabsContent value="past" className="mt-4 stack-gap-sm opacity-80">
          {pastEventsByMonth.length > 0
            ? pastEventsByMonth.map(([month, evs]) => <MonthGroup key={`past-${month}`} month={month} rows={evs} />)
            : <EmptyState icon={CalendarOff} title={t.noPastEvents} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
