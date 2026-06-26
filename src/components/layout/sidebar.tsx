
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, Users, BookOpen, Shield, User,
  LogIn, UserPlus, LogOut, MessageCircle, ChevronDown,
  CalendarCheck, Music, Library, Lightbulb, HeartHandshake
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { PixelAvatar } from '../avatar/PixelAvatar';

import { useChats } from '@/hooks/useChats';
import { usePrayerRequestBadge } from '@/hooks/use-prayer-request-badge';
import { translations } from '@/lib/translations';
import { isChatUnread } from '@/lib/notification-utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '../ui/button';

type NavItem = {
  href: string;
  label: string;
  icon?: React.ElementType;
  badge?: number;
  requiresAuth?: boolean;
  requiresGuest?: boolean;
};

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, isWorshipTeam, loadingAuth, signOutUser } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const { setIsPageLoading } = usePageLoading();

  const { chats } = useChats();
  const { unreadCount: unreadPrayerRequests, isShepherd } = usePrayerRequestBadge();

  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);


  const unreadChats = useMemo(() => {
    if (!currentUser || !chats) return 0;
    return chats.filter(chat => {
      if (pathname === `/chat/${chat.id}`) return false;
      return isChatUnread(chat, currentUser.uid);
    }).length;
  }, [chats, currentUser, pathname]);

  const navigate = (path: string) => {
    if (pathname !== path) setIsPageLoading(true);
    setOpenMobile(false);
    router.push(path);
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const navItems: NavItem[] = [
    { href: '/', label: t.home, icon: Home },
    { href: '/bible-checklist', label: t.readingPlan, icon: BookOpen },
    { href: '/chat', label: t.chat, icon: MessageCircle, badge: unreadChats, requiresAuth: true },
    { href: '/events', label: t.schedule, icon: CalendarCheck },
    ...(isAdmin || isWorshipTeam ? [{ href: '/worship', label: t.worshipPortal, icon: Music }] : []),
    { href: '/media', label: t.links, icon: Library },
    { href: '/members', label: t.members, icon: Users },
    { href: '/prayer-requests', label: t.prayerRequests, icon: HeartHandshake, badge: isShepherd ? unreadPrayerRequests : undefined, requiresAuth: true },
    { href: '/feedback', label: t.feedback, icon: Lightbulb },
  ];

  const isVisible = (item: { requiresAuth?: boolean; requiresGuest?: boolean }) =>
    (item.requiresAuth && currentUser) || (item.requiresGuest && !currentUser) || (!item.requiresAuth && !item.requiresGuest);

  return (
    <Sidebar collapsible="icon" className="app-sidebar">
      {/* Logo */}
      <SidebarHeader className="app-sidebar-header">
        <Link href="/" onClick={() => navigate('/')}
          className="flex h-full items-center justify-start transition-all active:scale-95">
          <div className="h-8 w-8 shrink-0">
            <img src="/icon.svg" alt="em." className="h-full w-full" />
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
              if (!isVisible(item as any)) return null;
              const active = isActive(item.href);

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.label}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "h-9 rounded-lg px-2.5 text-[13px] font-medium transition-colors gap-2.5 focus-visible:ring-2 focus-visible:ring-ring/50",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Link href={item.href}>
                      {item.icon && <item.icon className="h-[15px] w-[15px] shrink-0" />}
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
            {isMounted && !loadingAuth && isAdmin && (
              <>
                <SidebarSeparator className="my-1.5 opacity-30" />
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin')}
                    tooltip="Admin"
                    onClick={() => navigate('/admin')}
                    className={cn(
                      "h-9 rounded-lg px-2.5 text-[13px] font-medium gap-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      pathname.startsWith('/admin')
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Link href="/admin">
                      <Shield className="h-[15px] w-[15px] shrink-0" />
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
                    <PixelAvatar avatar={currentUser.avatar} className="h-8 w-8" />
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
                <DropdownMenuItem className="rounded-lg h-9 text-sm gap-2" onSelect={() => navigate('/profile')}>
                  <User className="h-4 w-4 text-muted-foreground" /> {t.profile}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="opacity-30 my-1" />
                <DropdownMenuItem
                  className="rounded-lg h-9 text-sm gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={() => void signOutUser()}
                >
                  <LogOut className="h-4 w-4" /> {t.signOut}
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
