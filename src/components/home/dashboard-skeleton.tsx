'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { HomeBibleSectionSkeleton } from '@/components/home/home-bible-section';
import { HomeAgendaSkeleton } from '@/components/home/home-agenda-row';
import { PageShell } from '@/components/ui/page-layout';

/**
 * Home shell shown while the dashboard chunk loads. Mirrors grouped layout.
 */
export function DashboardSkeleton() {
  return (
    <PageShell>
      <header className="home-greeting">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-40 max-w-full" />
      </header>

      <HomeBibleSectionSkeleton />
      <HomeAgendaSkeleton rows={3} />
    </PageShell>
  );
}
