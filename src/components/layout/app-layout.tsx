"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Sidebar from './sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import { OfflineBanner } from './offline-banner';
import { useAuth } from '@/contexts/auth-context';
import {
  isAccountsAppPath,
  isCellAppPath,
  isShellPath,
} from '@/lib/app-access';
import { usePageLoading } from '@/contexts/page-loading-context';
import { cn } from '@/lib/utils';
import Footer from './footer';
import { Bell } from 'lucide-react';
import { PWAInstallPrompt } from './pwa-install-prompt';
import { Button } from '@/components/ui/button';
import { AuthenticatedAppChrome } from './authenticated-app-chrome';
import { NdcpcUnreadProvider } from '@/contexts/ndcpc-unread-context';
import { CellBibleReaderShell } from '@/components/bible/cell-bible-reader-shell';
import { useChatVisualViewportVars } from '@/hooks/use-chat-visual-viewport-vars';
import { useClientSearchParams } from '@/hooks/use-client-search-params';
import { useIsMobile } from '@/hooks/use-mobile';

const InboxSheetLazy = dynamic(
  () => import('@/components/inbox/AppInboxSheet').then((m) => m.AppInboxSheet),
  { ssr: false },
);
const SetlistPlaylistBarLazy = dynamic(
  () => import('@/components/worship/SetlistPlaylistBar').then((m) => m.SetlistPlaylistBar),
  { ssr: false },
);
const ReadingsHubTabsLazy = dynamic(
  () => import('@/components/readings/readings-hub-tabs'),
  { ssr: false },
);
const ScheduleHubTabsLazy = dynamic(
  () => import('@/components/schedule/schedule-hub-tabs'),
  { ssr: false },
);

function GuestShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
    <main role="main" id="main-content" className="flex-1 relative overflow-hidden h-svh flex flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex justify-center">
        <div className="pointer-events-auto">
          <OfflineBanner />
        </div>
      </div>
      <div className="relative z-10 flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <div className={cn('flex-grow flex flex-col', !isLanding && 'page-shell')}>{children}</div>
      </div>
      <Footer />
    </main>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useClientSearchParams();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentUser, hasSession, loadingAuth, initialSessionCookie } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const chatSubpath = pathname.startsWith('/chat/')
    ? pathname.split('/')[2]
    : pathname.startsWith('/cell/chat/')
      ? pathname.split('/')[3]
      : null;
  const ndcpcChatSubpath = pathname.startsWith('/ndcpc/chat/') ? pathname.split('/')[3] : null;
  const isChatListSubpage = chatSubpath === 'photos' || chatSubpath === 'links';
  const isIndividualChat =
    (!!chatSubpath && !isChatListSubpage) || Boolean(ndcpcChatSubpath);
  const isMobile = useIsMobile();
  // iOS keyboard shell lock is mobile-only — desktop must keep the normal sidebar layout.
  const lockChatShell =
    isIndividualChat
    && isMobile
    && (isCellAppPath(pathname) || pathname.startsWith('/ndcpc/chat/'));

  useEffect(() => {
    const root = document.documentElement;
    if (lockChatShell) {
      root.dataset.chatDetail = 'true';
    } else {
      delete root.dataset.chatDetail;
    }
    return () => {
      delete root.dataset.chatDetail;
    };
  }, [lockChatShell]);

  useChatVisualViewportVars(lockChatShell);

  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const showReadingsTabs =
    pathname.startsWith('/bible-checklist') ||
    pathname.startsWith('/leaderboard');
  const showScheduleTabs =
    pathname.startsWith('/events') ||
    pathname.startsWith('/qt') ||
    pathname.startsWith('/cleaning-roster') ||
    pathname.startsWith('/rosters');
  const isShellRoute = isShellPath(pathname);

  const search = searchParams.toString();
  useEffect(() => {
    setIsPageLoading(false);
  }, [pathname, search, setIsPageLoading]);

  useEffect(() => {
    if (currentUser && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const dismissed = localStorage.getItem('pushBannerDismissed');
        if (!dismissed) {
          const timer = setTimeout(() => setShowPermissionBanner(true), 10000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [currentUser]);

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    localStorage.setItem('pushBannerDismissed', 'true');
  };

  useEffect(() => {
    if (!loadingAuth && currentUser) {
      const isApproved = currentUser.isApproved || currentUser.isAdmin;
      const isQuarantineRoute = pathname === '/pending-approval';
      const isAccountsRoute = isAccountsAppPath(pathname);
      const isProfileRoute = pathname === '/profile';

      if (!isApproved && !isQuarantineRoute && !isProfileRoute && !isAccountsRoute) {
        router.push('/pending-approval');
      } else if (isApproved && isQuarantineRoute) {
        router.push('/');
      }
    }
  }, [currentUser, loadingAuth, pathname, router]);

  // Cookie hint from the server: only block with a skeleton when we expect a restore.
  // Guests (no cookie) paint immediately — better FCP/LCP on landing and auth pages.
  if (!hasSession) {
    if (loadingAuth && initialSessionCookie) {
      return (
        <div className="flex min-h-svh flex-col bg-background">
          <div className="h-14 border-b border-border/40 bg-background/80" />
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-muted/50" />
            <div className="h-32 animate-pulse rounded-2xl bg-muted/30" />
            <div className="h-32 animate-pulse rounded-2xl bg-muted/25" />
          </div>
        </div>
      );
    }
    return <GuestShell>{children}</GuestShell>;
  }

  if (isShellRoute) {
    return <>{children}</>;
  }

  if (!currentUser) {
    // Session exists but profile still hydrating (cold cache) — light chrome stub.
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <div className="h-14 border-b border-border/40 bg-background/80" />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted/30" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted/25" />
        </div>
      </div>
    );
  }

  return (
    <CellBibleReaderShell>
    <NdcpcUnreadProvider>
    <SidebarProvider defaultOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <AuthenticatedAppChrome currentUser={currentUser} />
      <Sidebar />
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <SidebarInset
        data-chat-shell={lockChatShell ? '' : undefined}
        className={cn(
          'min-w-0 bg-background overflow-hidden flex flex-col',
          // Always give chat routes a real viewport height. Mobile CSS may override
          // with --chat-vv-height; desktop keeps the sidebar layout.
          isIndividualChat ? 'h-svh min-h-0' : 'h-svh min-h-svh',
        )}
      >
        <div className="flex flex-1 flex-col min-h-0">
          {!isIndividualChat ? <Header pinStatic={lockChatShell} /> : null}
          <InboxSheetLazy />

          <div
            className={cn(
              'flex flex-1 flex-col min-h-0',
              !isIndividualChat ? 'overflow-y-auto overflow-x-hidden p-0 relative' : 'overflow-hidden'
            )}
          >
            <main
              role="main"
              id="main-content"
              className={cn(
                'flex flex-col min-h-0',
                isIndividualChat ? 'flex-1' : 'min-h-full',
              )}
            >
              <div
                className={cn(
                  'flex flex-col min-h-0',
                  isIndividualChat ? 'flex-1 w-full' : 'flex-1',
                )}
              >
                {isIndividualChat ? (
                  children
                ) : (
                  <div className="page-shell">{children}</div>
                )}
              </div>
            </main>
          </div>
          <Footer />
        </div>
        {showReadingsTabs && <ReadingsHubTabsLazy />}
        {showScheduleTabs && <ScheduleHubTabsLazy />}
        <PWAInstallPrompt />

        <SetlistPlaylistBarLazy />

        {showPermissionBanner && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
            <div className="flex animate-permission-banner items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Bell className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-semibold text-sm">Turn on notifications</p>
                  <p className="text-muted-foreground text-xs">Get alerts for chat and duties.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDismissBanner}
                  className="text-muted-foreground"
                >
                  Later
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowPermissionBanner(false);
                    router.push('/accounts?tab=notifications');
                  }}
                >
                  Set Up
                </Button>
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
    </NdcpcUnreadProvider>
    </CellBibleReaderShell>
  );
}
