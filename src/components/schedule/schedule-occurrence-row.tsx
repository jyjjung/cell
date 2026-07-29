"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** Month card shell matching the Events page layout. */
export function ScheduleMonthGroup({
  month,
  children,
}: {
  /** ReactNode so the loading state can pass a Skeleton and reuse this shell. */
  month: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="ui-card !p-0">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-eyebrow">{month}</p>
      </div>
      <div className="ui-list px-2">{children}</div>
    </div>
  );
}

/**
 * Month / day / weekday stack shown at the leading edge of every schedule row.
 * Shared so the events, QT, cleaning and home lists cannot drift apart.
 */
export function ScheduleRowDate({ date }: { date: Date }) {
  return (
    <div className="flex w-10 shrink-0 flex-col items-center leading-none">
      <span className="text-[10px] font-medium text-muted-foreground">{format(date, "MMM")}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{format(date, "d")}</span>
      <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">{format(date, "EEE")}</span>
    </div>
  );
}

interface ScheduleOccurrenceRowProps {
  date: Date;
  /** Line 1: who or what this is. */
  title: string;
  /** Line 2: the kind of thing — event category, cleaning day, QT topic. */
  subtitle?: ReactNode;
  /** Line 3: the supporting detail — a time, a passage. */
  meta?: ReactNode;
  rightElement?: ReactNode;
  index?: number;
  onClick?: () => void;
  className?: string;
  id?: string;
}

/** Date-list row matching Events (`event-row`) formatting. */
export function ScheduleOccurrenceRow({
  date,
  title,
  subtitle,
  meta,
  rightElement,
  index = 0,
  onClick,
  className,
  id,
}: ScheduleOccurrenceRowProps) {
  const rowClass = cn("event-row group", onClick && "cursor-pointer", className);
  const body = (
    <>
      <ScheduleRowDate date={date} />

      <div className="event-row-body">
        <p className="event-row-title">{title}</p>
        {subtitle ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {subtitle}
          </div>
        ) : null}
        {meta ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>

      {rightElement ? <div className="shrink-0">{rightElement}</div> : null}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      id={id}
      className="scroll-mt-20"
    >
      {onClick ? (
        <button type="button" onClick={onClick} className={rowClass}>
          {body}
        </button>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </motion.div>
  );
}

/** Plain, single-line row meta such as a list of rostered names. */
export function ScheduleRowMeta({ children }: { children: ReactNode }) {
  return <span className="truncate">{children}</span>;
}

/** Emphasises the part of a row that is about the viewer. */
export function ScheduleRowHighlight({ lead, value }: { lead?: string; value?: string }) {
  if (!value) return null;
  return (
    <span className="font-medium text-foreground">
      {lead ? `${lead} ` : ""}
      {value}
    </span>
  );
}

/** Start/end time meta for a schedule row. */
export function ScheduleRowTime({ start, end }: { start: string; end?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {start}
      {end ? `–${end}` : ""}
    </span>
  );
}

/** Scripture reference shown at the trailing edge of a row. */
export function SchedulePassageRef({ passage }: { passage: string }) {
  return <span className="text-passage-ref">{passage}</span>;
}

/**
 * Loading row. Mirrors ScheduleOccurrenceRow's three-line body so the agenda
 * does not collapse in height when real data arrives.
 */
export function ScheduleOccurrenceRowSkeleton() {
  return (
    <div className="event-row">
      <div className="flex w-10 shrink-0 flex-col items-center gap-1 leading-none">
        <Skeleton className="h-2.5 w-6" />
        <Skeleton className="h-3.5 w-5" />
        <Skeleton className="h-2.5 w-6" />
      </div>

      {/* Heights track the real row's title / subtitle / meta line boxes. */}
      <div className="event-row-body">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-0.5 h-4 w-16" />
        <Skeleton className="mt-0.5 h-4 w-24" />
      </div>
    </div>
  );
}

/** Loading month card, reusing the real shell so the two cannot drift. */
export function ScheduleMonthGroupSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ScheduleMonthGroup month={<Skeleton className="h-4 w-24" />}>
      {Array.from({ length: rows }).map((_, index) => (
        <ScheduleOccurrenceRowSkeleton key={index} />
      ))}
    </ScheduleMonthGroup>
  );
}

/** Loading state for a full month-grouped schedule list. */
export function ScheduleListSkeleton({ groups = 2 }: { groups?: number }) {
  return (
    <div className="stack-gap-sm">
      {Array.from({ length: groups }).map((_, index) => (
        <ScheduleMonthGroupSkeleton key={index} rows={index === 0 ? 4 : 2} />
      ))}
    </div>
  );
}
