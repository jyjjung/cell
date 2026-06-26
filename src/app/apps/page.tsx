"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Home, BookCheck, ListChecks, Brain,
  Trophy, MessageCircle, CalendarDays, ClipboardList,
  SprayCan, Music, Library, Users, Lightbulb, User,
  Shield, Cpu
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { NavPageHeader, FeedCard } from '@/components/ui/page-layout';
import { translations } from '@/lib/translations';

type T = (typeof translations)['en'];

type AppItem = {
  nameKey: string;
  descKey: string;
  href: string;
  icon: React.ElementType;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  requiresWorship?: boolean;
};

function getAppSections(t: T): { titleKey: string; apps: AppItem[] }[] {
  return [
    {
      titleKey: 'appsSectionCore',
      apps: [
        { nameKey: 'home', descKey: 'appHomeDesc', href: '/', icon: Home },
        { nameKey: 'profile', descKey: 'appProfileDesc', href: '/profile', icon: User, requiresAuth: true },
      ],
    },
    {
      titleKey: 'appsSectionBible',
      apps: [
        { nameKey: 'readingPlan', descKey: 'appReadingPlanDesc', href: '/bible-checklist', icon: BookCheck },
        { nameKey: 'fullPlan', descKey: 'appFullPlanDesc', href: '/full-plan', icon: ListChecks },
        { nameKey: 'memoryVerses', descKey: 'appMemoryDesc', href: '/memorize', icon: Brain },
        { nameKey: 'communityProgress', descKey: 'appLeaderboardDesc', href: '/leaderboard', icon: Trophy, requiresAuth: true },
      ],
    },
    {
      titleKey: 'appsSectionCommunication',
      apps: [
        { nameKey: 'chat', descKey: 'appChatDesc', href: '/chat', icon: MessageCircle, requiresAuth: true },
        { nameKey: 'members', descKey: 'appMembersDesc', href: '/members', icon: Users },
      ],
    },
    {
      titleKey: 'appsSectionRosters',
      apps: [
        { nameKey: 'events', descKey: 'appEventsDesc', href: '/events', icon: CalendarDays },
        { nameKey: 'qtRoster', descKey: 'appQTDesc', href: '/qt', icon: ClipboardList },
        { nameKey: 'cleaningRoster', descKey: 'appCleaningDesc', href: '/cleaning-roster', icon: SprayCan },
      ],
    },
    {
      titleKey: 'appsSectionMore',
      apps: [
        { nameKey: 'worshipPortal', descKey: 'appWorshipDesc', href: '/worship', icon: Music, requiresWorship: true },
        { nameKey: 'links', descKey: 'appResourcesDesc', href: '/media', icon: Library },
        { nameKey: 'feedback', descKey: 'appFeedbackDesc', href: '/feedback', icon: Lightbulb },
        { nameKey: 'features', descKey: 'appFeaturesDesc', href: '/features', icon: Cpu },
        { nameKey: 'admin', descKey: 'appAdminDesc', href: '/admin', icon: Shield, requiresAdmin: true },
      ],
    },
  ];
}

function AppTile({ name, description, icon: Icon, onClick }: { name: string; description: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 group outline-none w-full"
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-muted flex items-center justify-center border border-border/50 group-hover:bg-card transition-colors">
        <Icon className="w-7 h-7 text-foreground" strokeWidth={1.8} />
      </div>
      <div className="text-center stack-gap-sm max-w-[88px]">
        <p className="text-xs font-semibold text-foreground leading-tight truncate w-full">{name}</p>
        <p className="text-micro-label leading-tight line-clamp-1 hidden sm:block">{description}</p>
      </div>
    </motion.button>
  );
}

export default function AppsPage() {
  const router = useRouter();
  const { currentUser, isAdmin, isWorshipTeam } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const appSections = getAppSections(t);

  const isVisible = (app: AppItem) => {
    if (app.requiresAdmin && !isAdmin) return false;
    if (app.requiresWorship && !isAdmin && !isWorshipTeam) return false;
    if (app.requiresAuth && !currentUser) return false;
    return true;
  };

  return (
    <div className="page-container">
      <NavPageHeader
        action={
          <Button variant="ghost" onClick={() => router.back()} className="h-8 rounded-lg text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
          </Button>
        }
      />

      {appSections.map((section) => {
        const visibleApps = section.apps.filter(isVisible);
        if (visibleApps.length === 0) return null;
        const sectionTitle = t[section.titleKey as keyof T] as string;

        return (
          <section key={section.titleKey} className="stack-gap-sm">
            <div className="panel-header mb-0">
              <h2 className="text-section-title text-base">{sectionTitle}</h2>
            </div>
            <FeedCard className="py-3">
              <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-5 sm:gap-x-4">
                {visibleApps.map((app) => (
                  <AppTile
                    key={app.href}
                    name={t[app.nameKey as keyof T] as string}
                    description={t[app.descKey as keyof T] as string}
                    icon={app.icon}
                    onClick={() => router.push(app.href)}
                  />
                ))}
              </div>
            </FeedCard>
          </section>
        );
      })}
    </div>
  );
}
