"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { type AppUser } from '@/types';
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
import { CalendarOff, Clock, MessageCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { EmptyState, PageHeader, PageSection } from '@/components/ui/page-layout';
import { ScheduleMonthGroup, ScheduleOccurrenceRow } from '@/components/schedule/schedule-occurrence-row';
import { cn } from '@/lib/utils';
import { formatUserDisplayName, formatNameString } from '@/lib/formatting';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { userCanSeeEvent } from '@/lib/event-visibility';
import { formatCustomRosterEntrySummary, getUserCustomRosterLabels } from '@/lib/roster-access';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import HomeInfoWidgets from '@/components/dashboard-widgets/home-info-widgets';
import { EventCategory } from '@/types';

interface DashboardPageProps {
  currentUser: AppUser;
}

type AgendaEntry = {
  /** Stable key for the underlying record, so your own view replaces the community one. */
  sourceKey: string;
  date: Date;
  label?: string;
  title: string;
  meta?: ReactNode;
  rightElement?: ReactNode;
  type: 'event' | 'birthday' | 'cleaning' | 'qt' | 'worship' | 'custom';
  passage?: string;
  qtTitle?: string;
  assignedNames?: string;
  dayName?: string;
  details?: string;
};

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const MAX_AGENDA_ENTRIES = 12;

function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (lang === 'ko') return h < 12 ? '좋은 아침이에요' : h < 17 ? '좋은 오후예요' : '좋은 저녁이에요';
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Highlights the part of a row that is about you. */
function MineMeta({ lead, value }: { lead?: string; value?: string }) {
  if (!value) return null;
  return (
    <span className="font-medium text-foreground">
      {lead ? `${lead} ` : ''}{value}
    </span>
  );
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
        label: event.category,
        title: event.title,
        meta: !event.allDay && event.startTime ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {event.startTime}{event.endTime ? `–${event.endTime}` : ''}
          </span>
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
        label: t.qtSharing,
        title: sharerName,
        meta: entry.title ? <span>{entry.title}</span> : undefined,
        rightElement: entry.passage ? (
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">{entry.passage}</span>
        ) : undefined,
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
        label: t.cleaningDuty,
        title: dayName || t.churchCleaning,
        meta: names ? <span>{names}</span> : undefined,
        type: 'cleaning',
        assignedNames: names,
        dayName,
      });
    });

    worshipRosters.forEach((roster) => {
      const d = parseISO(roster.date || '');
      if (!isValid(d) || !isSameDay(d, today)) return;
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
        .join(', ');
      if (!roleLines) return;
      add({
        sourceKey: `worship-${roster.id}`,
        date: d,
        label: t.worshipPortal,
        title: roster.name || t.worshipPortal,
        meta: <span className="truncate">{roleLines}</span>,
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
        label: t.schedule,
        title: entry.rosterName,
        meta: <span className="truncate">{assignments}</span>,
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
        label: t.cleaningDuty,
        title: dayName || t.churchCleaning,
        meta: others ? <MineMeta lead={t.withLabel} value={others} /> : undefined,
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
        label: t.qtSharing,
        title: formatUserDisplayName(currentUser, t.member),
        meta: <MineMeta lead={t.youreSharing} value={r.passage || r.title} />,
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
      add({
        sourceKey: `worship-${roster.id}`,
        date: d,
        label: t.worshipPortal,
        title: roster.name || t.worshipPortal,
        meta: <MineMeta lead={t.servingAs} value={myRoles.join(', ')} />,
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
      add({
        sourceKey: `custom-${entry.id}`,
        date: d,
        label: t.schedule,
        title: entry.rosterName,
        meta: <MineMeta lead={t.servingAs} value={myDuties.join(', ')} />,
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
          <div>
            <div className="mb-2 flex items-center gap-4">
              <Progress value={overallPct} className="h-2 flex-grow bg-muted shadow-inner" />
              <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">{overallPct}%</span>
            </div>
            <p className="text-micro-label">
              {daysLeft != null ? `${daysLeft} ${t.daysLeftLabel}` : null}
              {daysLeft != null && todayPassages.length > 0 ? ' · ' : null}
              {todayPassages.length > 0 ? `${todayDoneCount}/${todayPassages.length}` : null}
            </p>
          </div>

          {todayPassages.length > 0 ? (
            <div className="ui-list">
              <AnimatePresence mode="popLayout">
                {todayPassages.map(p => {
                  const date = todaysReading?.date;
                  const done = date
                    ? completedPassages.includes(makePassageKey(date, p.displayText))
                    : completedPassages.includes(makeManualPassageKey(p.displayText));
                  return (
                    <motion.div
                      key={p.displayText}
                      layout
                      transition={spring}
                      className={cn('flex items-center gap-3 py-2', done && 'opacity-45')}
                    >
                      <Checkbox
                        checked={done}
                        onCheckedChange={() => togglePassageCompletion(p.displayText, todaysReading?.date)}
                        className="h-4 w-4 shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => readPassage(p.displayText)}
                        className={cn(
                          'flex-1 text-left text-sm font-medium text-foreground',
                          done && 'text-muted-foreground line-through',
                        )}
                      >
                        {p.displayText}
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-micro-label">{t.restDayMessage}</p>
          )}

          {nextMissedPassage && (
            <div className="flex items-center gap-3 border-t border-border/60 pt-3">
              <Checkbox
                checked={false}
                onCheckedChange={() => togglePassageCompletion(nextMissedPassage.displayText, nextUnread?.date)}
                className="h-4 w-4 shrink-0"
              />
              <button
                type="button"
                onClick={() => readPassage(nextMissedPassage.displayText)}
                className="flex-1 text-left"
              >
                <span className="text-micro-label">{t.missedReading}: </span>
                <span className="text-sm font-medium text-foreground">{nextMissedPassage.displayText}</span>
              </button>
            </div>
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
                  label={entry.label}
                  title={entry.title}
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

      <Dialog open={!!selectedEntry} onOpenChange={open => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-sm rounded-xl border-border/70 p-5">
          <DialogHeader className="space-y-2 text-left">
            <p className="text-eyebrow">{selectedEntry ? entryTypeLabel(selectedEntry.type) : ''}</p>
            <DialogTitle className="text-base font-semibold leading-snug">{selectedEntry?.title}</DialogTitle>
            <DialogDescription className="text-stat-label">
              {selectedEntry && format(selectedEntry.date, 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {(selectedEntry?.type === 'event' || selectedEntry?.type === 'birthday' || selectedEntry?.type === 'worship' || selectedEntry?.type === 'custom') && selectedEntry.details && (
              <p className="text-sm leading-relaxed text-muted-foreground">{selectedEntry.details}</p>
            )}
            {selectedEntry?.type === 'qt' && (
              <div className="space-y-2 text-sm">
                {selectedEntry.qtTitle && (
                  <p><span className="text-muted-foreground">{t.topic}: </span>{selectedEntry.qtTitle}</p>
                )}
                {selectedEntry.passage && (
                  <p className="font-mono font-medium">{selectedEntry.passage}</p>
                )}
              </div>
            )}
            {selectedEntry?.type === 'cleaning' && (
              <div className="space-y-2 text-sm">
                {selectedEntry.dayName && (
                  <p><span className="text-muted-foreground">{t.dayType}: </span>{selectedEntry.dayName}</p>
                )}
                {selectedEntry.assignedNames && (
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p>{selectedEntry.assignedNames}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button className="mt-2 w-full" onClick={() => setSelectedEntry(null)}>{t.done}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
