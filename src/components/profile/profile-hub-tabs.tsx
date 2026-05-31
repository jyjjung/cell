"use client";

import { User, Trophy, Palette, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileTabId = "profile" | "rewards" | "appearance" | "settings";

type ProfileHubTabsProps = {
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  labels: {
    profile: string;
    rewards: string;
    appearance: string;
    settings: string;
  };
};

const TABS: { value: ProfileTabId; icon: React.ElementType; labelKey: keyof ProfileHubTabsProps["labels"] }[] = [
  { value: "profile", icon: User, labelKey: "profile" },
  { value: "rewards", icon: Trophy, labelKey: "rewards" },
  { value: "appearance", icon: Palette, labelKey: "appearance" },
  { value: "settings", icon: Settings, labelKey: "settings" },
];

export function ProfileHubTabs({ activeTab, onTabChange, labels }: ProfileHubTabsProps) {
  return (
    <div className="fixed bottom-3 left-1/2 z-40 w-[min(680px,calc(100vw-16px))] -translate-x-1/2 md:bottom-4 md:left-[calc(50%+8rem)] md:w-[min(720px,calc(100vw-16rem-32px))]">
      <div className="glass-elevated rounded-[1.75rem] border-transparent px-2 py-2">
        <div className="grid grid-cols-4 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.value === activeTab;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors",
                  active
                    ? "bg-background/40 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/25"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[length:var(--app-ui-font-xs)] leading-none", active ? "font-semibold" : "font-medium")}>
                  {labels[tab.labelKey]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function isProfileTabId(value: string | null | undefined): value is ProfileTabId {
  return value === "profile" || value === "rewards" || value === "appearance" || value === "settings";
}
