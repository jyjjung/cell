"use client";

import React, { useMemo } from 'react';
import { 
  ClipboardList, 
  ChevronRight,
  Users,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllUsers } from '@/hooks/use-all-users';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import Link from 'next/link';

interface RosterSummaryProps {
  rosterId: string;
  isSender: boolean;
}

export default function RosterSummary({ rosterId, isSender }: RosterSummaryProps) {
  const { rosters } = useWorshipRosters();
  const { allUsers } = useAllUsers();
  
  const roster = useMemo(() => 
    rosters.find(r => r.id === rosterId), 
    [rosters, rosterId]
  );

  if (!roster) return (
    <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-[11px] font-semibold text-muted-foreground">
        Loading Roster...
    </div>
  );

  const slots = roster.slots || [];
  const totalPositions = slots.reduce((acc, slot) => acc + (slot.members?.length || 0), 0);

  const formatDateText = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, 'EEEE, MMM do');
    } catch {
      return dateStr;
    }
  };

  const dateText = formatDateText(roster.date);

  return (
    <Link href={`/worship?tab=rosters&id=${rosterId}`} className="block transition-transform active:scale-95">
      <div className={cn(
        "group flex w-full max-w-full flex-col gap-4 rounded-2xl border p-4 shadow-sm transition-all duration-200",
        isSender 
          ? "border-primary/30 bg-primary/5 text-foreground" 
          : "border-border/60 bg-card text-foreground"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-muted/40">
                    <ClipboardList className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Service Roster</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{roster.name}</h3>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{dateText}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/40">
             <Users className="h-4 w-4 text-muted-foreground" />
             <span className="text-[10px] font-semibold text-foreground">{totalPositions}</span>
          </div>
        </div>

        {/* Roles */}
        <div className="flex flex-col gap-2 pt-2">
           {slots.filter(s => s.members.length > 0).map((slot, i) => {
             const m = slot.members[0];
             const user = m?.userId ? allUsers.find(u => u.uid === m.userId) : null;
             const name = m?.displayName || user?.firstName || 'TBD';

             return (
               <div key={i} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-6 w-6 shrink-0 border border-border/60">
                      {user?.photoURL && <AvatarImage src={user.photoURL} alt={name} />}
                      <AvatarFallback className="bg-muted text-[8px] font-semibold uppercase text-foreground">
                        {name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{name}</p>
                      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{slot.role}</p>
                    </div>
                  </div>
                  {user && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
                      <ShieldCheck className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
               </div>
             );
           })}
           {slots.filter(s => s.members.length > 0).length === 0 && (
             <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-8 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">No filled positions</p>
             </div>
           )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">
            Tap to View Roster
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}
