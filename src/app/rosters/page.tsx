
"use client";

import { useState, useMemo } from 'react';
import { useRosterDefinitions } from '@/hooks/useRosterDefinitions';
import { useCustomRoster } from '@/hooks/useCustomRoster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CalendarOff, Clock, User, Lock, Edit } from 'lucide-react';
import type { CustomRosterEntry, RosterDefinition, AppUser, UserProfileData } from '@/types';
import { format, parseISO, isBefore, startOfToday, compareAsc } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';

function canViewRoster(definition: RosterDefinition, user: AppUser | null): boolean {
    const visibility = definition.visibility;
    if (!visibility || visibility.type === 'public') {
      return true;
    }
    
    if (!user) {
      return false;
    }

    if (user.isAdmin) {
        return true;
    }

    if (visibility.allowedUserIds?.includes(user.uid)) {
      return true;
    }

    if (visibility.allowedRoleIds && user.roleIds) {
      for (const userRoleId of user.roleIds) {
        if (visibility.allowedRoleIds.includes(userRoleId)) {
          return true;
        }
      }
    }

    return false;
}


function OtherRosterDisplay({ rosterDef }: { rosterDef: RosterDefinition }) {
    const { roster, loading } = useCustomRoster(rosterDef.id);
    const { allUsers, loading: usersLoading } = useAllUsers();
    
    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);

    const { upcoming, past } = useMemo(() => {
        const today = startOfToday();
        const upcomingEntries: CustomRosterEntry[] = [];
        const pastEntries: CustomRosterEntry[] = [];
        const sortedRoster = [...roster].sort((a,b) => compareAsc(parseISO(a.date), parseISO(b.date)));
        for(const entry of sortedRoster) {
            try {
                if(isBefore(parseISO(entry.date), today)) pastEntries.push(entry);
                else upcomingEntries.push(entry);
            } catch(e) { console.error("Error processing roster entry:", entry, e); }
        }
        return { upcoming: upcomingEntries, past: pastEntries.reverse() };
    }, [roster]);

    const RosterMonthGroup = ({ month, entries }: { month: string, entries: CustomRosterEntry[] }) => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{month}</h2>
            <div className="space-y-4">
                {entries.map(entry => (
                    <div key={entry.id} className="p-4 rounded-lg border bg-card/50">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex items-start gap-4">
                                <div className="text-center w-12 shrink-0">
                                    <p className="text-xs text-muted-foreground">{format(parseISO(entry.date), 'EEE')}</p>
                                    <p className="text-2xl font-bold">{format(parseISO(entry.date), 'd')}</p>
                                </div>
                                <dl className="space-y-2">
                                  {entry.assignments.map((assignment, index) => {
                                      const user = assignment.userId ? usersMap.get(assignment.userId) : null;
                                      return (
                                        <div key={index} className="flex items-start gap-3">
                                            {user ? (
                                              <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-muted mt-0.5">
                                                <PixelAvatar avatar={user.avatar} />
                                              </div>
                                            ) : (
                                              <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center mt-0.5">
                                                  <User className="h-4 w-4 text-muted-foreground" />
                                              </div>
                                            )}
                                            <div>
                                                <dt className="font-medium">{assignment.person}</dt>
                                                <dd className="text-sm text-muted-foreground">{assignment.duty}</dd>
                                            </div>
                                        </div>
                                      )
                                  })}
                                </dl>
                            </div>
                            {entry.time && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{entry.time}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading || usersLoading) {
        return <div className="flex items-center justify-center h-60"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (roster.length === 0) {
        return (
            <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-60">
                <CalendarOff className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold">No Entries</h3>
                <p className="text-muted-foreground text-sm">This roster has no scheduled entries yet.</p>
            </div>
        );
    }
    
    const upcomingByMonth = upcoming.reduce((acc, entry) => {
        const month = format(parseISO(entry.date), 'MMMM yyyy');
        if (!acc[month]) acc[month] = [];
        acc[month].push(entry);
        return acc;
    }, {} as Record<string, CustomRosterEntry[]>);

    return (
        <div className="space-y-12 mt-8">
            {Object.entries(upcomingByMonth).length > 0 ? (
                Object.entries(upcomingByMonth).map(([month, entries]) => (
                    <RosterMonthGroup key={`upcoming-${month}`} month={month} entries={entries} />
                ))
            ) : (
                <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-60">
                    <CalendarOff className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-semibold">No Upcoming Duties</h3>
                    <p className="text-muted-foreground text-sm">There are no upcoming duties for this roster.</p>
                </div>
            )}
        </div>
    );
}


export default function OtherRostersPage() {
    const { definitions, loading } = useRosterDefinitions();
    const { currentUser } = useAuth();

    const viewableDefinitions = useMemo(() => {
        return definitions.filter(def => canViewRoster(def, currentUser));
    }, [definitions, currentUser]);
    
    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-12">
            <header><h1 className="text-3xl md:text-4xl font-bold tracking-tight">Rosters</h1></header>
            
            {viewableDefinitions.length === 0 ? (
                 <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-60">
                    <Lock className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-semibold">No Rosters Available</h3>
                    <p className="text-muted-foreground text-sm">You do not have access to any other rosters, or none have been created yet.</p>
                </div>
            ) : (
                <Tabs defaultValue={viewableDefinitions[0]?.id} className="w-full">
                    <TabsList>
                        {viewableDefinitions.map(def => <TabsTrigger key={def.id} value={def.id}>{def.name}</TabsTrigger>)}
                    </TabsList>
                    {viewableDefinitions.map(def => (
                        <TabsContent key={def.id} value={def.id}>
                            <OtherRosterDisplay rosterDef={def} />
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}

    