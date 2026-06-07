"use client";

import { useMemo, useState } from 'react';
import { format, parseISO, startOfToday, isValid, isSameDay } from 'date-fns';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import type { AppEvent, UserProfileData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { eventOccursOnDate } from '@/lib/event-occurrences';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DayViewWidgetProps {
  events: AppEvent[];
  cleaningRoster: any[];
  qtRoster: any[];
  allUsers: UserProfileData[];
  cleaningDays: any[];
}

type TimelineItem = {
    id: string;
    date: Date;
    startTime?: string;
    endTime?: string;
    allDay: boolean;
    title: string;
    type: 'event' | 'cleaning' | 'qt';
    category?: string;
    details?: string;
    passage?: string;
    qtTitle?: string;
    assignedNames?: string;
    dayName?: string;
};

const EventItem = ({ item, onClick }: { item: TimelineItem, onClick: () => void }) => {
    const getLabel = () => {
        switch (item.type) {
            case 'cleaning':
                return "Cleaning Duty";
            case 'qt':
                return "QT Roster";
            case 'event':
            default:
                return item.category || "Event";
        }
    };

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3 rounded-2xl glass-thin hover:ring-primary/30 transition-all group text-left"
        >
            <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base tracking-tight truncate text-foreground group-hover:text-white">{item.title}</p>
                   {!item.allDay && item.startTime && (
                    <span className="text-micro-label !opacity-100 px-1.5 py-0.5 rounded-md glass-thin text-muted-foreground group-hover:text-white shrink-0 !tracking-tight">
                      {item.startTime}
                    </span>
                  )}
                </div>
                <p className="text-micro-label !opacity-100 text-zinc-700 dark:text-zinc-300 group-hover:text-white/80 !tracking-widest">{getLabel()}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-[10px] font-black uppercase text-foreground leading-none group-hover:text-white">{format(item.date, "MMM d")}</p>
                <p className="text-[9px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mt-1 tracking-tighter group-hover:text-white/70">{format(item.date, "EEEE")}</p>
            </div>
        </button>
    )
}

export default function DayViewWidget({ events, cleaningRoster, qtRoster, allUsers, cleaningDays }: DayViewWidgetProps) {
  const today = startOfToday();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);

  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
  const cleaningDaysMap = useMemo(() => new Map(cleaningDays.map(d => [d.id, d.name])), [cleaningDays]);

  const todaysItems = useMemo(() => {
    const items: TimelineItem[] = [];

    events.forEach(e => {
      if (!eventOccursOnDate(e, today)) return;
      items.push({
        id: e.id,
        date: today,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        allDay: e.allDay ?? true,
        type: 'event',
        category: e.category,
        details: e.details,
      });
    });

    cleaningRoster.forEach(e => {
      const d = parseISO(e.date);
      if (isSameDay(d, today)) {
        const firstNames = e.assignedUserIds
            .map((uid: string) => usersMap.get(uid))
            .filter(Boolean)
            .map((u) => formatUserDisplayName(u!))
            .join(', ');

        items.push({
          id: e.id,
          date: today,
          title: 'Church Cleaning',
          allDay: true,
          type: 'cleaning',
          assignedNames: firstNames,
          dayName: cleaningDaysMap.get(e.dayId)
        });
      }
    });

    qtRoster.forEach(e => {
      const d = parseISO(e.date);
      if (isSameDay(d, today)) {
        items.push({
          id: e.id,
          date: today,
          title: e.personName ? formatNameString(e.personName, 'QT Sharing') : 'QT Sharing',
          allDay: true,
          type: 'qt',
          passage: e.passage,
          qtTitle: e.title
        });
      }
    });

    return items.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      if (!a.allDay && !b.allDay && a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
  }, [events, cleaningRoster, qtRoster, today, usersMap, cleaningDaysMap]);

  if (todaysItems.length === 0) return null;

  const handleGoToEvents = () => {
    setIsPageLoading(true);
    router.push('/events');
  };

  return (
    <>
        <div className="relative p-5 rounded-[2.5rem] bg-card border border-border/50 shadow-xl overflow-hidden h-fit">
            <div className="flex items-center justify-between mb-4">
                <div className="min-w-0 px-1">
                    <h3 className="text-base font-bold tracking-tight">Today</h3>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {todaysItems.map(item => (
                            <motion.div
                                key={`${item.type}-${item.id}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <EventItem item={item} onClick={() => setSelectedItem(item)} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
            
            <div className="mt-4">
                <Button 
                    variant="outline" 
                    size="sm"
                    className="h-11 w-full rounded-2xl text-micro-label !opacity-100 !tracking-widest bg-background/50 border-border/50 hover:bg-primary hover:text-white transition-all shadow-none group" 
                    onClick={handleGoToEvents}
                >
                    Schedule View
                    <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>

        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="sm:max-w-[425px] rounded-[2.5rem]">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                                "p-2 rounded-xl bg-opacity-10",
                                selectedItem?.type === 'cleaning' ? "bg-green-500 text-green-500" : 
                                selectedItem?.type === 'qt' ? "bg-primary text-primary" : "bg-orange-500 text-orange-500"
                            )}>
                                {selectedItem?.type === 'cleaning' ? <ShieldCheck className="h-5 w-5" /> : 
                                 selectedItem?.type === 'qt' ? <BookOpenText className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                {selectedItem?.type === 'cleaning' ? 'Service Assignment' : 
                                 selectedItem?.type === 'qt' ? 'Spiritual Rota' : selectedItem?.category}
                            </span>
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight">{selectedItem?.title}</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest pt-1">
                            {selectedItem && (
                                <div className="flex flex-col gap-1">
                                    <span>
                                        {format(selectedItem.date, "EEEE, MMMM do, yyyy")}
                                    </span>
                                    {!selectedItem.allDay && selectedItem.startTime && (
                                        <span className="flex items-center gap-1.5 text-primary">
                                            <Clock className="h-3 w-3" />
                                            {selectedItem.startTime}{selectedItem.endTime ? ` - ${selectedItem.endTime}` : ''}
                                        </span>
                                    )}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        {selectedItem?.type === 'event' && selectedItem.details && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-primary">
                                    <Info className="h-4 w-4" />
                                    <h4 className="text-xs font-black uppercase tracking-widest">Details</h4>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                    {selectedItem.details}
                                </p>
                            </div>
                        )}

                        {selectedItem?.type === 'qt' && (
                            <div className="space-y-4">
                                {selectedItem.qtTitle && (
                                    <div className="glass-thin p-4 rounded-2xl">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Message Title</h4>
                                        <p className="font-bold text-lg leading-tight">{selectedItem.qtTitle}</p>
                                    </div>
                                )}
                                <div className="glass-thin flex items-center justify-between p-4 rounded-2xl">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-1">Passage</h4>
                                        <p className="font-mono text-sm font-bold">{selectedItem.passage}</p>
                                    </div>
                                    <BookOpenText className="h-6 w-6 text-primary/40" />
                                </div>
                            </div>
                        )}

                        {selectedItem?.type === 'cleaning' && (
                            <div className="space-y-4">
                                <div className="glass-thin p-4 rounded-2xl">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Day Type</h4>
                                    <p className="font-bold text-lg leading-tight">{selectedItem.dayName || 'Standard Cleaning'}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-green-500">
                                        <Users className="h-4 w-4" />
                                        <h4 className="text-xs font-black uppercase tracking-widest">Assigned Team</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-bold px-1">
                                        {selectedItem.assignedNames}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-6">
                        <Button 
                            className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest"
                            onClick={() => setSelectedItem(null)}
                        >
                            Confirm View
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
    </>
  );
}
