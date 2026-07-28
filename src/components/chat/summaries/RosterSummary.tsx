"use client";

import React from 'react';
import { 
  ClipboardList, 
  ChevronRight,
  Users
} from 'lucide-react';
import { formatNameString } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { useUsersById } from '@/contexts/users-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { formatAppDate, getAppLocale } from '@/lib/formatting';
import type { WorshipRoster } from '@/types';
import Link from 'next/link';
import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { format } from 'date-fns';

interface RosterSummaryProps {
  rosterId: string;
  isSender: boolean;
}

export default function RosterSummary({ rosterId, isSender }: RosterSummaryProps) {
  const { data: roster, loading } = useFirestoreDoc<WorshipRoster>('worshipRosters', rosterId);
  const usersById = useUsersById();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const locale = getAppLocale(currentUser?.preferredLanguage);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-micro-label font-medium text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!roster) {
    return <DeletedContentNotice label={t.deletedContentRoster} />;
  }

  const slots = roster.slots || [];
  const totalPositions = slots.reduce((acc, slot) => acc + (slot.members?.length || 0), 0);
  const assignedSlots = slots.filter((slot) => (slot.members || []).length > 0);

  const getDayInfo = () => {
    try {
      if (!roster.date) return { dayOfWeek: '???', dayOfMonth: '??' };
      const date = new Date(roster.date);
      if (isNaN(date.getTime())) throw new Error();
      return {
        dayOfWeek: format(date, 'EEE'),
        dayOfMonth: format(date, 'd'),
      };
    } catch {
      return { dayOfWeek: '???', dayOfMonth: '??' };
    }
  };

  const { dayOfWeek, dayOfMonth } = getDayInfo();
  const dateText = (() => {
    try {
      const date = new Date(roster.date);
      if (isNaN(date.getTime())) return roster.date;
      return formatAppDate(date, locale, { weekday: 'long', month: 'short', day: 'numeric' });
    } catch {
      return roster.date;
    }
  })();

  return (
    <Link href={`/worship?tab=rosters&id=${rosterId}`} className="block w-full min-w-0 max-w-full transition-transform active:scale-95">
      <div className={cn(
        "group flex w-full min-w-0 max-w-full flex-col gap-4 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-200",
        isSender 
          ? "border-primary/30 bg-primary/5 text-foreground" 
          : "border-border/60 bg-card text-foreground"
      )}>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/40">
            <span className="text-micro-label">{dayOfWeek}</span>
            <span className="text-2xl font-semibold leading-none text-foreground">{dayOfMonth}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <ClipboardList className="h-3 w-3 text-primary" />
              <span className="text-micro-label">{t.serviceRoster}</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{roster.name}</h3>
            <div className="flex flex-col gap-1.5 text-muted-foreground">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Users className="w-3.5 h-3.5" />
                <span>{totalPositions} assigned · {dateText}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
           <div className="overflow-hidden rounded-xl border border-border/50">
             <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2 bg-muted/35 px-2.5 py-1.5">
               <p className="text-micro-label">{t.rosterRole}</p>
               <p className="text-micro-label">{t.rosterPerson}</p>
             </div>
             {assignedSlots.map((slot, i) => {
               const names = (slot.members || []).map((m) => {
                 const user = m?.userId ? usersById.get(m.userId) : undefined;
                 const rawName =
                   m?.displayName ||
                   [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
                 return rawName ? formatNameString(rawName) : '';
               });
               const uniqueNames = [...new Set(names.filter(Boolean))];
               const displayNames = uniqueNames.join(', ') || t.rosterUnassigned;

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
             <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center">
               <p className="text-[11px] font-medium text-muted-foreground">{t.rosterNoAssignedRoles}</p>
             </div>
           )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-micro-label transition-colors group-hover:text-foreground">{t.rosterTapToView}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}
