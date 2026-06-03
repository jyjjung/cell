
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 text-[length:var(--app-ui-font-sm)]",
  {
    variants: {
      variant: {
        default: "glass-elevated text-foreground hover:text-foreground active:scale-[0.98]",
        primary:
          "border border-primary/20 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "glass-elevated bg-destructive/80 text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "glass-thin text-foreground hover:bg-accent/55 hover:text-accent-foreground active:scale-[0.98]",
        secondary:
          "glass-thin bg-secondary/75 text-secondary-foreground hover:bg-secondary/85 active:scale-[0.98]",
        ghost: "glass-thin border-transparent bg-transparent hover:bg-accent/50 hover:text-accent-foreground active:scale-[0.95]",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "glass-elevated bg-gradient-to-br from-primary/90 to-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]",
      },
      size: {
        default: "h-[var(--app-control-height-md)] px-5 py-2 rounded-2xl",
        sm: "h-[var(--app-control-height-sm)] rounded-xl px-3 text-[length:var(--app-ui-font-xs)]",
        xs: "h-8 rounded-lg px-2 text-[length:var(--app-ui-font-xs)]",
        lg: "h-[var(--app-control-height-lg)] rounded-[1.25rem] px-8 text-[length:var(--app-ui-font-base)]",
        hero: "h-16 rounded-full px-10 text-lg font-black uppercase tracking-tight italic",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

    