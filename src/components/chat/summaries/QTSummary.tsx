"use client";

import React from 'react';
import { 
  Calendar, 
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { useUsersById } from '@/contexts/users-context';
import type { QTRosterEntry } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface QTSummaryProps {
  date: string;
  isSender: boolean;
}

export default function QTSummary({ date, isSender }: QTSummaryProps) {
  const { data: entry, loading } = useFirestoreDoc<QTRosterEntry>('qtRosters', date);
  const usersById = useUsersById();
  const router = useRouter();

  if (loading || !entry) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-[11px] font-semibold text-muted-foreground">
        Loading QT Entry...
      </div>
    );
  }

  const user = entry.userId ? usersById.get(entry.userId) : undefined;
  const name = entry.personName
    ? formatNameString(entry.personName, 'TBD')
    : formatUserDisplayName(user, 'TBD');

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
      onClick={() => router.push(`/qt?date=${date}`)}
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
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">QT Roster</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{entry.passage}</h3>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{formatDateText(date)}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
             <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
            <Avatar className="h-8 w-8 shrink-0 border border-border/60 overflow-hidden">
                <PixelAvatar
                  avatar={user?.avatar}
                  className="w-full h-full"
                  nameHint={{ firstName: user?.firstName, lastName: user?.lastName }}
                />
            </Avatar>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{name}</p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Assigned Reader</p>
            </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground">
            View Full Roster
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
