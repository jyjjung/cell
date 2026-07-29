"use client";

import { AnimatePresence } from 'framer-motion';
import { type AppUser, type UserProfileData } from '@/types';
import { translations } from '@/lib/translations';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import {
  makeManualPassageKey,
  makePassageKey,
} from '@/lib/passage-keys';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useEvents } from '@/hooks/use-events';
import { useChats } from '@/hooks/useChats';
import { isChatUnread } from '@/lib/notification-utils';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllCustomRosterEntries } from '@/hooks/useAllCustomRosterEntries';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { calculatePlanProgressPercent, findTodaysReading, findNextUnreadReading } from '@/lib/reading-utils';
import { expandEventsToOccurrenceRows, type EventOccurrenceRow } from '@/lib/event-occurrences';
import { useMemo, useCallback, useState, type ReactNode } from 'react';
import {
  format, parseISO, isValid, differenceInDays, startOfDay,
  isBefore, isSameDay, startOfToday, compareAsc, endOfMonth, addMonths,
} from 'date-fns';
import { CalendarOff, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, PageSection } from '@/components/ui/page-layout';
import {
  ScheduleMonthGroup,
  ScheduleOccurrenceRow,
  ScheduleRowHighlight,
  ScheduleRowMeta,
  ScheduleRowTime,
  SchedulePassageRef,
} from '@/components/schedule/schedule-occurrence-row';
import {
  ScheduleDetailDialog,
  ScheduleDetailField,
  ScheduleDetailGroup,
  ScheduleDetailPassage,
  ScheduleDetailPeople,
  ScheduleDetailText,
} from '@/components/schedule/schedule-detail-dialog';
import { PlanProgressBar, ReadingCheckRow } from '@/components/bible-plan/plan-progress';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { userCanSeeEvent } from '@/lib/event-visibility';
import { formatCustomRosterEntrySummary, getUserCustomRosterLabels } from '@/lib/roster-access';
import HomeInfoWidgets from '@/components/dashboard-widgets/home-info-widgets';
import { EventCategory } from '@/types';

interface DashboardPageProps {
  currentUser: AppUser;
}

type AgendaEntry = {
  /** Stable key for the underlying record, so your own view replaces the community one. */
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

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "Lead: Ana, Drums: Sam" — who is playing what on a worship set. */
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

const MAX_AGENDA_ENTRIES = 12;

function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (lang === 'ko') return h < 12 ? '좋은 아침이에요' : h < 17 ? '좋은 오후예요' : '좋은 저녁이에요';
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage({ currentUser }: DashboardPageProps) {
  const lang = currentUser.preferredLanguage || 'en';
  const t = translations[lang];
  const today = startOfToday();

  const { plan } = useBiblePlan();
  const { completedPassages, togglePassageCompletion } = useUserBibleChecklist();
  const { events } = useEvents();
  const { chats } = useChats();
  const { roster: cleaningRoster } = useCleaningRoster();
  const { roster: qtRoster } = useQTRoster();
  const { allUsers } = useAllUsers();
  const { cleaningDays } = useCleaningDays();
  const { rosters: worshipRosters } = useWorshipRosters();
  const { entries: customRosterEntries } = useAllCustomRosterEntries();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const { openBibleReader } = useGlobalBibleReader();
  const [selectedEntry, setSelectedEntry] = useState<AgendaEntry | null>(null);

  const go = useCallback((path: string) => {
    setIsPageLoading(true);
    router.push(path);
  }, [router, setIsPageLoading]);

  const readPassage = useCallback((text: string) => {
    const parsed = parsePassageReferenceForNavigation(text);
    if (parsed) openBibleReader(parsed.book, parsed.chapter);
  }, [openBibleReader]);

  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
  const cleaningDaysMap = useMemo(() => new Map(cleaningDays.map(d => [d.id, d.name])), [cleaningDays]);

  const todaysReading = useMemo(() => plan?.dailyReadings ? findTodaysReading(plan.dailyReadings) : null, [plan]);
  const nextUnread = useMemo(
    () => plan?.dailyReadings ? findNextUnreadReading(plan.dailyReadings, completedPassages, today) : null,
    [plan, completedPassages, today],
  );

  const todayPassages = useMemo(
    () => todaysReading?.passages.filter(p => p.displayText && !p.displayText.startsWith('Error:')) || [],
    [todaysReading],
  );

  const todayDoneCount = useMemo(() => todayPassages.filter(p => {
    const date = todaysReading?.date;
    return date
      ? completedPassages.includes(makePassageKey(date, p.displayText))
      : completedPassages.includes(makeManualPassageKey(p.displayText));
  }).length, [todayPassages, completedPassages, todaysReading?.date]);

  const overallPct = useMemo(
    () => calculatePlanProgressPercent(plan?.dailyReadings, completedPassages),
    [plan?.dailyReadings, completedPassages],
  );

  const daysLeft = useMemo(() => {
    if (!plan?.dailyReadings?.length) return null;
    const last = parseISO(plan.dailyReadings[plan.dailyReadings.length - 1].date);
    return isValid(last) ? Math.max(0, differenceInDays(last, startOfDay(new Date()))) : null;
  }, [plan]);

  const unreadChatCount = useMemo(
    () => chats.filter((c) => isChatUnread(c, currentUser.uid)).length,
    [chats, currentUser.uid],
  );

  const filteredEvents = useMemo(() => (events || []).filter((e) => {
    if (currentUser?.isAdmin) return true;
    return userCanSeeEvent(currentUser, e);
  }), [events, currentUser]);

  const dashboardEventRows = useMemo((): EventOccurrenceRow[] => {
    const rows = expandEventsToOccurrenceRows(filteredEvents, {
      from: today,
      until: endOfMonth(addMonths(today, 1)),
    });
    return rows.sort((a, b) => compareAsc(a.occurrenceDate, b.occurrenceDate));
  }, [filteredEvents, today]);

  const entryTypeLabel = (type: AgendaEntry['type']) => {
    switch (type) {
      case 'cleaning': return t.cleaningRoster;
      case 'qt': return t.qtTitle;
      case 'worship': return t.worshipPortal;
      case 'custom': return t.schedule;
      case 'event': return t.events;
      case 'birthday': return t.birthday;
    }
  };

  /**
   * One schedule instead of separate "today", "my duties" and "next up" lists.
   * Community entries land first; your own version of the same roster replaces it
   * so a Sunday you are serving on is never listed twice.
   */
  const agenda = useMemo((): AgendaEntry[] => {
    const byKey = new Map<string, AgendaEntry>();
    const add = (entry: AgendaEntry) => byKey.set(entry.sourceKey, entry);

    for (const row of dashboardEventRows) {
      const { event } = row;
      const isBirthday = event.category === EventCategory.Birthday;
      add({
        sourceKey: `event-${row.occurrenceKey}`,
        date: row.occurrenceDate,
        title: event.title,
        subtitle: <ScheduleRowMeta>{event.category}</ScheduleRowMeta>,
        meta: !event.allDay && event.startTime ? (
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

    // Community rosters only show for today; your own show for the full window.
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
      if (!isValid(d) || !isSameDay(d, today)) return;
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

    // ── Your own commitments, which replace the community entry above ──

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
        rightElement: <Badge variant="secondary">{t.youLabel}</Badge>,
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
        rightElement: <Badge variant="secondary">{t.youLabel}</Badge>,
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
        rightElement: <Badge variant="secondary">{t.youLabel}</Badge>,
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
        rightElement: <Badge variant="secondary">{t.youLabel}</Badge>,
        type: 'custom',
        details: `${t.servingAs} ${myDuties.join(', ')}`,
      });
    });

    return Array.from(byKey.values())
      .sort((a, b) => compareAsc(a.date, b.date))
      .slice(0, MAX_AGENDA_ENTRIES);
  }, [
    dashboardEventRows, qtRoster, cleaningRoster, worshipRosters, customRosterEntries,
    usersMap, cleaningDaysMap, today, currentUser,
    t.member, t.qtSharing, t.churchCleaning, t.cleaningDuty, t.worshipPortal, t.schedule,
    t.servingAs, t.youreSharing, t.withLabel, t.youLabel,
  ]);

  /** Month buckets, matching the Events / QT / Cleaning pages. */
  const agendaByMonth = useMemo(() => {
    const groups = new Map<string, AgendaEntry[]>();
    for (const entry of agenda) {
      const month = format(entry.date, 'MMMM yyyy');
      const bucket = groups.get(month);
      if (bucket) bucket.push(entry);
      else groups.set(month, [entry]);
    }
    return Array.from(groups.entries());
  }, [agenda]);

  const nextMissedPassage = useMemo(() => {
    if (!nextUnread) return null;
    const passages = nextUnread.passages?.filter(p => p.displayText && !p.displayText.startsWith('Error:')) || [];
    return passages.find(passage => {
      const date = nextUnread.date;
      return !completedPassages.includes(makePassageKey(date, passage.displayText));
    }) ?? null;
  }, [nextUnread, completedPassages]);

  const displayName = `${formatUserDisplayName(currentUser, 'Guest')}${lang === 'ko' ? '님' : ''}`;
  const dateLabel = lang === 'ko'
    ? `${format(today, 'M월 d일')} ${KO_WEEKDAYS[today.getDay()]}요일`
    : format(today, 'EEEE, d MMMM');

  return (
    <div className="page-container">

      <PageHeader
        title={`${getGreeting(lang)}, ${displayName}`}
        description={dateLabel}
        action={unreadChatCount > 0 ? (
          <Button variant="outline" size="sm" onClick={() => go('/chat')}>
            <MessageCircle className="mr-2 h-4 w-4" />
            {t.unreadMessagesLine.replace('{count}', String(unreadChatCount))}
          </Button>
        ) : undefined}
      />

      <PageSection
        title={t.bibleReadingHub}
        action={
          <Button variant="ghost" size="sm" onClick={() => go('/bible-checklist')}>
            {t.fullPlanLink}
          </Button>
        }
      >
        <div className="space-y-4">
          <PlanProgressBar
            value={overallPct}
            caption={
              <>
                {daysLeft != null ? `${daysLeft} ${t.daysLeftLabel}` : null}
                {daysLeft != null && todayPassages.length > 0 ? ' · ' : null}
                {todayPassages.length > 0 ? `${todayDoneCount}/${todayPassages.length}` : null}
              </>
            }
          />

          {todayPassages.length > 0 ? (
            <div className="ui-list">
              <AnimatePresence mode="popLayout">
                {todayPassages.map(p => {
                  const date = todaysReading?.date;
                  const done = date
                    ? completedPassages.includes(makePassageKey(date, p.displayText))
                    : completedPassages.includes(makeManualPassageKey(p.displayText));
                  return (
                    <ReadingCheckRow
                      key={p.displayText}
                      label={p.displayText}
                      done={done}
                      onToggle={() => togglePassageCompletion(p.displayText, todaysReading?.date)}
                      onRead={() => readPassage(p.displayText)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-micro-label">{t.restDayMessage}</p>
          )}

          {nextMissedPassage && (
            <ReadingCheckRow
              separated
              lead={t.missedReading}
              label={nextMissedPassage.displayText}
              onToggle={() => togglePassageCompletion(nextMissedPassage.displayText, nextUnread?.date)}
              onRead={() => readPassage(nextMissedPassage.displayText)}
            />
          )}
        </div>
      </PageSection>

      <div className="stack-gap-sm">
        {agendaByMonth.length > 0 ? (
          agendaByMonth.map(([month, entries]) => (
            <ScheduleMonthGroup key={month} month={month}>
              {entries.map((entry, index) => (
                <ScheduleOccurrenceRow
                  key={entry.sourceKey}
                  index={index}
                  date={entry.date}
                  title={entry.title}
                  subtitle={entry.subtitle}
                  meta={entry.meta}
                  rightElement={entry.rightElement}
                  onClick={() => setSelectedEntry(entry)}
                />
              ))}
            </ScheduleMonthGroup>
          ))
        ) : (
          <EmptyState icon={CalendarOff} title={t.clearSchedule} description={t.nothingComingUp} />
        )}
      </div>

      <HomeInfoWidgets />

      <ScheduleDetailDialog
        open={!!selectedEntry}
        onOpenChange={open => !open && setSelectedEntry(null)}
        eyebrow={selectedEntry ? entryTypeLabel(selectedEntry.type) : undefined}
        title={selectedEntry?.title}
        date={selectedEntry?.date}
        closeLabel={t.done}
      >
        {(selectedEntry?.type === 'event' || selectedEntry?.type === 'birthday' || selectedEntry?.type === 'worship' || selectedEntry?.type === 'custom') && selectedEntry.details && (
          <ScheduleDetailText>{selectedEntry.details}</ScheduleDetailText>
        )}
        {selectedEntry?.type === 'qt' && (
          <ScheduleDetailGroup>
            {selectedEntry.qtTitle && <ScheduleDetailField label={t.topic} value={selectedEntry.qtTitle} />}
            {selectedEntry.passage && <ScheduleDetailPassage passage={selectedEntry.passage} />}
          </ScheduleDetailGroup>
        )}
        {selectedEntry?.type === 'cleaning' && (
          <ScheduleDetailGroup>
            {selectedEntry.dayName && <ScheduleDetailField label={t.dayType} value={selectedEntry.dayName} />}
            {selectedEntry.assignedNames && <ScheduleDetailPeople names={selectedEntry.assignedNames} />}
          </ScheduleDetailGroup>
        )}
      </ScheduleDetailDialog>
    </div>
  );
}
