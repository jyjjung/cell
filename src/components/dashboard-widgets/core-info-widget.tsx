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
import { formatUserDisplayName } from '@/lib/formatting';

import { BroadcastSection } from './core-info/BroadcastSection';
import { ScriptureProgressionSection } from './core-info/ScriptureProgressionSection';
import { ReadingSection } from './core-info/ReadingSection';
import { ActiveCircles } from './core-info/ActiveCircles';
import { CommunityTimeline } from './core-info/CommunityTimeline';
import { TimelineDetailsDialog } from './core-info/TimelineDetailsDialog';
import { PageLoading } from '@/components/ui/loading-spinner';
import { motion } from 'framer-motion';

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
  if (!bibleStats) return <PageLoading className="min-h-[320px]" />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="widget-surface relative w-full overflow-hidden stack-gap-lg"
    >
      <section className="stack-gap-sm">
        <div>
          <p className="text-micro-label">{t.sessionPulse}</p>
          <h2 className="text-page-title">
            {t.hello}, {formatUserDisplayName(currentUser, 'Guest')}{currentUser.preferredLanguage === 'ko' ? '님' : ''}
          </h2>
        </div>
      </section>

      <div className="stack-gap-lg">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            emptyMsg="horizonClear"
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
