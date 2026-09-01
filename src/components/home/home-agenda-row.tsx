'use client';

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScheduleRowDate } from '@/components/schedule/schedule-occurrence-row';
import { HomeGroupedSection } from '@/components/home/home-grouped-section';
import { Skeleton } from '@/components/ui/skeleton';

interface HomeAgendaRowProps {
  date: Date;
  title: string;
  detail?: ReactNode;
  rightElement?: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Compact grouped-list row for the home agenda. */
export function HomeAgendaRow({
  date,
  title,
  detail,
  rightElement,
  onClick,
  className,
}: HomeAgendaRowProps) {
  const body = (
    <>
      <ScheduleRowDate date={date} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {detail ? <div className="truncate text-xs text-muted-foreground">{detail}</div> : null}
      </div>
      {rightElement ? <div className="shrink-0 self-center">{rightElement}</div> : null}
      {onClick ? (
        <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/70" aria-hidden />
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className={cn('home-group-nav-row h-auto w-full', className)}
      >
        {body}
      </Button>
    );
  }

  return <div className={cn('home-group-nav-row', className)}>{body}</div>;
}

/** Merge subtitle + meta into one scannable line. */
export function mergeAgendaDetail(subtitle?: ReactNode, meta?: ReactNode): ReactNode {
  if (!subtitle && !meta) return undefined;
  if (!subtitle) return meta;
  if (!meta) return subtitle;
  return (
    <>
      {subtitle}
      <span className="text-muted-foreground/50" aria-hidden>
        {' '}
        ·{' '}
      </span>
      {meta}
    </>
  );
}

export function HomeAgendaRowSkeleton() {
  return (
    <div className="home-group-nav-row">
      <div className="flex w-10 shrink-0 flex-col items-center gap-0.5">
        <Skeleton className="h-2 w-5" />
        <Skeleton className="h-3.5 w-5" />
        <Skeleton className="h-2 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function HomeAgendaSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <HomeGroupedSection
      id="home-agenda-heading-skeleton"
      title={<Skeleton className="h-3 w-28" />}
    >
        <div className="home-group-subhead">
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="home-group-list">
          {Array.from({ length: rows }).map((_, index) => (
            <HomeAgendaRowSkeleton key={index} />
          ))}
        </div>
    </HomeGroupedSection>
  );
}
