"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Book, BookOpen, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";
import { BibleReaderOverlay } from "@/components/bible/bible-reader-overlay";
import { useGlobalBibleReader } from "@/contexts/global-bible-reader-context";
import { BottomHubBar } from "@/components/layout/bottom-hub-bar";
import { HubTab } from "@/components/layout/hub-tab";
import { cn } from "@/lib/utils";

type ReadingTab = {
  value: string;
  label: string;
  href: string;
  icon: React.ElementType;
  requiresAuth?: boolean;
};

export default function ReadingsHubTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { isOpen, setIsOpen } = useGlobalBibleReader();
  const t = translations[currentUser?.preferredLanguage || "en"];

  const tabs = useMemo<ReadingTab[]>(
    () => [
      { value: "plan", label: t.readingPlan, href: "/bible-checklist", icon: BookOpen },
      { value: "progress", label: t.communityProgress, href: "/leaderboard", icon: Trophy, requiresAuth: true },
    ],
    [t],
  );

  const visibleTabs = tabs.filter((tab) => !tab.requiresAuth || !!currentUser);
  const planTab = visibleTabs.find((tab) => tab.value === "plan");
  const progressTab = visibleTabs.find((tab) => tab.value === "progress");
  const activeTab =
    visibleTabs.find((tab) => pathname.startsWith(tab.href))?.value ?? planTab?.value ?? "plan";

  return (
    <>
      <BottomHubBar>
        <div className={cn("grid gap-1", progressTab ? "grid-cols-3" : "grid-cols-2")}>
          {planTab ? (
            <HubTab
              active={activeTab === planTab.value}
              label={planTab.label}
              icon={planTab.icon}
              onClick={() => router.push(planTab.href)}
            />
          ) : null}

          <HubTab
            active={isOpen}
            label={t.bible}
            icon={Book}
            onClick={() => setIsOpen(!isOpen)}
          />

          {progressTab ? (
            <HubTab
              active={activeTab === progressTab.value}
              label={progressTab.label}
              icon={progressTab.icon}
              onClick={() => router.push(progressTab.href)}
            />
          ) : null}
        </div>
      </BottomHubBar>
      <BibleReaderOverlay placement="hub" />
    </>
  );
}
