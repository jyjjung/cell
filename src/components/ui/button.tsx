
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[0.9375rem] font-medium cursor-pointer touch-manipulation select-none transition-[color,background-color,border-color,opacity,transform] duration-150 active:scale-[0.98] active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
        premium:
          "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      size: {
        default: "h-11 min-h-11 px-4",
        sm: "h-9 min-h-9 rounded-xl px-3 text-[0.9375rem] hit-expand",
        xs: "h-8 min-h-8 rounded-lg px-2.5 text-[0.8125rem] hit-expand",
        lg: "h-12 min-h-12 rounded-xl px-5 text-base",
        hero: "h-12 min-h-12 rounded-xl px-8 text-base font-semibold",
        icon: "h-11 w-11 min-h-11 min-w-11 rounded-xl",
        /** Small visual for dense inline (chat, chips). Do not attach hit-expand — stacked rows cannot share overflowing 44px overlays. */
        iconCompact: "relative h-5 w-5 min-h-0 min-w-0 p-0 rounded-full",
        chip: "relative h-auto min-h-0 min-w-0 rounded-full px-2 py-0.5 text-xs font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
