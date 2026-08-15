
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield, User,
  LogIn, UserPlus, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  cellPath,
  getAppHref,
  resolveActiveApp,
} from '@/lib/app-access';
import { getSidebarNavForApp } from '@/lib/app-sidebar-nav';
import { AppLogo } from '@/components/shell/app-logo';
import { formatUserDisplayName } from '@/lib/formatting';
import { useAuth } from '@/contexts/auth-context';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { LoadingSpinner } from '../ui/loading-spinner';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useActiveAppAvatar } from '@/hooks/use-active-app-avatar';
import { PixelAvatar } from '../avatar/PixelAvatar';

import { useChats } from '@/hooks/useChats';
import { usePrayerRequestBadge } from '@/hooks/use-prayer-request-badge';
import { translations } from '@/lib/translations';
import { sumChatUnreadMessageCounts } from '@/lib/notification-utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const t = translations[currentUser?.preferredLanguage || 'en'];
  const activeApp = resolveActiveApp(pathname) ?? 'cell';
  const appHome = getAppHref(activeApp);

  useEffect(() => { setIsMounted(true); }, []);


  const unreadChats = useMemo(() => {
    if (!currentUser || !chats) return 0;
    return sumChatUnreadMessageCounts(
      chats.filter((chat) => chat.appScope !== 'ndcpc'),
      currentUser.uid,
      (chat) => pathname === `/chat/${chat.id}`,
    );
  }, [chats, currentUser, pathname]);

  const navigate = (path: string) => {
    if (pathname !== path) setIsPageLoading(true);
    setOpenMobile(false);
    router.push(path);
  };

  const { avatar: sidebarAvatar, showHalo: sidebarShowHalo } = useActiveAppAvatar(
    activeApp === 'ndcpc' ? 'ndcpc' : 'cell',
  );

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
              chats.filter((chat) => chat.appScope === 'ndcpc'),
              currentUser.uid,
              (chat) => pathname === `/ndcpc/chat/${chat.id}`,
            )
          : 0;
        badge = roleUnread;
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
    pathname,
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
            <AppLogo app={activeApp} size={32} className="rounded-lg" />
          </div>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-1.5 py-1.5 gap-1">
        {!isMounted || loadingAuth ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
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

      {/* Footer */}
      <SidebarFooter className="app-sidebar-footer gap-0 p-0">
        <div className="flex h-full w-full items-center px-1.5">
          {!isMounted || loadingAuth ? (
            <div className="flex flex-1 items-center justify-center px-1 py-2">
              <LoadingSpinner size="sm" />
            </div>
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group flex h-full min-w-0 w-full items-center gap-3 rounded-lg px-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <div className="h-8 w-8 shrink-0">
                    <PixelAvatar avatar={sidebarAvatar} showHalo={sidebarShowHalo} className="h-8 w-8" />
                  </div>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-tight">
                      {formatUserDisplayName(currentUser)}
                    </p>
                    {currentUser.email ? (
                      <p className="truncate text-[11px] text-muted-foreground leading-tight">
                        {currentUser.email}
                      </p>
                    ) : null}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="center"
                className="mb-1 w-[calc(var(--radix-dropdown-menu-trigger-width)-12px)] rounded-xl p-2"
              >
                <DropdownMenuItem className="rounded-lg h-9 text-sm gap-2" onSelect={() => navigate('/accounts')}>
                  <User className="h-4 w-4 text-muted-foreground" /> {t.profile}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex h-full min-w-0 w-full items-center gap-3 rounded-lg px-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-tight">Guest</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="center"
                className="mb-1 w-[calc(var(--radix-dropdown-menu-trigger-width)-12px)] rounded-xl p-2"
              >
                <DropdownMenuItem className="rounded-lg h-9 text-sm gap-2" onSelect={() => navigate('/login')}>
                  <LogIn className="h-4 w-4 text-muted-foreground" /> {t.signIn}
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg h-9 text-sm gap-2" onSelect={() => navigate('/signup')}>
                  <UserPlus className="h-4 w-4 text-muted-foreground" /> {t.register}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
