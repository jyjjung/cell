"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

type AvatarSize = "sm" | "md" | "lg"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    shape?: "circle" | "square"
    size?: AvatarSize
  }
>(({ className, shape = "circle", size = "lg", ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex shrink-0 overflow-hidden",
      {
        "h-6 w-6": size === "sm",
        "h-8 w-8": size === "md",
        "h-10 w-10": size === "lg",
        "rounded-full": shape === "circle",
        "rounded-lg": shape === "square",
      },
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

type AvatarGroupProps = React.HTMLAttributes<HTMLDivElement> & {
spacing?: "spaced" | "overlap"
overflowLabel?: string
showOverflow?: boolean
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
(
  {
    className,
    children,
    spacing = "spaced",
    overflowLabel = "+1",
    showOverflow = true,
    ...props
  },
  ref,
) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center",
      spacing === "spaced" ? "gap-1" : "gap-0 [&>*+*]:-ml-2 [&>*]:ring-2 [&>*]:ring-background",
      className,
    )}
    {...props}
  >
    {children}
    {showOverflow ? (
      <span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-muted px-1 text-sm leading-[1.4] text-muted-foreground">
        {overflowLabel}
      </span>
    ) : null}
  </div>
),
)
AvatarGroup.displayName = "AvatarGroup"

type AvatarBlockProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
avatar: React.ReactNode
title: React.ReactNode
description?: React.ReactNode
}

const AvatarBlock = React.forwardRef<HTMLDivElement, AvatarBlockProps>(
({ className, avatar, title, description, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-start gap-3", className)} {...props}>
    <div className="shrink-0">{avatar}</div>
    <div className="min-w-0 space-y-0.5 text-base leading-[1.4]">
      <div className="truncate font-semibold text-muted-foreground">{title}</div>
      {description ? (
        <div className="truncate text-muted-foreground/70">{description}</div>
      ) : null}
    </div>
  </div>
),
)
AvatarBlock.displayName = "AvatarBlock"

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarBlock }
