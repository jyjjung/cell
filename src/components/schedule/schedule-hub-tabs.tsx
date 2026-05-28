"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, ListChecks, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ScheduleTab = {
  value: string;
  label: string;
  href: string;
  icon: React.ElementType;
};

export default function ScheduleHubTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = useMemo<ScheduleTab[]>(
    () => [
      { value: "events", label: "Events", href: "/events", icon: CalendarCheck },
      { value: "qt", label: "QT", href: "/qt", icon: ListChecks },
      { value: "cleaning", label: "Cleaning", href: "/cleaning-roster", icon: Sparkles },
    ],
    []
  );

  const activeTab = tabs.find((tab) => pathname.startsWith(tab.href))?.value ?? "events";

  return (
    <>
      <div className="fixed bottom-3 left-1/2 z-40 w-[min(680px,calc(100vw-16px))] -translate-x-1/2 md:bottom-4 md:left-[calc(50%+8rem)] md:w-[min(720px,calc(100vw-16rem-32px))]">
        <div className="glass-elevated rounded-[1.75rem] border-transparent px-2 py-2">
          <div className="grid grid-cols-3 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.value === activeTab;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => router.push(tab.href)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors",
                    active ? "bg-background/40 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/25"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
