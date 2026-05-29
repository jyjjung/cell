
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import { useAuth } from '@/contexts/auth-context';
import { messaging } from '@/lib/firebase';
import { usePageLoading } from '@/contexts/page-loading-context';
import { onMessage } from 'firebase/messaging';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import Footer from './footer';
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { Loader2, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PWAInstallPrompt } from './pwa-install-prompt';
import { useFCMToken } from '@/hooks/use-fcm-token';
import { getMillis, isChatUnread } from '@/lib/notification-utils';
import { CommandMenu } from './command-menu';
import DynamicLakeWallpaper from './dynamic-lake-wallpaper';
import ReadingsHubTabs from '@/components/readings/readings-hub-tabs';
import ScheduleHubTabs from '@/components/schedule/schedule-hub-tabs';
import AdminHubTabs from '@/components/admin/admin-hub-tabs';
import { useGrantSecretAchievement } from '@/hooks/use-grant-secret-achievement';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const { currentUser, loadingAuth } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const { notifications } = useNotifications();
  const { chats } = useChats();
  
  const { registerToken, requestPermission } = useFCMToken();
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
        // Only show if user hasn't permanently dismissed it
        const dismissed = localStorage.getItem('pushBannerDismissed');
        if (!dismissed) {
          // Delay 10 seconds so user settles in first
          const timer = setTimeout(() => setShowPermissionBanner(true), 10000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [currentUser]);

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPermissionBanner(false);
      localStorage.setItem('pushBannerDismissed', 'true');
      toast({
        title: "Notifications Enabled",
        description: "You're all set to receive updates!",
      });
    }
  };

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    localStorage.setItem('pushBannerDismissed', 'true');
  };

  const totalUnreadCount = useMemo(() => {
    if (!currentUser) return 0;
    
    // 1. Unread Notifications (Alerts/Announcements)
    const unreadNotifs = notifications.filter(n => {
      const readBy = Array.isArray(n.readBy) ? n.readBy : [];
      return !readBy.includes(currentUser.uid);
    }).length;

    // 2. Unread Chats (matching server-side calculateTotalUnread for badge consistency)
    const unreadChatCount = chats.filter(chat => {
      if (pathname === `/chat/${chat.id}`) return false;
      return isChatUnread(chat, currentUser.uid);
    }).length;

    return unreadNotifs + unreadChatCount;
  }, [notifications, chats, currentUser, pathname]);

  const updateNativeBadge = React.useCallback((count: number) => {
    if (typeof window !== 'undefined' && 'setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch((e: any) => console.warn('App Badge API Error:', e));
      } else {
        (navigator as any).clearAppBadge().catch((e: any) => console.warn('App Badge API Error:', e));
      }
    }
  }, []);

  useEffect(() => {
    if (hasMounted && currentUser) {
      updateNativeBadge(totalUnreadCount);
      
      const baseTitle = "em.";
      if (totalUnreadCount > 0) {
        document.title = `(${totalUnreadCount}) ${baseTitle}`;
      } else {
        document.title = baseTitle;
      }
    }
  }, [totalUnreadCount, currentUser, hasMounted, updateNativeBadge]);
  useEffect(() => {
    setIsSidebarOpen(true);
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && !loadingAuth && currentUser) {
        const isApproved = currentUser.isApproved || currentUser.isAdmin;
        const isQuarantineRoute = pathname === '/pending-approval';
        const isProfileRoute = pathname === '/profile';

        if (!isApproved && !isQuarantineRoute && !isProfileRoute) {
            router.push('/pending-approval');
        } else if (isApproved && isQuarantineRoute) {
            router.push('/');
        }
    }
  }, [currentUser, loadingAuth, hasMounted, pathname, router]);
  
  useEffect(() => {
    // Foreground messaging: show native notification via SW (not toast).
    // This fires when the app is OPEN. When closed, onBackgroundMessage in
    // firebase-messaging-sw.js handles it.
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && messaging && currentUser) {
      const unsubscribe = onMessage(messaging as any, (payload) => {
        const title = payload.data?.title || 'New Notification';
        const body = payload.data?.body || '';
        const link = payload.data?.link || '/';
        const tag = payload.data?.tag || 'community-update';

        // Suppress if the user is already viewing this exact chat
        const isCurrentlyViewingThisChat = pathname === link && link.startsWith('/chat/');
        if (isCurrentlyViewingThisChat) return;

        // Show native notification via service worker (works on iOS PWA + all browsers)
        // new Notification() is silently blocked in SW-controlled pages
        if (Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body,
              icon: payload.data?.icon || '/icon.svg',
              tag,
              data: { link },
            });
          }).catch(() => {});
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser, pathname]);
  
  // Foreground Heartbeat: Re-register token on visibility change to catch iOS rotations
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        console.log('[AppLayout] Foreground Heartbeat: Refreshing push registration');
        registerToken(true); // Forced refresh
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUser, registerToken]);
  
  if (loadingAuth || !hasMounted) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-8 text-center space-y-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary/20" />
      </div>
    );
  }
  if (!currentUser) {
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
  return (
    <SidebarProvider defaultOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <Sidebar />
      <SidebarInset className="min-w-0 bg-background h-svh overflow-hidden flex flex-col">
        <DynamicLakeWallpaper />
        
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <Header onOpenCommandMenu={() => setCommandMenuOpen(true)} />
        <CommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />
            
                <div 
                    className={cn(
                        "flex-1 relative min-h-0", 
                        !isIndividualChat ? "overflow-y-auto overflow-x-hidden p-0" : "overflow-hidden"
                    )}
                >
                    <main role="main" className={cn("flex flex-col", isIndividualChat ? "h-full" : "min-h-full")}>
                        <div className={cn(
                            "flex-1 flex flex-col min-h-0",
                            isIndividualChat ? "w-full h-full p-0" : ""
                        )}>
                        {isIndividualChat ? children : (
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
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
        
        {/* User Gesture Notification Prompt */}
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
                  onClick={() => handleDismissBanner()}
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
