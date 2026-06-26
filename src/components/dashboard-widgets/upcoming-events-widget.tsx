"use client";

import { useMemo, useState } from 'react';
import { useEvents } from '@/hooks/use-events';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { parseISO, startOfToday, isValid, format, compareAsc, addDays, isAfter } from 'date-fns';
import { nextOccurrenceOnOrAfter } from '@/lib/event-occurrences';
import { Loader2, Calendar, Users, BookOpenText, CalendarOff, ArrowRight, ShieldCheck, Info, Clock } from 'lucide-react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/lib/translations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type TimelineItem = {
    id: string;
    date: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    allDay: boolean;
    title: string;
    type: 'event' | 'cleaning' | 'qt';
    category?: EventCategory;
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
            className="surface-row w-full hover:ring-primary/20 transition-all group text-left"
        >
            <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate text-foreground">{item.title}</p>
                   {!item.allDay && item.startTime && (
                    <span className="text-micro-label px-1.5 py-0.5 rounded-md glass-thin shrink-0">
                      {item.startTime}
                    </span>
                  )}
                </div>
                <p className="text-micro-label">{getLabel()}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-foreground leading-none">{format(item.date, "MMM d")}</p>
                <p className="text-micro-label mt-0.5">{format(item.date, "EEE")}</p>
            </div>
        </button>
    )
}

export default function UpcomingEventsWidget() {
    const { currentUser } = useAuth();
    const t = translations[currentUser?.preferredLanguage || 'en'];
    const { events, loading: loadingEvents } = useEvents();
    const { roster: cleaningRoster, loading: loadingCleaning } = useCleaningRoster();
    const { cleaningDays } = useCleaningDays();
    const { roster: qtRoster, loading: loadingQT } = useQTRoster();
    const { allUsers, loading: loadingUsers } = useAllUsers();
    
    const router = useRouter();
    const { setIsPageLoading } = usePageLoading();

    const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);

    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
    const cleaningDaysMap = useMemo(() => new Map(cleaningDays.map(d => [d.id, d.name])), [cleaningDays]);

    const timelineItems = useMemo(() => {
        const today = startOfToday();
        const items: TimelineItem[] = [];

        events.forEach(event => {
            const next = nextOccurrenceOnOrAfter(event, addDays(today, 1));
            if (!next) return;
            const start = parseISO(event.date);
            const endDate = event.endDate ? parseISO(event.endDate) : undefined;
            if (!isValid(start)) return;

            items.push({
                id: event.id,
                date: next,
                endDate,
                startTime: event.startTime,
                endTime: event.endTime,
                allDay: event.allDay ?? true,
                title: event.title,
                type: 'event',
                category: event.category as EventCategory,
                details: event.details,
            });
        });

        cleaningRoster.forEach(entry => {
            const date = parseISO(entry.date);
            if (isValid(date) && isAfter(date, today)) {
                const firstNames = entry.assignedUserIds
                    .map(uid => usersMap.get(uid))
                    .filter(Boolean)
                    .map(u => formatUserDisplayName(u!))
                    .join(', ');

                items.push({ 
                    id: entry.id, 
                    date, 
                    allDay: true,
                    title: firstNames || t.churchCleaning, 
                    type: 'cleaning',
                    assignedNames: firstNames,
                    dayName: cleaningDaysMap.get(entry.dayId)
                });
            }
        });

        qtRoster.forEach(entry => {
            const date = parseISO(entry.date);
            if (isValid(date) && isAfter(date, today)) {
                items.push({ 
                    id: entry.id, 
                    date, 
                    allDay: true,
                    title: entry.personName ? formatNameString(entry.personName, t.qtSharing) : t.qtSharing, 
                    type: 'qt',
                    passage: entry.passage,
                    qtTitle: entry.title
                });
            }
        });

        return items.sort((a, b) => compareAsc(a.date, b.date)).slice(0, 5);
    }, [events, cleaningRoster, qtRoster, usersMap, cleaningDaysMap, t]);

    const handleGoToEvents = () => {
        setIsPageLoading(true);
        router.push('/events');
    };

    const loading = loadingEvents || loadingCleaning || loadingQT || loadingUsers;

    return (
        <>
            <div className="widget-surface relative h-fit overflow-hidden">
                <div className="panel-header">
                    <div className="min-w-0">
                        <h3 className="panel-title">{t.timelineTitle}</h3>
                        <p className="panel-subtitle">{t.communitySchedule}</p>
                    </div>
                </div>

                <div className="stack-gap-sm mb-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-40" />
                        </div>
                    ) : timelineItems.length === 0 ? (
                        <div className="empty-inline">
                            <CalendarOff className="h-6 w-6 mb-2 text-muted-foreground" />
                            <p>{t.horizonIsClear}</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {timelineItems.map(item => (
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
                    )}
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
                                        {selectedItem.endDate 
                                            ? `${format(selectedItem.date, "MMM d")} - ${format(selectedItem.endDate, "MMM d, yyyy")}`
                                            : format(selectedItem.date, "EEEE, MMMM do, yyyy")}
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
