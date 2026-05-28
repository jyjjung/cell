
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useAllUsers } from '@/hooks/use-all-users';
import type { CleaningRosterEntry, UserProfileData } from '@/types';
import { startOfToday, format, compareAsc, isBefore } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import { Loader2, ListTodo, ShieldCheck, CalendarClock, History } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RosterFeedCard } from '@/components/ui/roster-feed-card';

export default function CleaningRosterPage() {
    const { currentUser } = useAuth();
    const { roster, loading: rosterLoading } = useCleaningRoster();
    const { cleaningDays, loading: daysLoading } = useCleaningDays();
    const { allUsers, loading: usersLoading } = useAllUsers();
    const [isMounted, setIsMounted] = useState(false);
    const t = translations[currentUser?.preferredLanguage || 'en'];
    const [searchParams] = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null);
    const targetDate = searchParams?.get('date');

    useEffect(() => { setIsMounted(true); }, []);

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
    
    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
    const daysMap = useMemo(() => new Map(cleaningDays.map(d => [d.id, d.name])), [cleaningDays]);

    const { upcoming, past } = useMemo(() => {
        const today = startOfToday();
        const upcomingEntries: CleaningRosterEntry[] = [];
        const pastEntries: CleaningRosterEntry[] = [];
        
        const sortedRoster = [...roster].sort((a,b) => compareAsc(parseDay(a.date), parseDay(b.date)));

        for(const entry of sortedRoster) {
            try {
                if(isBefore(parseDay(entry.date), today)) {
                    pastEntries.push(entry);
                } else {
                    upcomingEntries.push(entry);
                }
            } catch(e) {
                 console.error("Error processing roster entry for display:", entry, e);
            }
        }
        
        pastEntries.reverse(); // Show most recent past entries first

        return { upcoming: upcomingEntries, past: pastEntries };
    }, [roster]);

    if (!isMounted) return null;

    let globalIdx = 0;

    return (
        <div className="page-container space-y-6">
            <PageHeader 
                title={t.cleaningRosterTitle} 
            />
            
            {(rosterLoading || daysLoading || usersLoading) ? (
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
                        <TabsContent value="upcoming" className="mt-6 space-y-4">
                            {upcoming.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {upcoming.map((entry) => {
                                        const dayName = daysMap.get(entry.dayId) || 'Unknown Day';
                                        const assignedUsers = entry.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];
                                        const completer = entry.completedBy ? usersMap.get(entry.completedBy) : null;
                                        
                                        const currentIndex = globalIdx++;

                                        return (
                                            <div key={entry.id} id={`date-${entry.date}`} className="scroll-mt-24 transition-all duration-700">
                                                <RosterFeedCard 
                                                    key={entry.id}
                                                    index={currentIndex}
                                                    date={parseDay(entry.date)}
                                                    label="Cleaning Roster"
                                                    title={dayName}
                                                    description={(
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-[10px] font-medium text-muted-foreground/60">
                                                                {format(parseDay(entry.date), 'EEEE, MMMM do, yyyy')}
                                                            </p>
                                                            {assignedUsers.map((user, uidx) => (
                                                                <span key={user.uid} className="text-[10px] font-medium text-muted-foreground/70">
                                                                    {user.firstName}{uidx < assignedUsers.length - 1 ? ',' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    rightElement={
                                                        <div className="bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                                                            <p className="text-[9px] font-black uppercase tracking-wider text-primary whitespace-nowrap">
                                                                {entry.isCompleted ? `Completed${completer ? ` by ${completer.firstName}` : ''}` : 'Scheduled'}
                                                            </p>
                                                        </div>
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState 
                                    icon={ShieldCheck} 
                                    title={t.allClean} 
                                    description={t.noUpcomingCleaning}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="past" className="mt-6 space-y-4 opacity-80">
                            {past.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {past.slice(0, 10).map((entry) => {
                                        const dayName = daysMap.get(entry.dayId) || 'Unknown Day';
                                        const assignedUsers = entry.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];
                                        const completer = entry.completedBy ? usersMap.get(entry.completedBy) : null;
                                        
                                        const currentIndex = globalIdx++;

                                        return (
                                            <RosterFeedCard 
                                                key={entry.id}
                                                index={currentIndex}
                                                date={parseDay(entry.date)}
                                                label="Cleaning Roster"
                                                title={dayName}
                                                description={(
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-[10px] font-medium text-muted-foreground/60">
                                                            {format(parseDay(entry.date), 'EEEE, MMMM do, yyyy')}
                                                        </p>
                                                        {assignedUsers.map((user, uidx) => (
                                                            <span key={user.uid} className="text-[10px] font-medium text-muted-foreground/70">
                                                                {user.firstName}{uidx < assignedUsers.length - 1 ? ',' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                rightElement={
                                                    <div className="bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                                                        <p className="text-[9px] font-black uppercase tracking-wider text-primary whitespace-nowrap">
                                                            {entry.isCompleted ? `Completed${completer ? ` by ${completer.firstName}` : ''}` : 'Scheduled'}
                                                        </p>
                                                    </div>
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={ListTodo}
                                    title="No past cleaning entries"
                                />
                            )}
                        </TabsContent>
                        </>
                    ) : (
                        <EmptyState 
                            icon={ListTodo} 
                            title={t.rosterNotSet} 
                            description={t.rosterNotCreated}
                        />
                    )}
                </Tabs>
            )}
            <BackToTopButton />
        </div>
    );
}
