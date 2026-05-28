"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { EventCategory } from "@/types";
import { parseDay, type EventOccurrenceRow } from "@/lib/event-occurrences";
import { cn } from "@/lib/utils";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { LinkifiedText } from "@/components/ui/linkified-text";

const categoryConfig: Record<EventCategory, { color: string; bg: string }> = {
  [EventCategory.Event]: { color: "text-primary", bg: "bg-muted border-border" },
  [EventCategory.Snack]: { color: "text-primary", bg: "bg-muted border-border" },
  [EventCategory.Birthday]: { color: "text-primary", bg: "bg-muted border-border" },
};

export default function EventOccurrenceCard({
  row,
  index = 0,
  onCardClick,
  className,
}: {
  row: EventOccurrenceRow;
  index?: number;
  onCardClick?: (row: EventOccurrenceRow) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { event, occurrenceDate } = row;
  const eventDate = occurrenceDate;
  const rangeStart = parseDay(event.date);
  const rangeEnd = event.endDate ? parseDay(event.endDate) : null;
  const config = categoryConfig[event.category as EventCategory] || categoryConfig[EventCategory.Event];
  const isRecurring = event.recurrence && event.recurrence !== "none";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      key={row.occurrenceKey}
    >
      <button
        type="button"
        onClick={() => {
          if (onCardClick) {
            onCardClick(row);
            return;
          }
          setOpen((o) => !o);
        }}
        className={cn(
          "glass-card group flex w-full items-center gap-4 rounded-2xl p-5 text-left sm:p-6",
          className
        )}
      >
        <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border shadow-inner", config.bg)}>
          <span className={cn("text-[9px] font-black uppercase leading-none tracking-widest", config.color)}>{format(eventDate, "MMM")}</span>
          <span className={cn("text-2xl font-black leading-tight", config.color)}>{format(eventDate, "d")}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>{event.category}</span>
            {isRecurring && (
              <span className="rounded-md border border-border/40 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {event.recurrence === "daily" ? "DAILY" : "WEEKLY"}
              </span>
            )}
          </div>
          <p className="text-sm font-bold tracking-tight text-foreground">{event.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">{format(eventDate, "EEEE, MMMM do, yyyy")}</p>
            {!isRecurring && rangeEnd && format(rangeStart, "yyyy-MM-dd") !== format(rangeEnd, "yyyy-MM-dd") && (
              <span className="text-[9px] font-bold uppercase tracking-tighter text-zinc-700/80 dark:text-zinc-300/80">
                ({format(rangeStart, "MMM d")} - {format(rangeEnd, "MMM d, yyyy")})
              </span>
            )}
            {!event.allDay && event.startTime && (
              <div className="flex items-center gap-1 rounded-lg border border-primary/10 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                <Clock className="h-2.5 w-2.5" />
                <span>
                  {event.startTime}
                  {event.endTime ? ` - ${event.endTime}` : ""}
                </span>
              </div>
            )}
            {event.allDay && <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700/80 dark:text-zinc-300/80">All Day</span>}
            {event.location && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-700/85 dark:text-zinc-300/85">
                <MapPin className="h-2.5 w-2.5" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </div>

        <motion.div animate={{ rotate: onCardClick ? 0 : open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {!onCardClick && open && event.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-6 mt-2 rounded-2xl border border-border/40 bg-muted p-5">
              <LinkifiedText text={event.details} className="block text-sm leading-relaxed text-muted-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
