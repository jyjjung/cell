"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { type AppUser } from '@/types';
import { translations } from '@/lib/translations';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useEvents } from '@/hooks/use-events';
import { useChats } from '@/hooks/useChats';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useAllCustomRosterEntries } from '@/hooks/useAllCustomRosterEntries';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { calculatePlanProgressPercent, findTodaysReading, findNextUnreadReading } from '@/lib/reading-utils';
import { makePassageKey } from '@/hooks/use-user-bible-checklist';
import { expandEventsToOccurrenceRows, type EventOccurrenceRow } from '@/lib/event-occurrences';
import { useMemo, useCallback, useState } from 'react';
import {
  format, parseISO, isValid, differenceInDays, startOfDay, isBefore,
  startOfToday, compareAsc, endOfMonth, addMonths,
} from 'date-fns';
import {
  ChevronRight, BookOpen, Calendar, Users, HeartHandshake, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatUserDisplayName } from '@/lib/formatting';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { userCanSeeEvent } from '@/lib/event-visibility';
import { getUserCustomRosterLabels } from '@/lib/roster-access';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import CalendarWidget from '@/components/dashboard-widgets/calendar-widget';
import AgendaView, { type AgendaItem } from '@/components/dashboard-widgets/agenda-view';
import TodayQtWidget from '@/components/dashboard-widgets/today-qt-widget';
import OnlineOfferingsWidget from '@/components/dashboard-widgets/online-offerings-widget';
import { EventCategory } from '@/types';

interface DashboardPageProps {
  currentUser: AppUser;
}

type DashboardListItem = {
  id: string;
  date: Date;
  label: string;
  sublabel?: string;
  type: 'event' | 'birthday' | 'cleaning' | 'qt' | 'worship' | 'custom';
  href?: string;
  details?: string;
  passage?: string;
  qtTitle?: string;
  assignedNames?: string;
  dayName?: string;
};

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (lang === 'ko') return h < 12 ? '좋은 아침이에요' : h < 17 ? '좋은 오후예요' : '좋은 저녁이에요';
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function ShortcutPill({
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
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
  const [selectedEvent, setSelectedEvent] = useState<DashboardListItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

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
      ? completedPassages.includes(makePassageKey(date, p.displayText)) || completedPassages.includes(p.displayText)
      : completedPassages.includes(p.displayText);
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

  const unreadChatCount = useMemo(() => chats.filter(c => {
    if (!c.lastMessageSentAt || !c.memberSeen?.[currentUser.uid] || c.lastMessageSenderId === currentUser.uid) return false;
    const ms = (ts: { toMillis?: () => number; _seconds?: number } | Date) =>
      (ts as { toMillis?: () => number })?.toMillis?.()
      ?? (ts instanceof Date ? ts.getTime() : (ts as { _seconds?: number })?._seconds ? (ts as { _seconds: number })._seconds * 1000 : 0);
    return ms(c.lastMessageSentAt) > ms(c.memberSeen[currentUser.uid]);
  }).length, [chats, currentUser.uid]);

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

  const upcomingOnlyEvents = useMemo(
    () => filteredEvents.filter((event) => {
      const rows = expandEventsToOccurrenceRows([event], {
        from: today,
        until: endOfMonth(addMonths(today, 1)),
      });
      return rows.length > 0;
    }),
    [filteredEvents, today],
  );


  const itemTypeLabel = (type: DashboardListItem['type']) => {
    switch (type) {
      case 'cleaning': return t.cleaningRoster;
      case 'qt': return t.qtTitle;
      case 'worship': return t.worshipPortal;
      case 'custom': return t.schedule;
      case 'event': return t.events;
      case 'birthday': return t.birthday;
    }
  };

  const openEventFromOccurrence = useCallback((row: EventOccurrenceRow) => {
    const isBirthday = row.event.category === EventCategory.Birthday;
    setSelectedEvent({
      id: row.occurrenceKey,
      date: row.occurrenceDate,
      label: row.event.title,
      sublabel: row.event.category,
      type: isBirthday ? 'birthday' : 'event',
      details: row.event.details,
    });
  }, []);

  const myRosterItems = useMemo((): DashboardListItem[] => {
    const items: DashboardListItem[] = [];

    cleaningRoster.forEach(r => {
      const d = parseISO(r.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      if (!r.assignedUserIds.includes(currentUser.uid)) return;
      const dayLabel = cleaningDaysMap.get(r.dayId);
      const names = r.assignedUserIds
        .map((uid) => usersMap.get(uid))
        .filter(Boolean)
        .map((user) => formatUserDisplayName(user!))
        .join(', ');
      items.push({
        id: `my-cleaning-${r.id}`,
        date: d,
        label: 'Church Cleaning',
        sublabel: dayLabel,
        type: 'cleaning',
        href: '/cleaning-roster',
        assignedNames: names,
        dayName: dayLabel,
      });
    });

    qtRoster.forEach(r => {
      const d = parseISO(r.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      if (r.userId !== currentUser.uid) return;
      items.push({
        id: `my-qt-${r.id}`,
        date: d,
        label: 'QT Sharing',
        sublabel: r.title || r.passage,
        type: 'qt',
        href: '/qt',
        passage: r.passage,
        qtTitle: r.title,
      });
    });

    worshipRosters.forEach(roster => {
      const d = parseISO(roster.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      const myRoles: string[] = [];
      roster.slots.forEach(slot => {
        if (slot.members.some(m => m.userId === currentUser.uid)) myRoles.push(slot.role);
      });
      if (myRoles.length === 0) return;
      items.push({
        id: `my-worship-${roster.id}`,
        date: d,
        label: roster.name || 'Worship Roster',
        sublabel: myRoles.join(', '),
        type: 'worship',
        href: '/worship',
        details: `Your roles: ${myRoles.join(', ')}`,
      });
    });

    customRosterEntries.forEach(entry => {
      const d = parseISO(entry.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      const myDuties = getUserCustomRosterLabels(
        entry,
        { fields: entry.rosterFields },
        currentUser.uid,
      );
      if (myDuties.length === 0) return;
      items.push({
        id: `my-custom-${entry.id}`,
        date: d,
        label: entry.rosterName,
        sublabel: myDuties.join(', '),
        type: 'custom',
        href: `/rosters/${entry.rosterDefId}?date=${entry.date}`,
        details: `Your assignments: ${myDuties.join(', ')}`,
      });
    });

    return items.sort((a, b) => compareAsc(a.date, b.date));
  }, [cleaningRoster, qtRoster, worshipRosters, customRosterEntries, currentUser.uid, cleaningDaysMap, usersMap, today]);

  const upcomingDuties = useMemo(() => myRosterItems.slice(0, 8), [myRosterItems]);

  const upcomingEvents = useMemo(
    () => dashboardEventRows.slice(0, 6),
    [dashboardEventRows],
  );

  const handleAgendaItemClick = useCallback((item: AgendaItem) => {
    if (item.kind === 'event') {
      openEventFromOccurrence(item.row);
      return;
    }
    setSelectedEvent({
      id: item.id,
      date: item.date,
      label: item.title,
      type: item.type,
      passage: item.passage,
      qtTitle: item.qtTitle,
      assignedNames: item.assignedNames,
      dayName: item.dayName,
      details: item.details,
    });
  }, [openEventFromOccurrence]);

  const nextMissedPassage = useMemo(() => {
    if (!nextUnread) return null;
    const passages = nextUnread.passages?.filter(p => p.displayText && !p.displayText.startsWith('Error:')) || [];
    return passages.find(passage => {
      const date = nextUnread.date;
      return !(
        completedPassages.includes(makePassageKey(date, passage.displayText)) ||
        completedPassages.includes(passage.displayText)
      );
    }) ?? null;
  }, [nextUnread, completedPassages]);

  const displayName = `${formatUserDisplayName(currentUser, 'Guest')}${lang === 'ko' ? '님' : ''}`;
  const dateLabel = format(today, lang === 'ko' ? 'M월 d일 EEEE' : 'EEEE, MMMM d');

  return (
    <div className="page-container">

      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-eyebrow">{dateLabel}</p>
          <h1 className="text-page-title leading-tight">
            {getGreeting(lang)}, {displayName}
          </h1>
        </div>
        {unreadChatCount > 0 && (
          <button
            type="button"
            onClick={() => go('/chat')}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {unreadChatCount} {t.unread}
          </button>
        )}
      </header>

      {/* Shortcuts */}
      <div className="flex flex-wrap gap-2">
        <ShortcutPill icon={MessageCircle} label={t.messagesLabel} badge={unreadChatCount} onClick={() => go('/chat')} />
        <ShortcutPill icon={HeartHandshake} label={t.prayerRequests} onClick={() => go('/prayer-requests')} />
        <ShortcutPill icon={Calendar} label={t.events} onClick={() => go('/events')} />
        <ShortcutPill icon={BookOpen} label={t.bibleReadingHub} onClick={() => go('/bible-checklist')} />
      </div>

      {/* Main grid: reading + today */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-6">

        {/* Bible reading */}
        <section className="ui-card space-y-5 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-eyebrow">{t.bibleReadingHub}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums tracking-tight">{overallPct}</span>
                <span className="text-lg text-muted-foreground">%</span>
              </div>
              {daysLeft != null && (
                <p className="text-stat-label mt-1">{daysLeft} {t.daysLeftLabel}</p>
              )}
            </div>
            {todayPassages.length > 0 && (
              <p className="text-sm font-medium text-muted-foreground tabular-nums">
                {todayDoneCount}/{todayPassages.length}
              </p>
            )}
          </div>

          <Progress value={overallPct} className="h-1.5 bg-muted" />

          {todayPassages.length > 0 ? (
            <div className="space-y-0.5">
              <p className="text-eyebrow pb-2">{t.todaysAssigned}</p>
              <AnimatePresence mode="popLayout">
                {todayPassages.map(p => {
                  const date = todaysReading?.date;
                  const done = date
                    ? completedPassages.includes(makePassageKey(date, p.displayText)) || completedPassages.includes(p.displayText)
                    : completedPassages.includes(p.displayText);
                  return (
                    <motion.div
                      key={p.displayText}
                      layout
                      transition={spring}
                      className={cn('flex items-center gap-3 rounded-lg py-2', done && 'opacity-45')}
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
                          'flex-1 text-left text-sm font-medium',
                          done && 'line-through text-muted-foreground',
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
            <p className="text-sm text-muted-foreground">{t.restDayMessage}</p>
          )}

          {nextMissedPassage && (
            <div className="border-t border-border/50 pt-4">
              <p className="text-eyebrow mb-2">{t.missedReading}</p>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => togglePassageCompletion(nextMissedPassage.displayText, nextUnread?.date)}
                  className="h-4 w-4 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => readPassage(nextMissedPassage.displayText)}
                  className="flex-1 text-left text-sm font-medium"
                >
                  {nextMissedPassage.displayText}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Today snapshot */}
        <aside className="ui-card space-y-4 lg:col-span-2">
          <TodayQtWidget />
          <OnlineOfferingsWidget />

          <div>
            <p className="text-eyebrow">{t.todayLabel}</p>
            <AgendaView
              selectedDate={today}
              hideHeader
              hideQt
              events={upcomingOnlyEvents}
              cleaningRoster={cleaningRoster}
              qtRoster={qtRoster}
              worshipRosters={worshipRosters}
              customRosterEntries={customRosterEntries}
              allUsers={allUsers}
              cleaningDays={cleaningDays}
              onItemClick={handleAgendaItemClick}
            />

          {upcomingDuties.length > 0 && (
            <div className="space-y-2 border-t border-border/50 pt-4">
              <p className="text-section-title">{t.myUpcomingDuties}</p>
              <div className="ui-list">
                {upcomingDuties.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedEvent(item)}
                    className="event-row group"
                  >
                    <span className="event-row-time">{format(item.date, 'MMM d')}</span>
                    <div className="event-row-body">
                      <p className="event-row-title">{item.label}</p>
                      <p className="event-row-meta">{item.sublabel || itemTypeLabel(item.type)}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {upcomingEvents.length > 0 && (
            <div className="space-y-2 border-t border-border/50 pt-4">
              <p className="text-section-title">{t.nextUp}</p>
              <div className="ui-list">
                {upcomingEvents.map((row) => (
                  <button
                    key={row.occurrenceKey}
                    type="button"
                    onClick={() => openEventFromOccurrence(row)}
                    className="event-row group"
                  >
                    <span className="event-row-time">{format(row.occurrenceDate, 'MMM d')}</span>
                    <div className="event-row-body">
                      <p className="event-row-title">{row.event.title}</p>
                      <p className="event-row-meta">{row.event.category}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>
        </aside>
      </div>

      {/* Calendar */}
      <section>
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="border-b border-border/50 p-4 lg:border-b-0 lg:border-r">
              <CalendarWidget
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                events={upcomingOnlyEvents}
                cleaningRoster={cleaningRoster}
                qtRoster={qtRoster}
              />
            </div>
            <div className="p-3">
              <AgendaView
                selectedDate={selectedDate}
                events={upcomingOnlyEvents}
                cleaningRoster={cleaningRoster}
                qtRoster={qtRoster}
                worshipRosters={worshipRosters}
                customRosterEntries={customRosterEntries}
                allUsers={allUsers}
                cleaningDays={cleaningDays}
                onItemClick={handleAgendaItemClick}
              />
            </div>
          </div>
        </div>
      </section>

      <Dialog open={!!selectedEvent} onOpenChange={open => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-sm rounded-xl border-border/70 p-5">
          <DialogHeader className="space-y-2 text-left">
            <p className="text-eyebrow">{selectedEvent ? itemTypeLabel(selectedEvent.type) : ''}</p>
            <DialogTitle className="text-base font-semibold leading-snug">{selectedEvent?.label}</DialogTitle>
            <DialogDescription className="text-stat-label">
              {selectedEvent && format(selectedEvent.date, 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {(selectedEvent?.type === 'event' || selectedEvent?.type === 'birthday' || selectedEvent?.type === 'worship' || selectedEvent?.type === 'custom') && selectedEvent.details && (
              <p className="text-sm leading-relaxed text-muted-foreground">{selectedEvent.details}</p>
            )}
            {selectedEvent?.type === 'qt' && (
              <div className="space-y-2 text-sm">
                {selectedEvent.qtTitle && (
                  <p><span className="text-muted-foreground">{t.topic}: </span>{selectedEvent.qtTitle}</p>
                )}
                {selectedEvent.passage && (
                  <p className="font-mono font-medium">{selectedEvent.passage}</p>
                )}
              </div>
            )}
            {selectedEvent?.type === 'cleaning' && (
              <div className="space-y-2 text-sm">
                {selectedEvent.dayName && (
                  <p><span className="text-muted-foreground">{t.dayType}: </span>{selectedEvent.dayName}</p>
                )}
                {selectedEvent.assignedNames && (
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p>{selectedEvent.assignedNames}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button className="mt-2 w-full" onClick={() => setSelectedEvent(null)}>{t.done}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
