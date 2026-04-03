
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useAllUsers } from '@/hooks/use-all-users';
import type { CleaningRosterEntry, UserProfileData } from '@/types';
import { startOfToday, format, compareAsc, isBefore } from 'date-fns';
import { parseDay } from '@/lib/event-occurrences';
import { Loader2, Check, ListTodo, ShieldCheck } from 'lucide-react';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { translations } from '@/lib/translations';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import BackToTopButton from '@/components/ui/back-to-top-button';

import { RosterCard } from '@/components/ui/roster-card';

export default function CleaningRosterPage() {
    const { currentUser } = useAuth();
    const { roster, loading: rosterLoading, toggleCompletion } = useCleaningRoster();
    const { cleaningDays, loading: daysLoading } = useCleaningDays();
    const { allUsers, loading: usersLoading } = useAllUsers();
    const [isMounted, setIsMounted] = useState(false);
    const t = translations[currentUser?.preferredLanguage || 'en'];

    useEffect(() => { setIsMounted(true); }, []);
    
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
        <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
            <PageHeader 
                title={t.cleaningRosterTitle} 
                subtitle="Facility Integrity Management"
                icon={ListTodo}
                accentColor="text-emerald-500"
                iconBgColor="bg-emerald-500/20"
            />
            
            {(rosterLoading || daysLoading || usersLoading) ? (
                 <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500/20" />
                    <p className="text-micro-label text-emerald-500/40 !opacity-100">Coordinating Purge Sequence...</p>
                 </div>
            ) : (
                <div className="space-y-20">
                    {roster.length > 0 ? (
                        <>
                        {upcoming.length > 0 ? (
                            <div className="space-y-12">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-section-title text-foreground/80">Upcoming Schedule</h2>
                                    <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow" />
                                </div>
                                <div className="flex flex-col gap-4">
                                    {upcoming.map((entry) => {
                                        const dayName = daysMap.get(entry.dayId) || 'Unknown Day';
                                        const assignedUsers = entry.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];
                                        const completer = entry.completedBy ? usersMap.get(entry.completedBy) : null;
                                        const isUserAssigned = currentUser ? entry.assignedUserIds.includes(currentUser.uid) : false;
                                        const canToggle = isUserAssigned && (!entry.isCompleted || (entry.isCompleted && entry.completedBy === currentUser?.uid));
                                        
                                        const currentIndex = globalIdx++;

                                        return (
                                            <RosterCard 
                                                key={entry.id}
                                                index={currentIndex}
                                                date={parseDay(entry.date)}
                                                title={dayName}
                                                subtitle={(
                                                    <div className="flex flex-wrap items-center gap-x-2">
                                                        {assignedUsers.map((user, uidx) => (
                                                            <span key={user.uid} className="text-xs font-medium text-muted-foreground/70">
                                                                {user.firstName}{uidx < assignedUsers.length - 1 ? ',' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                users={assignedUsers}
                                                accentColor="text-emerald-500"
                                                accentBg="bg-emerald-500/20"
                                                isCompleted={entry.isCompleted}
                                                completedBy={completer ? { firstName: completer.firstName, avatar: completer.avatar } : undefined}
                                                onClick={canToggle ? () => toggleCompletion(entry.date, entry.isCompleted) : undefined}
                                            />
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

                        {past.length > 0 && (
                            <div className="space-y-12 opacity-80 pt-10">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-section-title text-foreground/40 italic">Historical Log</h2>
                                    <div className="h-px bg-gradient-to-r from-white/5 to-transparent flex-grow" />
                                </div>
                                <div className="flex flex-col gap-4">
                                    {past.slice(0, 10).map((entry) => {
                                        const dayName = daysMap.get(entry.dayId) || 'Unknown Day';
                                        const assignedUsers = entry.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];
                                        const completer = entry.completedBy ? usersMap.get(entry.completedBy) : null;
                                        
                                        const currentIndex = globalIdx++;

                                        return (
                                            <RosterCard 
                                                key={entry.id}
                                                index={currentIndex}
                                                date={parseDay(entry.date)}
                                                title={dayName}
                                                users={assignedUsers}
                                                accentColor="text-emerald-500/40"
                                                accentBg="bg-emerald-500/5"
                                                isCompleted={entry.isCompleted}
                                                completedBy={completer ? { firstName: completer.firstName, avatar: completer.avatar } : undefined}
                                                animate={false}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        </>
                    ) : (
                        <EmptyState 
                            icon={ListTodo} 
                            title={t.rosterNotSet} 
                            description={t.rosterNotCreated}
                        />
                    )}
                </div>
            )}
            <BackToTopButton />
        </div>
    );
}
