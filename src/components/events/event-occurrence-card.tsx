"use client";

import { LinkifiedText } from "@/components/ui/linkified-text";
import { type EventOccurrenceRow } from "@/lib/event-occurrences";
import { cn } from "@/lib/utils";
import { EventCategory } from "@/types";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { useState } from "react";

const categoryConfig: Record<EventCategory, { color: string }> = {
  [EventCategory.Event]: { color: "text-foreground" },
  [EventCategory.Snack]: { color: "text-foreground" },
  [EventCategory.Birthday]: { color: "text-foreground" },
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
  const config = categoryConfig[event.category as EventCategory] || categoryConfig[EventCategory.Event];
  const isRecurring = event.recurrence && event.recurrence !== "none";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
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
        className={cn("event-row group", className)}
      >
        <div className="flex w-10 shrink-0 flex-col items-center leading-none">
          <span className="text-[10px] font-medium text-muted-foreground">{format(eventDate, "MMM")}</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">{format(eventDate, "d")}</span>
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">{format(eventDate, "EEE")}</span>
        </div>

        <div className="event-row-body">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("text-xs text-muted-foreground", config.color)}>{event.category}</span>
            {isRecurring && (
              <span className="text-xs text-muted-foreground">
                {event.recurrence === "daily" ? "Daily" : "Weekly"}
              </span>
            )}
          </div>
          <p className="event-row-title">{event.title}</p>
          {((!event.allDay && event.startTime) || event.location) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {!event.allDay && event.startTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {event.startTime}
                  {event.endTime ? `–${event.endTime}` : ""}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {event.location}
                </span>
              )}
            </div>
          )}
        </div>

        <motion.div animate={{ rotate: onCardClick ? 0 : open ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {!onCardClick && open && event.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mx-2 mt-1.5 rounded-md border border-border bg-muted/40 p-3">
              <LinkifiedText text={event.details} className="block text-sm leading-relaxed text-muted-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
