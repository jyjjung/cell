'use client';

import type { ReactNode } from 'react';
import {
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  Gift,
  ListChecks,
  Music2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScheduleRowDate } from '@/components/schedule/schedule-occurrence-row';
import { HomeGroupedSection } from '@/components/home/home-grouped-section';
import { Skeleton } from '@/components/ui/skeleton';

interface HomeAgendaRowProps {
  date: Date;
  title: string;
  detail?: ReactNode;
  type?: string;
  typeLabel?: string;
  rightElement?: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Compact grouped-list row for the home agenda. */
export function HomeAgendaRow({
  date,
  title,
  detail,
  type,
  typeLabel,
  rightElement,
  onClick,
  className,
}: HomeAgendaRowProps) {
  const body = (
    <>
      <ScheduleRowDate date={date} />
      {type ? <ScheduleTypeIndicator type={type} label={typeLabel} /> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {detail ? <div className="truncate text-xs leading-relaxed text-muted-foreground">{detail}</div> : null}
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

const scheduleTypeConfig: Record<
  string,
  { icon: typeof CalendarCheck; className: string; label: string }
> = {
  event: { icon: CalendarCheck, className: 'bg-primary/10 text-primary', label: 'Event' },
  birthday: { icon: Gift, className: 'bg-chart-4/15 text-chart-4', label: 'Birthday' },
  cleaning: { icon: Sparkles, className: 'bg-chart-2/15 text-chart-2', label: 'Cleaning' },
  qt: { icon: ListChecks, className: 'bg-chart-3/15 text-chart-3', label: 'QT' },
  worship: { icon: Music2, className: 'bg-chart-5/15 text-chart-5', label: 'Worship' },
  custom: { icon: ClipboardList, className: 'bg-muted text-muted-foreground', label: 'Roster' },
};

export function ScheduleTypeIndicator({ type, label }: { type: string; label?: string }) {
  const config = scheduleTypeConfig[type] ?? scheduleTypeConfig.custom;
  const Icon = config.icon;

  return (
    <span
      className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2 text-[0.6875rem] font-medium', config.className)}
      title={label || config.label}
      aria-label={label || config.label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{label || config.label}</span>
    </span>
  );
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
      <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
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
