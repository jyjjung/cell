"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, ListChecks, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";
import { BottomHubBar, bottomHubIconClass, bottomHubTabClass } from "@/components/layout/bottom-hub-bar";

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
    ],
    [t],
  );

  const activeTab = tabs.find((tab) => pathname.startsWith(tab.href))?.value ?? "events";

  return (
    <BottomHubBar>
      <div className="grid grid-cols-3 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => router.push(tab.href)}
              className={bottomHubTabClass(active)}
            >
              <Icon className={bottomHubIconClass(active)} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </BottomHubBar>
  );
}
