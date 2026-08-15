'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import Link from 'next/link';
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Resource, Schedule, Setlist } from '@/types/ndcpc-ported';
import { collection, query, orderBy } from 'firebase/firestore';
import { findBySunday, getUpcomingSunday } from '@/lib/ndcpc/dates';
import { normalizeSetlist, resolveSetlistResources } from '@/lib/ndcpc/setlist';
import { resolveServiceSteps } from '@/lib/ndcpc/worship-format';
import { useTranslation } from '@/context/LocaleProvider';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import { LoadingState } from '@/components/ndcpc/LoadingState';
import { CombinedServiceView } from '@/components/ndcpc/CombinedServiceView';
import { SetlistMedia } from '@/components/ndcpc/SetlistMedia';
import { UpcomingDuties } from '@/components/ndcpc/UpcomingDuties';
import { useWeeklyWorshipFormat } from '@/components/ndcpc/WorshipFormatManager';
import { Button } from '@/components/ui/button';

export function DashboardView() {
  const firestore = useFirestore();
  const { t, locale } = useTranslation();
  const upcomingSunday = useMemo(() => getUpcomingSunday(), []);

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.schedules), orderBy('date', 'desc'));
  }, [firestore]);

  const setlistsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.setlists), orderBy('date', 'desc'));
  }, [firestore]);

  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.resources), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: schedules, isLoading: schedulesLoading } =
    useCollection<Schedule>(schedulesQuery);
  const { data: setlists, isLoading: setlistsLoading } =
    useCollection<Setlist>(setlistsQuery);
  const { data: weeklyFormat, isLoading: worshipFormatLoading } = useWeeklyWorshipFormat();
  const { data: resources } = useCollection<Resource>(resourcesQuery);

  const isLoading = schedulesLoading || setlistsLoading || worshipFormatLoading;

  const upcomingSchedule = findBySunday(schedules, upcomingSunday);
  const upcomingSetlist = findBySunday(setlists, upcomingSunday);
  const serviceSteps = resolveServiceSteps(weeklyFormat?.items);

  const resourceMap = useMemo(
    () => new Map(resources?.map((r) => [r.id, r]) ?? []),
    [resources]
  );

  const normalizedSetlist = upcomingSetlist
    ? normalizeSetlist(upcomingSetlist, resourceMap)
    : { songIds: [], chantIds: [] };

  const setlistSongs = resolveSetlistResources(normalizedSetlist.songIds, resourceMap);
  const setlistChants = resolveSetlistResources(normalizedSetlist.chantIds, resourceMap);

  const dateLabel = formatAppDate(upcomingSunday, 'EEEE, MMMM d', locale);
  const hasSetlist = setlistSongs.length > 0 || setlistChants.length > 0;

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <>
      <div className="space-y-10">
        <UpcomingDuties schedules={schedules} />

        <section>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('dashboard.upcoming')}
          </p>
          <p className="font-headline text-2xl font-semibold leading-snug sm:text-3xl">
            {dateLabel}
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-headline text-lg font-semibold">{t('dashboard.service')}</h2>
            <Button asChild variant="ghost" size="sm" className="h-8 shrink-0">
              <Link href="/ndcpc/worship?tab=order">{t('dashboard.viewAll')}</Link>
            </Button>
          </div>
          <CombinedServiceView items={serviceSteps} schedule={upcomingSchedule} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-headline text-lg font-semibold">{t('dashboard.setlist')}</h2>
            <Button asChild variant="ghost" size="sm" className="h-8 shrink-0">
              <Link href="/ndcpc/worship?tab=setlist">{t('dashboard.viewAll')}</Link>
            </Button>
          </div>
          {hasSetlist ? (
            <SetlistMedia songs={setlistSongs} chants={setlistChants} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('dashboard.noSetlist')}</p>
          )}
        </section>
      </div>
    </>
  );
}
