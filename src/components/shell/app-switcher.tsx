'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppLogo } from '@/components/shell/app-logo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getAppHref,
  getAppLabel,
  listAccessibleApps,
  resolveActiveApp,
  type CommunityAppId,
} from '@/lib/app-access';
import { persistLastApp } from '@/lib/persist-last-app';
import { cn } from '@/lib/utils';

export function AppSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const accessible = listAccessibleApps(currentUser);
  const active = resolveActiveApp(pathname);
  const lastPersisted = useRef<CommunityAppId | null>(null);

  // Remember wherever you actually are — not only when clicking the switcher.
  useEffect(() => {
    if (!active || !currentUser?.uid) return;
    if (lastPersisted.current === active) return;
    lastPersisted.current = active;
    persistLastApp(active, currentUser.uid);
  }, [active, currentUser?.uid]);

  if (!currentUser || accessible.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex items-center gap-0.5 rounded-xl border border-border/60 bg-muted/40 p-0.5',
          className,
        )}
        role="navigation"
        aria-label="Switch app"
      >
        {accessible.map((app) => {
          const href = getAppHref(app);
          const isActive = active === app;
          const label = getAppLabel(app);
          return (
            <Tooltip key={app}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  onClick={() => persistLastApp(app, currentUser.uid)}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors sm:px-2 sm:py-1.5',
                    isActive
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                  )}
                >
                  <AppLogo app={app} size={22} className="rounded-lg" />
                  <span className="hidden md:inline text-xs font-medium">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="md:hidden">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
