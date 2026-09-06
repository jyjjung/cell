import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Text field — 44px min height, 16px type on touch, radius matching buttons.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isDateTime = type === "date" || type === "time" || type === "datetime-local" || type === "month" || type === "week"

    return (
      <input
        type={type}
        className={cn(
          "flex h-11 min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground touch-manipulation",
          "placeholder:text-muted-foreground",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30",
          "read-only:cursor-default read-only:bg-muted/40",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-100 disabled:text-muted-foreground",
          // Native date/time controls inflate height on iOS unless inner edit padding is zeroed.
          isDateTime && [
            "appearance-none py-0 leading-normal",
            "[&::-webkit-date-and-time-value]:min-h-0",
            "[&::-webkit-datetime-edit]:m-0 [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit]:leading-[2.75rem]",
            "[&::-webkit-datetime-edit-fields-wrapper]:p-0",
          ],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
