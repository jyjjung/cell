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
import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { format, parseISO, isValid, differenceInDays, startOfDay, isBefore, startOfToday, compareAsc, isSameDay, startOfMonth, endOfMonth, addMonths, addDays } from 'date-fns';
import {
  BookOpen, MessageCircle, Calendar, CheckCircle, ChevronRight,
  Sparkles, ArrowRight, ShieldCheck, BookOpenText, Users, Flame, Clock, MapPin,
  Music2, ListChecks
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatUserDisplayName } from '@/lib/formatting';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { db } from '@/lib/firebase';
import { doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';
import { useUserAchievementStats } from '@/hooks/use-user-achievement-stats';
import { getUnlockedAchievements } from '@/lib/achievements';
import { getAvatarTierByUnlocked } from '@/lib/avatar-cosmetics';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import CalendarWidget from '@/components/dashboard-widgets/calendar-widget';
import AgendaView from '@/components/dashboard-widgets/agenda-view';
import { PageHeader } from '@/components/ui/page-layout';
import { EventCategory } from '@/types';
interface DashboardPageProps {
  currentUser: AppUser;
}

function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (lang === 'ko') return h < 12 ? '좋은 아침이에요' : h < 17 ? '좋은 오후예요' : '좋은 저녁이에요';
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const spring = { type: 'spring', stiffness: 300, damping: 28 };

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
};

type DashboardListItem = {
  id: string;
  date: Date;
  label: string;
  sublabel?: string;
  type: 'event' | 'birthday' | 'cleaning' | 'qt' | 'worship' | 'custom';
  href?: string;
  // For dialog
  details?: string;
  passage?: string;
  qtTitle?: string;
  assignedNames?: string;
  dayName?: string;
};

export default function DashboardPage({ currentUser }: DashboardPageProps) {
  const t = translations[currentUser.preferredLanguage || 'en'];
  const { plan, loading: planLoading } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { events, loading: eventsLoading } = useEvents();
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
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [isClaimingAchievementHelp, setIsClaimingAchievementHelp] = useState(false);
  const [optimisticNextClaimAtMs, setOptimisticNextClaimAtMs] = useState<number | null>(null);
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const { feedbackCount, clickMeCount } = useUserAchievementStats(currentUser.uid, true);
  const lastSyncedTierRef = useRef<string | null>(null);

  const isLoading = planLoading || eventsLoading || loadingChecklist;

  // Hooks moved above early return
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
  const nextUnread = useMemo(() => plan?.dailyReadings ? findNextUnreadReading(plan.dailyReadings, completedPassages, startOfToday()) : null, [plan, completedPassages]);

  const todayPassages = useMemo(() => todaysReading?.passages.filter(p => p.displayText && !p.displayText.startsWith('Error:')) || [], [todaysReading]);
  const todayDoneCount = useMemo(() => todayPassages.filter(p => {
    const date = todaysReading?.date;
    return date
      ? completedPassages.includes(makePassageKey(date, p.displayText)) || completedPassages.includes(p.displayText)
      : completedPassages.includes(p.displayText);
  }).length, [todayPassages, completedPassages, todaysReading?.date]);
  const isTodayComplete = todayPassages.length > 0 && todayDoneCount === todayPassages.length;

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
    const ms = (ts: any) => ts?.toMillis?.() || (ts instanceof Date ? ts.getTime() : ts?._seconds ? ts._seconds * 1000 : 0);
    return ms(c.lastMessageSentAt) > ms(c.memberSeen[currentUser.uid]);
  }).length, [chats, currentUser.uid]);

  const filteredEvents = useMemo(() => {
    return (events || []).filter(e => {
      if (currentUser?.isAdmin) return true;
      if (!e.allowedRoleIds || e.allowedRoleIds.length === 0) return true;
      const userRoles = currentUser?.roleIds || [];
      return e.allowedRoleIds.some(rid => userRoles.includes(rid));
    });
  }, [events, currentUser]);

  // ── Unified Type Helpers ──
  const itemTypeColor = (type: DashboardListItem['type']) => {
    switch (type) {
      case 'cleaning': return 'text-primary';
      case 'qt': return 'text-primary';
      case 'worship': return 'text-primary';
      case 'custom': return 'text-primary';
      case 'event': return 'text-primary';
      case 'birthday': return 'text-primary';
    }
  };
  const itemTypeBg = (type: DashboardListItem['type']) => {
    switch (type) {
      case 'cleaning': return 'bg-muted border-border';
      case 'qt': return 'bg-primary/10 border-primary/20';
      case 'worship': return 'bg-muted border-border';
      case 'custom': return 'bg-muted border-border';
      case 'event': return 'bg-muted border-border';
      case 'birthday': return 'bg-muted border-border';
    }
  };
  const itemTypeIcon = (type: DashboardListItem['type']) => {
    switch (type) {
      case 'cleaning': return ShieldCheck;
      case 'qt': return BookOpenText;
      case 'worship': return Music2;
      case 'custom': return ListChecks;
      case 'event': return Calendar;
      case 'birthday': return Sparkles;
    }
  };
  const itemTypeLabel = (type: DashboardListItem['type']) => {
    switch (type) {
      case 'cleaning': return 'Cleaning';
      case 'qt': return 'QT Sharing';
      case 'worship': return 'Worship';
      case 'custom': return 'Custom Roster';
      case 'event': return 'Event';
      case 'birthday': return 'Birthday';
    }
  };

  const dashboardEventRows = useMemo((): EventOccurrenceRow[] => {
    const today = startOfToday();
    const windowStart = today;
    const windowEnd = endOfMonth(addMonths(today, 1));
    const rows = expandEventsToOccurrenceRows(filteredEvents, { from: windowStart, until: windowEnd });
    return rows.sort((a, b) => compareAsc(a.occurrenceDate, b.occurrenceDate));
  }, [filteredEvents]);

  const upcomingOnlyEvents = useMemo(
    () => filteredEvents.filter((event) => {
      const rows = expandEventsToOccurrenceRows([event], {
        from: startOfToday(),
        until: endOfMonth(addMonths(startOfToday(), 1)),
      });
      return rows.length > 0;
    }),
    [filteredEvents]
  );

  const nextUpEvent = dashboardEventRows[0] ?? null;

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
    const today = startOfToday();
    const items: DashboardListItem[] = [];

    // Cleaning – match by uid in assignedUserIds array
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
        dayName: dayLabel
      });
    });

    // QT – match by userId field (not name)
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
        qtTitle: r.title
      });
    });

    // Worship roster – match by userId in any slot's members
    worshipRosters.forEach(roster => {
      const d = parseISO(roster.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      const myRoles: string[] = [];
      roster.slots.forEach(slot => {
        if (slot.members.some(m => m.userId === currentUser.uid)) {
          myRoles.push(slot.role);
        }
      });
      if (myRoles.length === 0) return;
      items.push({
        id: `my-worship-${roster.id}`,
        date: d,
        label: roster.name || 'Worship Roster',
        sublabel: myRoles.join(', '),
        type: 'worship',
        href: '/worship',
        details: `Your roles: ${myRoles.join(', ')}`
      });
    });

    // Custom rosters – match by userId in assignments array
    customRosterEntries.forEach(entry => {
      const d = parseISO(entry.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      const myDuties = entry.assignments
        .filter(a => a.userId === currentUser.uid)
        .map(a => a.duty);
      if (myDuties.length === 0) return;
      items.push({
        id: `my-custom-${entry.id}`,
        date: d,
        label: entry.rosterName,
        sublabel: myDuties.join(', '),
        type: 'custom',
        href: '/rosters',
        details: `Your assignments: ${myDuties.join(', ')}`
      });
    });

    return items.sort((a, b) => compareAsc(a.date, b.date));
  }, [cleaningRoster, qtRoster, worshipRosters, customRosterEntries, currentUser.uid, cleaningDaysMap, usersMap]);

  const imminentDuties = useMemo(() => {
    const today = startOfToday();
    const tomorrow = addDays(today, 1);
    return myRosterItems.filter(
      item => isSameDay(item.date, today) || isSameDay(item.date, tomorrow)
    );
  }, [myRosterItems]);

  const getDutyWhenLabel = useCallback((date: Date) => {
    const today = startOfToday();
    if (isSameDay(date, today)) return t.dutyToday;
    if (isSameDay(date, addDays(today, 1))) return t.dutyTomorrow;
    return format(date, 'MMM d');
  }, [t]);

  const claimCooldownMs = 24 * 60 * 60 * 1000;
  const serverNextClaimAtMs = useMemo(() => {
    const baseMs = currentUser.clickMeLastClaimAt?.toMillis?.() || 0;
    return baseMs > 0 ? baseMs + claimCooldownMs : 0;
  }, [currentUser.clickMeLastClaimAt]);
  const nextClaimAtMs = optimisticNextClaimAtMs && optimisticNextClaimAtMs > serverNextClaimAtMs
    ? optimisticNextClaimAtMs
    : serverNextClaimAtMs;
  const nowMs = Date.now();
  const canClaimAchievementHelp = nowMs >= nextClaimAtMs;
  const remainingMs = Math.max(0, nextClaimAtMs - nowMs);
  const cooldownLabel = useMemo(() => {
    if (remainingMs <= 0) return 'Ready now';
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  }, [remainingMs]);

  const handleAchievementHelpClick = useCallback(async () => {
    if (!canClaimAchievementHelp || isClaimingAchievementHelp) return;
    setIsClaimingAchievementHelp(true);
    try {
      const currentStats = {
        planProgressPercent: overallPct,
        feedbackCount,
        clickMeCount: typeof clickMeCount === 'number' ? clickMeCount : (currentUser.clickMeCount || 0),
      };
      const previouslyUnlockedIds = new Set(getUnlockedAchievements(currentStats).map((achievement) => achievement.id));

      await updateDoc(doc(db, 'users', currentUser.uid), {
        clickMeCount: increment(1),
        clickMeLastClaimAt: serverTimestamp(),
      });

      const nextStats = {
        ...currentStats,
        clickMeCount: (currentStats.clickMeCount || 0) + 1,
      };
      const newlyUnlocked = getUnlockedAchievements(nextStats).filter(
        (achievement) => !previouslyUnlockedIds.has(achievement.id)
      );

      if (newlyUnlocked.length > 0) {
        await Promise.all(
          newlyUnlocked.map((achievement) =>
            createNotification({
              title: `Achievement Unlocked: ${achievement.title}`,
              message: achievement.description,
              type: 'admin',
              isGlobal: false,
              userId: currentUser.uid,
              relatedUrl: '/profile',
            })
          )
        );
      }

      setOptimisticNextClaimAtMs(Date.now() + claimCooldownMs);
      toast({
        title: newlyUnlocked.length > 0 ? 'Achievement Unlocked!' : 'Click Count +1',
        description: newlyUnlocked.length > 0
          ? `${newlyUnlocked[0].title} has been added to your achievements.`
          : 'This counted toward Click Me achievements. Come back in 24 hours.',
      });
    } catch (error) {
      toast({
        title: 'Could not claim right now',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsClaimingAchievementHelp(false);
    }
  }, [
    canClaimAchievementHelp,
    isClaimingAchievementHelp,
    currentUser.uid,
    currentUser.clickMeCount,
    overallPct,
    completedPassages.length,
    feedbackCount,
    clickMeCount,
    createNotification,
    toast,
  ]);

  useEffect(() => {
    if (typeof feedbackCount !== 'number' || typeof clickMeCount !== 'number') {
      return;
    }

    const unlocked = getUnlockedAchievements({
      planProgressPercent: overallPct,
      feedbackCount,
      clickMeCount,
    });
    const targetTier = getAvatarTierByUnlocked(unlocked.length).id;
    const currentTier = currentUser.avatar?.cosmeticTier || 'none';

    if (targetTier === currentTier || targetTier === lastSyncedTierRef.current) return;
    lastSyncedTierRef.current = targetTier;

    updateDoc(doc(db, 'users', currentUser.uid), {
      'avatar.cosmeticTier': targetTier,
    }).catch(() => {
      lastSyncedTierRef.current = null;
    });
  }, [
    currentUser.uid,
    currentUser.avatar?.cosmeticTier,
    overallPct,
    completedPassages.length,
    feedbackCount,
    clickMeCount,
  ]);

  return (
    <div className="page-container max-w-4xl space-y-6 pb-32">

      <PageHeader
        title={`${getGreeting(currentUser.preferredLanguage || 'en')}, ${formatUserDisplayName(currentUser, 'Guest')}${currentUser.preferredLanguage === 'ko' ? '님' : ''}`}
      />

      {imminentDuties.length > 0 && (
        <motion.section custom={0.5} variants={fadeUp} initial="hidden" animate="visible">
          <div className="glass-card rounded-2xl border-primary/25 bg-primary/5 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-micro-label !opacity-100 text-primary">{t.dutyReminderTitle}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.dutyReminderSubtitle}</p>
                </div>
                <div className="space-y-1.5">
                  {imminentDuties.map(item => {
                    const Icon = itemTypeIcon(item.type);
                    const when = getDutyWhenLabel(item.date);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEvent(item)}
                        className="glass-thin flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', itemTypeColor(item.type))} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold leading-snug">
                            <span className="text-primary">{when}</span>
                            <span className="text-muted-foreground"> · </span>
                            <span>{item.label}</span>
                          </p>
                          {(item.sublabel || itemTypeLabel(item.type)) && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {itemTypeLabel(item.type)}
                              {item.sublabel ? ` — ${item.sublabel}` : ''}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Stats Row ── */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Progress', value: `${overallPct}%`, sub: `${daysLeft ?? '—'} days left`, color: 'text-primary', bg: 'bg-muted border-border', icon: Flame, onClick: () => go('/bible-checklist') },
          { label: 'Messages', value: unreadChatCount, sub: unreadChatCount > 0 ? 'Unread' : 'All caught up', color: unreadChatCount > 0 ? 'text-primary' : 'text-muted-foreground/40', bg: 'bg-muted border-border', icon: MessageCircle, onClick: () => go('/chat') },
          {
            label: 'Next Up',
            value: nextUpEvent?.event.category || '—',
            sub: nextUpEvent
              ? `${nextUpEvent.event.title} · ${format(nextUpEvent.occurrenceDate, 'MMM d')}`
              : 'Clear schedule',
            color: 'text-primary',
            bg: 'bg-muted border-border',
            icon: Calendar,
            onClick: () => go('/events'),
          },
        ].map((card, i) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className={cn(
              "group glass-elevated relative flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-colors"
            )}
          >
            <div className="min-w-0 w-full">
              <p className="truncate text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className={cn("mt-0.5 text-xl font-bold leading-tight", card.color)}>{card.value}</p>
              <p className="truncate text-xs text-muted-foreground">{card.sub}</p>
            </div>
          </button>
        ))}
      </motion.div>

      {/* ── Bible Reading Hub ── */}
      <motion.section custom={1} variants={fadeUp} initial="hidden" animate="visible"
        className={cn(
          "glass-card relative p-5 md:p-6 rounded-2xl overflow-hidden transition-all duration-500",
          isTodayComplete && "border-primary/20"
        )}>
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl shadow-inner bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-micro-label !opacity-100 text-muted-foreground/50">Daily Path</p>
                <h2 className="text-base font-bold truncate">Bible Reading</h2>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => go('/bible-checklist')} className="text-xs rounded-xl text-primary font-bold">
              Full plan <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Today's Section */}
            {todayPassages.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">Today's assigned</p>
                    <AnimatePresence mode="popLayout">
                        {todayPassages.map(p => {
                            const date = todaysReading?.date;
                            const done = date
                              ? completedPassages.includes(makePassageKey(date, p.displayText)) || completedPassages.includes(p.displayText)
                              : completedPassages.includes(p.displayText);
                            return (
                                <motion.div key={p.displayText} layout transition={spring}
                                    className={cn(
                                        "glass-thin flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group cursor-pointer",
                                        done ? "opacity-60" : "hover:bg-primary/12 hover:border-primary/35"
                                    )}
                                >
                                    <Checkbox
                                        checked={done}
                                        onCheckedChange={() => togglePassageCompletion(p.displayText, todaysReading?.date)}
                                        className="h-5 w-5 rounded-lg shrink-0 border-primary/20"
                                    />
                                    <button onClick={() => readPassage(p.displayText)} className={cn("flex-1 text-left text-sm font-semibold truncate transition-colors", done && "line-through")}>
                                        {p.displayText}
                                    </button>
                                    {!done && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="py-2">
                    <p className="text-sm font-bold text-primary">Rest Day — No reading assigned for today.</p>
                </div>
            )}

            {/* Next Up / Integrated Section */}
            {nextUnread && (() => {
                const nextPassages = nextUnread.passages?.filter(p => p.displayText && !p.displayText.startsWith('Error:')) || [];
                const p = nextPassages.find(passage => {
                  const date = nextUnread.date;
                  return !(
                    completedPassages.includes(makePassageKey(date, passage.displayText)) ||
                    completedPassages.includes(passage.displayText)
                  );
                });
                if (!p) return null;
                const done = false; // p is always unread by definition
                return (
                <div className="mt-6 pt-6 border-t border-border/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Missed Reading</p>
                    <motion.div layout transition={spring}
                        className="glass-thin flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group cursor-pointer hover:bg-muted/35"
                    >
                        <Checkbox
                            checked={false}
                            onCheckedChange={() => togglePassageCompletion(p.displayText, nextUnread.date)}
                            className="h-5 w-5 rounded-lg shrink-0 border-border"
                        />
                        <button onClick={() => readPassage(p.displayText)} className="flex-1 text-left text-sm font-semibold truncate transition-colors">
                            {p.displayText}
                        </button>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </motion.div>
                </div>
                );
            })()}
          </div>
        </div>
      </motion.section>

      {/* ── My Upcoming Rosters ── */}
      {myRosterItems.length > 0 && (
        <motion.section custom={3} variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-section-title text-primary">My Upcoming Duties</h2>
          </div>

          <div className="glass-elevated overflow-hidden rounded-xl">
            <div className="hidden grid-cols-[58px_72px_minmax(0,1fr)_88px] gap-2 border-b border-border/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Date</span>
              <span>Type</span>
              <span>Title</span>
              <span>Details</span>
            </div>
            {myRosterItems.slice(0, 8).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedEvent(item)}
                className="grid h-8 w-full grid-cols-[58px_72px_minmax(0,1fr)] items-center gap-2 border-b border-border/30 px-2.5 text-left text-[11px] leading-none last:border-b-0 hover:bg-muted/40 sm:grid-cols-[58px_72px_minmax(0,1fr)_88px]"
              >
                <span className="text-muted-foreground">{format(item.date, 'MMM d')}</span>
                <span className="truncate font-medium text-primary">{itemTypeLabel(item.type)}</span>
                <span className="truncate font-medium text-foreground">{item.label}</span>
                <span className="hidden truncate text-muted-foreground sm:block">{item.sublabel || '—'}</span>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Upcoming Events ── */}
      <motion.section custom={4} variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-section-title text-primary">Upcoming Events</h2>
          <Button variant="ghost" size="sm" onClick={() => go('/events')} className="text-xs rounded-xl font-bold text-primary">
            Full View <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {dashboardEventRows.length > 0 && (
          <div className="glass-elevated overflow-hidden rounded-xl">
            <div className="hidden grid-cols-[58px_72px_minmax(0,1fr)_88px] gap-2 border-b border-border/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Date</span>
              <span>Type</span>
              <span>Title</span>
              <span>Time</span>
            </div>
            {dashboardEventRows.slice(0, 10).map((row) => (
              <button
                key={row.occurrenceKey}
                onClick={() => openEventFromOccurrence(row)}
                className="grid h-8 w-full grid-cols-[58px_72px_minmax(0,1fr)] items-center gap-2 border-b border-border/30 px-2.5 text-left text-[11px] leading-none last:border-b-0 hover:bg-muted/40 sm:grid-cols-[58px_72px_minmax(0,1fr)_88px]"
              >
                <span className="text-muted-foreground">{format(row.occurrenceDate, 'MMM d')}</span>
                <span className="truncate font-medium text-primary">{row.event.category}</span>
                <span className="truncate font-medium text-foreground">{row.event.title}</span>
                <span className="hidden truncate text-muted-foreground sm:block">
                  {row.event.allDay ? 'All day' : row.event.startTime || '—'}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Community Schedule Hub ── */}
      <motion.section custom={5} variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-section-title text-primary">Community Schedule</h2>
          <Button variant="ghost" size="sm" onClick={() => go('/events')} className="text-xs rounded-xl font-bold text-primary">
            Full View <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        <div className="mb-2 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5 xl:col-span-4">
            <CalendarWidget
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              events={upcomingOnlyEvents}
              cleaningRoster={cleaningRoster}
              qtRoster={qtRoster}
            />
          </div>
          <div className="lg:col-span-7 xl:col-span-8">
            <AgendaView
              selectedDate={selectedDate}
              events={upcomingOnlyEvents}
              cleaningRoster={cleaningRoster}
              qtRoster={qtRoster}
              allUsers={allUsers}
              cleaningDays={cleaningDays}
              onItemClick={(item) => {
                setSelectedEvent(item as DashboardListItem);
              }}
            />
          </div>
        </div>
      </motion.section>

      {/* ── Event Detail Dialog ── */}
      <Dialog open={!!selectedEvent} onOpenChange={open => !open && setSelectedEvent(null)}>
        <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl shadow-2xl max-w-sm mx-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl border", selectedEvent ? itemTypeBg(selectedEvent.type) : '')}>
                {selectedEvent && (() => {
                  const Icon = itemTypeIcon(selectedEvent.type);
                  return <Icon className={cn("h-5 w-5", itemTypeColor(selectedEvent.type))} />
                })()}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{selectedEvent ? itemTypeLabel(selectedEvent.type) : ''}</p>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">{selectedEvent?.label}</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-primary">
              {selectedEvent && format(selectedEvent.date, 'EEEE, MMMM do, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {(selectedEvent?.type === 'event' || selectedEvent?.type === 'birthday' || selectedEvent?.type === 'worship' || selectedEvent?.type === 'custom') && selectedEvent.details && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Details</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedEvent.details}</p>
              </div>
            )}
            {selectedEvent?.type === 'qt' && (
              <div className="space-y-3">
                {selectedEvent.qtTitle && <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Topic</p>
                  <p className="font-bold">{selectedEvent.qtTitle}</p>
                </div>}
                {selectedEvent.passage && <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Passage</p>
                    <p className="font-bold font-mono">{selectedEvent.passage}</p>
                  </div>
                  <BookOpenText className="h-6 w-6 text-primary/30" />
                </div>}
              </div>
            )}
            {selectedEvent?.type === 'cleaning' && (
              <div className="space-y-3">
                {selectedEvent.dayName && <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Day Type</p>
                  <p className="font-bold">{selectedEvent.dayName}</p>
                </div>}
                <div className="p-4 rounded-2xl bg-muted border border-border flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Team</p>
                    <p className="font-bold text-sm">{selectedEvent.assignedNames}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button className="w-full h-12 rounded-2xl font-bold text-sm mt-4" onClick={() => setSelectedEvent(null)}>Done</Button>
        </DialogContent>
      </Dialog>

      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="pt-1">
        <div className="rounded-xl border border-border/30 dark:border-border/15 bg-transparent px-3 py-2 text-center">
          <Button
            onClick={handleAchievementHelpClick}
            disabled={!canClaimAchievementHelp || isClaimingAchievementHelp}
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-3 text-[11px] font-semibold text-zinc-700 dark:text-zinc-400 hover:bg-muted/40 dark:hover:bg-muted/20"
          >
            {isClaimingAchievementHelp ? 'Claiming...' : 'Click me!'}
          </Button>
          <p className="mt-0.5 text-[10px] text-zinc-600 dark:text-zinc-500">
            Builds your Click Me achievement count. {canClaimAchievementHelp ? 'Available once every 24 hours.' : `Next claim in ${cooldownLabel}.`}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
