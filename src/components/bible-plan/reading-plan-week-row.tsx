'use client';

import { format } from 'date-fns';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';
import type { WeeklyProgress } from '@/types';

type Lang = keyof typeof translations;

type Props = {
  week: WeeklyProgress;
  lang: Lang;
  isGuest: boolean;
  variant?: 'default' | 'completed' | 'current';
  layout?: 'list' | 'card';
  onClick: () => void;
};

function weekDateRange(week: WeeklyProgress): string {
  return `${format(week.startDate, 'MMM d')} – ${format(week.endDate, 'MMM d, yyyy')}`;
}

function weekStatusLabel(
  week: WeeklyProgress,
  t: (typeof translations)['en'],
  isGuest: boolean,
): string {
  if (week.isCompleted) return t.completed;
  if (!isGuest && week.totalCount > 0 && (week.isOverdue || week.isCurrent)) {
    return t.weekChaptersRead(week.completedCount, week.totalCount);
  }
  if (week.totalCount > 0) {
    return t.weekPassagesCount(week.completedCount, week.totalCount);
  }
  if (!isGuest && week.isOverdue) return t.overdue;
  if (!isGuest && week.isCurrent) return t.currentWeek;
  return t.currentWeek;
}

export function ReadingPlanWeekRow({
  week,
  lang,
  isGuest,
  variant = 'default',
  layout = 'list',
  onClick,
}: Props) {
  const t = translations[lang];
  const statusLabel = weekStatusLabel(week, t, isGuest);
  const isCompleted = variant === 'completed' || week.isCompleted;
  const isCurrent = variant === 'current' || (!isGuest && week.isCurrent);
  const isOverdue = !isGuest && week.isOverdue && !isCompleted;

  const trailing = isCompleted ? (
    <CheckCircle className="h-5 w-5 text-success" aria-hidden />
  ) : (
    <span
      className={cn(
        'text-sm font-medium tabular-nums',
        isCurrent && 'text-primary',
        isOverdue && 'text-destructive',
        !isCurrent && !isOverdue && 'text-muted-foreground',
      )}
    >
      {statusLabel}
    </span>
  );

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {t.week} {week.weekNumber}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {isCurrent && !isGuest ? `${t.currentWeek} · ${weekDateRange(week)}` : weekDateRange(week)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-center">{trailing}</div>
      <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/70" aria-hidden />
    </>
  );

  if (layout === 'list') {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className="home-group-nav-row h-auto w-full"
      >
        {body}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'ui-card w-full text-left touch-manipulation transition-[box-shadow,transform,background-color] motion-safe:active:scale-[0.99] hover:shadow-md',
        isCompleted && 'ring-1 ring-success/35',
        isCurrent && !isCompleted && 'ring-1 ring-primary/35 bg-accent/30',
        isOverdue && 'ring-1 ring-destructive/35 bg-destructive/5',
        !isCompleted && !isCurrent && !isOverdue && 'ring-1 ring-border/60 hover:bg-secondary/40',
      )}
    >
      <div className="flex w-full items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-section-title">
            {t.week} {week.weekNumber}
          </p>
          <p className="text-sm text-muted-foreground">
            {isCurrent && !isGuest ? `${t.currentWeek} · ${weekDateRange(week)}` : weekDateRange(week)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {trailing}
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </div>
    </button>
  );
}

export function ReadingPlanCompletedWeeksSummary({
  weeks,
  lang,
  layout = 'list',
  onClick,
}: {
  weeks: WeeklyProgress[];
  lang: Lang;
  layout?: 'list' | 'card';
  onClick: () => void;
}) {
  const t = translations[lang];
  if (weeks.length === 0) return null;

  const label =
    weeks.length === 1
      ? `${t.week} ${weeks[0].weekNumber}`
      : `${t.week} ${weeks[0].weekNumber} – ${weeks[weeks.length - 1].weekNumber}`;

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-success">{t.completed}</p>
      </div>
      <CheckCircle className="h-5 w-5 shrink-0 self-center text-success" aria-hidden />
      <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/70" aria-hidden />
    </>
  );

  if (layout === 'list') {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className="home-group-nav-row h-auto w-full"
      >
        {body}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-card w-full text-left ring-1 ring-success/35 touch-manipulation transition-[box-shadow,transform] motion-safe:active:scale-[0.99] hover:shadow-md"
    >
      <div className="flex w-full items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-micro-label text-success">{t.completed}</p>
          <p className="font-semibold text-section-title">{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" aria-hidden />
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </div>
    </button>
  );
}
