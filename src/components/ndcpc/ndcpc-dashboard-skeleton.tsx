'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { HomeGroupedSection } from '@/components/home/home-grouped-section';
import { PageShell } from '@/components/ui/page-layout';

function GroupedSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <HomeGroupedSection id="ndcpc-home-skeleton-section" title={<Skeleton className="h-3 w-28" />}>
      <div className="home-group-list">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="home-group-nav-row">
            <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </HomeGroupedSection>
  );
}

/** Preschool home shell while dashboard data loads. Mirrors grouped layout. */
export function NdcpcDashboardSkeleton() {
  return (
    <PageShell>
      <header className="home-greeting">
        <Skeleton className="h-8 w-56 max-w-full" />
      </header>
      <GroupedSectionSkeleton rows={2} />
      <GroupedSectionSkeleton rows={4} />
    </PageShell>
  );
}
