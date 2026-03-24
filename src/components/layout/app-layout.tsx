
"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import Footer from './footer';
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { Loader2 } from 'lucide-react';
import { ChunkErrorListener } from './chunk-error-listener';
import { PWAInstallPrompt } from './pwa-install-prompt';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const { currentUser, loadingAuth } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const isMobile = useIsMobile();
  
  const { notifications } = useNotifications();
  const { chats } = useChats();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useMotionValue(0);
  const scaleX = useSpring(scrollProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const isIndividualChat = pathname.startsWith('/chat/') && pathname !== '/chat';

  useEffect(() => {
    setIsPageLoading(false);
  }, [pathname, setIsPageLoading]);

  const totalUnreadCount = useMemo(() => {
    if (!currentUser) return 0;
    
    const unreadAlerts = notifications.filter(n => {
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        return !readBy.includes(currentUser.uid);
    }).length;

    const unreadChats = chats.filter(chat => {
      if (!chat.lastMessageSentAt || !chat.memberSeen || !chat.memberSeen[currentUser.uid] || !chat.lastMessageSenderId) return false;
      if (chat.lastMessageSenderId === currentUser.uid) return false;
      
      const lastSeen = chat.memberSeen[currentUser.uid];
      const lastSent = chat.lastMessageSentAt;

      const getMs = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.toMillis === 'function') return ts.toMillis();
          if (ts instanceof Date) return ts.getTime();
          if (ts._seconds) return ts._seconds * 1000;
          return 0;
      };

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
  }, []);

  useEffect(() => {
    if (hasMounted && currentUser) {
      updateNativeBadge(totalUnreadCount);
    }
  }, [totalUnreadCount, currentUser, hasMounted, updateNativeBadge]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isIndividualChat) {
        scrollProgress.set(0);
        return;
    }

    let ticking = false;
    const updateScroll = () => {
      const totalHeight = el.scrollHeight - el.clientHeight;
      if (totalHeight > 0) {
        const currentProgress = el.scrollTop / totalHeight;
        scrollProgress.set(currentProgress);
      } else {
        scrollProgress.set(0);
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    updateScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, [pathname, currentUser, scrollProgress, isIndividualChat]);

  useEffect(() => {
    const getInitialSidebarState = () => {
      if (typeof document === 'undefined') return true;
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('sidebar_state='))
        ?.split('=')[1];
      return cookieValue ? cookieValue === 'true' : true;
    };
    setIsSidebarOpen(getInitialSidebarState());
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
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && messaging && currentUser) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[AppLayout] SW registered:', registration.scope);
        }).catch((err) => {
          console.error('[AppLayout] SW registration failed:', err);
        });

      const unsubscribe = onMessage(messaging, (payload) => {
        const notificationTitle = payload.data?.title || 'New Community Sync';
        const link = payload.data?.link || '/';
        const notificationOptions = {
          body: payload.data?.body,
          icon: payload.data?.icon || '/icon.svg',
          data: { link },
          tag: payload.data?.tag || 'community-update'
        };

        if (Notification.permission === 'granted' && notificationTitle) {
          const notification = new Notification(notificationTitle, notificationOptions);
          notification.onclick = (event) => {
            event.preventDefault();
            router.push(link);
            window.focus();
            notification.close();
          };
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser, router, pathname]);
  
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
        <motion.div className="fixed top-0 left-0 right-0 h-1 bg-primary z-[100] origin-left" style={{ scaleX }} />
        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            <div className="flex-grow flex flex-col">{children}</div>
            <Footer />
        </div>
      </main>
    );
  }

  return (
    <SidebarProvider defaultOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <ChunkErrorListener />
      <Sidebar />
      <SidebarInset className="min-w-0 bg-transparent h-svh overflow-hidden flex flex-col">
        <ImmersiveBackground />
        <motion.div className="fixed top-0 left-0 right-0 h-1 bg-primary z-[100] origin-left" style={{ scaleX }} />
        
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
            <Header />
            
            <div className="flex-1 flex flex-col min-h-0 relative">
                <div 
                    ref={scrollRef} 
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
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
