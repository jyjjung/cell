"use client";

import { useMemo, useState } from 'react';
import { useEvents } from '@/hooks/use-events';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { isBefore, parseISO, startOfToday, isValid, format, compareAsc } from 'date-fns';
import { Loader2, Calendar, Users, Coffee, Cake, CalendarOff, ArrowRight, ShieldCheck, BookOpenText, Info } from 'lucide-react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
    title: string;
    type: 'event' | 'cleaning' | 'qt';
    category?: EventCategory;
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
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-transparent hover:bg-green-500 transition-all group text-left"
        >
            <div className="flex-grow min-w-0">
                <p className="font-bold text-base tracking-tight truncate text-foreground group-hover:text-white">{item.title}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover:text-white/80">{getLabel()}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-[10px] font-black uppercase text-foreground leading-none group-hover:text-white">{format(item.date, "MMM d")}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter group-hover:text-white/70">{format(item.date, "EEEE")}</p>
            </div>
        </button>
    )
}

export default function UpcomingEventsWidget() {
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

        // Add regular events
        events.forEach(event => {
            const date = parseISO(event.date);
            if (isValid(date) && !isBefore(date, today)) {
                items.push({ 
                    id: event.id, 
                    date, 
                    title: event.title, 
                    type: 'event', 
                    category: event.category,
                    details: event.details || event.summary 
                });
            }
        });

        // Add cleaning duties
        cleaningRoster.forEach(entry => {
            const date = parseISO(entry.date);
            if (isValid(date) && !isBefore(date, today)) {
                const firstNames = entry.assignedUserIds
                    .map(uid => usersMap.get(uid))
                    .filter(Boolean)
                    .map(u => u!.firstName)
                    .join(', ');

                items.push({ 
                    id: entry.id, 
                    date, 
                    title: firstNames || "Church Cleaning", 
                    type: 'cleaning',
                    assignedNames: firstNames,
                    dayName: cleaningDaysMap.get(entry.dayId)
                });
            }
        });

        // Add QT assignments
        qtRoster.forEach(entry => {
            const date = parseISO(entry.date);
            if (isValid(date) && !isBefore(date, today)) {
                items.push({ 
                    id: entry.id, 
                    date, 
                    title: entry.personName || "QT Sharing", 
                    type: 'qt',
                    passage: entry.passage,
                    qtTitle: entry.title
                });
            }
        });

        return items.sort((a, b) => compareAsc(a.date, b.date)).slice(0, 5);
    }, [events, cleaningRoster, qtRoster, usersMap, cleaningDaysMap]);

    const handleGoToEvents = () => {
        setIsPageLoading(true);
        router.push('/events');
    };

    const loading = loadingEvents || loadingCleaning || loadingQT || loadingUsers;

    return (
        <>
            <div className="relative p-6 md:p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-xl overflow-hidden h-fit">
                <div className="flex items-center justify-between mb-6">
                    <div className="min-w-0">
                        <h3 className="text-lg font-black tracking-tight">Timeline</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Community Schedule</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500 shadow-inner">
                        <Calendar className="h-5 w-5" />
                    </div>
                </div>

                <div className="space-y-3 mb-6 min-h-[120px]">
                    {loading ? (
                        <div className="h-32 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-20" />
                        </div>
                    ) : timelineItems.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-center opacity-40 py-4">
                            <CalendarOff className="h-8 w-8 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Clear Roster</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {timelineItems.map(item => (
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
                    )}
                </div>
                
                <div className="mt-8">
                    <Button 
                        variant="outline" 
                        className="h-12 w-full rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-background/50 border-border/50 hover:bg-green-500 hover:text-white transition-all shadow-none group" 
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
                            {selectedItem && format(selectedItem.date, "EEEE, MMMM do, yyyy")}
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
                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Message Title</h4>
                                        <p className="font-bold text-lg leading-tight">{selectedItem.qtTitle}</p>
                                    </div>
                                )}
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
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
                                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
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