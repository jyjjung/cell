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
  BookOpen,
  Brain,
  MessageCircle,
  Grid2x2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
      { value: "bible", label: "Bible", href: "/admin/bible-plan", icon: BookOpen },
      { value: "memory", label: "Memory", href: "/admin/memory-verses", icon: Brain },
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
    <>
      <div className="fixed bottom-3 left-1/2 z-40 w-[min(760px,calc(100vw-16px))] -translate-x-1/2 md:bottom-4 md:left-[calc(50%+8rem)] md:w-[min(820px,calc(100vw-16rem-32px))]">
        <div className="glass-elevated relative rounded-[1.75rem] border-transparent px-2 py-2">
          <div className="grid grid-cols-5 gap-1">
            {primaryTabs.slice(0, 2).map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.value === active;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => router.push(tab.href)}
                  className={cn(
                    "flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-colors",
                    isActive ? "bg-background/40 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/25"
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    <Icon className={cn("h-4.5 w-4.5", isActive ? "text-primary" : "text-muted-foreground")} />
                  </span>
                  <span className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "font-medium")}>{tab.label}</span>
                </button>
              );
            })}
            <div className="flex h-14 items-center justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="glass-elevated border-transparent flex h-11 w-11 items-center justify-center rounded-full"
                  >
                    <Grid2x2 className="h-5 w-5 text-primary" />
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
                            "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center transition-colors",
                            isActive ? "bg-background/40 text-foreground" : "hover:bg-background/25 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "font-medium")}>{tab.label}</span>
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
                  className={cn(
                    "flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-colors",
                    isActive ? "bg-background/40 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/25"
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    <Icon className={cn("h-4.5 w-4.5", isActive ? "text-primary" : "text-muted-foreground")} />
                  </span>
                  <span className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "font-medium")}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
