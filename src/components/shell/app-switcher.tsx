'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Check, ChevronDown, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AppLogo } from '@/components/shell/app-logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getAppHref,
  getAppLabel,
  listAccessibleApps,
  resolveActiveApp,
  type CommunityAppId,
} from '@/lib/app-access';
import { persistLastApp } from '@/lib/persist-last-app';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const switcherTriggerClass =
  'flex h-11 min-w-11 items-center justify-center gap-0.5 rounded-xl px-1.5 transition-colors touch-manipulation text-muted-foreground hover:bg-muted/70 hover:text-foreground data-[state=open]:bg-primary/10 data-[state=open]:text-primary';

export function AppSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const accessible = listAccessibleApps(currentUser);
  const active = resolveActiveApp(pathname);
  const lastPersisted = useRef<CommunityAppId | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active || !currentUser?.uid) return;
    if (lastPersisted.current === active) return;
    lastPersisted.current = active;
    persistLastApp(active, currentUser.uid);
  }, [active, currentUser?.uid]);

  if (!currentUser || accessible.length === 0) return null;

  const displayApp = active ?? accessible[0];
  const displayLabel = displayApp ? getAppLabel(displayApp) : 'Apps';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(switcherTriggerClass, className)}
          aria-label={`Switch app — ${displayLabel}`}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {displayApp ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <AppLogo app={displayApp} size={32} fit="contain" />
            </span>
          ) : (
            <LayoutGrid className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {accessible.map((app) => {
          const href = getAppHref(app);
          const isActive = active === app;
          const label = getAppLabel(app);
          return (
            <DropdownMenuItem key={app} asChild>
              <Link
                href={href}
                onClick={() => {
                  persistLastApp(app, currentUser.uid);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5"
              >
                <AppLogo app={app} size={24} fit="contain" />
                <span className="flex-1 font-medium">{label}</span>
                {isActive ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
