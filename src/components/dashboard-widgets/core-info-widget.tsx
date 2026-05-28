"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardData, type InternalTimelineItem } from '@/hooks/use-dashboard-data';
import { useNotifications } from '@/hooks/use-notifications';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { translations } from '@/lib/translations';

// Modular Components
import { BroadcastSection } from './core-info/BroadcastSection';
import { ScriptureProgressionSection } from './core-info/ScriptureProgressionSection';
import { ReadingSection } from './core-info/ReadingSection';
import { ActiveCircles } from './core-info/ActiveCircles';
import { CommunityTimeline } from './core-info/CommunityTimeline';
import { TimelineDetailsDialog } from './core-info/TimelineDetailsDialog';
import { CoreInfoSkeleton } from './core-info-skeleton';
import { motion, AnimatePresence } from 'framer-motion';

export default function CoreInfoWidget() {
  const {
    currentUser,
    bibleStats,
    todaysReading,
    nextUnreadReading,
    unreadAnnouncements,
    recentChats,
    timelineItems,
    usersMap
  } = useDashboardData();

  const { markAsRead } = useNotifications();
  const { completedPassages, togglePassageCompletion } = useUserBibleChecklist();
  const { setIsPageLoading } = usePageLoading();
  const { openBibleReader } = useGlobalBibleReader();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<InternalTimelineItem | null>(null);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  const handlePassageClick = useCallback((displayText: string) => {
    const parsed = parsePassageReferenceForNavigation(displayText);
    if (parsed) openBibleReader(parsed.book, parsed.chapter);
  }, [openBibleReader]);

  const handleLink = useCallback((path: string) => {
    setIsPageLoading(true);
    router.push(path);
  }, [router, setIsPageLoading]);

  if (!isMounted || !currentUser) return null;
  if (!bibleStats) return <CoreInfoSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-elevated relative w-full p-8 md:p-12 rounded-[3.5rem] overflow-hidden space-y-24"
    >
      {/* Decorative radial gradient for depth */}
      <div className="absolute top-0 right-[-20%] w-[80%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[40%] bg-primary/5 blur-[100px] rounded-full -z-10" />

      {/* 1. Header & Greeting */}
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 leading-none">Perspective Session</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter leading-none text-white/95 uppercase tracking-[-0.04em]">
            {t.hello}, {currentUser.firstName}{currentUser.preferredLanguage === 'ko' ? '님' : ''}
          </h2>
        </div>
        <div className="h-1 w-24 bg-primary/40 rounded-full" />
      </section>

      {/* Modularized Components with Sequential Animations */}
      <div className="space-y-24">
        <BroadcastSection
          unreadAnnouncements={unreadAnnouncements}
          t={t}
          markAsRead={markAsRead}
          handleLink={handleLink}
        />

        <ScriptureProgressionSection
          bibleStats={bibleStats}
          t={t}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
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
        </div>

        <ActiveCircles
          recentChats={recentChats}
          currentUser={currentUser}
          usersMap={usersMap}
          t={t}
          handleLink={handleLink}
        />

        <CommunityTimeline
          timelineItems={timelineItems}
          t={t}
          handleLink={handleLink}
          onItemSelect={setSelectedTimelineItem}
        />
      </div>

      <TimelineDetailsDialog
        item={selectedTimelineItem}
        onClose={() => setSelectedTimelineItem(null)}
        t={t}
      />
    </motion.div>
  );
}
