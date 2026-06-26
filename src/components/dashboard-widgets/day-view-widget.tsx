"use client";

import { useMemo, useState } from 'react';
import { format, parseISO, startOfToday, isSameDay } from 'date-fns';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import type { AppEvent, UserProfileData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { eventOccursOnDate } from '@/lib/event-occurrences';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import {
  ArrowRight,
  ShieldCheck,
  BookOpenText,
  Calendar,
  Clock,
  Users,
  Info,
} from 'lucide-react';
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

type EventItemProps = {
    item: TimelineItem;
    onClick: () => void;
    t: Record<string, any>;
};

const EventItem = ({ item, onClick, t }: EventItemProps) => {
    const getLabel = () => {
        switch (item.type) {
            case 'cleaning':
                return t.cleaningDuty;
            case 'qt':
                return t.qtRoster;
            case 'event':
            default:
                return item.category || t.eventLabel;
        }
    };

    return (
        <button
            onClick={onClick}
            className="event-row group"
        >
            <span className="event-row-time">
              {!item.allDay && item.startTime ? item.startTime : '—'}
            </span>
            <div className="event-row-body">
                <p className="event-row-title">{item.title}</p>
                <p className="event-row-meta">{getLabel()}</p>
            </div>
        </button>
    )
}

export default function DayViewWidget({ events, cleaningRoster, qtRoster, allUsers, cleaningDays }: DayViewWidgetProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
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
            .map((u: UserProfileData) => formatUserDisplayName(u!))
            .join(', ');

        items.push({
          id: e.id,
          date: today,
          title: t.churchCleaning,
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
          title: e.personName ? formatNameString(e.personName, t.qtSharing) : t.qtSharing,
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
  }, [events, cleaningRoster, qtRoster, today, usersMap, cleaningDaysMap, t]);

  if (todaysItems.length === 0) return null;

  const handleGoToEvents = () => {
    setIsPageLoading(true);
    router.push('/events');
  };

  return (
    <>
        <div className="flow-section">
            <div className="section-heading">
                <h3 className="section-heading-title">{t.todayLabel}</h3>
            </div>

            <div className="data-table mb-2">
                <AnimatePresence mode="popLayout">
                    {todaysItems.map(item => (
                        <motion.div
                            key={`${item.type}-${item.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <EventItem item={item} onClick={() => setSelectedItem(item)} t={t} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={handleGoToEvents}
            >
                {t.scheduleView}
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
        </div>

        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                                "p-2 rounded-lg",
                                selectedItem?.type === 'cleaning' ? "bg-green-500/10 text-green-500" : 
                                selectedItem?.type === 'qt' ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500"
                            )}>
                                {selectedItem?.type === 'cleaning' ? <ShieldCheck className="h-5 w-5" /> : 
                                 selectedItem?.type === 'qt' ? <BookOpenText className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                            </div>
                            <span className="text-micro-label">
                                {selectedItem?.type === 'cleaning' ? t.cleaningDuty : 
                                 selectedItem?.type === 'qt' ? t.qtRoster : selectedItem?.category}
                            </span>
                        </div>
                        <DialogTitle className="text-section-title">{selectedItem?.title}</DialogTitle>
                        <DialogDescription className="text-micro-label pt-1">
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

                    <div className="stack-gap pt-3">
                        {selectedItem?.type === 'event' && selectedItem.details && (
                            <div className="stack-gap-sm">
                                <div className="flex items-center gap-2 text-primary">
                                    <Info className="h-4 w-4" />
                                    <h4 className="text-micro-label font-semibold text-foreground">{t.details}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {selectedItem.details}
                                </p>
                            </div>
                        )}

                        {selectedItem?.type === 'qt' && (
                            <div className="stack-gap-sm">
                                {selectedItem.qtTitle && (
                                    <div className="glass-thin p-3 rounded-lg">
                                        <h4 className="text-micro-label mb-1">{t.topic}</h4>
                                        <p className="font-semibold text-sm leading-tight">{selectedItem.qtTitle}</p>
                                    </div>
                                )}
                                <div className="glass-thin flex items-center justify-between p-3 rounded-lg">
                                    <div>
                                        <h4 className="text-micro-label text-primary mb-1">{t.passage}</h4>
                                        <p className="font-mono text-sm font-medium">{selectedItem.passage}</p>
                                    </div>
                                    <BookOpenText className="h-5 w-5 text-primary/40" />
                                </div>
                            </div>
                        )}

                        {selectedItem?.type === 'cleaning' && (
                            <div className="stack-gap-sm">
                                <div className="glass-thin p-3 rounded-lg">
                                    <h4 className="text-micro-label mb-1">{t.dayType}</h4>
                                    <p className="font-semibold text-sm leading-tight">{selectedItem.dayName || t.standardCleaning}</p>
                                </div>
                                <div className="stack-gap-sm">
                                    <div className="flex items-center gap-2 text-green-500">
                                        <Users className="h-4 w-4" />
                                        <h4 className="text-micro-label font-semibold text-foreground">{t.team}</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground px-1">
                                        {selectedItem.assignedNames}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-3">
                        <Button 
                            className="w-full"
                            onClick={() => setSelectedItem(null)}
                        >
                            {t.confirm}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
    </>
  );
}
