"use client";

import { useMemo, useState, useEffect } from 'react';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import type { QTRosterEntry, UserProfileData } from '@/types';
import { format, parseISO, isBefore, startOfToday, compareAsc } from 'date-fns';
import { Loader2, User, CalendarOff, BookOpen } from 'lucide-react';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LinkifiedText } from '@/components/ui/linkified-text';

export default function QTRosterPage() {
    const { roster, loading: rosterLoading } = useQTRoster();
    const { allUsers, loading: usersLoading } = useAllUsers();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    const usersMap = useMemo(() => {
        const map = new Map<string, UserProfileData>();
        allUsers.forEach(u => map.set(u.uid, u));
        return map;
    }, [allUsers]);

    const { upcomingByMonth, pastByMonth } = useMemo(() => {
        const today = startOfToday();
        const upcoming = new Map<string, QTRosterEntry[]>();
        const past = new Map<string, QTRosterEntry[]>();
        
        const sortedRoster = [...roster].sort((a,b) => compareAsc(parseISO(a.date), parseISO(b.date)));

        for(const entry of sortedRoster) {
            try {
                const entryDate = parseISO(entry.date);
                const monthYearKey = format(entryDate, 'MMMM yyyy');

                if(isBefore(entryDate, today)) {
                    if(!past.has(monthYearKey)) past.set(monthYearKey, []);
                    past.get(monthYearKey)!.push(entry);
                } else {
                    if(!upcoming.has(monthYearKey)) upcoming.set(monthYearKey, []);
                    upcoming.get(monthYearKey)!.push(entry);
                }
            } catch(e) {
                 console.error("Error processing roster entry for display:", entry, e);
            }
        }
        
        const pastArray = Array.from(past.entries()).reverse();
        pastArray.forEach(([, monthEntries]) => monthEntries.reverse());

        return { upcomingByMonth: Array.from(upcoming.entries()), pastByMonth: pastArray };

    }, [roster]);

    const QTCard = ({ entry, index }: { entry: QTRosterEntry, index: number }) => {
        const user = entry.userId ? usersMap.get(entry.userId) : undefined;
        const displayName = entry.personName || (user ? `${user.firstName} ${user.lastName}` : 'Unknown User');
        const entryDate = parseISO(entry.date);

        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-5 sm:p-6 rounded-[2rem] bg-card/20 backdrop-blur-xl border border-white/5 hover:border-primary/20 transition-all overflow-hidden"
            >
                {/* Visual Connection Line (Desktop) */}
                <div className="hidden sm:block absolute left-[2.75rem] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />

                {/* Date Side - Scaled for better mobile flow */}
                <div className="flex sm:flex-col items-center justify-start sm:justify-center w-full sm:w-14 shrink-0 sm:border-r border-white/5 sm:pr-4 gap-2 sm:gap-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{format(entryDate, 'EEE')}</p>
                    <p className="text-2xl font-black tracking-tighter text-foreground leading-none">{format(entryDate, 'd')}</p>
                </div>

                {/* Avatar & Content Block */}
                <div className="flex items-start gap-4 flex-grow min-w-0 w-full">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-muted/20 border border-white/10 shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                        {user?.avatar ? (
                            <PixelAvatar avatar={user.avatar} />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-muted">
                                <User className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                        )}
                    </div>

                    <div className="flex-grow min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h3 className="text-base font-black tracking-tight text-foreground truncate">{displayName}</h3>
                            {/* Mobile Passage (Compact) */}
                            <div className="sm:hidden flex items-center gap-1.5 text-primary">
                                <BookOpen className="h-3 w-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest font-mono">{entry.passage}</span>
                            </div>
                        </div>
                        {entry.title && (
                            <LinkifiedText 
                                text={entry.title} 
                                className="block text-xs font-medium text-muted-foreground/70 mt-1.5 leading-relaxed" 
                            />
                        )}
                    </div>
                </div>

                {/* Passage Pill (Desktop Only) */}
                <div className="hidden sm:block shrink-0 text-right">
                    <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                        <p className="text-[10px] font-black tracking-widest uppercase text-primary font-mono whitespace-nowrap">
                            {entry.passage}
                        </p>
                    </div>
                </div>
            </motion.div>
        )
    }

    const RosterMonthGroup = ({ month, entries }: { month: string, entries: QTRosterEntry[] }) => (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-black tracking-tight text-foreground/80 uppercase tracking-[0.1em]">{month}</h2>
                <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow" />
            </div>
            <div className="flex flex-col gap-4">
                {entries.map((entry, idx) => <QTCard key={entry.id} entry={entry} index={idx} />)}
            </div>
        </div>
    );
    
    if(!isMounted || rosterLoading || usersLoading) {
        return (
             <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Syncing Spiritual Matrix...</p>
                </div>
             </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto space-y-16 pb-24">
            <header className="space-y-2">
                <h1 className="text-2xl sm:text-2xl font-black tracking-tighter leading-none">QT Roster.</h1>
                <div className="flex items-center gap-2 text-primary">
                    <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Spiritual Timeline Synchronization</p>
                </div>
            </header>
            
            <div className="space-y-20">
                {roster.length > 0 ? (
                    <>
                    {upcomingByMonth.length > 0 ? (
                        upcomingByMonth.map(([month, entries]) => (
                            <RosterMonthGroup key={`upcoming-${month}`} month={month} entries={entries} />
                        ))
                    ) : (
                        <div className="py-24 text-center border-2 border-dashed border-border/50 rounded-[3rem] opacity-30">
                            <CalendarOff className="h-12 w-12 mx-auto mb-6" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Current Horizon is Clear</p>
                        </div>
                    )}
                    </>
                ) : (
                    <div className="py-24 text-center border-2 border-dashed border-border/50 rounded-[3rem] opacity-30">
                        <CalendarOff className="h-12 w-12 mx-auto mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Activation Command</p>
                    </div>
                )}
            </div>
        </div>
    )
}