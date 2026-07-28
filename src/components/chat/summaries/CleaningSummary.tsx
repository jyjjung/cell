"use client";

import React from 'react';
import { 
  ListTodo,
  ChevronRight,
  Users,
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
import { formatUserDisplayName } from '@/lib/formatting';

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
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-micro-label font-medium text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!entry) {
    return <DeletedContentNotice label={t.deletedContentCleaning} />;
  }

  if (dayLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-micro-label font-medium text-muted-foreground">
        Loading…
      </div>
    );
  }

  const assignedUsers = entry.assignedUserIds
    .map((uid) => usersById.get(uid))
    .filter(Boolean);

  const getDayInfo = () => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) throw new Error();
      return {
        dayOfWeek: format(d, 'EEE'),
        dayOfMonth: format(d, 'd'),
      };
    } catch {
      return { dayOfWeek: '???', dayOfMonth: '??' };
    }
  };

  const { dayOfWeek, dayOfMonth } = getDayInfo();
  const names = assignedUsers
    .map((user) => formatUserDisplayName(user))
    .filter(Boolean)
    .join(', ');

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
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/40">
            <span className="text-micro-label">{dayOfWeek}</span>
            <span className="text-2xl font-semibold leading-none text-foreground">{dayOfMonth}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <ListTodo className="h-3 w-3 text-primary" />
              <span className="text-micro-label">Cleaning roster</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">
              {day?.name || 'Cleaning'}
            </h3>
            <div className="flex flex-col gap-1.5 text-muted-foreground">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">{names || 'No one assigned'}</span>
              </div>
            </div>
          </div>
        </div>

        {assignedUsers.length > 0 && (
          <div className="flex -space-x-3">
            {assignedUsers.map((user, i) => (
              <div key={user?.uid ?? i} className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-background">
                <PixelAvatar
                  avatar={user?.avatar}
                  className="w-full h-full"
                  nameHint={{ firstName: user?.firstName, lastName: user?.lastName }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between">
          <span className="text-micro-label transition-colors group-hover:text-foreground">
            View schedule
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
