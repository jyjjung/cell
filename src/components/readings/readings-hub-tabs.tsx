"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ScrollText, Brain, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import MiniBibleReader from "@/components/bible/mini-bible-reader";
import { useGlobalBibleReader } from "@/contexts/global-bible-reader-context";

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

  const tabs = useMemo<ReadingTab[]>(
    () => [
      { value: "plan", label: "Plan", href: "/bible-checklist", icon: BookOpen },
      { value: "full", label: "Full", href: "/full-plan", icon: ScrollText },
      { value: "memorize", label: "Memory", href: "/memorize", icon: Brain },
      { value: "progress", label: "Progress", href: "/leaderboard", icon: Trophy, requiresAuth: true },
    ],
    []
  );

  const visibleTabs = tabs.filter((tab) => !tab.requiresAuth || !!currentUser);
  const activeTab = visibleTabs.find((tab) => pathname.startsWith(tab.href))?.value ?? visibleTabs[0]?.value ?? "plan";
  const leftTabs = visibleTabs.slice(0, 2);
  const rightTabs = visibleTabs.slice(2, 4);

  return (
    <>
      <div className="fixed bottom-3 left-1/2 z-40 w-[min(680px,calc(100vw-16px))] -translate-x-1/2 md:bottom-4 md:left-[calc(50%+8rem)] md:w-[min(720px,calc(100vw-16rem-32px))]">
        <div className="glass-elevated relative rounded-[1.75rem] border-transparent px-2 pb-3 pt-3">
          <div className="grid grid-cols-5 gap-1">
            {leftTabs.map((tab) => {
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
            <div className="flex items-center justify-center">
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="glass-elevated border-transparent flex h-12 w-12 items-center justify-center rounded-full"
                  >
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span className="sr-only">Open popup Bible</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  side="top"
                  className="mb-2 w-[calc(100vw-1.5rem)] sm:w-[380px] p-0 h-[600px] max-h-[calc(100vh-8rem)] overflow-hidden rounded-xl flex flex-col"
                >
                  <MiniBibleReader onClose={() => setIsOpen(false)} />
                </PopoverContent>
              </Popover>
            </div>
            {rightTabs.map((tab) => {
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
