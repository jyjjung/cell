"use client";

import React, { useMemo } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock, Calendar, ShieldCheck, BookOpenText, Users, Info, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventOccursOnDate } from '@/lib/event-occurrences';
import type { AppEvent, CleaningRosterEntry, QTRosterEntry, UserProfileData, CleaningDay } from '@/types';
import { Card } from '@/components/ui/card';

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
        list.push({ ...e, date: selectedDate, type: 'event', label: e.category || 'Event' });
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
              <motion.button
                key={`${item.type}-${item.id || idx}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onItemClick?.(item)}
                className="w-full text-left group"
              >
                <Card className={cn(
                  "p-4 rounded-3xl bg-card/20 border-border/40 hover:bg-card/40 transition-all flex items-center gap-4 group-active:scale-[0.98] shadow-lg shadow-black/5",
                  item.type === 'cleaning' ? "border-l-4 border-l-emerald-500" : 
                  item.type === 'qt' ? "border-l-4 border-l-primary" : "border-l-4 border-l-orange-500"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-white/5",
                    item.type === 'cleaning' ? "bg-emerald-500/10 text-emerald-500" : 
                    item.type === 'qt' ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500"
                  )}>
                    {item.type === 'cleaning' ? <ShieldCheck className="w-5 h-5" /> : 
                     item.type === 'qt' ? <BookOpenText className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 mb-0.5">
                      {item.type === 'cleaning' ? 'Church Cleaning' : item.type === 'qt' ? 'Spiritual' : item.category || 'Event'}
                    </p>
                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {item.title}
                    </h4>
                    {!item.allDay && item.startTime && (
                      <p className="text-[10px] font-bold text-primary/60 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.startTime}
                      </p>
                    )}
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Card>
              </motion.button>
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
