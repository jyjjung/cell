
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useAllUsers } from '@/hooks/use-all-users';
import type { CleaningRosterEntry, UserProfileData } from '@/types';
import { format, parseISO, isBefore, startOfToday, compareAsc } from 'date-fns';
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
        
        const sortedRoster = [...roster].sort((a,b) => compareAsc(parseISO(a.date), parseISO(b.date)));

        for(const entry of sortedRoster) {
            try {
                if(isBefore(parseISO(entry.date), today)) {
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

    const RosterEntry = ({ entry }: { entry: CleaningRosterEntry }) => {
        const dayName = daysMap.get(entry.dayId) || 'Unknown Day';
        const assignedUsers = entry.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];
        const completer = entry.completedBy ? usersMap.get(entry.completedBy) : null;
        
        const isUserAssigned = currentUser ? entry.assignedUserIds.includes(currentUser.uid) : false;
        const canToggle = isUserAssigned && (!entry.isCompleted || (entry.isCompleted && entry.completedBy === currentUser?.uid));
        
        const handleToggle = () => {
            if (canToggle) {
                toggleCompletion(entry.date, entry.isCompleted);
            }
        };

        return (
            <div 
                onClick={handleToggle}
                className={cn(
                    "p-4 rounded-lg border bg-card/50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 transition-colors",
                    canToggle && "cursor-pointer hover:bg-muted/50",
                    entry.isCompleted && "bg-green-500/10 border-green-500/30"
                )}
            >
                <div className="flex items-center gap-4 flex-grow min-w-0">
                    <div className="text-center w-12 shrink-0">
                        <p className="text-xs text-muted-foreground">{format(parseISO(entry.date), 'EEE')}</p>
                        <p className="text-2xl font-bold">{format(parseISO(entry.date), 'd')}</p>
                    </div>
                    <div className="flex-grow space-y-2">
                        <p className="font-semibold">{dayName}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {assignedUsers.map(user => (
                                <div key={user.uid} className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full overflow-hidden bg-muted">
                                        <PixelAvatar avatar={user.avatar} />
                                    </div>
                                    <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 justify-end sm:justify-center sm:pt-1">
                    {entry.isCompleted && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                             <Check className="h-5 w-5" />
                             <span>{t.done}</span>
                             {completer && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                             <div className="h-6 w-6 rounded-full overflow-hidden bg-muted border-2">
                                                <PixelAvatar avatar={completer.avatar} />
                                             </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t.completedBy} {completer.firstName}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const RosterMonthGroup = ({ month, entries }: { month: string, entries: CleaningRosterEntry[] }) => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{month}</h2>
            <div className="space-y-3">
                {entries.map(entry => <RosterEntry key={entry.id} entry={entry} />)}
            </div>
        </div>
    );
    
    if (!isMounted || rosterLoading || daysLoading || usersLoading) {
        return (
             <div className="flex items-center justify-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
        );
    }
    
    const upcomingByMonth = upcoming.reduce((acc, entry) => {
        const month = format(parseISO(entry.date), 'MMMM yyyy');
        if (!acc[month]) acc[month] = [];
        acc[month].push(entry);
        return acc;
    }, {} as Record<string, CleaningRosterEntry[]>);

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.cleaningRosterTitle}</h1>
            </header>
            
            {roster.length > 0 ? (
                Object.entries(upcomingByMonth).length > 0 ? (
                    Object.entries(upcomingByMonth).map(([month, entries]) => (
                        <RosterMonthGroup key={`upcoming-${month}`} month={month} entries={entries} />
                    ))
                ) : (
                    <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-60">
                        <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
                        <h3 className="font-semibold">{t.allClean}</h3>
                        <p className="text-muted-foreground text-sm">{t.noUpcomingCleaning}</p>
                    </div>
                )
            ) : (
                <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-60">
                    <ListTodo className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-semibold">{t.rosterNotSet}</h3>
                    <p className="text-muted-foreground text-sm">{t.rosterNotCreated}</p>
                </div>
            )}
        </div>
    )
}
