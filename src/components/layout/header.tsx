"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/chat': 'Chat',
  '/bible-checklist': 'Reading Plan',
  '/full-plan': 'Full Plan',
  '/memorize': 'Memory Verses',
  '/members': 'Members',
  '/events': 'Events',
  '/qt': 'QT Roster',
  '/cleaning-roster': 'Cleaning Roster',
  '/rosters': 'Rosters',
  '/leaderboard': 'Community Progress',
  '/announcements': 'Announcements',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/admin': 'Admin',
};

export default function Header() {
  const pathname = usePathname();

  const label = Object.entries(routeLabels)
    .find(([key]) => key === '/' ? pathname === '/' : pathname.startsWith(key))?.[1]
    ?? '';

  return (
    <header className="sticky top-0 z-40 w-full md:hidden">
      <div className="flex h-14 items-center gap-3 px-4 bg-background/60 backdrop-blur-xl border-b border-border/30">
        <SidebarTrigger className="h-9 w-9 rounded-xl" />
        {label && (
          <motion.p
            key={pathname}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="text-sm font-semibold text-foreground/80 tracking-tight"
          >
            {label}
          </motion.p>
        )}
      </div>
    </header>
  );
}
