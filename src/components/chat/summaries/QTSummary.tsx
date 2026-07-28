"use client";

import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/contexts/users-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { formatNameString, formatUserDisplayName } from '@/lib/formatting';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { QTRosterEntry } from '@/types';
import { format } from 'date-fns';
import {
    BookOpen,
    ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QTSummaryProps {
  date: string;
  isSender: boolean;
}

export default function QTSummary({ date, isSender }: QTSummaryProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { data: entry, loading } = useFirestoreDoc<QTRosterEntry>('qtRosters', date);
  const usersById = useUsersById();
  const router = useRouter();

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-micro-label font-medium text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!entry) {
    return <DeletedContentNotice label={t.deletedContentQt} />;
  }

  const user = entry.userId ? usersById.get(entry.userId) : undefined;
  const name = entry.personName
    ? formatNameString(entry.personName, 'TBD')
    : formatUserDisplayName(user, 'TBD');

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
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/40">
            <span className="text-micro-label">{dayOfWeek}</span>
            <span className="text-2xl font-semibold leading-none text-foreground">{dayOfMonth}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <BookOpen className="h-3 w-3 text-primary" />
              <span className="text-micro-label">QT roster</span>
            </div>
            <h3 className="mb-2 truncate text-base font-semibold leading-tight text-foreground">{entry.passage}</h3>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Avatar className="h-5 w-5 shrink-0 border border-border/60 overflow-hidden">
                <PixelAvatar
                  avatar={user?.avatar}
                  className="w-full h-full"
                  nameHint={{ firstName: user?.firstName, lastName: user?.lastName }}
                />
              </Avatar>
              <span className="truncate">{name}</span>
            </div>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-micro-label transition-colors group-hover:text-foreground">
            View roster
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
