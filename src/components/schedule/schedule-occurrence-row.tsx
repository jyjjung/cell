"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Month card shell matching the Events page layout. */
export function ScheduleMonthGroup({
  month,
  children,
}: {
  month: string;
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

interface ScheduleOccurrenceRowProps {
  date: Date;
  label?: string;
  title: string;
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
  label,
  title,
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
      <div className="flex w-10 shrink-0 flex-col items-center leading-none">
        <span className="text-[10px] font-medium text-muted-foreground">
          {format(date, "MMM")}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {format(date, "d")}
        </span>
      </div>

      <div className="event-row-body">
        {label ? (
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ) : null}
        <p className="event-row-title">{title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{format(date, "EEE")}</span>
          {meta}
        </div>
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
