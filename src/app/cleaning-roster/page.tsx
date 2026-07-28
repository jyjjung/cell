
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useAllUsers } from '@/hooks/use-all-users';
import type { CleaningRosterEntry, UserProfileData } from '@/types';
import { startOfToday, format, compareAsc, isBefore } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import { Loader2, ListTodo, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RosterFeedCard } from '@/components/ui/roster-feed-card';
import { formatUserDisplayName } from '@/lib/formatting';

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
                element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
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
        
        pastEntries.reverse();

        return { upcoming: upcomingEntries, past: pastEntries };
    }, [roster]);

    if (!isMounted) return null;

    let globalIdx = 0;

    const statusLabel = (entry: CleaningRosterEntry, completer: UserProfileData | null | undefined) => {
        if (entry.isCompleted) {
            return completer ? `${t.done} ${formatUserDisplayName(completer)}` : t.done;
        }
        return t.scheduled;
    };

    return (
        <div className="page-container">
            <NavPageHeader />
            
            {(rosterLoading || daysLoading || usersLoading) ? (
                 <div className="empty-inline py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">{t.loadingRoster}</p>
                 </div>
            ) : (
                <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="h-9">
                        <TabsTrigger value="upcoming" className="rounded-md text-sm">{t.upcoming}</TabsTrigger>
                        <TabsTrigger value="past" className="rounded-md text-sm">{t.past}</TabsTrigger>
                    </TabsList>
                    {roster.length > 0 ? (
                        <>
                        <TabsContent value="upcoming" className="mt-4 stack-gap-sm">
                            {upcoming.length > 0 ? (
                                <div className="ui-card !p-0">
                                  <div className="ui-list px-2">
                                    {upcoming.map((entry) => {
                                        const dayName = daysMap.get(entry.dayId) || t.unknownDay;
                                        const assignedUsers = entry.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];
                                        const completer = entry.completedBy ? usersMap.get(entry.completedBy) : null;
                                        const currentIndex = globalIdx++;

                                        return (
                                            <div key={entry.id} id={`date-${entry.date}`} className="scroll-mt-20">
                                                <RosterFeedCard 
                                                    index={currentIndex}
                                                    date={parseDay(entry.date)}
                                                    label={t.cleaningRosterTitle}
                                                    title={dayName}
                                                    description={(
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                            <span>{format(parseDay(entry.date), 'EEE')}</span>
                                                            {assignedUsers.map((user, uidx) => (
                                                                <span key={user.uid}>
                                                                    {formatUserDisplayName(user)}{uidx < assignedUsers.length - 1 ? ',' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    rightElement={
                                                        <div className="bg-muted px-2 py-0.5 rounded-md border border-border">
                                                            <p className="text-micro-label text-muted-foreground whitespace-nowrap">
                                                                {statusLabel(entry, completer)}
                                                            </p>
                                                        </div>
                                                    }
                                                    hideChevron
                                                />
                                            </div>
                                        );
                                    })}
                                  </div>
                                </div>
                            ) : (
                                <EmptyState 
                                    icon={ShieldCheck} 
                                    title={t.allClean} 
                                    description={t.noUpcomingCleaning}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="past" className="mt-4 stack-gap-sm opacity-80">
                            {past.length > 0 ? (
                                <div className="ui-card !p-0">
                                  <div className="ui-list px-2">
                                    {past.slice(0, 10).map((entry) => {
                                        const dayName = daysMap.get(entry.dayId) || t.unknownDay;
                                        const assignedUsers = entry.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];
                                        const completer = entry.completedBy ? usersMap.get(entry.completedBy) : null;
                                        const currentIndex = globalIdx++;

                                        return (
                                            <div key={entry.id}>
                                                <RosterFeedCard 
                                                    index={currentIndex}
                                                    date={parseDay(entry.date)}
                                                    label={t.cleaningRosterTitle}
                                                    title={dayName}
                                                    description={(
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                            <span>{format(parseDay(entry.date), 'EEE')}</span>
                                                            {assignedUsers.map((user, uidx) => (
                                                                <span key={user.uid}>
                                                                    {formatUserDisplayName(user)}{uidx < assignedUsers.length - 1 ? ',' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    rightElement={
                                                        <div className="bg-muted px-2 py-0.5 rounded-md border border-border">
                                                            <p className="text-micro-label text-muted-foreground whitespace-nowrap">
                                                                {statusLabel(entry, completer)}
                                                            </p>
                                                        </div>
                                                    }
                                                    hideChevron
                                                />
                                            </div>
                                        );
                                    })}
                                  </div>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={ListTodo}
                                    title={t.noPastCleaningEntries}
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
