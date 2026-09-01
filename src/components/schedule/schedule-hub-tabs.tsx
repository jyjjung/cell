"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, ListChecks, Sparkles, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";
import { BottomHubBar } from "@/components/layout/bottom-hub-bar";
import { HubTab } from "@/components/layout/hub-tab";

type ScheduleTab = {
  value: string;
  label: string;
  href: string;
  icon: React.ElementType;
};

export default function ScheduleHubTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || "en"];

  const tabs = useMemo<ScheduleTab[]>(
    () => [
      { value: "events", label: t.events, href: "/events", icon: CalendarCheck },
      { value: "qt", label: t.qtSharing, href: "/qt", icon: ListChecks },
      { value: "cleaning", label: t.cleaningDuty, href: "/cleaning-roster", icon: Sparkles },
      { value: "rosters", label: t.customRosters, href: "/rosters", icon: ClipboardList },
    ],
    [t],
  );

  const activeTab = tabs.find((tab) => pathname.startsWith(tab.href))?.value ?? "events";

  return (
    <BottomHubBar>
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => (
          <HubTab
            key={tab.value}
            active={tab.value === activeTab}
            label={tab.label}
            icon={tab.icon}
            onClick={() => router.push(tab.href)}
          />
        ))}
      </div>
    </BottomHubBar>
  );
}
