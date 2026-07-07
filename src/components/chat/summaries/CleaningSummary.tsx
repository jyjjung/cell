"use client";

import React from 'react';
import { 
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { useUsersById } from '@/contexts/users-context';
import type { CleaningDay, CleaningRosterEntry } from '@/types';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

interface CleaningSummaryProps {
  date: string;
  isSender: boolean;
}

export default function CleaningSummary({ date, isSender }: CleaningSummaryProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { data: entry, loading: entryLoading } = useFirestoreDoc<CleaningRosterEntry>('cleaningRosters', date);
  const { data: day, loading: dayLoading } = useFirestoreDoc<CleaningDay>(
    'cleaningDays',
    entry?.dayId ?? null,
  );
  const usersById = useUsersById();
  const router = useRouter();

  if (entryLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-[11px] font-semibold text-muted-foreground">
        Loading Roster...
      </div>
    );
  }

  if (!entry) {
    return <DeletedContentNotice label={t.deletedContentCleaning} />;
  }

  if (dayLoading) {
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
                <span className="text-micro-label">Cleaning roster</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{day?.name || 'Cleaning'}</h3>
            <p className="text-micro-label">{formatDateText(date)}</p>
          </div>
        </div>

        <div className="flex -space-x-3 mt-2">
            {assignedUsers.map((user, i) => (
                <div key={user?.uid ?? i} className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-background">
                    <PixelAvatar
                      avatar={user?.avatar}
                      className="w-full h-full"
                      nameHint={{ firstName: user?.firstName, lastName: user?.lastName }}
                    />
                </div>
            ))}
            {assignedUsers.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-2 text-micro-label text-muted-foreground">No one assigned</div>
            )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-micro-label transition-colors group-hover:text-foreground">
            View schedule
          </span>
        </div>
      </div>
    </div>
  );
}
