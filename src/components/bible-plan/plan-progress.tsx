"use client";

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

interface PlanProgressBarProps {
  value: number;
  caption?: ReactNode;
}

/** Plan completion bar with its percentage, shared by home and the full checklist. */
export function PlanProgressBar({ value, caption }: PlanProgressBarProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4">
        <Progress value={value} className="h-2 flex-grow bg-muted" />
        <span className="text-sm font-semibold tabular-nums">{Math.round(value)}%</span>
      </div>
      {caption ? <p className="text-micro-label">{caption}</p> : null}
    </div>
  );
}

type PlanCombinedProgressBarProps = {
  completed: number;
  dueThroughToday: number;
  total: number;
  progressSoFarPercent: number;
  progressSoFarLabel: string;
  legendRead: string;
  legendDue: string;
  legendUpcoming: string;
  caption?: ReactNode;
  hideProgressSoFarInLegend?: boolean;
  showLegend?: boolean;
};

function planProgressSegments(completed: number, dueThroughToday: number, total: number) {
  if (total <= 0) {
    return { read: 0, due: 0, upcoming: 100 };
  }
  const read = (completed / total) * 100;
  const due = (Math.max(0, dueThroughToday - completed) / total) * 100;
  const upcoming = (Math.max(0, total - Math.max(completed, dueThroughToday)) / total) * 100;
  return { read, due, upcoming };
}

/** Full-plan bar: read (primary), still due (accent), not yet scheduled (muted). */
export function PlanCombinedProgressBar({
  completed,
  dueThroughToday,
  total,
  progressSoFarPercent,
  progressSoFarLabel,
  legendRead,
  legendDue,
  legendUpcoming,
  caption,
  hideProgressSoFarInLegend = false,
  showLegend = true,
}: PlanCombinedProgressBarProps) {
  const overallPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const { read, due, upcoming } = planProgressSegments(completed, dueThroughToday, total);
  const dueMarker =
    total > 0 && dueThroughToday > 0 ? Math.min(100, (dueThroughToday / total) * 100) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div
          className="relative h-2.5 flex-grow overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={overallPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={caption ? String(caption) : undefined}
        >
          <div className="flex h-full w-full">
            {read > 0 ? (
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${read}%` }}
              />
            ) : null}
            {due > 0 ? (
              <div
                className="h-full bg-chart-3 transition-all duration-500"
                style={{ width: `${due}%` }}
              />
            ) : null}
            {upcoming > 0 ? (
              <div
                className="h-full bg-muted-foreground/25 transition-all duration-500"
                style={{ width: `${upcoming}%` }}
              />
            ) : null}
          </div>
          {dueMarker != null && dueMarker < 100 ? (
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-foreground/25"
              style={{ left: `${dueMarker}%` }}
              aria-hidden
            />
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{overallPercent}%</span>
      </div>

      {showLegend ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            {legendRead}
          </span>
          {due > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-3" aria-hidden />
              {legendDue}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/35" aria-hidden />
            {legendUpcoming}
          </span>
          {!hideProgressSoFarInLegend ? (
            <span className="ml-auto tabular-nums">
              {Math.round(progressSoFarPercent)}% {progressSoFarLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {caption ? <p className="text-micro-label">{caption}</p> : null}
    </div>
  );
}

export function PlanProgressBarSkeleton() {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4">
        <Skeleton className="h-2 flex-grow" />
        <Skeleton className="h-7 w-12" />
      </div>
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

type PlanPaceRow = {
  label: string;
  value: string | number;
  unit?: string;
};

/** Label/value rows for pace stats — full labels, no truncation. */
export function PlanPaceList({
  items,
  className,
}: {
  items: PlanPaceRow[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <dl className={cn('divide-y divide-border/50 border-t border-border/50', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {item.value}
            {item.unit ? (
              <span className="ml-1 text-xs font-medium text-muted-foreground">{item.unit}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface ReadingCheckRowProps {
  label: string;
  done?: boolean;
  /** Prefix such as "Missed reading", shown before the passage. */
  lead?: string;
  /** Draws a rule above the row, for a reading appended below today's list. */
  separated?: boolean;
  /** Set false on home to skip layout animation on first paint. */
  animate?: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onRead: () => void;
}

/** Compact tickable passage row — shared by home and the full reading plan. */
export function ReadingCheckRow({
  label,
  done = false,
  lead,
  separated = false,
  animate = true,
  disabled = false,
  onToggle,
  onRead,
}: ReadingCheckRowProps) {
  const row = (
    <div
      className={cn(
        'reading-check-row',
        done && 'reading-check-row-done',
        separated && 'border-t border-border/45',
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="h-3.5 w-3.5 shrink-0 rounded-[3px]"
        aria-label={label}
      />
      <button type="button" className="reading-check-row-label" onClick={onRead} disabled={disabled}>
        {lead ? <span className="reading-check-row-lead">{lead}</span> : null}
        <span className={cn(done && 'line-through decoration-muted-foreground/60')}>{label}</span>
      </button>
    </div>
  );

  if (!animate) return row;

  return (
    <motion.div layout transition={spring}>
      {row}
    </motion.div>
  );
}

export function ReadingCheckRowSkeleton() {
  return (
    <div className="reading-check-row">
      <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
      <Skeleton className="h-3.5 w-40" />
    </div>
  );
}
