"use client";

import { Building2, GraduationCap, Layers, UserX, Users } from "lucide-react";
import { BottomHubBar } from "@/components/layout/bottom-hub-bar";
import { HubTab } from "@/components/layout/hub-tab";
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
        {TABS.map((tab) => (
          <HubTab
            key={tab.value}
            active={tab.value === activeTab}
            label={
              <>
                {tab.label}
                {tab.value !== "roles" && typeof counts[tab.value] === "number"
                  ? ` (${counts[tab.value]})`
                  : ""}
              </>
            }
            icon={tab.icon}
            onClick={() => onTabChange(tab.value)}
          />
        ))}
      </div>
    </BottomHubBar>
  );
}
