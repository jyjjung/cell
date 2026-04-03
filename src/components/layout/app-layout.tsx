
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChunkErrorListener } from './chunk-error-listener';
import { PWAInstallPrompt } from './pwa-install-prompt';
import { useFCMToken } from '@/hooks/use-fcm-token';

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
  
  const { registerToken } = useFCMToken();
  const isIndividualChat = pathname.startsWith('/chat/') && pathname !== '/chat';

  useEffect(() => {
    setIsPageLoading(false);
  }, [pathname, setIsPageLoading]);

  const totalUnreadCount = useMemo(() => {
    if (!currentUser) return 0;
    
    // 1. Unread Notifications (Alerts/Announcements)
    const unreadAlerts = notifications.filter(n => {
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        return !readBy.includes(currentUser.uid);
    }).length;

    // 2. Unread Chats
    const unreadChats = chats.filter(chat => {
      // Basic validation
      if (!chat.lastMessageSentAt || !chat.lastMessageSenderId) return false;
      
      // Don't count if we were the last sender
      if (chat.lastMessageSenderId === currentUser.uid) return false;
      
      // Robust unread check: if we haven't seen it, or if most recent message is after our last seen
      const lastSeen = chat.memberSeen?.[currentUser.uid];
      const lastSent = chat.lastMessageSentAt;

      const getMs = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.toMillis === 'function') return ts.toMillis();
          if (ts instanceof Date) return ts.getTime();
          if (ts._seconds) return ts._seconds * 1000 + (ts._nanoseconds / 1000000);
          return 0;
      };

      // If we've never seen the chat (no lastSeen), it's unread if there's a message from someone else
      if (!lastSeen) return true;

      return getMs(lastSent) > getMs(lastSeen);
    }).length;
    
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
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SYNC_BADGE', count });
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
      const initPush = async () => {
        if (Notification.permission === 'default') {
          const p = await Notification.requestPermission();
          if (p === 'granted') {
              registerToken();
          }
        } else if (Notification.permission === 'granted') {
            registerToken();
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
          // Use the Service Worker registration to show the notification
          // This is more robust for PWAs and ensures it feels like a "device push"
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body,
              icon: payload.data?.icon || '/icon.svg',
              tag,
              data: { link },
              badge: '/icon.svg', // High-fidelity detail for Android/Chrome
            });
          });
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
            
            <div className="flex-1 flex flex-col min-h-0 relative">
                <div 
                    className={cn(
                        "flex-1 relative min-h-0", 
                        !isIndividualChat ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
                    )}
                >
                    <main role="main" className={cn("flex flex-col", isIndividualChat ? "h-full" : "min-h-full")}>
                        <div className={cn(
                            "flex-1 flex flex-col min-h-0",
                            isIndividualChat ? "w-full h-full p-0" : "container mx-auto px-6 md:px-12 lg:px-20 py-10 md:py-16"
                        )}>
                        {isIndividualChat ? children : (
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            >
                                {children}
                            </motion.div>
                        )}
                        </div>
                    </main>
                </div>
                <Footer />
            </div>
        </div>
        <PWAInstallPrompt />
      </SidebarInset>
    </SidebarProvider>
  );
}
