"use client";

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
        <Progress value={value} className="h-2 flex-grow bg-muted shadow-inner" />
        <span className="text-stat-value-sm">{Math.round(value)}%</span>
      </div>
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

interface ReadingCheckRowProps {
  label: string;
  done?: boolean;
  /** Prefix such as "Missed reading", shown before the passage. */
  lead?: string;
  /** Draws a rule above the row, for a reading appended below today's list. */
  separated?: boolean;
  onToggle: () => void;
  onRead: () => void;
}

/** Tickable passage row used wherever a reading can be marked complete. */
export function ReadingCheckRow({
  label,
  done = false,
  lead,
  separated = false,
  onToggle,
  onRead,
}: ReadingCheckRowProps) {
  return (
    <motion.div
      layout
      transition={spring}
      className={cn(
        'surface-row',
        separated && 'border-t border-border/60 pt-3',
        done && 'opacity-45',
      )}
    >
      <Checkbox checked={done} onCheckedChange={onToggle} className="h-4 w-4 shrink-0" />
      <button type="button" onClick={onRead} className="flex-1 text-left">
        {lead ? <span className="text-micro-label">{lead}: </span> : null}
        <span
          className={cn(
            'text-sm font-medium text-foreground',
            done && 'text-muted-foreground line-through',
          )}
        >
          {label}
        </span>
      </button>
    </motion.div>
  );
}

export function ReadingCheckRowSkeleton() {
  return (
    <div className="surface-row">
      <Skeleton className="h-4 w-4 shrink-0 rounded" />
      <Skeleton className="h-5 w-44" />
    </div>
  );
}
