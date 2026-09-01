'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppSwitcher } from '@/components/shell/app-switcher';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function CommunityAppShell({
  title,
  children,
  onSignOut,
}: {
  title: string;
  children: React.ReactNode;
  onSignOut: () => void;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="app-header-bar">
          <Link href="/" className="min-w-0 truncate text-sm font-semibold tracking-tight">
            {title}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <AppSwitcher />
            <Button variant="ghost" size="sm" onClick={onSignOut} className="shrink-0">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

export function useCommunityAppGate({
  loginNext,
  allowed,
  redirectTo,
}: {
  loginNext: string;
  allowed: boolean;
  redirectTo: string;
}) {
  const router = useRouter();
  // caller runs useEffect with currentUser
  return {
    redirectIfNeeded(currentUser: unknown, loadingAuth: boolean) {
      if (!loadingAuth && !currentUser) {
        router.replace(`/login?next=${loginNext}`);
        return true;
      }
      if (!loadingAuth && currentUser && !allowed) {
        router.replace(redirectTo);
        return true;
      }
      return false;
    },
  };
}
