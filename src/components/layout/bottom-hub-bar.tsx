"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BottomHubBarProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  maxWidth?: "default" | "wide";
};

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
      <div className={cn("glass-elevated rounded-xl border-transparent px-2 py-1.5", innerClassName)}>
        {children}
      </div>
    </div>
  );
}

export function bottomHubTabClass(active: boolean) {
  return cn(
    "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors text-xs",
    active ? "bg-background/40 text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
  );
}

export function bottomHubIconClass(active: boolean) {
  return cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground");
}
