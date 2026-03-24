
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useEvents } from '@/hooks/use-events';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { useAllUsers } from '@/hooks/use-all-users';
import { format, parseISO, isValid, differenceInDays, startOfDay, isBefore, compareAsc, startOfToday } from 'date-fns';
import { 
  Calendar, 
  BookOpen, 
  Timer, 
  ArrowRight, 
  ShieldCheck, 
  BookOpenText, 
  Loader2, 
  Users, 
  Check, 
  FastForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { findTodaysReading, findNextUnreadReading } from '@/lib/reading-utils';
import { translations } from '@/lib/translations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type InternalTimelineItem = {
    id: string;
    date: Date;
    title: string;
    type: 'event' | 'cleaning' | 'qt';
    category?: string;
    details?: string;
    passage?: string;
    qtTitle?: string;
    assignedNames?: string;
    dayName?: string;
};

// Isolated Section Components for High Performance Re-rendering
const BroadcastSection = React.memo(({ unreadAnnouncements, t, markAsRead, handleLink }: any) => (
    <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60">{t.broadcasts}</p>
            <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t.globalAlerts}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleLink('/announcements')} className="rounded-xl font-black text-[10px] uppercase tracking-widest text-primary">{t.archive} <ArrowRight className="ml-1 h-3 w-3"/></Button>
        </div>
        <div className="space-y-4">
          {unreadAnnouncements.length === 0 ? (
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center py-10 border border-dashed border-border/50 rounded-[2rem]">{t.frequencySilent}</p>
          ) : (
            unreadAnnouncements.slice(0, 3).map((n: any) => (
              <div key={n.id} className="p-6 rounded-[2rem] bg-orange-500/5 border border-orange-500/10 flex items-center justify-between group/alert">
                <div className="min-w-0 pr-4">
                  <p className="font-black text-xs tracking-tight uppercase text-orange-500 truncate">{n.title}</p>
                  <p className="text-[11px] font-medium opacity-70 mt-1 truncate">{n.message}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => markAsRead(n.id)} className="h-10 w-10 shrink-0 rounded-xl hover:bg-orange-500 hover:text-white transition-all"><Check className="h-4 w-4"/></Button>
              </div>
            ))
          )}
        </div>
    </section>
));
BroadcastSection.displayName = 'BroadcastSection';

const ScriptureProgressionSection = React.memo(({ bibleStats, t }: any) => (
    <section className="space-y-8">
        <div className="space-y-1 border-b border-border/50 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">{t.journeyPath}</p>
          <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t.scriptureProgression}</h2>
        </div>
        {bibleStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-[1.2rem] bg-primary/10 flex items-center justify-center border border-primary/20">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight leading-none">{bibleStats.chaptersLeft}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-3">{t.chaptersRemaining}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-[1.2rem] bg-primary/10 flex items-center justify-center border border-primary/20">
                <Timer className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight leading-none">{bibleStats.daysLeft}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-3">{t.daysUntilCompletion}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-30 italic">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-xs">{t.loading}</p>
          </div>
        )}
    </section>
));
ScriptureProgressionSection.displayName = 'ScriptureProgressionSection';

const ReadingSection = React.memo(({ title, reading, completedPassages, togglePassageCompletion, handlePassageClick, t, handleLink, emptyMsg, showArchiveLink }: any) => (
    <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">{t[title.labelKey]}</p>
            <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t[title.titleKey]}</h2>
          </div>
          {showArchiveLink && <Button variant="ghost" size="sm" onClick={() => handleLink('/bible-checklist')} className="rounded-xl font-black text-[10px] uppercase tracking-widest text-primary">{t.fullPlan} <ArrowRight className="ml-1 h-3 w-3"/></Button>}
        </div>
        <div className="space-y-3">
          {!reading ? (
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center py-10 border border-dashed border-border/50 rounded-[2rem]">{t[emptyMsg]}</p>
          ) : (
            reading.passages.map((p: any) => (
              <div key={p.displayText} className="flex items-center gap-5 p-6 rounded-[2rem] bg-muted/20 border border-transparent hover:border-primary/20 transition-all">
                <Checkbox checked={completedPassages.includes(p.displayText)} onCheckedChange={() => togglePassageCompletion(p.displayText)} className="h-6 w-6 rounded-lg border-primary/20" />
                <button onClick={() => handlePassageClick(p.displayText)} className={cn("text-lg font-black tracking-tighter hover:text-primary transition-all text-left", completedPassages.includes(p.displayText) && "line-through opacity-40")}>{p.displayText}</button>
              </div>
            ))
          )}
        </div>
    </section>
));
ReadingSection.displayName = 'ReadingSection';

export default function CoreInfoWidget() {
  const { currentUser } = useAuth();
  const { plan } = useBiblePlan();
  const { completedPassages, togglePassageCompletion, markMultiplePassages } = useUserBibleChecklist();
  const { events } = useEvents();
  const { roster: cleaningRoster } = useCleaningRoster();
  const { cleaningDays } = useCleaningDays();
  const { roster: qtRoster } = useQTRoster();
  const { notifications, markAsRead } = useNotifications();
  const { chats } = useChats();
  const { allUsers } = useAllUsers();
  
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const [isMounted, setIsMounted] = useState(false);
  const { openBibleReader } = useGlobalBibleReader();
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<InternalTimelineItem | null>(null);
  
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);
  const cleaningDaysMap = useMemo(() => new Map(cleaningDays.map(d => [d.id, d.name])), [cleaningDays]);

  const bibleStats = useMemo(() => {
    if (!plan?.dailyReadings || plan.dailyReadings.length === 0) return null;
    const today = startOfDay(new Date());
    const allPassages = plan.dailyReadings.flatMap(day => day.passages || []);
    const uniqueChaptersInPlan = new Set(allPassages.map(p => `${p.book} ${p.chapter}`));
    const completedChapters = new Set<string>();
    completedPassages.forEach(cp => {
      const passage = allPassages.find(p => p.displayText === cp);
      if (passage) completedChapters.add(`${passage.book} ${passage.chapter}`);
    });
    const chaptersLeft = Math.max(0, uniqueChaptersInPlan.size - completedChapters.size);
    const lastReadingDate = parseISO(plan.dailyReadings[plan.dailyReadings.length - 1].date);
    const daysLeft = isValid(lastReadingDate) ? Math.max(0, differenceInDays(lastReadingDate, today)) : 0;
    return { chaptersLeft, daysLeft };
  }, [plan, completedPassages]);

  const todaysReading = useMemo(() => plan?.dailyReadings ? findTodaysReading(plan.dailyReadings) : null, [plan]);
  const nextUnreadReading = useMemo(() => plan?.dailyReadings ? findNextUnreadReading(plan.dailyReadings, completedPassages) : null, [plan, completedPassages]);

  const unreadAnnouncements = useMemo(() => {
    return notifications.filter(n => n.type === 'announcement' && !n.readBy.includes(currentUser?.uid || ''));
  }, [notifications, currentUser?.uid]);

  const recentChats = useMemo(() => chats.slice(0, 3), [chats]);

  const timelineItems = useMemo(() => {
    const today = startOfToday();
    const items: InternalTimelineItem[] = [];
    events.forEach(e => {
        const d = parseISO(e.date);
        if (isValid(d) && !isBefore(d, today)) items.push({ id: e.id, date: d, title: e.title, type: 'event', category: e.category, details: e.details || e.summary });
    });
    cleaningRoster.forEach(e => {
        const d = parseISO(e.date);
        if (isValid(d) && !isBefore(d, today)) {
            const names = e.assignedUserIds.map(uid => usersMap.get(uid)?.firstName).filter(Boolean).join(', ');
            items.push({ id: e.id, date: d, title: names || "Cleaning", type: 'cleaning', assignedNames: names, dayName: cleaningDaysMap.get(e.dayId) });
        }
    });
    qtRoster.forEach(e => {
        const d = parseISO(e.date);
        if (isValid(d) && !isBefore(d, today)) items.push({ id: e.id, date: d, title: e.personName || "QT", type: 'qt', passage: e.passage, qtTitle: e.title });
    });
    return items.sort((a, b) => compareAsc(a.date, b.date)).slice(0, 5);
  }, [events, cleaningRoster, qtRoster, usersMap, cleaningDaysMap]);

  const handlePassageClick = useCallback((displayText: string) => {
    const parsed = parsePassageReferenceForNavigation(displayText);
    if (parsed) openBibleReader(parsed.book, parsed.chapter);
  }, [openBibleReader]);

  const handleLink = useCallback((path: string) => {
    setIsPageLoading(true);
    router.push(path);
  }, [router, setIsPageLoading]);

  if (!isMounted || !currentUser) return null;

  return (
    <div className="relative w-full bg-card/40 backdrop-blur-2xl border border-border/50 p-8 md:p-12 rounded-[2.5rem] shadow-2xl overflow-hidden space-y-20">
      {/* 1. Header & Greeting */}
      <section className="space-y-4">
        <h2 className="text-2xl sm:text-2xl font-black tracking-tighter leading-none">
          {t.hello}, {currentUser.firstName}{currentUser.preferredLanguage === 'ko' ? '님' : ''}
        </h2>
        <div className="h-1.5 w-24 bg-primary/20 rounded-full" />
      </section>

      <BroadcastSection unreadAnnouncements={unreadAnnouncements} t={t} markAsRead={markAsRead} handleLink={handleLink} />

      <ScriptureProgressionSection bibleStats={bibleStats} t={t} />

      <ReadingSection 
        title={{ labelKey: 'dailyBread', titleKey: 'todaysReading' }} 
        reading={todaysReading} 
        completedPassages={completedPassages} 
        togglePassageCompletion={togglePassageCompletion} 
        handlePassageClick={handlePassageClick} 
        t={t} 
        handleLink={handleLink} 
        emptyMsg="sabbathRest"
        showArchiveLink={true}
      />

      <ReadingSection 
        title={{ labelKey: 'spiritualHorizon', titleKey: 'nextMilestone' }} 
        reading={nextUnreadReading} 
        completedPassages={completedPassages} 
        togglePassageCompletion={togglePassageCompletion} 
        handlePassageClick={handlePassageClick} 
        t={t} 
        handleLink={handleLink} 
        emptyMsg="confirm"
      />

      {/* 6. Active Circles */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/60">{t.messenger}</p>
            <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t.activeCircles}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleLink('/chat')} className="rounded-xl font-black text-[10px] uppercase tracking-widest text-primary">Hub <ArrowRight className="ml-1 h-3 w-3"/></Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentChats.length === 0 ? (
            <p className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-center opacity-30 py-10">Static Signal</p>
          ) : (
            recentChats.map(c => {
              const peerId = c.members.find(id => id !== currentUser.uid);
              const peer = peerId ? usersMap.get(peerId) : null;
              const name = c.type === 'group' ? c.name : (peer?.firstName ? `${peer.firstName} ${peer.lastName}` : 'Circle');
              return (
                <button key={c.id} onClick={() => handleLink(`/chat/${c.id}`)} className="flex items-center gap-4 p-5 rounded-[2rem] bg-muted/20 hover:bg-blue-500 hover:text-white transition-all text-left overflow-hidden">
                  <div className="h-10 w-10 shrink-0 rounded-2xl overflow-hidden bg-muted border border-background shadow-lg">
                    {c.type === 'group' ? <Users className="h-full w-full p-2.5 opacity-40"/> : <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${name}`} className="w-full h-full" alt="Avatar"/>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[11px] truncate leading-tight uppercase tracking-widest">{name}</p>
                    <p className="text-[9px] font-medium opacity-60 truncate mt-1">{c.lastMessageText || 'Connected'}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </section>

      {/* 7. Timeline */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-success/60">{t.schedule}</p>
            <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t.communityTimeline}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleLink('/events')} className="rounded-xl font-black text-[10px] uppercase tracking-widest text-primary">{t.calendar} <ArrowRight className="ml-1 h-3 w-3"/></Button>
        </div>
        <div className="space-y-4">
          {timelineItems.length === 0 ? (
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center py-10 border border-dashed border-border/50 rounded-[2rem]">Clear Horizon</p>
          ) : (
            timelineItems.map(item => (
              <button key={item.id} onClick={() => setSelectedTimelineItem(item)} className="w-full flex items-center gap-6 p-6 rounded-[2rem] bg-muted/20 hover:bg-green-500 hover:text-white transition-all group/event text-left">
                <div className="text-center w-14 shrink-0 border-r border-border/50 group-hover/event:border-white/20 pr-4">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover/event:opacity-70">{format(item.date, "EEE")}</p>
                  <p className="text-2xl font-black leading-none mt-1">{format(item.date, "d")}</p>
                </div>
                <div className="min-w-0">
                  <p className="font-black text-base tracking-tight truncate uppercase tracking-widest">{item.title}</p>
                  <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-1">
                    {item.type === 'cleaning' ? 'Cleaning' : item.type === 'qt' ? 'QT' : item.category}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Global Dialog Components */}
      
      <Dialog open={!!selectedTimelineItem} onOpenChange={(open) => !open && setSelectedTimelineItem(null)}>
        <DialogContent className="rounded-[3rem] p-10 border-border/50 bg-card/95 backdrop-blur-3xl shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-xl bg-opacity-10",
                    selectedTimelineItem?.type === 'cleaning' ? "bg-green-500 text-green-500" : 
                    selectedTimelineItem?.type === 'qt' ? "bg-primary text-primary" : "bg-orange-500 text-orange-500"
                )}>
                    {selectedTimelineItem?.type === 'cleaning' ? <ShieldCheck className="h-5 w-5" /> : selectedTimelineItem?.type === 'qt' ? <BookOpenText className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Session Record</p>
            </div>
            <DialogTitle className="text-2xl font-black tracking-tighter uppercase leading-tight">{selectedTimelineItem?.title}</DialogTitle>
            <DialogDescription className="text-[9px] font-black uppercase tracking-[0.4em] text-primary pt-1">
              {selectedTimelineItem && format(selectedTimelineItem.date, "EEEE, MMMM do, yyyy")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8 pt-8">
            {selectedTimelineItem?.type === 'event' && selectedTimelineItem.details && (
              <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/50">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">Context</p>
                <p className="text-sm font-medium leading-relaxed opacity-80">{selectedTimelineItem.details}</p>
              </div>
            )}
            {selectedTimelineItem?.type === 'qt' && (
              <div className="space-y-4">
                {selectedTimelineItem.qtTitle && (
                  <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/50">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">Topic</p>
                    <p className="text-lg font-black leading-tight">{selectedTimelineItem.qtTitle}</p>
                  </div>
                )}
                <div className="flex items-center justify-between p-6 rounded-[2rem] bg-primary/5 border border-primary/10 shadow-inner">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">Scripture Segment</p>
                    <p className="text-xl font-black tabular-nums">{selectedTimelineItem.passage}</p>
                  </div>
                  <BookOpenText className="h-8 w-8 text-primary/30" />
                </div>
              </div>
            )}
            {selectedTimelineItem?.type === 'cleaning' && (
              <div className="space-y-4">
                <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">Day Type</p>
                  <p className="text-lg font-black leading-tight">{selectedTimelineItem.dayName || 'Standard Cleaning'}</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-green-500/5 border border-green-500/10 shadow-inner">
                  <p className="text-[9px] font-black uppercase tracking-widest text-green-500 mb-2">Assigned Team</p>
                  <p className="text-lg font-black">{selectedTimelineItem.assignedNames}</p>
                </div>
              </div>
            )}
          </div>
          <Button className="w-full h-14 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest mt-10 shadow-xl shadow-primary/10 active:scale-95" onClick={() => setSelectedTimelineItem(null)}>{t.confirm}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
