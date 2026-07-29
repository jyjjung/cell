'use client';

import { PageHeader, PageSection } from '@/components/ui/page-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ScheduleMonthGroupSkeleton } from '@/components/schedule/schedule-occurrence-row';
import { PlanProgressBarSkeleton, ReadingCheckRowSkeleton } from '@/components/bible-plan/plan-progress';

/**
 * Home shell shown while the dashboard chunk loads. Built from the same layout
 * components as the real page so the two cannot drift out of alignment.
 */
export function DashboardSkeleton() {
  return (
    <div className="page-container">
      <PageHeader
        title={<Skeleton className="h-8 w-56" />}
        description={<Skeleton className="h-5 w-40" />}
      />

      <PageSection
        title={<Skeleton className="h-5 w-28" />}
        action={<Skeleton className="h-8 w-20" />}
      >
        <div className="space-y-4">
          <PlanProgressBarSkeleton />
          <div className="ui-list">
            {Array.from({ length: 2 }).map((_, row) => (
              <ReadingCheckRowSkeleton key={row} />
            ))}
          </div>
        </div>
      </PageSection>

      <div className="stack-gap-sm">
        <ScheduleMonthGroupSkeleton rows={3} />
        <ScheduleMonthGroupSkeleton rows={2} />
      </div>
    </div>
  );
}
