"use client";

import { useMemo, useState, useEffect } from 'react';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import type { QTRosterEntry, UserProfileData } from '@/types';
import { format, isBefore, startOfToday, compareAsc } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import { Loader2, CalendarOff } from 'lucide-react';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RosterFeedCard, RosterMonthGroup } from '@/components/ui/roster-feed-card';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';

export default function QTRosterPage() {
    const { currentUser } = useAuth();
    const { roster, loading: rosterLoading } = useQTRoster();
    const { allUsers, loading: usersLoading } = useAllUsers();
    const [isMounted, setIsMounted] = useState(false);
    const t = translations[currentUser?.preferredLanguage || 'en'];
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
                element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
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

    let globalIdx = 0;
    
    return (
      <div className="page-container">
            <NavPageHeader />
            
            {(rosterLoading || usersLoading) ? (
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
                            {upcomingByMonth.length > 0 ? (
                                upcomingByMonth.map(([month, entries]) => (
                                    <RosterMonthGroup key={`upcoming-${month}`} month={month}>
                                        {entries.map((entry) => {
                                            const user = entry.userId ? usersMap.get(entry.userId) : undefined;
                                            const displayName = entry.personName
                                                ? formatNameString(entry.personName, t.member)
                                                : formatUserDisplayName(user, t.member);
                                            const entryDate = parseDay(entry.date);
                                            const currentIndex = globalIdx++;
                                            const meta = [
                                                format(entryDate, 'EEE'),
                                                entry.title,
                                            ].filter(Boolean).join(' · ');

                                            return (
                                                <div key={entry.id} id={`date-${entry.date}`} className="scroll-mt-20">
                                                    <RosterFeedCard
                                                        index={currentIndex}
                                                        date={entryDate}
                                                        label={t.qtTitle}
                                                        title={displayName}
                                                        description={
                                                            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                                <span>{meta}</span>
                                                                {entry.passage ? (
                                                                    <span className="font-mono text-foreground/80">{entry.passage}</span>
                                                                ) : null}
                                                            </span>
                                                        }
                                                    />
                                                </div>
                                            );
                                        })}
                                    </RosterMonthGroup>
                                ))
                            ) : (
                                <EmptyState 
                                    icon={CalendarOff} 
                                    title={t.horizonIsClear} 
                                />
                            )}
                        </TabsContent>
                        <TabsContent value="past" className="mt-4 stack-gap-sm opacity-80">
                            {pastByMonth.length > 0 ? (
                                pastByMonth.map(([month, entries]) => (
                                    <RosterMonthGroup key={`past-${month}`} month={month}>
                                        {entries.map((entry) => {
                                            const user = entry.userId ? usersMap.get(entry.userId) : undefined;
                                            const displayName = entry.personName
                                                ? formatNameString(entry.personName, t.member)
                                                : formatUserDisplayName(user, t.member);
                                            const entryDate = parseDay(entry.date);
                                            const currentIndex = globalIdx++;

                                            return (
                                                <RosterFeedCard
                                                    key={`past-${entry.id}`}
                                                    index={currentIndex}
                                                    date={entryDate}
                                                    label={t.qtTitle}
                                                    title={displayName}
                                                    description={
                                                        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                            <span>{format(entryDate, 'EEE')}</span>
                                                            {entry.passage ? (
                                                                <span className="font-mono text-foreground/80">{entry.passage}</span>
                                                            ) : null}
                                                        </span>
                                                    }
                                                />
                                            );
                                        })}
                                    </RosterMonthGroup>
                                ))
                            ) : (
                                <EmptyState 
                                    icon={CalendarOff} 
                                    title={t.noPastQTEntries} 
                                />
                            )}
                        </TabsContent>
                        </>
                    ) : (
                        <EmptyState 
                            icon={CalendarOff} 
                            title={t.awaitingActivation} 
                        />
                    )}
                </Tabs>
            )}
        </div>
    )
}
