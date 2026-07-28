"use client";

import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
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
  hideChevron?: boolean;
}

/** Compact date-column row matching events / worship roster list formatting. */
export function RosterFeedCard({
  date,
  label,
  title,
  description,
  rightElement,
  index = 0,
  className,
  onClick,
  hideChevron = false,
}: RosterFeedCardProps) {
  const content = (
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
        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="event-row-title">{title}</p>
        {description ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>

      {rightElement ? <div className="shrink-0">{rightElement}</div> : null}
      {!hideChevron ? (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
      ) : null}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className={cn("event-row group w-full", className)}>
          {content}
        </button>
      ) : (
        <div className={cn("event-row group", className)}>{content}</div>
      )}
    </motion.div>
  );
}
