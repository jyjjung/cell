"use client";

import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/contexts/users-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { formatNameString, formatUserDisplayName } from '@/lib/formatting';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { QTRosterEntry } from '@/types';
import { format } from 'date-fns';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import {
  chatCardEyebrow,
  chatCardFooter,
  chatCardIcon,
  chatCardLoading,
  chatCardMeta,
  chatCardShell,
  chatCardTitle,
} from './chat-card-styles';

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
    return <div className={chatCardLoading}>Loading…</div>;
  }

  if (!entry) {
    return <DeletedContentNotice label={t.deletedContentQt} />;
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
      className="block cursor-pointer transition-transform active:scale-95"
    >
      <div className={chatCardShell(isSender, 'max-w-[280px]')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <div className={chatCardIcon}>
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              <span className={chatCardEyebrow}>QT roster</span>
            </div>
            <h3 className={cn(chatCardTitle, 'mb-1')}>{entry.passage}</h3>
            <p className={chatCardMeta}>{formatDateText(date)}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-muted">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[10px] bg-muted/50 p-3">
          <Avatar className="h-8 w-8 shrink-0 overflow-hidden border border-border">
            <PixelAvatar
              avatar={user?.avatar}
              className="h-full w-full"
              nameHint={{ firstName: user?.firstName, lastName: user?.lastName }}
            />
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className={chatCardMeta}>Reader</p>
          </div>
        </div>

        <div className={chatCardFooter}>
          <span>View roster</span>
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
