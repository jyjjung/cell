
"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import { useAuth } from '@/contexts/auth-context';
import { usePageLoading } from '@/contexts/page-loading-context';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Footer from './footer';
import { Bell, Loader2 } from 'lucide-react';
import { PWAInstallPrompt } from './pwa-install-prompt';

import { CommandMenu } from './command-menu';
import ReadingsHubTabs from '@/components/readings/readings-hub-tabs';
import ScheduleHubTabs from '@/components/schedule/schedule-hub-tabs';
import AdminHubTabs from '@/components/admin/admin-hub-tabs';
import { AuthenticatedAppChrome } from './authenticated-app-chrome';
import { SetlistPlaylistBar } from '@/components/worship/SetlistPlaylistBar';
import { useChatVisualViewportVars } from '@/hooks/use-chat-visual-viewport-vars';
import { useIsMobile } from '@/hooks/use-mobile';

function GuestShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <main role="main" className="flex-1 relative overflow-hidden h-svh flex flex-col bg-background">
      <div className="relative z-10 flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <div className={cn('flex-grow flex flex-col', !isLanding && 'page-shell')}>{children}</div>
      </div>
      <Footer />
    </main>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentUser, hasSession, loadingAuth } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const chatSubpath = pathname.startsWith('/chat/') ? pathname.split('/')[2] : null;
  const isChatListSubpage = chatSubpath === 'photos' || chatSubpath === 'links';
  const isIndividualChat = !!chatSubpath && !isChatListSubpage;
  const isMobile = useIsMobile();
  // iOS keyboard shell lock is mobile-only — desktop must keep the normal sidebar layout.
  const lockChatShell = isIndividualChat && isMobile;

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
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const showReadingsTabs =
    pathname.startsWith('/bible-checklist') ||
    pathname.startsWith('/full-plan') ||
    pathname.startsWith('/memorize') ||
    pathname.startsWith('/leaderboard');
  const showScheduleTabs =
    pathname.startsWith('/events') ||
    pathname.startsWith('/qt') ||
    pathname.startsWith('/cleaning-roster') ||
    pathname.startsWith('/rosters');
  const showAdminTabs = pathname.startsWith('/admin');

  useEffect(() => {
    setIsPageLoading(false);
  }, [pathname, setIsPageLoading]);

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
      const isProfileRoute = pathname === '/profile';

      if (!isApproved && !isQuarantineRoute && !isProfileRoute) {
        router.push('/pending-approval');
      } else if (isApproved && isQuarantineRoute) {
        router.push('/');
      }
    }
  }, [currentUser, loadingAuth, pathname, router]);

  if (!hasSession) {
    if (loadingAuth) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        </div>
      );
    }
    return <GuestShell>{children}</GuestShell>;
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <AuthenticatedAppChrome currentUser={currentUser} />
      <Sidebar />
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
          <Header onOpenCommandMenu={() => setCommandMenuOpen(true)} pinStatic={lockChatShell} />
          <CommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />

          <div
            className={cn(
              'flex flex-1 flex-col min-h-0',
              !isIndividualChat ? 'overflow-y-auto overflow-x-hidden p-0 relative' : 'overflow-hidden'
            )}
          >
            <main
              role="main"
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
                  <motion.div
                    key={pathname}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="page-shell"
                  >
                    {children}
                  </motion.div>
                )}
              </div>
            </main>
          </div>
          <Footer />
        </div>
        {showReadingsTabs && <ReadingsHubTabs />}
        {showScheduleTabs && <ScheduleHubTabs />}
        {showAdminTabs && <AdminHubTabs />}
        <PWAInstallPrompt />

        <SetlistPlaylistBar />

        {showPermissionBanner && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="notice-surface flex items-center justify-between gap-4 p-4"
            >
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
                <button
                  onClick={handleDismissBanner}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={() => {
                    setShowPermissionBanner(false);
                    router.push('/profile');
                  }}
                  className="bg-primary px-4 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground active:scale-95 transition-all"
                >
                  Set Up
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
