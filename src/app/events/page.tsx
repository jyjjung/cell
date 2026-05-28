"use client";

import { useMemo, useState, useEffect } from 'react';
import { useEvents } from '@/hooks/use-events';
import { format, isBefore, startOfToday, compareAsc, subYears, addYears } from 'date-fns';
import { CalendarOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { expandEventsToOccurrenceRows, type EventOccurrenceRow } from '@/lib/event-occurrences';
import { useAuth } from '@/contexts/auth-context';
import EventOccurrenceCard from '@/components/events/event-occurrence-card';

function MonthGroup({ month, rows }: { month: string; rows: EventOccurrenceRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-micro-label !opacity-100 text-zinc-700 dark:text-zinc-300 px-1 mb-3">{month}</p>
      {rows.map((row, i) => (
        <EventOccurrenceCard key={row.occurrenceKey} row={row} index={i} />
      ))}
    </div>
  );
}

export default function EventsPage() {
  const { events, loading } = useEvents();
  const { currentUser, isAdmin } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { upcomingEventsByMonth, pastEventsByMonth } = useMemo(() => {
    const today = startOfToday();
    if (!events?.length) return { upcomingEventsByMonth: [] as [string, EventOccurrenceRow[]][], pastEventsByMonth: [] as [string, EventOccurrenceRow[]][] };

    const filteredEvents = (events || []).filter(e => {
      if (isAdmin) return true;
      if (!e.allowedRoleIds || e.allowedRoleIds.length === 0) return true;
      const userRoles = currentUser?.roleIds || [];
      return e.allowedRoleIds.some(rid => userRoles.includes(rid));
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
  }, [events]);

  if (!isMounted || loading) return null;

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Events"
      />

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="h-10">
          <TabsTrigger value="upcoming" className="rounded-md text-sm font-medium">Upcoming</TabsTrigger>
          <TabsTrigger value="past" className="rounded-md text-sm font-medium">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-8">
          {upcomingEventsByMonth.length > 0
            ? upcomingEventsByMonth.map(([month, evs]) => <MonthGroup key={`up-${month}`} month={month} rows={evs} />)
            : <EmptyState icon={CalendarOff} title="No upcoming events" description="Check back later." />}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-8 opacity-80">
          {pastEventsByMonth.length > 0
            ? pastEventsByMonth.map(([month, evs]) => <MonthGroup key={`past-${month}`} month={month} rows={evs} />)
            : <EmptyState icon={CalendarOff} title="No past events" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
