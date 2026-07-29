"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BottomHubBarProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  maxWidth?: "default" | "wide";
};

/** Floating hub shell — Figma BottomHubBar tokens (card surface, hairline border). */
const shellBase =
  "fixed bottom-3 left-1/2 z-40 -translate-x-1/2 md:bottom-4 md:left-[calc(50%+8rem)]";

const widthClass = {
  default: "w-[min(680px,calc(100vw-16px))] md:w-[min(720px,calc(100vw-16rem-32px))]",
  wide: "w-[min(760px,calc(100vw-16px))] md:w-[min(820px,calc(100vw-16rem-32px))]",
};

export function BottomHubBar({
  children,
  className,
  innerClassName,
  maxWidth = "default",
}: BottomHubBarProps) {
  return (
    <div className={cn(shellBase, widthClass[maxWidth], className)}>
      <div
        className={cn(
          "rounded-2xl border border-border bg-card px-2 py-1.5 shadow-sm",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Figma hub tab: active = primary icon + foreground label; inactive = muted. */
export function bottomHubTabClass(active: boolean) {
  return cn(
    "flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 transition-colors text-[10px] font-medium",
    active
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
  );
}

export function bottomHubIconClass(active: boolean) {
  return cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground");
}
