"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RosterFeedCardProps {
  date: Date;
  label: string;
  title: string;
  description?: React.ReactNode;
  rightElement?: React.ReactNode;
  index?: number;
  className?: string;
  onClick?: () => void;
}

/** Event-row style card used by QT, cleaning, and custom roster feeds. */
export function RosterFeedCard({
  date,
  label,
  title,
  description,
  rightElement,
  index = 0,
  className,
  onClick,
}: RosterFeedCardProps) {
  const body = (
    <>
      <div className="flex w-10 shrink-0 flex-col items-center leading-none">
        <span className="text-[10px] font-medium text-muted-foreground">{format(date, "MMM")}</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">{format(date, "d")}</span>
      </div>

      <div className="event-row-body">
        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="event-row-title">{title}</p>
        {description ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        ) : (
          <p className="event-row-meta">{format(date, "EEE")}</p>
        )}
      </div>

      {rightElement ?? (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={className}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className={cn("event-row group w-full text-left", className)}>
          {body}
        </button>
      ) : (
        <div className={cn("event-row group", className)}>{body}</div>
      )}
    </motion.div>
  );
}

/** Month section matching the Events page MonthGroup layout. */
export function RosterMonthGroup({
  month,
  children,
}: {
  month: string;
  children: React.ReactNode;
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
