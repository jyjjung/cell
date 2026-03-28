"use client";

import { useMemo, useState, useEffect } from 'react';
import { EventCategory } from '@/types';
import { useEvents } from '@/hooks/use-events';
import { format, parseISO, isBefore, startOfToday, compareAsc, subYears, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, Cake, Coffee, Users, CalendarOff, ChevronRight, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { expandEventsToOccurrenceRows, type EventOccurrenceRow } from '@/lib/event-occurrences';

const categoryConfig: Record<EventCategory, { icon: React.ElementType; color: string; bg: string }> = {
  [EventCategory.Event]: { icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  [EventCategory.Snack]: { icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  [EventCategory.Birthday]: { icon: Cake, color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20' },
};

function EventCard({ row, index }: { row: EventOccurrenceRow; index: number }) {
  const [open, setOpen] = useState(false);
  const { event, occurrenceDate } = row;
  const eventDate = occurrenceDate;
  const rangeStart = parseISO(event.date);
  const rangeEnd = event.endDate ? parseISO(event.endDate) : null;
  const config = categoryConfig[event.category] || categoryConfig[EventCategory.Event];
  const Icon = config.icon;
  const isRecurring = event.recurrence && event.recurrence !== 'none';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      key={row.occurrenceKey}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-md hover:border-border/70 transition-all text-left group"
      >
        <div className={cn("w-14 h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center border", config.bg)}>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.color)}>{format(eventDate, 'MMM')}</span>
          <span className={cn("text-2xl font-black leading-none", config.color)}>{format(eventDate, 'd')}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <Icon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", config.color)}>{event.category}</span>
            {isRecurring && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 border border-border/40 rounded-md px-1.5 py-0.5">
                {event.recurrence === 'daily' ? 'Daily' : 'Weekly'}
              </span>
            )}
          </div>
          <p className="font-semibold text-sm">{event.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {format(eventDate, 'EEEE, MMMM do, yyyy')}
            </p>
            {!isRecurring && rangeEnd && format(rangeStart, 'yyyy-MM-dd') !== format(rangeEnd, 'yyyy-MM-dd') && (
              <span className="text-[10px] text-muted-foreground/70">
                ({format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')})
              </span>
            )}
            {!event.allDay && event.startTime && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/5 border border-primary/10">
                <Clock className="h-2.5 w-2.5" />
                <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
              </div>
            )}
            {event.allDay && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">All Day</span>}
          </div>
        </div>

        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && event.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-1 p-4 rounded-2xl bg-muted/30 border border-border/30">
              <LinkifiedText text={event.details} className="block text-sm text-muted-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MonthGroup({ month, rows }: { month: string; rows: EventOccurrenceRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-1 mb-3">{month}</p>
      {rows.map((row, i) => (
        <EventCard key={row.occurrenceKey} row={row} index={i} />
      ))}
    </div>
  );
}

export default function EventsPage() {
  const { events, loading } = useEvents();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { upcomingEventsByMonth, pastEventsByMonth } = useMemo(() => {
    const today = startOfToday();
    if (!events?.length) return { upcomingEventsByMonth: [] as [string, EventOccurrenceRow[]][], pastEventsByMonth: [] as [string, EventOccurrenceRow[]][] };

    const rows = expandEventsToOccurrenceRows(events, {
      from: subYears(today, 5),
      until: addYears(today, 4),
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
    <div className="max-w-2xl mx-auto space-y-8 pb-24">
      <PageHeader title="Events" subtitle="Community Schedule" accentColor="text-blue-500" />

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-muted/30 border border-border/30 h-11">
          <TabsTrigger value="upcoming" className="rounded-xl text-sm font-semibold">Upcoming</TabsTrigger>
          <TabsTrigger value="past" className="rounded-xl text-sm font-semibold">Past</TabsTrigger>
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
