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
import { findTodaysReading, findNextUnreadReading } from '@/lib/reading-utils';
import { nextOccurrenceOnOrAfter } from '@/lib/event-occurrences';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { format, parseISO, isValid, differenceInDays, startOfDay, isBefore, startOfToday, compareAsc, addDays, isAfter, isSameDay } from 'date-fns';
import {
  BookOpen, MessageCircle, Calendar, CheckCircle, ChevronRight,
  Sparkles, ArrowRight, ShieldCheck, BookOpenText, Users, Flame, Clock, MapPin,
  Music2, ListChecks
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import CalendarWidget from '@/components/dashboard-widgets/calendar-widget';
import AgendaView from '@/components/dashboard-widgets/agenda-view';

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

type TimelineItem = {
  id: string; date: Date; title: string; type: 'event' | 'cleaning' | 'qt';
  category?: string; details?: string; passage?: string; qtTitle?: string;
  assignedNames?: string; dayName?: string;
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
  const [selectedEvent, setSelectedEvent] = useState<TimelineItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());

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
  const todayDoneCount = useMemo(() => todayPassages.filter(p => completedPassages.includes(p.displayText)).length, [todayPassages, completedPassages]);
  const isTodayComplete = todayPassages.length > 0 && todayDoneCount === todayPassages.length;

  const overallPct = useMemo(() => {
    if (!plan?.dailyReadings) return 0;
    const total = plan.dailyReadings.flatMap(d => d.passages || []).length;
    return total > 0 ? Math.round((completedPassages.length / total) * 100) : 0;
  }, [plan, completedPassages]);

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

  const upcomingItems = useMemo(() => {
    const today = startOfToday();
    const items: TimelineItem[] = [];
    filteredEvents.forEach(e => {
      const next = nextOccurrenceOnOrAfter(e, addDays(today, 1));
      if (!next) return;
      items.push({ id: e.id, date: next, title: e.title, type: 'event', category: e.category, details: e.details });
    });
    cleaningRoster.forEach(e => {
      const d = parseISO(e.date);
      if (isValid(d) && isAfter(d, today)) {
        const names = e.assignedUserIds.map(uid => usersMap.get(uid)?.firstName).filter(Boolean).join(', ');
        items.push({ id: e.id, date: d, title: names || 'Cleaning', type: 'cleaning', assignedNames: names, dayName: cleaningDaysMap.get(e.dayId) });
      }
    });
    qtRoster.forEach(e => {
      const d = parseISO(e.date);
      if (isValid(d) && isAfter(d, today)) items.push({ id: e.id, date: d, title: e.personName || 'QT', type: 'qt', passage: e.passage, qtTitle: e.title });
    });
    return items.sort((a, b) => compareAsc(a.date, b.date)).slice(0, 4);
  }, [events, cleaningRoster, qtRoster, usersMap, cleaningDaysMap]);

  // ── My personal roster assignments (UID-based, no false-name matches) ──
  type MyRosterItem = {
    id: string;
    date: Date;
    label: string;
    sublabel?: string;
    type: 'cleaning' | 'qt' | 'worship' | 'custom';
    href: string;
  };

  const myRosterItems = useMemo((): MyRosterItem[] => {
    const today = startOfToday();
    const items: MyRosterItem[] = [];

    // Cleaning – match by uid in assignedUserIds array
    cleaningRoster.forEach(r => {
      const d = parseISO(r.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      if (!r.assignedUserIds.includes(currentUser.uid)) return;
      const dayLabel = cleaningDaysMap.get(r.dayId);
      items.push({
        id: `cleaning-${r.id}`,
        date: d,
        label: 'Church Cleaning',
        sublabel: dayLabel,
        type: 'cleaning',
        href: '/cleaning-roster',
      });
    });

    // QT – match by userId field (not name)
    qtRoster.forEach(r => {
      const d = parseISO(r.date || '');
      if (!isValid(d) || isBefore(d, today)) return;
      if (r.userId !== currentUser.uid) return;
      items.push({
        id: `qt-${r.id}`,
        date: d,
        label: 'QT Sharing',
        sublabel: r.title || r.passage,
        type: 'qt',
        href: '/qt',
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
        id: `worship-${roster.id}`,
        date: d,
        label: roster.name || 'Worship Roster',
        sublabel: myRoles.join(', '),
        type: 'worship',
        href: '/worship',
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
        id: `custom-${entry.id}`,
        date: d,
        label: entry.rosterName,
        sublabel: myDuties.join(', '),
        type: 'custom',
        href: '/rosters',
      });
    });

    return items.sort((a, b) => compareAsc(a.date, b.date));
  }, [cleaningRoster, qtRoster, worshipRosters, customRosterEntries, currentUser.uid, cleaningDaysMap]);

  const myRosterTypeColor = (type: MyRosterItem['type']) => {
    switch (type) {
      case 'cleaning': return 'text-emerald-500';
      case 'qt': return 'text-primary';
      case 'worship': return 'text-purple-500';
      case 'custom': return 'text-orange-500';
    }
  };
  const myRosterTypeBg = (type: MyRosterItem['type']) => {
    switch (type) {
      case 'cleaning': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'qt': return 'bg-primary/10 border-primary/20';
      case 'worship': return 'bg-purple-500/10 border-purple-500/20';
      case 'custom': return 'bg-orange-500/10 border-orange-500/20';
    }
  };
  const myRosterTypeIcon = (type: MyRosterItem['type']) => {
    switch (type) {
      case 'cleaning': return ShieldCheck;
      case 'qt': return BookOpenText;
      case 'worship': return Music2;
      case 'custom': return ListChecks;
    }
  };
  const myRosterTypeLabel = (type: MyRosterItem['type']) => {
    switch (type) {
      case 'cleaning': return 'Cleaning';
      case 'qt': return 'QT Sharing';
      case 'worship': return 'Worship';
      case 'custom': return 'Custom Roster';
    }
  };

  const typeColor = (type: string) => type === 'cleaning' ? 'text-emerald-500' : type === 'qt' ? 'text-primary' : 'text-orange-500';
  const typeBg = (type: string) => type === 'cleaning' ? 'bg-emerald-500/10 border-emerald-500/20' : type === 'qt' ? 'bg-primary/10 border-primary/20' : 'bg-orange-500/10 border-orange-500/20';
  const typeLabel = (item: TimelineItem) => item.type === 'cleaning' ? 'Cleaning Roster' : item.type === 'qt' ? 'QT Roster' : item.category || 'Event';

  return (
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">

      {/* ── Greeting ── */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="space-y-1">
        <h1 className="text-4xl md:text-hero normal-case not-italic leading-tight md:leading-none">
          {getGreeting(currentUser.preferredLanguage || 'en')},<br />
          <span className="gradient-text">{currentUser.firstName}{currentUser.preferredLanguage === 'ko' ? '님' : ''}</span>
        </h1>
      </motion.div>
      
      {/* ── Smart Roster Assistant ── */}
      {(() => {
        const today = startOfToday();
        const tomorrow = addDays(today, 1);
        const myCleaningToday = cleaningRoster.find(r => isSameDay(parseISO(r.date || ''), today) && r.assignedUserIds.includes(currentUser.uid));
        const myCleaningSoon = !myCleaningToday && cleaningRoster.find(r => isSameDay(parseISO(r.date || ''), tomorrow) && r.assignedUserIds.includes(currentUser.uid));
        const myQTSoon = qtRoster.find(r => {
          const d = parseISO(r.date || '');
          return (isSameDay(d, today) || isSameDay(d, tomorrow)) && r.userId === currentUser.uid;
        });

        const duty = myCleaningToday || myCleaningSoon || myQTSoon;
        if (!duty) return null;

        const isToday = isSameDay(parseISO(duty.date || ''), today);
        const type = myCleaningToday || myCleaningSoon ? 'cleaning' : 'qt';

        return (
          <motion.div custom={0.5} variants={fadeUp} initial="hidden" animate="visible"
            className="glass-thick p-6 rounded-[2rem] border border-primary/20 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group shadow-2xl shadow-primary/5">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              {type === 'cleaning' ? <ShieldCheck className="w-24 h-24" /> : <BookOpenText className="w-24 h-24" />}
            </div>

            <div className={cn("p-4 rounded-2xl shrink-0 animate-pulse-subtle", type === 'cleaning' ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/20 text-primary")}>
              {type === 'cleaning' ? <ShieldCheck className="h-8 w-8" /> : <BookOpenText className="h-8 w-8" />}
            </div>

            <div className="flex-1 text-center md:text-left">
              <p className="text-micro-label !opacity-100 mb-1">Upcoming Duty Assistant</p>
              <h1 className="text-xl font-black tracking-tight mb-1 uppercase">
                {isToday ? "You're on duty today!" : "Duty Reminder: Tomorrow"}
              </h1>
              <p className="text-sm font-medium text-muted-foreground/80">
                {type === 'cleaning'
                  ? `You are assigned to the Church Cleaning team ${isToday ? 'today' : 'tomorrow'}.`
                  : `You're scheduled for the QT sharing ${isToday ? 'today' : 'tomorrow'}.`}
              </p>
            </div>

            <Button className="rounded-2xl h-12 px-8 font-black text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all"
              onClick={() => go(type === 'cleaning' ? '/cleaning-roster' : '/qt')}>
              View Details <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        );
      })()}

      {/* ── Stats Row ── */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Progress', value: `${overallPct}%`, sub: `${daysLeft ?? '—'} days left`, color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', icon: Flame, onClick: () => go('/bible-checklist') },
          { label: 'Messages', value: unreadChatCount, sub: unreadChatCount > 0 ? 'Unread' : 'All caught up', color: unreadChatCount > 0 ? 'text-indigo-500' : 'text-muted-foreground/40', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: MessageCircle, onClick: () => go('/chat') },
          { label: 'Next Up', value: upcomingItems[0] ? format(upcomingItems[0].date, 'MMM d') : '—', sub: upcomingItems[0]?.title || 'Clear schedule', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Calendar, onClick: () => go('/events') },
        ].map((card, i) => (
          <button key={card.label} onClick={card.onClick}
            className={cn("flex flex-col items-start gap-3 p-4 rounded-2xl border text-left transition-all hover:glass-thick hover:scale-[1.02] active:scale-[0.98] group relative", card.bg)}>
            <div className={cn("p-2 rounded-xl bg-background/60 border border-white/5 shadow-sm group-hover:bg-background transition-colors", card.color)}>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-micro-label !opacity-100 text-muted-foreground/40 truncate !tracking-tight">{card.label}</p>
              <p className={cn("text-xl font-black leading-tight mt-0.5", card.color)}>{card.value}</p>
              <p className="text-[11px] font-bold text-muted-foreground/60 truncate tracking-tight">{card.sub}</p>
            </div>
            <ChevronRight className="absolute top-4 right-4 h-3 w-3 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors" />
          </button>
        ))}
      </motion.div>

      {/* ── Bible Reading Hub ── */}
      <motion.section custom={1} variants={fadeUp} initial="hidden" animate="visible"
        className={cn(
          "relative p-6 md:p-8 rounded-[2.5rem] border shadow-lg overflow-hidden transition-all duration-500 bg-card/50 border-border/50 backdrop-blur-xl",
          isTodayComplete && "bg-emerald-500/5 border-emerald-500/20"
        )}>
        {/* Decorative blob */}
        <div className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30",
          isTodayComplete ? "bg-emerald-400" : "bg-primary/40")} />

        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl shadow-inner", isTodayComplete ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/10 text-primary")}>
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
                            const done = completedPassages.includes(p.displayText);
                            return (
                                <motion.div key={p.displayText} layout transition={spring}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 group cursor-pointer",
                                        done ? "opacity-50 bg-muted/20 border-transparent shadow-none" : "bg-card border-border/40 hover:bg-primary shadow-sm hover:border-primary hover:text-white"
                                    )}
                                >
                                    <Checkbox
                                        checked={done}
                                        onCheckedChange={() => togglePassageCompletion(p.displayText)}
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
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Rest Day — No reading assigned for today.</p>
                </div>
            )}

            {/* Next Up / Integrated Section */}
            {nextUnread && (() => {
                const nextPassages = nextUnread.passages?.filter(p => p.displayText && !p.displayText.startsWith('Error:')) || [];
                const p = nextPassages.find(passage => !completedPassages.includes(passage.displayText));
                if (!p) return null;
                const done = false; // p is always unread by definition
                return (
                <div className="mt-6 pt-6 border-t border-border/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3">Missed Reading</p>
                    <motion.div layout transition={spring}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 group cursor-pointer bg-card border-amber-500/20 hover:bg-amber-500/10 shadow-sm"
                    >
                        <Checkbox
                            checked={false}
                            onCheckedChange={() => togglePassageCompletion(p.displayText)}
                            className="h-5 w-5 rounded-lg shrink-0 border-amber-500/30"
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
        <motion.section custom={3} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-section-title text-purple-500">My Upcoming Duties</h2>
          </div>

          <div className="space-y-2">
            {myRosterItems.map(item => {
              const Icon = myRosterTypeIcon(item.type);
              const isToday = isSameDay(item.date, startOfToday());
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.href)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all hover:glass-thick hover:scale-[1.01] active:scale-[0.99] group ${myRosterTypeBg(item.type)}`}
                >
                  {/* Date badge */}
                  <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-background/60 border border-white/5 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                      {format(item.date, 'MMM')}
                    </span>
                    <span className={`text-lg font-black leading-tight ${myRosterTypeColor(item.type)}`}>
                      {format(item.date, 'd')}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`shrink-0 p-2 rounded-xl bg-background/60 border border-white/5 shadow-sm ${myRosterTypeColor(item.type)}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                        {myRosterTypeLabel(item.type)}
                      </p>
                      {isToday && (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${myRosterTypeBg(item.type)} ${myRosterTypeColor(item.type)}`}>
                          Today
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm truncate">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-xs text-muted-foreground/60 font-medium truncate">{item.sublabel}</p>
                    )}
                  </div>

                  <ChevronRight className="shrink-0 h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors" />
                </button>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── Community Schedule Hub ── */}
      <motion.section custom={4} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-section-title text-emerald-600 dark:text-emerald-400">Community Schedule</h2>
          <Button variant="ghost" size="sm" onClick={() => go('/events')} className="text-xs rounded-xl font-bold text-primary">
            Full View <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: The Visual Calendar */}
          <div className="lg:col-span-5 xl:col-span-4">
            <CalendarWidget 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              events={filteredEvents}
              cleaningRoster={cleaningRoster}
              qtRoster={qtRoster}
            />
          </div>

          {/* Right: The Agenda for selected day */}
          <div className="lg:col-span-7 xl:col-span-8">
            <AgendaView 
              selectedDate={selectedDate}
              events={filteredEvents}
              cleaningRoster={cleaningRoster}
              qtRoster={qtRoster}
              allUsers={allUsers}
              cleaningDays={cleaningDays}
              onItemClick={(item) => setSelectedEvent(item as any)}
            />
          </div>
        </div>
      </motion.section>

      {/* ── Event Detail Dialog ── */}
      <Dialog open={!!selectedEvent} onOpenChange={open => !open && setSelectedEvent(null)}>
        <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl shadow-2xl max-w-sm mx-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl border", selectedEvent ? typeBg(selectedEvent.type) : '')}>
                {selectedEvent?.type === 'cleaning' ? <ShieldCheck className={cn("h-5 w-5", typeColor('cleaning'))} /> :
                  selectedEvent?.type === 'qt' ? <BookOpenText className={cn("h-5 w-5", typeColor('qt'))} /> :
                    <Calendar className={cn("h-5 w-5", typeColor('event'))} />}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{selectedEvent ? typeLabel(selectedEvent) : ''}</p>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">{selectedEvent?.title}</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-primary">
              {selectedEvent && format(selectedEvent.date, 'EEEE, MMMM do, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedEvent?.type === 'event' && selectedEvent.details && (
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
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                  <Users className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Team</p>
                    <p className="font-bold text-sm">{selectedEvent.assignedNames}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button className="w-full h-12 rounded-2xl font-bold text-sm mt-4" onClick={() => setSelectedEvent(null)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
