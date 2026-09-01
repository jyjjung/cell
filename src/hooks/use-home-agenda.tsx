'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  addMonths,
  compareAsc,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfToday,
} from 'date-fns';
import { useEvents } from '@/hooks/use-events';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllCustomRosterEntries } from '@/hooks/useAllCustomRosterEntries';
import { expandEventsToOccurrenceRows } from '@/lib/event-occurrences';
import { userCanSeeEvent } from '@/lib/event-visibility';
import { formatCustomRosterEntrySummary, getUserCustomRosterLabels } from '@/lib/roster-access';
import { formatNameString, formatUserDisplayName } from '@/lib/formatting';
import {
  SchedulePassageRef,
  ScheduleRowHighlight,
  ScheduleRowMeta,
  ScheduleRowTime,
} from '@/components/schedule/schedule-occurrence-row';
import { translations } from '@/lib/translations';
import type { AppUser, UserProfileData } from '@/types';
import { EventCategory } from '@/types';

export type HomeAgendaEntry = {
  sourceKey: string;
  date: Date;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  rightElement?: ReactNode;
  type: 'event' | 'birthday' | 'cleaning' | 'qt' | 'worship' | 'custom';
  passage?: string;
  qtTitle?: string;
  assignedNames?: string;
  dayName?: string;
  details?: string;
};

const MAX_AGENDA_ENTRIES = 12;

function formatWorshipRoleLines(
  roster: { slots: { role: string; members: { userId?: string | null; displayName?: string }[] }[] },
  usersMap: Map<string, UserProfileData>,
) {
  return roster.slots
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
    .join(', ');
}

export function useHomeAgenda(currentUser: AppUser) {
  const lang = currentUser.preferredLanguage || 'en';
  const t = translations[lang];
  const today = startOfToday();

  const { events } = useEvents();
  const { roster: cleaningRoster } = useCleaningRoster();
  const { roster: qtRoster } = useQTRoster();
  const { allUsers } = useAllUsers();
  const { cleaningDays } = useCleaningDays();
  const { rosters: worshipRosters } = useWorshipRosters();
  const { entries: customRosterEntries } = useAllCustomRosterEntries();

  const usersMap = useMemo(() => new Map(allUsers.map((u) => [u.uid, u])), [allUsers]);
  const cleaningDaysMap = useMemo(
    () => new Map(cleaningDays.map((d) => [d.id, d.name])),
    [cleaningDays],
  );

  const filteredEvents = useMemo(
    () => (events || []).filter((e) => (currentUser?.isAdmin ? true : userCanSeeEvent(currentUser, e))),
    [events, currentUser],
  );

  const dashboardEventRows = useMemo(() => {
    const rows = expandEventsToOccurrenceRows(filteredEvents, {
      from: today,
      until: endOfMonth(addMonths(today, 1)),
    });
    return rows.sort((a, b) => compareAsc(a.occurrenceDate, b.occurrenceDate));
  }, [filteredEvents, today]);

  const entryTypeLabel = (type: HomeAgendaEntry['type']) => {
    switch (type) {
      case 'cleaning':
        return t.cleaningRoster;
      case 'qt':
        return t.qtTitle;
      case 'worship':
        return t.worshipPortal;
      case 'custom':
        return t.schedule;
      case 'event':
        return t.events;
      case 'birthday':
        return t.birthday;
    }
  };

  const agenda = useMemo((): HomeAgendaEntry[] => {
    const byKey = new Map<string, HomeAgendaEntry>();
    const add = (entry: HomeAgendaEntry) => byKey.set(entry.sourceKey, entry);

    for (const row of dashboardEventRows) {
      const { event } = row;
      const isBirthday = event.category === EventCategory.Birthday;
      add({
        sourceKey: `event-${row.occurrenceKey}`,
        date: row.occurrenceDate,
        title: event.title,
        subtitle: <ScheduleRowMeta>{event.category}</ScheduleRowMeta>,
        meta:
          !event.allDay && event.startTime ? (
            <ScheduleRowTime start={event.startTime} end={event.endTime} />
          ) : undefined,
        type: isBirthday ? 'birthday' : 'event',
        details: event.details,
      });
    }

    for (const entry of qtRoster) {
      const d = parseISO(entry.date || '');
      if (!isValid(d) || isBefore(d, today)) continue;
      const user = entry.userId ? usersMap.get(entry.userId) : undefined;
      const sharerName = entry.personName
        ? formatNameString(entry.personName, t.member)
        : formatUserDisplayName(user, t.member);
      add({
        sourceKey: `qt-${entry.id}`,
        date: d,
        title: sharerName,
        subtitle: <ScheduleRowMeta>{entry.title || t.qtSharing}</ScheduleRowMeta>,
        meta: entry.passage ? <SchedulePassageRef passage={entry.passage} /> : undefined,
        type: 'qt',
        passage: entry.passage,
        qtTitle: entry.title,
      });
    }

    cleaningRoster.forEach((r) => {
      const d = parseISO(r.date || '');
      if (!isValid(d) || !isSameDay(d, today)) return;
      const names = r.assignedUserIds
        .map((uid) => usersMap.get(uid))
        .filter(Boolean)
        .map((user) => formatUserDisplayName(user!))
        .join(', ');
      const dayName = cleaningDaysMap.get(r.dayId);
      add({
        sourceKey: `cleaning-${r.id}`,
        date: d,
        title: names || dayName || t.churchCleaning,
        subtitle: names && dayName ? <ScheduleRowMeta>{dayName}</ScheduleRowMeta> : undefined,
        meta: <ScheduleRowMeta>{t.cleaningDuty}</ScheduleRowMeta>,
        type: 'cleaning',
        assignedNames: names,
        dayName,
      });
    });

    worshipRosters.forEach((roster) => {
      const d = parseISO(roster.date || '');
      if (!isValid(d) || !isSameDay(d, today)) return;
      const roleLines = formatWorshipRoleLines(roster, usersMap);
      if (!roleLines) return;
      add({
        sourceKey: `worship-${roster.id}`,
        date: d,
        title: roleLines,
        subtitle: <ScheduleRowMeta>{roster.name || t.worshipPortal}</ScheduleRowMeta>,
        type: 'worship',
        details: roleLines,
      });
    });

    customRosterEntries.forEach((entry) => {
      const d = parseISO(entry.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      const assignments = formatCustomRosterEntrySummary(
        entry,
        { fields: entry.rosterFields },
        usersMap,
      );
      if (!assignments) return;
      add({
        sourceKey: `custom-${entry.id}`,
        date: d,
        title: assignments,
        subtitle: <ScheduleRowMeta>{entry.rosterName}</ScheduleRowMeta>,
        type: 'custom',
        details: assignments,
      });
    });

    cleaningRoster.forEach((r) => {
      const d = parseISO(r.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      if (!r.assignedUserIds.includes(currentUser.uid)) return;
      const names = r.assignedUserIds
        .map((uid) => usersMap.get(uid))
        .filter(Boolean)
        .map((user) => formatUserDisplayName(user!))
        .join(', ');
      const others = r.assignedUserIds
        .filter((uid) => uid !== currentUser.uid)
        .map((uid) => usersMap.get(uid))
        .filter(Boolean)
        .map((user) => formatUserDisplayName(user!))
        .join(', ');
      const dayName = cleaningDaysMap.get(r.dayId);
      add({
        sourceKey: `cleaning-${r.id}`,
        date: d,
        title: names || dayName || t.churchCleaning,
        subtitle: names && dayName ? <ScheduleRowMeta>{dayName}</ScheduleRowMeta> : undefined,
        meta: (
          <>
            <ScheduleRowMeta>{t.cleaningDuty}</ScheduleRowMeta>
            {others ? <ScheduleRowHighlight lead={t.withLabel} value={others} /> : null}
          </>
        ),
        rightElement: <span className="home-you-badge">{t.youLabel}</span>,
        type: 'cleaning',
        assignedNames: names,
        dayName,
      });
    });

    qtRoster.forEach((r) => {
      const d = parseISO(r.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      if (r.userId !== currentUser.uid) return;
      add({
        sourceKey: `qt-${r.id}`,
        date: d,
        title: formatUserDisplayName(currentUser, t.member),
        subtitle: <ScheduleRowMeta>{r.title || t.qtSharing}</ScheduleRowMeta>,
        meta: <ScheduleRowHighlight lead={t.youreSharing} value={r.passage || r.title} />,
        rightElement: <span className="home-you-badge">{t.youLabel}</span>,
        type: 'qt',
        passage: r.passage,
        qtTitle: r.title,
      });
    });

    worshipRosters.forEach((roster) => {
      const d = parseISO(roster.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      const myRoles = roster.slots
        .filter((slot) => slot.members.some((m) => m.userId === currentUser.uid))
        .map((slot) => slot.role);
      if (myRoles.length === 0) return;
      const roleLines = formatWorshipRoleLines(roster, usersMap);
      add({
        sourceKey: `worship-${roster.id}`,
        date: d,
        title: roleLines || roster.name || t.worshipPortal,
        subtitle: <ScheduleRowMeta>{roster.name || t.worshipPortal}</ScheduleRowMeta>,
        meta: <ScheduleRowHighlight lead={t.servingAs} value={myRoles.join(', ')} />,
        rightElement: <span className="home-you-badge">{t.youLabel}</span>,
        type: 'worship',
        details: `${t.servingAs} ${myRoles.join(', ')}`,
      });
    });

    customRosterEntries.forEach((entry) => {
      const d = parseISO(entry.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      const myDuties = getUserCustomRosterLabels(
        entry,
        { fields: entry.rosterFields },
        currentUser.uid,
      );
      if (myDuties.length === 0) return;
      const assignments = formatCustomRosterEntrySummary(
        entry,
        { fields: entry.rosterFields },
        usersMap,
      );
      add({
        sourceKey: `custom-${entry.id}`,
        date: d,
        title: assignments || entry.rosterName,
        subtitle: <ScheduleRowMeta>{entry.rosterName}</ScheduleRowMeta>,
        meta: <ScheduleRowHighlight lead={t.servingAs} value={myDuties.join(', ')} />,
        rightElement: <span className="home-you-badge">{t.youLabel}</span>,
        type: 'custom',
        details: `${t.servingAs} ${myDuties.join(', ')}`,
      });
    });

    return Array.from(byKey.values())
      .sort((a, b) => compareAsc(a.date, b.date))
      .slice(0, MAX_AGENDA_ENTRIES);
  }, [
    dashboardEventRows,
    qtRoster,
    cleaningRoster,
    worshipRosters,
    customRosterEntries,
    usersMap,
    cleaningDaysMap,
    today,
    currentUser,
    t.member,
    t.qtSharing,
    t.churchCleaning,
    t.cleaningDuty,
    t.worshipPortal,
    t.servingAs,
    t.youreSharing,
    t.withLabel,
    t.youLabel,
  ]);

  const agendaByMonth = useMemo(() => {
    const groups = new Map<string, HomeAgendaEntry[]>();
    for (const entry of agenda) {
      const month = format(entry.date, 'MMMM yyyy');
      const bucket = groups.get(month);
      if (bucket) bucket.push(entry);
      else groups.set(month, [entry]);
    }
    return Array.from(groups.entries());
  }, [agenda]);

  return { agenda, agendaByMonth, entryTypeLabel, t };
}
