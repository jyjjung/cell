"use client";

import { useMemo, useState, useEffect } from 'react';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import type { QTRosterEntry, UserProfileData } from '@/types';
import { format, isBefore, startOfToday, compareAsc } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import { Loader2, CalendarOff, CalendarClock, History } from 'lucide-react';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RosterFeedCard } from '@/components/ui/roster-feed-card';
import { useAuth } from '@/contexts/auth-context';
import { useGrantSecretAchievement } from '@/hooks/use-grant-secret-achievement';

export default function QTRosterPage() {
    const { currentUser } = useAuth();
    useGrantSecretAchievement('qt', !!currentUser);
    const { roster, loading: rosterLoading } = useQTRoster();
    const { allUsers, loading: usersLoading } = useAllUsers();
    const [isMounted, setIsMounted] = useState(false);
    const [searchParams] = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null);
    const targetDate = searchParams?.get('date');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted && !rosterLoading && targetDate) {
            const element = document.getElementById(`date-${targetDate}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-background');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-background');
                }, 3000);
            }
        }
    }, [isMounted, rosterLoading, targetDate]);
    
    const usersMap = useMemo(() => {
        const map = new Map<string, UserProfileData>();
        allUsers.forEach(u => map.set(u.uid, u));
        return map;
    }, [allUsers]);

    const { upcomingByMonth, pastByMonth } = useMemo(() => {
        const today = startOfToday();
        const upcoming = new Map<string, QTRosterEntry[]>();
        const past = new Map<string, QTRosterEntry[]>();
        
        const sortedRoster = [...roster].sort((a,b) => compareAsc(parseDay(a.date), parseDay(b.date)));

        for(const entry of sortedRoster) {
            try {
                const entryDate = parseDay(entry.date);
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

    if(!isMounted) return null;

    // Calculate global indices for staggered animation
    let globalIdx = 0;
    
    return (
      <div className="page-container space-y-6">
            <PageHeader 
                title="QT Roster" 
            />
            
            {(rosterLoading || usersLoading) ? (
                 <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading roster...</p>
                 </div>
            ) : (
                <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="h-10">
                        <TabsTrigger value="upcoming" className="rounded-md text-sm font-medium">Upcoming</TabsTrigger>
                        <TabsTrigger value="past" className="rounded-md text-sm font-medium">Past</TabsTrigger>
                    </TabsList>
                    {roster.length > 0 ? (
                        <>
                        <TabsContent value="upcoming" className="mt-6 space-y-8">
                            {upcomingByMonth.length > 0 ? (
                                upcomingByMonth.map(([month, entries]) => (
                                    <div key={`upcoming-${month}`} className="space-y-4">
                                        <p className="text-micro-label !opacity-100 text-muted-foreground/60 px-1">{month}</p>
                                        <div className="flex flex-col gap-3">
                                            {entries.map((entry) => {
                                                const user = entry.userId ? usersMap.get(entry.userId) : undefined;
                                                const displayName = entry.personName || (user ? `${user.firstName} ${user.lastName}` : 'Unknown User');
                                                const entryDate = parseDay(entry.date);
                                                const currentIndex = globalIdx++;

                                                return (
                                                    <div id={`date-${entry.date}`} className="scroll-mt-24 transition-all duration-700">
                                                        <RosterFeedCard
                                                            key={entry.id}
                                                            index={currentIndex}
                                                            date={entryDate}
                                                            label="QT Roster"
                                                            title={displayName}
                                                            description={(
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="text-[10px] font-medium text-muted-foreground/60">
                                                                        {format(entryDate, 'EEEE, MMMM do, yyyy')}
                                                                    </p>
                                                                    {entry.title && (
                                                                        <LinkifiedText
                                                                            text={entry.title}
                                                                            className="block text-[10px] font-medium text-muted-foreground/70 leading-relaxed"
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                            rightElement={(
                                                                <div className="bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                                                                    <p className="text-[9px] font-black uppercase tracking-wider text-primary font-mono whitespace-nowrap">
                                                                        {entry.passage || '—'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        />
                                                    </div>
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
                        </TabsContent>
                        <TabsContent value="past" className="mt-6 space-y-8 opacity-80">
                            {pastByMonth.length > 0 ? (
                                pastByMonth.map(([month, entries]) => (
                                    <div key={`past-${month}`} className="space-y-4">
                                        <p className="text-micro-label !opacity-100 text-muted-foreground/60 px-1">{month}</p>
                                        <div className="flex flex-col gap-3">
                                            {entries.map((entry) => {
                                                const user = entry.userId ? usersMap.get(entry.userId) : undefined;
                                                const displayName = entry.personName || (user ? `${user.firstName} ${user.lastName}` : 'Unknown User');
                                                const entryDate = parseDay(entry.date);
                                                const currentIndex = globalIdx++;

                                                return (
                                                    <RosterFeedCard
                                                        key={`past-${entry.id}`}
                                                        index={currentIndex}
                                                        date={entryDate}
                                                        label="QT Roster"
                                                        title={displayName}
                                                        description={
                                                            <p className="text-[10px] font-medium text-muted-foreground/60">
                                                                {format(entryDate, 'EEEE, MMMM do, yyyy')}
                                                            </p>
                                                        }
                                                        rightElement={
                                                            <div className="bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                                                                <p className="text-[9px] font-black uppercase tracking-wider text-primary font-mono whitespace-nowrap">
                                                                    {entry.passage || '—'}
                                                                </p>
                                                            </div>
                                                        }
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState 
                                    icon={CalendarOff} 
                                    title="No past QT roster entries" 
                                />
                            )}
                        </TabsContent>
                        </>
                    ) : (
                        <EmptyState 
                            icon={CalendarOff} 
                            title="Awaiting Activation Command" 
                        />
                    )}
                </Tabs>
            )}
        </div>
    )
}