"use client";

import React, { useMemo } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { Calendar, ChevronRight } from 'lucide-react';
import { eventOccursOnDate, type EventOccurrenceRow } from '@/lib/event-occurrences';
import type { AppEvent, CleaningRosterEntry, QTRosterEntry, UserProfileData, CleaningDay, WorshipRoster } from '@/types';
import type { CustomRosterEntryWithMeta } from '@/hooks/useAllCustomRosterEntries';
import { formatCustomRosterEntrySummary } from '@/lib/roster-access';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface AgendaViewProps {
  selectedDate: Date;
  events: AppEvent[];
  cleaningRoster: CleaningRosterEntry[];
  qtRoster: QTRosterEntry[];
  allUsers: UserProfileData[];
  cleaningDays: CleaningDay[];
  onItemClick?: (item: AgendaItem) => void;
  hideHeader?: boolean;
  hideQt?: boolean;
  worshipRosters?: WorshipRoster[];
  customRosterEntries?: CustomRosterEntryWithMeta[];
}

export type AgendaItem =
  | { kind: 'event'; row: EventOccurrenceRow }
  | {
      kind: 'roster';
      id: string;
      type: 'cleaning' | 'qt' | 'worship' | 'custom';
      title: string;
      meta?: string;
      date: Date;
      passage?: string;
      qtTitle?: string;
      assignedNames?: string;
      dayName?: string;
      details?: string;
    };

function AgendaRow({
  time,
  title,
  meta,
  onClick,
}: {
  time: string;
  title: string;
  meta?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="event-row group">
      <span className="event-row-time">{time}</span>
      <div className="event-row-body">
        <p className="event-row-title">{title}</p>
        {meta ? <p className="event-row-meta">{meta}</p> : null}
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
    </button>
  );
}

export default function AgendaView({
  selectedDate,
  events,
  cleaningRoster,
  qtRoster,
  allUsers,
  cleaningDays,
  onItemClick,
  hideHeader = false,
  hideQt = false,
  worshipRosters = [],
  customRosterEntries = [],
}: AgendaViewProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const isToday = isSameDay(selectedDate, new Date());

  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
  const cleaningDaysMap = useMemo(() => new Map(cleaningDays.map(d => [d.id, d.name])), [cleaningDays]);

  const items = useMemo(() => {
    const list: AgendaItem[] = [];

    events.forEach(e => {
      if (eventOccursOnDate(e, selectedDate)) {
        list.push({
          kind: 'event',
          row: {
            event: e,
            occurrenceDate: selectedDate,
            occurrenceKey: `${e.id}-${format(selectedDate, 'yyyy-MM-dd')}`,
          },
        });
      }
    });

    cleaningRoster.forEach(r => {
      if (isSameDay(parseISO(r.date), selectedDate)) {
        const names = r.assignedUserIds
          .map((id) => usersMap.get(id))
          .filter(Boolean)
          .map((user) => formatUserDisplayName(user!))
          .join(', ');
        list.push({
          kind: 'roster',
          id: r.id,
          type: 'cleaning',
          title: names || t.churchCleaning,
          meta: cleaningDaysMap.get(r.dayId) || t.cleaningDuty,
          date: selectedDate,
          assignedNames: names,
          dayName: cleaningDaysMap.get(r.dayId),
        });
      }
    });

    if (!hideQt) {
      qtRoster.forEach(r => {
        if (isSameDay(parseISO(r.date), selectedDate)) {
          list.push({
            kind: 'roster',
            id: r.id,
            type: 'qt',
            title: formatNameString(r.personName, t.qtSharing),
            meta: r.title || r.passage || t.qtSharing,
            date: selectedDate,
            passage: r.passage,
            qtTitle: r.title,
          });
        }
      });
    }

    worshipRosters.forEach((roster) => {
      if (!isSameDay(parseISO(roster.date), selectedDate)) return;
      const roleLines = roster.slots
        .filter((slot) => slot.members.length > 0)
        .map((slot) => {
          const names = slot.members
            .map((member) => {
              if (member.userId) {
                const user = usersMap.get(member.userId);
                return user ? formatUserDisplayName(user) : member.displayName;
              }
              return member.displayName;
            })
            .filter(Boolean)
            .join(', ');
          return `${slot.role}: ${names}`;
        })
        .join(' · ');
      if (!roleLines) return;
      list.push({
        kind: 'roster',
        id: roster.id,
        type: 'worship',
        title: roster.name || t.worshipPortal,
        meta: roleLines,
        date: selectedDate,
        details: roleLines,
      });
    });

    customRosterEntries.forEach((entry) => {
      if (!isSameDay(parseISO(entry.date), selectedDate)) return;
      const assignments = formatCustomRosterEntrySummary(
        entry,
        { fields: entry.rosterFields },
        usersMap,
      );
      if (!assignments) return;
      list.push({
        kind: 'roster',
        id: entry.id,
        type: 'custom',
        title: entry.rosterName,
        meta: assignments,
        date: selectedDate,
        details: assignments,
      });
    });

    return list.sort((a, b) => {
      const aTime =
        a.kind === 'event'
          ? a.row.event.allDay
            ? ''
            : a.row.event.startTime || ''
          : '';
      const bTime =
        b.kind === 'event'
          ? b.row.event.allDay
            ? ''
            : b.row.event.startTime || ''
          : '';
      if (!aTime && bTime) return -1;
      if (aTime && !bTime) return 1;
      if (aTime && bTime) return aTime.localeCompare(bTime);
      return 0;
    });
  }, [selectedDate, events, cleaningRoster, qtRoster, worshipRosters, customRosterEntries, usersMap, cleaningDaysMap, t, hideQt]);

  return (
    <div className={cn('stack-gap-sm', hideHeader ? '' : 'px-1')}>
      {!hideHeader && (
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-section-title">
            {isToday ? t.todayLabel : format(selectedDate, 'EEE, MMM d')}
          </h3>
          {!isToday && (
            <span className="text-stat-label">{format(selectedDate, 'yyyy')}</span>
          )}
        </div>
      )}

      <div className={hideHeader ? 'stack-gap-sm' : 'ui-list'}>
        {items.length > 0 ? (
          items.map((item) => {
            if (item.kind === 'event') {
              const { event } = item.row;
              const time = event.allDay ? t.allDay : event.startTime || '—';
              return (
                <AgendaRow
                  key={item.row.occurrenceKey}
                  time={time}
                  title={event.title}
                  meta={event.category}
                  onClick={() => onItemClick?.(item)}
                />
              );
            }

            const time =
              item.type === 'cleaning'
                ? t.cleaningDuty
                : item.type === 'qt'
                  ? t.qtSharing
                  : item.type === 'worship'
                    ? t.worshipPortal
                    : t.schedule;
            return (
              <AgendaRow
                key={`${item.type}-${item.id}`}
                time={time}
                title={item.title}
                meta={item.meta}
                onClick={() => onItemClick?.(item)}
              />
            );
          })
        ) : (
          <div className="py-10 text-center">
            <Calendar className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">{t.clearSchedule}</p>
            <p className="text-stat-label mt-0.5">{t.nothingPlannedToday}</p>
          </div>
        )}
      </div>
    </div>
  );
}
