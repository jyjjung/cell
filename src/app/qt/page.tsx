"use client";

import { useMemo, useState, useEffect } from 'react';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import type { QTRosterEntry, UserProfileData } from '@/types';
import { format, parseISO, isBefore, startOfToday, compareAsc } from 'date-fns';
import { Loader2, User, CalendarOff, BookOpen, Calendar } from 'lucide-react';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { RosterCard } from '@/components/ui/roster-card';

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

    const RosterMonthGroup = ({ month, entries }: { month: string, entries: QTRosterEntry[] }) => (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <h2 className="text-section-title text-foreground/80">{month}</h2>
                <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow" />
            </div>
            <div className="flex flex-col gap-4">
                {entries.map((entry, idx) => {
                    const user = entry.userId ? usersMap.get(entry.userId) : undefined;
                    const displayName = entry.personName || (user ? `${user.firstName} ${user.lastName}` : 'Unknown User');
                    const entryDate = parseISO(entry.date);

                    return (
                        <RosterCard 
                            key={entry.id}
                            index={idx}
                            date={entryDate}
                            title={displayName}
                            subtitle={entry.title && (
                                <LinkifiedText 
                                    text={entry.title} 
                                    className="block text-xs font-medium text-muted-foreground/70 mt-1.5 leading-relaxed" 
                                />
                            )}
                            users={user ? [user] : []}
                            rightElement={(
                                <div className="shrink-0">
                                    <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                                        <p className="text-micro-label text-primary font-mono whitespace-nowrap !opacity-100 tracking-tight">
                                            {entry.passage}
                                        </p>
                                    </div>
                                </div>
                            )}
                        />
                    );
                })}
            </div>
        </div>
    );
    
    if(!isMounted) return null;

    // Calculate global indices for staggered animation
    let globalIdx = 0;
    
    return (
      <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
            <PageHeader 
                title="QT Roster" 
                subtitle="Spiritual Timeline Synchronization"
                icon={Calendar}
                accentColor="text-primary"
                iconBgColor="bg-primary/10"
            />
            
            {(rosterLoading || usersLoading) ? (
                 <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                    <p className="text-micro-label !opacity-100 opacity-40">Syncing Spiritual Matrix...</p>
                 </div>
            ) : (
                <div className="space-y-20">
                    {roster.length > 0 ? (
                        <>
                        {upcomingByMonth.length > 0 ? (
                            upcomingByMonth.map(([month, entries]) => (
                                <div key={`upcoming-${month}`} className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-section-title text-foreground/80">{month}</h2>
                                        <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow" />
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        {entries.map((entry) => {
                                            const user = entry.userId ? usersMap.get(entry.userId) : undefined;
                                            const displayName = entry.personName || (user ? `${user.firstName} ${user.lastName}` : 'Unknown User');
                                            const entryDate = parseISO(entry.date);
                                            const currentIndex = globalIdx++;

                                            return (
                                                <RosterCard 
                                                    key={entry.id}
                                                    index={currentIndex}
                                                    date={entryDate}
                                                    title={displayName}
                                                    subtitle={entry.title && (
                                                        <LinkifiedText 
                                                            text={entry.title} 
                                                            className="block text-xs font-medium text-muted-foreground/70 mt-1.5 leading-relaxed" 
                                                        />
                                                    )}
                                                    users={user ? [user] : []}
                                                    rightElement={(
                                                        <div className="shrink-0">
                                                            <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                                                                <p className="text-micro-label text-primary font-mono whitespace-nowrap !opacity-100 tracking-tight">
                                                                    {entry.passage}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState 
                                icon={CalendarOff} 
                                title="Current Horizon is Clear" 
                            />
                        )}
                        </>
                    ) : (
                        <EmptyState 
                            icon={CalendarOff} 
                            title="Awaiting Activation Command" 
                        />
                    )}
                </div>
            )}
        </div>
    )
}