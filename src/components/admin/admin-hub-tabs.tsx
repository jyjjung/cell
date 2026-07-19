"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  Users,
  Layers,
  Megaphone,
  Calendar,
  ListChecks,
  ListTodo,
  ClipboardList,
  BookOpen,
  Brain,
  MessageCircle,
  Info,
  Grid2x2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BottomHubBar, bottomHubIconClass, bottomHubTabClass } from "@/components/layout/bottom-hub-bar";

type AdminTab = {
  value: string;
  label: string;
  href: string;
  icon: React.ElementType;
};

export default function AdminHubTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = useMemo<AdminTab[]>(
    () => [
      { value: "hub", label: "Hub", href: "/admin", icon: Shield },
      { value: "users", label: "Users", href: "/admin/users", icon: Users },
      { value: "roles", label: "Roles", href: "/admin/groups", icon: Layers },
      { value: "notifs", label: "Announcements", href: "/admin/notifications", icon: Megaphone },
      { value: "events", label: "Events", href: "/admin/events", icon: Calendar },
      { value: "qt", label: "QT", href: "/admin/qt-roster", icon: ListChecks },
      { value: "clean", label: "Cleaning", href: "/admin/cleaning-roster", icon: ListTodo },
      { value: "custom", label: "Custom", href: "/admin/custom-rosters", icon: ClipboardList },
      { value: "bible", label: "Bible", href: "/admin/bible-plan", icon: BookOpen },
      { value: "memory", label: "Memory", href: "/admin/memory-verses", icon: Brain },
      { value: "info", label: "Info", href: "/admin/info-widgets", icon: Info },
      { value: "chats", label: "Chats", href: "/admin/chats", icon: MessageCircle },
    ],
    []
  );

  const active = tabs.find((tab) => (tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href)))?.value;

  const primaryTabs = useMemo(
    () => [
      tabs.find((t) => t.value === "clean")!,
      tabs.find((t) => t.value === "notifs")!,
      tabs.find((t) => t.value === "events")!,
      tabs.find((t) => t.value === "qt")!,
    ],
    [tabs]
  );

  return (
    <BottomHubBar maxWidth="wide">
      <div className="grid grid-cols-5 gap-1">
        {primaryTabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => router.push(tab.href)}
              className={bottomHubTabClass(isActive)}
            >
              <Icon className={bottomHubIconClass(isActive)} />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <div className="flex items-center justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="glass-elevated border-transparent flex h-10 w-10 items-center justify-center rounded-full"
              >
                <Grid2x2 className="h-4 w-4 text-primary" />
                <span className="sr-only">Open admin menu</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" side="top" className="mb-2 w-[min(560px,calc(100vw-24px))] rounded-2xl p-2">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tab.value === active;
                  return (
                    <button
                      key={`menu-${tab.value}`}
                      type="button"
                      onClick={() => router.push(tab.href)}
                      className={cn(
                        bottomHubTabClass(isActive),
                        "rounded-xl px-2 py-2",
                      )}
                    >
                      <Icon className={bottomHubIconClass(isActive)} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {primaryTabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => router.push(tab.href)}
              className={bottomHubTabClass(isActive)}
            >
              <Icon className={bottomHubIconClass(isActive)} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </BottomHubBar>
  );
}
