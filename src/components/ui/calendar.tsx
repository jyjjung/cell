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
  captionLayout = "dropdown",
  navLayout = "after",
  ...props
}: CalendarProps) {
  const compact = size === "compact"

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      navLayout={navLayout}
      className={cn(
        "w-fit rounded-2xl border border-border/60 bg-card text-foreground shadow-sm",
        compact ? "p-2" : "p-3",
        className,
      )}
      classNames={{
        months: cn(
          "flex flex-col sm:flex-row",
          compact ? "space-y-2 sm:space-x-2 sm:space-y-0" : "space-y-4 sm:space-x-4 sm:space-y-0",
        ),
        month: compact ? "space-y-2" : "space-y-4",
        month_caption: cn(
          "relative flex items-center justify-between gap-2",
          compact ? "h-8" : "h-10",
        ),
        caption_label: cn(
          "pointer-events-none flex items-center justify-between gap-2 px-1 font-medium",
          compact ? "text-xs" : "text-sm",
        ),
        dropdowns: "flex flex-1 items-center gap-2",
        dropdown_root: cn(
          "relative flex min-w-0 items-center rounded-lg border border-border bg-background px-2 text-foreground",
          compact ? "h-8 text-xs" : "h-10 text-sm",
        ),
        dropdown: "absolute inset-0 cursor-pointer opacity-0",
        months_dropdown: "flex-1",
        years_dropdown: "flex-1",
        chevron: "h-4 w-4 shrink-0 text-muted-foreground",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          compact
            ? "relative left-auto h-8 w-8 rounded-lg bg-transparent p-0 opacity-70 hover:bg-muted hover:opacity-100"
            : "relative left-auto h-10 w-10 rounded-lg bg-transparent p-0 opacity-70 hover:bg-muted hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          compact
            ? "relative right-auto h-8 w-8 rounded-lg bg-transparent p-0 opacity-70 hover:bg-muted hover:opacity-100"
            : "relative right-auto h-10 w-10 rounded-lg bg-transparent p-0 opacity-70 hover:bg-muted hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: cn(
          "rounded-md font-normal text-muted-foreground",
          compact ? "w-8 text-[0.7rem]" : "w-10 text-xs",
        ),
        week: cn("flex w-full", compact ? "mt-1" : "mt-1"),
        day: cn(
          "relative p-0 text-center focus-within:relative focus-within:z-20",
          compact ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          compact
            ? "h-8 w-8 rounded-lg p-0 text-xs font-normal aria-selected:opacity-100"
            : "h-10 w-10 rounded-lg p-0 font-normal aria-selected:opacity-100",
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "font-semibold",
        outside:
          "day-outside text-muted-foreground/50 aria-selected:bg-muted/50 aria-selected:text-muted-foreground/50",
        disabled: "text-muted-foreground/40",
        range_middle:
          "aria-selected:bg-muted aria-selected:text-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...iconProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return (
            <Icon
              className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", className)}
              {...iconProps}
            />
          )
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
