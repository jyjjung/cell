
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LogIn, UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  cellPath,
  getAppHref,
  resolveActiveApp,
} from '@/lib/app-access';
import { getSidebarNavForApp } from '@/lib/app-sidebar-nav';
import { AppLogo } from '@/components/shell/app-logo';
import { useAuth } from '@/contexts/auth-context';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageLoading } from '@/contexts/page-loading-context';

import { useChats } from '@/hooks/useChats';
import { usePrayerRequestBadge } from '@/hooks/use-prayer-request-badge';
import { useNdcpcUnread } from '@/contexts/ndcpc-unread-context';
import { translations } from '@/lib/translations';
import { sumChatUnreadMessageCounts } from '@/lib/notification-utils';
import { chatBelongsToApp } from '@/lib/chat-utils';
import { Button } from '../ui/button';

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, isWorshipTeam, loadingAuth } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const { setIsPageLoading } = usePageLoading();

  const { chats } = useChats();
  const { unreadCount: unreadPrayerRequests, isShepherd } = usePrayerRequestBadge();
  const { prayerUnread: ndcpcPrayerUnread } = useNdcpcUnread();

  const t = translations[currentUser?.preferredLanguage || 'en'];
  const activeApp = resolveActiveApp(pathname) ?? 'cell';
  const appHome = getAppHref(activeApp);

  useEffect(() => { setIsMounted(true); }, []);


  const unreadChats = useMemo(() => {
    if (!currentUser || !chats) return 0;
    return sumChatUnreadMessageCounts(
      chats.filter((chat) => chatBelongsToApp(chat, 'cell')),
      currentUser.uid,
      (chat) => pathname === `/cell/chat/${chat.id}` || pathname === `/chat/${chat.id}`,
    );
  }, [chats, currentUser, pathname]);

  const navigate = (path: string) => {
    const nextPathname = path.split(/[?#]/)[0];
    if (pathname !== nextPathname) setIsPageLoading(true);
    setOpenMobile(false);
    router.push(path);
  };

  const navItems = useMemo(() => {
    const items = getSidebarNavForApp(activeApp, {
      isAdmin,
      isWorshipTeam,
      labels: {
        home: t.home,
        readingPlan: t.readingPlan,
        chat: t.chat,
        schedule: t.schedule,
        worshipPortal: t.worshipPortal,
        links: t.links,
        docs: t.docs,
        forms: t.forms,
        members: t.members,
        prayerRequests: t.prayerRequests,
        feedback: t.feedback,
        profile: t.profile,
        appearance: t.appearance,
        notifications: t.notifications,
      },
    });

    return items.map((item) => {
      let badge: number | undefined;
      if (activeApp === 'cell' && item.href === cellPath('/chat')) {
        badge = unreadChats;
      } else if (activeApp === 'cell' && item.href === cellPath('/prayer-requests')) {
        badge = isShepherd ? unreadPrayerRequests : undefined;
      } else if (activeApp === 'ndcpc' && item.badgeKey === 'chat') {
        const roleUnread = currentUser
          ? sumChatUnreadMessageCounts(
              chats.filter((chat) => chatBelongsToApp(chat, 'ndcpc')),
              currentUser.uid,
              (chat) => pathname === `/ndcpc/chat/${chat.id}`,
            )
          : 0;
        badge = roleUnread;
      } else if (activeApp === 'ndcpc' && item.badgeKey === 'prayer') {
        badge = ndcpcPrayerUnread;
      }
      return { ...item, badge };
    });
  }, [
    activeApp,
    isAdmin,
    isWorshipTeam,
    t,
    unreadChats,
    isShepherd,
    unreadPrayerRequests,
    chats,
    currentUser,
    ndcpcPrayerUnread,
  ]);

  const isNavActive = (href: string) => {
    if (activeApp === 'accounts') {
      const tab = href.split('tab=')[1]?.split('&')[0];
      const currentTab =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('tab') ?? 'profile'
          : 'profile';
      return tab === currentTab;
    }
    if (href === appHome) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar collapsible="icon" className="app-sidebar">
      {/* Logo */}
      <SidebarHeader className="app-sidebar-header">
        <Link href={appHome} onClick={() => navigate(appHome)}
          className="flex h-full items-center justify-start transition-all active:scale-95">
          <div className="h-8 w-8 shrink-0">
            <AppLogo app={activeApp} size={32} fit="contain" />
          </div>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-1.5 py-1.5 gap-1">
        {!isMounted || loadingAuth ? (
            <div className="space-y-1 p-1" aria-busy="true" aria-live="polite" aria-label="Loading navigation">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
        ) : (
          <SidebarMenu className="gap-0.5 p-1">
            {navItems.map(item => {
              if (item.requiresAuth && !currentUser) return null;
              const active = isNavActive(item.href);

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.label}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "h-9 rounded-lg px-3 text-[13px] font-medium transition-colors gap-2.5 focus-visible:ring-2 focus-visible:ring-ring/50",
                      active
                        ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground [&>svg]:text-primary"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
                    )}
                  >
                    <Link href={item.href}>
                      {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <SidebarMenuBadge className="h-5 min-w-5 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold">
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}

            {/* Admin button */}
            {isMounted && !loadingAuth && isAdmin && activeApp === 'cell' && (
              <>
                <SidebarSeparator className="my-1.5 opacity-30" />
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin')}
                    tooltip="Admin"
                    onClick={() => navigate('/admin')}
                    className={cn(
                      "h-9 rounded-lg px-3 text-[13px] font-medium gap-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      pathname.startsWith('/admin')
                        ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground [&>svg]:text-primary"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
                    )}
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4 shrink-0" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}

            {/* Guest sign-in prompt */}
            {isMounted && !loadingAuth && !currentUser && (
              <div className="mt-3 space-y-1 group-data-[collapsible=icon]:hidden">
                <SidebarSeparator className="mb-2 opacity-30" />
                <Button asChild variant="default" className="h-8.5 w-full rounded-lg text-[13px] font-semibold" onClick={() => navigate('/login')}>
                  <Link href="/login"><LogIn className="mr-2 h-4 w-4" />{t.signIn}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-8.5 w-full rounded-lg text-[13px] font-medium text-muted-foreground" onClick={() => navigate('/signup')}>
                  <Link href="/signup"><UserPlus className="mr-2 h-4 w-4" />{t.register}</Link>
                </Button>
              </div>
            )}
          </SidebarMenu>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
