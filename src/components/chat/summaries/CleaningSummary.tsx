"use client";

import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/contexts/users-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { translations } from '@/lib/translations';
import type { CleaningDay, CleaningRosterEntry } from '@/types';
import { format } from 'date-fns';
import { ChevronRight, ListTodo } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  chatCardEyebrow,
  chatCardFooter,
  chatCardIcon,
  chatCardLoading,
  chatCardMeta,
  chatCardShell,
  chatCardTitle,
} from './chat-card-styles';

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

  if (entryLoading || dayLoading) {
    return <div className={chatCardLoading}>Loading…</div>;
  }

  if (!entry) {
    return <DeletedContentNotice label={t.deletedContentCleaning} />;
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
      className="block cursor-pointer transition-transform active:scale-95"
    >
      <div className={chatCardShell(isSender, 'max-w-[280px]')}>
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <div className={chatCardIcon}>
              <ListTodo className="h-3.5 w-3.5" />
            </div>
            <span className={chatCardEyebrow}>Cleaning roster</span>
          </div>
          <h3 className={cn(chatCardTitle, 'mb-1')}>{day?.name || 'Cleaning'}</h3>
          <p className={chatCardMeta}>{formatDateText(date)}</p>
        </div>

        <div className="flex -space-x-2">
          {assignedUsers.map((user, i) => (
            <div
              key={user?.uid ?? i}
              className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-card"
            >
              <PixelAvatar
                avatar={user?.avatar}
                className="h-full w-full"
                nameHint={{ firstName: user?.firstName, lastName: user?.lastName }}
              />
            </div>
          ))}
          {assignedUsers.length === 0 && (
            <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              No one assigned
            </div>
          )}
        </div>

        <div className={chatCardFooter}>
          <span>View schedule</span>
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
