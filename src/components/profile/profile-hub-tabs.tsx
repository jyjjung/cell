"use client";

import { User, Palette, Settings } from "lucide-react";
import { BottomHubBar } from "@/components/layout/bottom-hub-bar";
import { HubTab } from "@/components/layout/hub-tab";

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
        {TABS.map((tab) => (
          <HubTab
            key={tab.value}
            active={tab.value === activeTab}
            label={labels[tab.labelKey]}
            icon={tab.icon}
            onClick={() => onTabChange(tab.value)}
          />
        ))}
      </div>
    </BottomHubBar>
  );
}

export function isProfileTabId(value: string | null | undefined): value is ProfileTabId {
  return value === "profile" || value === "appearance" || value === "settings";
}
