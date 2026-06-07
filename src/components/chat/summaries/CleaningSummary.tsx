"use client";

import React from 'react';
import { 
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { useUsersById } from '@/contexts/users-context';
import type { CleaningDay, CleaningRosterEntry } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface CleaningSummaryProps {
  date: string;
  isSender: boolean;
}

export default function CleaningSummary({ date, isSender }: CleaningSummaryProps) {
  const { data: entry, loading: entryLoading } = useFirestoreDoc<CleaningRosterEntry>('cleaningRosters', date);
  const { data: day, loading: dayLoading } = useFirestoreDoc<CleaningDay>(
    'cleaningDays',
    entry?.dayId ?? null,
  );
  const usersById = useUsersById();
  const router = useRouter();

  if (entryLoading || dayLoading || !entry) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-[11px] font-semibold text-muted-foreground">
        Loading Roster...
      </div>
    );
  }

  const assignedUsers = entry.assignedUserIds
    .map((uid) => usersById.get(uid))
    .filter(Boolean);

  const formatDateText = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'EEEE, MMM do');
    } catch {
      return dateStr;
    }
  };

  return (
    <div 
      onClick={() => router.push(`/cleaning-roster?date=${date}`)}
      className="block transition-transform active:scale-95 cursor-pointer"
    >
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
                    <ListTodo className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Facility Roster</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{day?.name || 'Cleaning Session'}</h3>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{formatDateText(date)}</p>
          </div>
        </div>

        <div className="flex -space-x-3 mt-2">
            {assignedUsers.map((user, i) => (
                <Avatar key={i} className="h-10 w-10 shrink-0 overflow-hidden border-2 border-background">
                    {user?.avatar ? (
                        <PixelAvatar avatar={user.avatar} className="w-full h-full" />
                    ) : (
                        <AvatarFallback className="bg-muted text-[10px] font-semibold uppercase text-foreground">
                        {user?.firstName?.[0] || '?'}
                        </AvatarFallback>
                    )}
                </Avatar>
            ))}
            {assignedUsers.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-2 text-[10px] font-medium text-muted-foreground">No assigned personnel</div>
            )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">
            Access System Status
          </span>
        </div>
      </div>
    </div>
  );
}
