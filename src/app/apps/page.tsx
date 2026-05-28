"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Home, BookOpen, BookCheck, ListChecks, Brain,
  Trophy, MessageCircle, CalendarDays, ClipboardList,
  Sparkles, SprayCan, Music, Library, Users, Lightbulb, User,
  Shield, Cpu
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader, FeedCard } from '@/components/ui/page-layout';

/* ── Animation variants ─────────────────────────────────── */

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/* ── App definitions ────────────────────────────────────── */

type AppItem = {
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;       // Tailwind background utility
  iconColor: string;   // Icon text color
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  requiresWorship?: boolean;
};

const appSections: { title: string; apps: AppItem[] }[] = [
  {
    title: "Core",
    apps: [
      {
        name: "Home",
        description: "Your personal dashboard",
        href: "/",
        icon: Home,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "Profile",
        description: "Settings & preferences",
        href: "/profile",
        icon: User,
        color: "bg-muted",
        iconColor: "text-foreground",
        requiresAuth: true,
      },
    ],
  },
  {
    title: "Bible Reading",
    apps: [
      {
        name: "Reading Plan",
        description: "Daily M'Cheyne checklist",
        href: "/bible-checklist",
        icon: BookCheck,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "Full Plan",
        description: "Complete yearly overview",
        href: "/full-plan",
        icon: ListChecks,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "Memory Verses",
        description: "Scripture memorization",
        href: "/memorize",
        icon: Brain,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "Community Progress",
        description: "Leaderboard & rankings",
        href: "/leaderboard",
        icon: Trophy,
        color: "bg-muted",
        iconColor: "text-foreground",
        requiresAuth: true,
      },
    ],
  },
  {
    title: "Communication",
    apps: [
      {
        name: "Chat",
        description: "Group conversations",
        href: "/chat",
        icon: MessageCircle,
        color: "bg-muted",
        iconColor: "text-foreground",
        requiresAuth: true,
      },
      {
        name: "Members",
        description: "Community directory",
        href: "/members",
        icon: Users,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
    ],
  },
  {
    title: "Dates & Rosters",
    apps: [
      {
        name: "Events",
        description: "Upcoming gatherings",
        href: "/events",
        icon: CalendarDays,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "QT Roster",
        description: "Quiet time schedule",
        href: "/qt",
        icon: ClipboardList,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "Cleaning Roster",
        description: "Duty assignments",
        href: "/cleaning-roster",
        icon: SprayCan,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
    ],
  },
  {
    title: "More",
    apps: [
      {
        name: "Worship Portal",
        description: "Setlists & chord sheets",
        href: "/worship",
        icon: Music,
        color: "bg-muted",
        iconColor: "text-foreground",
        requiresWorship: true,
      },
      {
        name: "Resources",
        description: "Media & downloads",
        href: "/media",
        icon: Library,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "Updates & Feedback",
        description: "Changelog & suggestions",
        href: "/feedback",
        icon: Lightbulb,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "Platform Info",
        description: "Architecture & tech",
        href: "/features",
        icon: Cpu,
        color: "bg-muted",
        iconColor: "text-foreground",
      },
      {
        name: "Admin",
        description: "System management",
        href: "/admin",
        icon: Shield,
        color: "bg-muted",
        iconColor: "text-foreground",
        requiresAdmin: true,
      },
    ],
  },
];

/* ── App Tile Component ─────────────────────────────────── */

function AppTile({ app, onClick }: { app: AppItem; onClick: () => void }) {
  return (
    <motion.button
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="flex flex-col items-center gap-3 group outline-none w-full"
    >
      <div className={`
        w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-[18px] sm:rounded-[20px]
        ${app.color}
        flex items-center justify-center
        border border-border/50
        transition-colors duration-300
        group-hover:bg-card
      `}>
        <app.icon className={`w-8 h-8 sm:w-9 sm:h-9 ${app.iconColor}`} strokeWidth={1.8} />
      </div>

      {/* Label */}
      <div className="text-center space-y-0.5 max-w-[90px]">
        <p className="text-xs sm:text-[13px] font-semibold text-foreground leading-tight truncate">
          {app.name}
        </p>
        <p className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium leading-tight line-clamp-1 hidden sm:block">
          {app.description}
        </p>
      </div>
    </motion.button>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function AppsPage() {
  const router = useRouter();
  const { currentUser, isAdmin, isWorshipTeam } = useAuth();

  const isVisible = (app: AppItem) => {
    if (app.requiresAdmin && !isAdmin) return false;
    if (app.requiresWorship && !isAdmin && !isWorshipTeam) return false;
    if (app.requiresAuth && !currentUser) return false;
    return true;
  };

  return (
    <div className="page-container max-w-4xl space-y-8">

        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
          <motion.div variants={fadeUp}>
            <PageHeader
              title="All Apps"
              action={
                <Button variant="ghost" onClick={() => router.back()} className="h-9 rounded-xl font-bold">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              }
            />
          </motion.div>

          {/* App sections */}
          {appSections.map((section) => {
            const visibleApps = section.apps.filter(isVisible);
            if (visibleApps.length === 0) return null;

            return (
              <motion.div key={section.title} variants={fadeUp} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-700 dark:text-zinc-300">
                    {section.title}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>

                <FeedCard className="py-4">
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-5 sm:gap-x-6 sm:gap-y-8"
                  >
                    {visibleApps.map((app) => (
                      <AppTile
                        key={app.href}
                        app={app}
                        onClick={() => router.push(app.href)}
                      />
                    ))}
                  </motion.div>
                </FeedCard>
              </motion.div>
            );
          })}

        </motion.div>
    </div>
  );
}
