
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
import { ImmersiveBackground } from './immersive-background';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import Footer from './footer';
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { Loader2, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChunkErrorListener } from './chunk-error-listener';
import { PWAInstallPrompt } from './pwa-install-prompt';
import { useFCMToken } from '@/hooks/use-fcm-token';
import { getMillis, isChatUnread } from '@/lib/notification-utils';

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

  useEffect(() => {
    setIsPageLoading(false);
  }, [pathname, setIsPageLoading]);

  useEffect(() => {
    if (currentUser && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        setShowPermissionBanner(true);
      }
    }
  }, [currentUser]);

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPermissionBanner(false);
      toast({
        title: "Notifications Enabled",
        description: "You're all set to receive updates!",
      });
    }
  };

  const totalUnreadCount = useMemo(() => {
    if (!currentUser) return 0;
    
    // 1. Unread Notifications (Alerts/Announcements)
    const unreadAlerts = notifications.filter(n => {
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        return !readBy.includes(currentUser.uid);
    }).length;

    // 2. Unread Chats
    const unreadChats = chats.filter(chat => isChatUnread(chat, currentUser.uid)).length;
    
    return unreadAlerts + unreadChats;
  }, [notifications, chats, currentUser]);

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
    // Only proceed if window is available, serviceWorker is supported, messaging is initialized, and user is logged in
    const isBrowser = typeof window !== 'undefined';
    const hasSW = isBrowser && 'serviceWorker' in navigator;
    
    if (hasSW && messaging && currentUser) {
      // Standardize on '/firebase-messaging-sw.js' for 100% Firebase & custom Push compatibility.
      const initPush = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          
          // Ensure we update the SW immediately when a new one is available
          registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                  installingWorker.onstatechange = () => {
                      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          console.log('[AppLayout] New SW version available. Refresh suggested.');
                      }
                  };
              }
          };
          
          console.log('[AppLayout] Master Worker registered successfully');
        } catch (error) {
          console.log('[AppLayout] Service worker registration failed:', error);
        }
      };
      initPush();

      const unsubscribe = onMessage(messaging as any, (payload) => {
        const title = payload.data?.title || 'New Sync Notification';
        const body = payload.data?.body || '';
        const link = payload.data?.link || '/';
        const tag = payload.data?.tag || 'community-update';

        // Logic for avoiding redundant notifications when user is already in the chat
        const isCurrentlyViewingThisChat = pathname === link;
        if (isCurrentlyViewingThisChat && link.startsWith('/chat/')) {
            return; // Skip notification
        }

        if (Notification.permission === 'granted' && title) {
          // Foreground: We rely on the toast below and the native browser behavior.
          // We DO NOT manually call showNotification here to prevent "Double Notifications"
          // while the app is active. The Service Worker handles the background banners.
        }

        // --- IN-APP TOAST ---
        // Only show if not already viewing the exact target
        if (!isCurrentlyViewingThisChat) {
            toast({
                title: title,
                description: body,
                className: "cursor-pointer hover:bg-muted/50 transition-colors",
                onClick: () => {
                   router.push(link);
                }
            });
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser, router, pathname, toast]);
  
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
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary/20" />
      </div>
    );
  }
  if (!currentUser) {
    return (
      <main role="main" className="flex-1 relative overflow-hidden h-svh flex flex-col">
        <ImmersiveBackground />
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            <div className="flex-grow flex flex-col">{children}</div>
            <Footer />
        </div>
      </main>
    );
  }
  return (
    <SidebarProvider defaultOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <ChunkErrorListener />
      <ImmersiveBackground />
      <Sidebar />
      <SidebarInset className="min-w-0 bg-transparent h-svh overflow-hidden flex flex-col">
        
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
            <Header />
            
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
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                                {children}
                            </motion.div>
                        )}
                        </div>
                    </main>
                <Footer />
            </div>
            </div>
            <PWAInstallPrompt />
        
        {/* User Gesture Notification Prompt */}
        {showPermissionBanner && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
            <motion.div 
               initial={{ y: 100, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="bg-primary p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Stay Updated</p>
                  <p className="text-white/80 text-xs">Enable push notifications.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPermissionBanner(false)}
                  className="px-3 py-1.5 text-xs text-white/60 hover:text-white font-medium transition-colors"
                >
                  Later
                </button>
                <button 
                  onClick={() => {
                    setShowPermissionBanner(false);
                    router.push('/profile');
                  }}
                  className="bg-white text-primary px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
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
