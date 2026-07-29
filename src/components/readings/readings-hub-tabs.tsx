"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ScrollText, Brain, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";
import { BibleReaderOverlay } from "@/components/bible/bible-reader-overlay";
import { useGlobalBibleReader } from "@/contexts/global-bible-reader-context";
import { BottomHubBar, bottomHubIconClass, bottomHubTabClass } from "@/components/layout/bottom-hub-bar";

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
      { value: "full", label: t.fullPlan, href: "/full-plan", icon: ScrollText },
      { value: "memorize", label: t.memoryVerses, href: "/memorize", icon: Brain },
      { value: "progress", label: t.communityProgress, href: "/leaderboard", icon: Trophy, requiresAuth: true },
    ],
    [t],
  );

  const visibleTabs = tabs.filter((tab) => !tab.requiresAuth || !!currentUser);
  const activeTab = visibleTabs.find((tab) => pathname.startsWith(tab.href))?.value ?? visibleTabs[0]?.value ?? "plan";
  const leftTabs = visibleTabs.slice(0, 2);
  const rightTabs = visibleTabs.slice(2, 4);

  return (
    <>
      <BottomHubBar>
        <div className="grid grid-cols-5 gap-1">
          {leftTabs.map((tab) => {
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
          <div className="flex items-center justify-center">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-primary transition-colors hover:bg-accent"
              onClick={() => setIsOpen(!isOpen)}
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="sr-only">Open popup Bible</span>
            </button>
          </div>
          {rightTabs.map((tab) => {
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
      <BibleReaderOverlay placement="hub" />
    </>
  );
}
