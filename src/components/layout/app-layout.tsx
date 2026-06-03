
"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import { useAuth } from '@/contexts/auth-context';
import { usePageLoading } from '@/contexts/page-loading-context';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Footer from './footer';
import { Bell } from 'lucide-react';
import { PWAInstallPrompt } from './pwa-install-prompt';
import { CommandMenu } from './command-menu';
import ReadingsHubTabs from '@/components/readings/readings-hub-tabs';
import ScheduleHubTabs from '@/components/schedule/schedule-hub-tabs';
import AdminHubTabs from '@/components/admin/admin-hub-tabs';
import { useGrantSecretAchievement } from '@/hooks/use-grant-secret-achievement';
import { AuthenticatedAppChrome } from './authenticated-app-chrome';

const DynamicLakeWallpaper = dynamic(() => import('./dynamic-lake-wallpaper'), {
  ssr: false,
});

function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <main role="main" className="flex-1 relative overflow-hidden h-svh flex flex-col bg-background">
      <DynamicLakeWallpaper />
      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        <div className="flex-grow flex flex-col">{children}</div>
        <Footer />
      </div>
    </main>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentUser, loadingAuth } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const isIndividualChat = pathname.startsWith('/chat/') && pathname !== '/chat';

  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const hour = new Date().getHours();
  const isSunday = new Date().getDay() === 0;
  useGrantSecretAchievement('midnight', !!currentUser && !loadingAuth && hour === 0);
  useGrantSecretAchievement('early-bird', !!currentUser && !loadingAuth && hour >= 5 && hour < 7);
  useGrantSecretAchievement('sunday', !!currentUser && !loadingAuth && isSunday);
  useGrantSecretAchievement('command-menu', !!currentUser && !loadingAuth && commandMenuOpen);
  const showReadingsTabs =
    pathname.startsWith('/bible-checklist') ||
    pathname.startsWith('/full-plan') ||
    pathname.startsWith('/memorize') ||
    pathname.startsWith('/leaderboard');
  const showScheduleTabs =
    pathname.startsWith('/events') ||
    pathname.startsWith('/qt') ||
    pathname.startsWith('/cleaning-roster');
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

  if (!currentUser) {
    return <GuestShell>{children}</GuestShell>;
  }

  return (
    <SidebarProvider defaultOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <AuthenticatedAppChrome currentUser={currentUser} />
      <Sidebar />
      <SidebarInset className="min-w-0 bg-background h-svh overflow-hidden flex flex-col">
        <DynamicLakeWallpaper />

        <div className="flex-1 flex flex-col min-h-0 relative z-10">
          <Header onOpenCommandMenu={() => setCommandMenuOpen(true)} />
          <CommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />

          <div
            className={cn(
              'flex-1 relative min-h-0',
              !isIndividualChat ? 'overflow-y-auto overflow-x-hidden p-0' : 'overflow-hidden'
            )}
          >
            <main role="main" className={cn('flex flex-col', isIndividualChat ? 'h-full' : 'min-h-full')}>
              <div
                className={cn('flex-1 flex flex-col min-h-0', isIndividualChat ? 'w-full h-full p-0' : '')}
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
            <Footer />
          </div>
        </div>
        {showReadingsTabs && <ReadingsHubTabs />}
        {showScheduleTabs && <ScheduleHubTabs />}
        {showAdminTabs && <AdminHubTabs />}
        <PWAInstallPrompt />

        {showPermissionBanner && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass-elevated p-4 rounded-2xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="glass-thin p-2 rounded-xl">
                  <Bell className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-bold text-sm">Stay Updated</p>
                  <p className="text-muted-foreground text-xs">Enable push notifications.</p>
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
                  className="glass-thin px-4 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
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
