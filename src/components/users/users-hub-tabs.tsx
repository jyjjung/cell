"use client";

import { Building2, GraduationCap, Layers, UserX, Users } from "lucide-react";
import { BottomHubBar, bottomHubIconClass, bottomHubTabClass } from "@/components/layout/bottom-hub-bar";
import type { UsersSegmentTab } from "@/lib/user-segments";

type UsersHubTabsProps = {
  activeTab: UsersSegmentTab;
  onTabChange: (tab: UsersSegmentTab) => void;
  counts: Record<Exclude<UsersSegmentTab, "roles">, number>;
};

const TABS: { value: UsersSegmentTab; icon: React.ElementType; label: string }[] = [
  { value: "all", icon: Users, label: "All" },
  { value: "cell", icon: Building2, label: "em." },
  { value: "ndcpc", icon: GraduationCap, label: "Preschool" },
  { value: "unassigned", icon: UserX, label: "Unassigned" },
  { value: "roles", icon: Layers, label: "Roles" },
];

export function UsersHubTabs({ activeTab, onTabChange, counts }: UsersHubTabsProps) {
  return (
    <BottomHubBar maxWidth="wide">
      <div className="grid grid-cols-5 gap-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.value === activeTab;
          const count = tab.value !== "roles" ? counts[tab.value] : undefined;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={bottomHubTabClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={bottomHubIconClass(active)} />
              <span className="truncate">
                {tab.label}
                {typeof count === "number" ? ` (${count})` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </BottomHubBar>
  );
}
