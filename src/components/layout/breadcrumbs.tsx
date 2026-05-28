"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

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
  '/leaderboard': 'Community Progress',
  '/announcements': 'Announcements',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/admin': 'Admin',
  '/worship': 'Worship Portal',
  '/media': 'Resources',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const pathsegments = pathname.split('/').filter(Boolean);

  const crumbs = React.useMemo(() => {
    const items = [{ href: '/', label: 'Home', icon: Home }];
    let currentPath = '';

    pathsegments.forEach((segment) => {
      currentPath += `/${segment}`;
      let label = routeLabels[currentPath];

      if (!label && currentPath.startsWith('/chat/') && segment.length > 5) {
        label = 'Conversation';
      }

      items.push({
        href: currentPath,
        label: label || segment.charAt(0).toUpperCase() + segment.slice(1)
      } as any);
    });

    return items;
  }, [pathsegments]);

  if (pathname === '/') return null;

  // Mobile: show only current page name + back button
  if (isMobile) {
    const parentCrumb = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;
    const currentCrumb = crumbs[crumbs.length - 1];
    const showBackButton = pathsegments.length > 1;

    return (
      <nav aria-label="Breadcrumb" className="flex items-center">
        {showBackButton && parentCrumb && (
          <motion.button
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.back()}
            className="glass-thin flex items-center gap-1 h-9 px-2 rounded-xl text-muted-foreground hover:text-foreground transition-all active:scale-95"
            aria-label={`Back to ${parentCrumb.label}`}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
          </motion.button>
        )}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn("text-sm font-bold text-foreground", showBackButton ? "ml-1" : "ml-0.5")}
        >
          {currentCrumb.label}
        </motion.span>
      </nav>
    );
  }

  // Desktop: full breadcrumbs trail
  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <motion.li
              key={crumb.href}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-1.5"
            >
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
              )}

              <Link
                href={crumb.href}
                className={cn(
                  "glass-thin text-xs font-bold uppercase tracking-wider transition-all hover:text-primary active:scale-95 px-1 py-0.5 rounded-md border-transparent",
                  isLast
                    ? "text-foreground"
                    : "text-muted-foreground/60 hover:bg-background/35"
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {index === 0 ? <Home className="h-3.5 w-3.5" /> : crumb.label}
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}
