"use client";

import { useMemo, useState, useEffect } from 'react';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useAllUsers } from '@/hooks/use-all-users';
import type { CleaningRosterEntry, UserProfileData } from '@/types';
import { startOfToday, format, compareAsc, isBefore } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import { ListTodo, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleListSkeleton, ScheduleMonthGroup, ScheduleOccurrenceRow, ScheduleRowMeta } from '@/components/schedule/schedule-occurrence-row';
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

    const { upcomingByMonth, pastByMonth } = useMemo(() => {
        const today = startOfToday();
        const upcoming = new Map<string, CleaningRosterEntry[]>();
        const past = new Map<string, CleaningRosterEntry[]>();
        
        const sortedRoster = [...roster].sort((a,b) => compareAsc(parseDay(a.date), parseDay(b.date)));

        for(const entry of sortedRoster) {
            try {
                const entryDate = parseDay(entry.date);
                const monthKey = format(entryDate, 'MMMM yyyy');
                if(isBefore(entryDate, today)) {
                    if (!past.has(monthKey)) past.set(monthKey, []);
                    past.get(monthKey)!.push(entry);
                } else {
                    if (!upcoming.has(monthKey)) upcoming.set(monthKey, []);
                    upcoming.get(monthKey)!.push(entry);
                }
            } catch(e) {
                 console.error("Error processing roster entry for display:", entry, e);
            }
        }
        
        const pastArray = Array.from(past.entries()).reverse();
        pastArray.forEach(([, monthEntries]) => monthEntries.reverse());

        return {
            upcomingByMonth: Array.from(upcoming.entries()),
            pastByMonth: pastArray,
        };
    }, [roster]);

    if (!isMounted) return null;

    let globalIdx = 0;

    const renderEntry = (entry: CleaningRosterEntry, key: string) => {
        const dayName = daysMap.get(entry.dayId) || t.unknownDay;
        const assignedUsers = entry.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];
        const assignedNames = assignedUsers.map(user => formatUserDisplayName(user)).join(', ');
        const completer = entry.completedBy ? usersMap.get(entry.completedBy) : null;
        const currentIndex = globalIdx++;
        const doneLabel = entry.isCompleted
            ? completer
                ? `${t.done} ${formatUserDisplayName(completer)}`
                : t.done
            : null;

        return (
            <ScheduleOccurrenceRow
                key={key}
                id={`date-${entry.date}`}
                index={currentIndex}
                date={parseDay(entry.date)}
                title={assignedNames || dayName}
                subtitle={assignedNames ? <ScheduleRowMeta>{dayName}</ScheduleRowMeta> : undefined}
                meta={<ScheduleRowMeta>{t.cleaningDuty}</ScheduleRowMeta>}
                rightElement={
                    doneLabel ? (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {doneLabel}
                        </span>
                    ) : undefined
                }
            />
        );
    };

    return (
        <div className="page-container">
            <NavPageHeader />
            
            {(rosterLoading || daysLoading || usersLoading) ? (
                <ScheduleListSkeleton />
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
                                    <ScheduleMonthGroup key={`upcoming-${month}`} month={month}>
                                        {entries.map((entry) => renderEntry(entry, entry.id))}
                                    </ScheduleMonthGroup>
                                ))
                            ) : (
                                <EmptyState 
                                    icon={ShieldCheck} 
                                    title={t.allClean} 
                                    description={t.noUpcomingCleaning}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="past" className="mt-4 stack-gap-sm opacity-80">
                            {pastByMonth.length > 0 ? (
                                (() => {
                                    let remaining = 10;
                                    return pastByMonth.map(([month, entries]) => {
                                        if (remaining <= 0) return null;
                                        const slice = entries.slice(0, remaining);
                                        remaining -= slice.length;
                                        return (
                                            <ScheduleMonthGroup key={`past-${month}`} month={month}>
                                                {slice.map((entry) => renderEntry(entry, `past-${entry.id}`))}
                                            </ScheduleMonthGroup>
                                        );
                                    });
                                })()
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
