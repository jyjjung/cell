'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { startOfDay } from 'date-fns';
import { collection, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Resource, Schedule, Setlist } from '@/types/ndcpc-ported';
import { getUpcomingSunday } from '@/lib/ndcpc/dates';
import { normalizeSetlist, resolveSetlistResources } from '@/lib/ndcpc/setlist';
import { resolveServiceSteps } from '@/lib/ndcpc/worship-format';
import { useTranslation } from '@/context/LocaleProvider';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { CombinedServiceView } from '@/components/ndcpc/CombinedServiceView';
import { UpcomingDuties } from '@/components/ndcpc/UpcomingDuties';
import { useWeeklyWorshipFormat } from '@/components/ndcpc/WorshipFormatManager';
import { NdcpcHomeGreeting } from '@/components/ndcpc/ndcpc-home-greeting';
import { NdcpcDashboardSkeleton } from '@/components/ndcpc/ndcpc-dashboard-skeleton';
import { HomeGroupedSection } from '@/components/home/home-grouped-section';
import { PageShell, EmptyState } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNdcpcResourcesByIds } from '@/hooks/use-ndcpc-resources-by-ids';

const UPCOMING_SCHEDULE_LIMIT = 16;

const SetlistMedia = dynamic(
  () => import('@/components/ndcpc/SetlistMedia').then((mod) => mod.SetlistMedia),
  {
    loading: () => (
      <div className="space-y-3 px-4 py-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
    ),
  },
);

export function DashboardView() {
  const firestore = useFirestore();
  const { t, locale } = useTranslation();
  const upcomingSunday = useMemo(() => getUpcomingSunday(), []);
  const today = useMemo(() => startOfDay(new Date()), []);
  const sundayTimestamp = useMemo(
    () => Timestamp.fromDate(startOfDay(upcomingSunday)),
    [upcomingSunday],
  );

  const upcomingSchedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, NDCPc_COLLECTIONS.schedules),
      where('date', '>=', Timestamp.fromDate(today)),
      orderBy('date', 'asc'),
      limit(UPCOMING_SCHEDULE_LIMIT),
    );
  }, [firestore, today]);

  const sundayScheduleQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, NDCPc_COLLECTIONS.schedules),
      where('date', '==', sundayTimestamp),
      limit(1),
    );
  }, [firestore, sundayTimestamp]);

  const sundaySetlistQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, NDCPc_COLLECTIONS.setlists),
      where('date', '==', sundayTimestamp),
      limit(1),
    );
  }, [firestore, sundayTimestamp]);

  const { data: upcomingSchedules, isLoading: upcomingSchedulesLoading } =
    useCollection<Schedule>(upcomingSchedulesQuery);
  const { data: sundaySchedules, isLoading: sundayScheduleLoading } =
    useCollection<Schedule>(sundayScheduleQuery);
  const { data: sundaySetlists, isLoading: sundaySetlistLoading } =
    useCollection<Setlist>(sundaySetlistQuery);
  const { data: weeklyFormat, isLoading: worshipFormatLoading } = useWeeklyWorshipFormat();

  const upcomingSchedule = sundaySchedules?.[0] ?? null;
  const upcomingSetlist = sundaySetlists?.[0] ?? null;
  const serviceSteps = resolveServiceSteps(weeklyFormat?.items);

  const setlistResourceIds = useMemo(() => {
    if (!upcomingSetlist) return [];
    const normalized = normalizeSetlist(upcomingSetlist, new Map<string, Resource>());
    return [...normalized.songIds, ...normalized.chantIds];
  }, [upcomingSetlist]);

  const { resourceMap, isLoading: resourcesLoading } = useNdcpcResourcesByIds(setlistResourceIds);

  const normalizedSetlist = upcomingSetlist
    ? normalizeSetlist(upcomingSetlist, resourceMap)
    : { songIds: [], chantIds: [] };

  const setlistSongs = resolveSetlistResources(normalizedSetlist.songIds, resourceMap);
  const setlistChants = resolveSetlistResources(normalizedSetlist.chantIds, resourceMap);

  const dateLabel = formatAppDate(upcomingSunday, 'EEEE, MMMM d', locale);
  const hasSetlist = setlistSongs.length > 0 || setlistChants.length > 0;

  const isLoading =
    upcomingSchedulesLoading ||
    sundayScheduleLoading ||
    sundaySetlistLoading ||
    worshipFormatLoading;

  if (isLoading) {
    return <NdcpcDashboardSkeleton />;
  }

  return (
    <PageShell>
      <NdcpcHomeGreeting />

      <UpcomingDuties schedules={upcomingSchedules} />

      <HomeGroupedSection
        id="ndcpc-sunday-service"
        title={t('dashboard.service')}
        action={
          <Button asChild variant="ghost" size="sm" className="home-group-action">
            <Link href="/ndcpc/worship?tab=order">{t('dashboard.viewAll')}</Link>
          </Button>
        }
      >
        <div className="home-bible-hero border-b border-border/50">
          <p className="home-bible-week">{t('dashboard.upcoming')}</p>
          <p className="text-base font-semibold leading-snug text-foreground">{dateLabel}</p>
        </div>
        <div className="px-4 py-2">
          <CombinedServiceView items={serviceSteps} schedule={upcomingSchedule} />
        </div>
      </HomeGroupedSection>

      <HomeGroupedSection
        id="ndcpc-sunday-setlist"
        title={t('dashboard.setlist')}
        action={
          <Button asChild variant="ghost" size="sm" className="home-group-action">
            <Link href="/ndcpc/worship?tab=setlist">{t('dashboard.viewAll')}</Link>
          </Button>
        }
      >
        {resourcesLoading && setlistResourceIds.length > 0 ? (
          <div className="space-y-3 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="aspect-video w-full rounded-xl" />
          </div>
        ) : hasSetlist ? (
          <div className="px-4 py-3">
            <SetlistMedia songs={setlistSongs} chants={setlistChants} />
          </div>
        ) : (
          <EmptyState title={t('dashboard.noSetlist')} />
        )}
      </HomeGroupedSection>
    </PageShell>
  );
}
