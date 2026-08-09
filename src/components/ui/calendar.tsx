
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  size?: "default" | "compact"
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  size = "default",
  ...props
}: CalendarProps) {
  const compact = size === "compact"

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(compact ? "p-2" : "p-3", className)}
      classNames={{
        months: cn(
          "flex flex-col sm:flex-row",
          compact ? "space-y-2 sm:space-x-2 sm:space-y-0" : "space-y-4 sm:space-x-4 sm:space-y-0",
        ),
        month: compact ? "space-y-2" : "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: compact ? "text-xs font-medium" : "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          compact
            ? "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100"
            : "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: cn(
          "text-muted-foreground rounded-md font-normal",
          compact ? "w-7 text-[0.7rem]" : "w-9 text-[0.8rem]",
        ),
        row: cn("flex w-full", compact ? "mt-1" : "mt-2"),
        cell: cn(
          "text-center p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          compact ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          compact
            ? "h-7 w-7 p-0 text-xs font-normal aria-selected:opacity-100"
            : "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
