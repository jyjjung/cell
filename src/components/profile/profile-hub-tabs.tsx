"use client";

import { User, Palette, Settings } from "lucide-react";
import { BottomHubBar, bottomHubIconClass, bottomHubTabClass } from "@/components/layout/bottom-hub-bar";

export type ProfileTabId = "profile" | "appearance" | "settings";

type ProfileHubTabsProps = {
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  labels: {
    profile: string;
    appearance: string;
    settings: string;
  };
};

const TABS: { value: ProfileTabId; icon: React.ElementType; labelKey: keyof ProfileHubTabsProps["labels"] }[] = [
  { value: "profile", icon: User, labelKey: "profile" },
  { value: "appearance", icon: Palette, labelKey: "appearance" },
  { value: "settings", icon: Settings, labelKey: "settings" },
];

export function ProfileHubTabs({ activeTab, onTabChange, labels }: ProfileHubTabsProps) {
  return (
    <BottomHubBar>
      <div className="grid grid-cols-3 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={bottomHubTabClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={bottomHubIconClass(active)} />
              <span>{labels[tab.labelKey]}</span>
            </button>
          );
        })}
      </div>
    </BottomHubBar>
  );
}

export function isProfileTabId(value: string | null | undefined): value is ProfileTabId {
  return value === "profile" || value === "appearance" || value === "settings";
}
