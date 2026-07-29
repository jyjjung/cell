"use client";

import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/contexts/users-context';
import { useFirestoreDoc } from '@/hooks/use-firestore-doc';
import { formatAppDate, formatNameString, getAppLocale } from '@/lib/formatting';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { WorshipRoster } from '@/types';
import { ChevronRight, ClipboardList, Users } from 'lucide-react';
import Link from 'next/link';
import {
  chatCardEyebrow,
  chatCardFooter,
  chatCardIcon,
  chatCardLoading,
  chatCardMeta,
  chatCardShell,
  chatCardTitle,
} from './chat-card-styles';

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
    return <div className={chatCardLoading}>Loading…</div>;
  }

  if (!roster) {
    return <DeletedContentNotice label={t.deletedContentRoster} />;
  }

  const slots = roster.slots || [];
  const totalPositions = slots.reduce((acc, slot) => acc + (slot.members?.length || 0), 0);
  const assignedSlots = slots.filter((slot) => (slot.members || []).length > 0);

  const formatDateText = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return formatAppDate(date, locale, { weekday: 'long', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const dateText = formatDateText(roster.date);

  return (
    <Link
      href={`/worship?tab=rosters&id=${rosterId}`}
      className="block w-full min-w-0 max-w-full transition-transform active:scale-95"
    >
      <div className={chatCardShell(isSender)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <div className={chatCardIcon}>
                <ClipboardList className="h-3.5 w-3.5" />
              </div>
              <span className={chatCardEyebrow}>{t.serviceRoster}</span>
            </div>
            <h3 className={cn(chatCardTitle, 'mb-1')}>{roster.name}</h3>
            <p className={chatCardMeta}>{dateText}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-[10px] bg-muted">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">{totalPositions}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-border">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2 bg-muted/40 px-2.5 py-1.5">
            <p className={chatCardEyebrow}>{t.rosterRole}</p>
            <p className={chatCardEyebrow}>{t.rosterPerson}</p>
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
                  'grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-2 px-2.5 py-1.5',
                  i !== 0 && 'border-t border-border',
                )}
              >
                <p className="truncate text-xs font-semibold text-foreground">{slot.role}</p>
                <p className="truncate text-xs font-medium text-muted-foreground">{displayNames}</p>
              </div>
            );
          })}
          {assignedSlots.length === 0 && (
            <div className="border-t border-dashed border-border px-3 py-4 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.rosterNoAssignedRoles}</p>
            </div>
          )}
        </div>

        <div className={chatCardFooter}>
          <span>{t.rosterTapToView}</span>
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}
