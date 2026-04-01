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
        className="w-full flex items-center gap-4 p-5 sm:p-6 rounded-[2rem] bg-card/20 backdrop-blur-xl border border-white/5 hover:border-primary/20 transition-all text-left group shadow-lg shadow-black/5 relative overflow-hidden"
      >
        <div className={cn("w-14 h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center border shadow-inner", config.bg)}>
          <span className={cn("text-[9px] font-black uppercase tracking-widest leading-none", config.color)}>{format(eventDate, 'MMM')}</span>
          <span className={cn("text-2xl font-black leading-tight", config.color)}>{format(eventDate, 'd')}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Icon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
            <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>{event.category}</span>
            {isRecurring && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 border border-white/5 rounded-md px-1.5 py-0.5">
                {event.recurrence === 'daily' ? 'DAILY' : 'WEEKLY'}
              </span>
            )}
          </div>
          <p className="font-bold text-sm text-foreground tracking-tight">{event.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-[10px] font-medium text-muted-foreground/60">
              {format(eventDate, 'EEEE, MMMM do, yyyy')}
            </p>
            {!isRecurring && rangeEnd && format(rangeStart, 'yyyy-MM-dd') !== format(rangeEnd, 'yyyy-MM-dd') && (
              <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                ({format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')})
              </span>
            )}
            {!event.allDay && event.startTime && (
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/10">
                <Clock className="h-2.5 w-2.5" />
                <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
              </div>
            )}
            {event.allDay && <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/20">All Day</span>}
          </div>
        </div>

        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
        </motion.div>

        {/* Decorative background blob */}
        <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 blur-3xl opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity", config.bg.split(' ')[0])} />
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
            <div className="mx-6 mt-2 p-5 rounded-[1.5rem] bg-muted/20 border border-white/5 backdrop-blur-md">
              <LinkifiedText text={event.details} className="block text-sm text-muted-foreground leading-relaxed" />
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
      <p className="text-micro-label !opacity-100 text-muted-foreground/60 px-1 mb-3">{month}</p>
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
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <PageHeader 
        title="Events" 
        description="View and manage upcoming community events and schedules." 
        icon={Calendar} 
        accentColor="text-blue-500" 
        iconBgColor="bg-blue-500/10" 
      />

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
