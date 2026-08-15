"use client";

import { User, Palette, Bell, SlidersHorizontal } from "lucide-react";
import { BottomHubBar, bottomHubIconClass, bottomHubTabClass } from "@/components/layout/bottom-hub-bar";

export type AccountsTabId = "profile" | "appearance" | "apps" | "notifications";

type AccountsHubTabsProps = {
  activeTab: AccountsTabId;
  onTabChange: (tab: AccountsTabId) => void;
  labels: {
    profile: string;
    appearance: string;
    apps: string;
    notifications: string;
  };
};

const TABS: { value: AccountsTabId; icon: React.ElementType; labelKey: keyof AccountsHubTabsProps["labels"] }[] = [
  { value: "profile", icon: User, labelKey: "profile" },
  { value: "appearance", icon: Palette, labelKey: "appearance" },
  { value: "apps", icon: SlidersHorizontal, labelKey: "apps" },
  { value: "notifications", icon: Bell, labelKey: "notifications" },
];

export function AccountsHubTabs({ activeTab, onTabChange, labels }: AccountsHubTabsProps) {
  return (
    <BottomHubBar>
      <div className="grid grid-cols-4 gap-1">
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
              <span className="truncate">{labels[tab.labelKey]}</span>
            </button>
          );
        })}
      </div>
    </BottomHubBar>
  );
}

export function isAccountsTabId(value: string | null | undefined): value is AccountsTabId {
  return value === "profile" || value === "appearance" || value === "apps" || value === "notifications";
}
