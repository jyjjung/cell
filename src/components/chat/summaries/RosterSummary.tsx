"use client";

import React, { useMemo } from 'react';
import { 
  ClipboardList, 
  ChevronRight,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllUsers } from '@/hooks/use-all-users';
import { format } from 'date-fns';
import Link from 'next/link';

interface RosterSummaryProps {
  rosterId: string;
  isSender: boolean;
}

export default function RosterSummary({ rosterId, isSender }: RosterSummaryProps) {
  const { rosters } = useWorshipRosters();
  const { allUsers } = useAllUsers();
  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
  
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
  const assignedSlots = slots.filter((slot) => (slot.members || []).length > 0);

  const toFirstLastInitial = (rawName: string) => {
    const parts = rawName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return rawName;
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
    return `${first} ${lastInitial}.`;
  };

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
        "group flex w-full max-w-full flex-col gap-2.5 rounded-2xl border p-3 shadow-sm transition-all duration-200",
        isSender 
          ? "border-primary/30 bg-primary/5 text-foreground" 
          : "border-border/60 bg-card text-foreground"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md border border-border/60 bg-muted/40">
                    <ClipboardList className="h-3 w-3 text-primary" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Service Roster</span>
            </div>
            <h3 className="mb-1 truncate text-sm font-semibold leading-tight text-foreground">{roster.name}</h3>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{dateText}</p>
          </div>
          <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/40">
             <Users className="h-3.5 w-3.5 text-muted-foreground" />
             <span className="text-[10px] font-semibold text-foreground">{totalPositions}</span>
          </div>
        </div>

        {/* Roles */}
        <div className="flex flex-col gap-1.5 pt-1">
           <div className="overflow-hidden rounded-lg border border-border/50">
             <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2 bg-muted/35 px-2.5 py-1.5">
               <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Role</p>
               <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Person</p>
             </div>
             {assignedSlots.map((slot, i) => {
               const names = (slot.members || []).map((m) => {
                 const user = m?.userId ? usersMap.get(m.userId) : null;
                 const rawName =
                   m?.displayName ||
                   [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
                 return rawName ? toFirstLastInitial(rawName) : '';
               });
               const uniqueNames = [...new Set(names.filter(Boolean))];
               const displayNames = uniqueNames.join(', ');

               return (
                 <div
                   key={i}
                   className={cn(
                     "grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2 px-2.5 py-1.5 transition-colors",
                     i !== 0 && "border-t border-border/40",
                     "bg-muted/20 group-hover:bg-muted/35"
                   )}
                 >
                   <p className="truncate text-[11px] font-semibold text-foreground">{slot.role}</p>
                   <p className="truncate text-[11px] font-medium text-foreground/90">
                     {displayNames}
                   </p>
                 </div>
               );
             })}
           </div>
           {assignedSlots.length === 0 && (
             <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center">
               <p className="text-[11px] font-medium text-muted-foreground">No assigned roles</p>
             </div>
           )}
        </div>

        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">
            Tap to View Roster
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}
