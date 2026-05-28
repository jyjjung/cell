"use client";

import React, { useMemo } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock, Calendar, ShieldCheck, BookOpenText, Users, Info, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventOccursOnDate, type EventOccurrenceRow } from '@/lib/event-occurrences';
import type { AppEvent, CleaningRosterEntry, QTRosterEntry, UserProfileData, CleaningDay } from '@/types';
import EventOccurrenceCard from '@/components/events/event-occurrence-card';

interface AgendaViewProps {
  selectedDate: Date;
  events: AppEvent[];
  cleaningRoster: CleaningRosterEntry[];
  qtRoster: QTRosterEntry[];
  allUsers: UserProfileData[];
  cleaningDays: CleaningDay[];
  onItemClick?: (item: any) => void;
}

export default function AgendaView({
  selectedDate,
  events,
  cleaningRoster,
  qtRoster,
  allUsers,
  cleaningDays,
  onItemClick,
}: AgendaViewProps) {
  
  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
  const cleaningDaysMap = useMemo(() => new Map(cleaningDays.map(d => [d.id, d.name])), [cleaningDays]);

  const items = useMemo(() => {
    const list: any[] = [];

    // Events
    events.forEach(e => {
      if (eventOccursOnDate(e, selectedDate)) {
        const row: EventOccurrenceRow = {
          event: e,
          occurrenceDate: selectedDate,
          occurrenceKey: `${e.id}-${format(selectedDate, 'yyyy-MM-dd')}`,
        };
        list.push({ kind: 'event', row });
      }
    });

    // Cleaning
    cleaningRoster.forEach(r => {
      if (isSameDay(parseISO(r.date), selectedDate)) {
        const names = r.assignedUserIds.map(id => usersMap.get(id)?.firstName).filter(Boolean).join(', ');
        list.push({ ...r, date: selectedDate, type: 'cleaning', title: names || 'Church Cleaning', assignedNames: names, dayName: cleaningDaysMap.get(r.dayId) });
      }
    });

    // QT
    qtRoster.forEach(r => {
      if (isSameDay(parseISO(r.date), selectedDate)) {
        list.push({ ...r, date: selectedDate, type: 'qt', label: 'QT Roster', title: r.personName || 'QT Sharing', qtTitle: r.title });
      }
    });

    return list.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      if (!a.allDay && !b.allDay && a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
  }, [selectedDate, events, cleaningRoster, qtRoster, usersMap, cleaningDaysMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-base font-black uppercase tracking-[0.25em] text-foreground/40">
          {format(selectedDate, 'EEEE, MMM d')}
        </h3>
        <div className="h-px flex-1 bg-border/40 ml-4" />
      </div>

      <div className="space-y-3 min-h-[120px]">
        <AnimatePresence mode="popLayout">
          {items.length > 0 ? (
            items.map((item, idx) => (
              item.kind === 'event' ? (
                <EventOccurrenceCard
                  key={item.row.occurrenceKey}
                  row={item.row}
                  index={idx}
                  className="glass-card"
                />
              ) : (
              <motion.button
                key={`${item.type}-${item.id || idx}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onItemClick?.(item)}
                className={`glass-card w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] group ${
                  item.type === 'cleaning' ? 'ring-1 ring-emerald-500/25' : 
                  item.type === 'qt' ? 'ring-1 ring-primary/25' : 
                  'ring-1 ring-sky-500/25'
                }`}
              >
                <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-background/60 border border-white/5 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                    {format(selectedDate, 'MMM')}
                  </span>
                  <span className={`text-lg font-black leading-tight ${
                    item.type === 'cleaning' ? 'text-emerald-500' : 
                    item.type === 'qt' ? 'text-primary' : 
                    'text-sky-500'
                  }`}>
                    {format(selectedDate, 'd')}
                  </span>
                </div>

                <div className={`shrink-0 p-2 rounded-xl bg-background/60 border border-white/5 shadow-sm ${
                  item.type === 'cleaning' ? 'text-emerald-500' : 
                  item.type === 'qt' ? 'text-primary' : 
                  'text-sky-500'
                }`}>
                  {item.type === 'cleaning' ? <ShieldCheck className="w-4 h-4" /> : 
                   item.type === 'qt' ? <BookOpenText className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                       {item.type === 'cleaning' ? 'Cleaning' : item.type === 'qt' ? 'QT Sharing' : item.category || 'Event'}
                    </p>
                    {isSameDay(selectedDate, new Date()) && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                        item.type === 'cleaning' ? 'bg-emerald-500/10 text-emerald-500' : 
                        item.type === 'qt' ? 'bg-primary/10 text-primary' : 
                        'bg-sky-500/10 text-sky-500'
                      }`}>
                        Today
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm truncate">{item.title}</p>
                  {(!item.allDay && item.startTime) ? (
                    <p className="text-xs text-muted-foreground font-medium truncate flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.startTime}
                    </p>
                  ) : item.type === 'cleaning' && item.assignedNames ? (
                    <p className="text-xs text-muted-foreground font-medium truncate">{item.assignedNames}</p>
                  ) : item.type === 'qt' && item.qtTitle ? (
                    <p className="text-xs text-muted-foreground font-medium truncate">{item.qtTitle}</p>
                  ) : item.details ? (
                    <p className="text-xs text-muted-foreground font-medium truncate">{item.details}</p>
                  ) : null}
                </div>
                
                <ChevronRight className="shrink-0 h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
              </motion.button>
              )
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Clear Schedule</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1 uppercase tracking-tight">Nothing planned for this day yet.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
