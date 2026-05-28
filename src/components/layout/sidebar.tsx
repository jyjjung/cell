
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, Users, BookOpen, Shield, LogOut, User,
  LogIn, UserPlus, MessageCircle, ChevronDown,
  CalendarCheck, Music, Library, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { Skeleton } from '../ui/skeleton';
import { usePageLoading } from '@/contexts/page-loading-context';
import { PixelAvatar } from '../avatar/PixelAvatar';

import { useChats } from '@/hooks/useChats';
import { translations } from '@/lib/translations';
import { isChatUnread } from '@/lib/notification-utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
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
  const { currentUser, isAdmin, isWorshipTeam, signOutUser, loadingAuth } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const { setIsPageLoading } = usePageLoading();

  const { chats } = useChats();

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

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const navItems: NavItem[] = [
    { href: '/', label: t.home, icon: Home },
    { href: '/bible-checklist', label: 'Readings', icon: BookOpen },
    { href: '/chat', label: t.chat, icon: MessageCircle, badge: unreadChats, requiresAuth: true },
    { href: '/events', label: 'Schedule', icon: CalendarCheck },
    ...(isAdmin || isWorshipTeam ? [{ href: '/worship', label: 'Worship Portal', icon: Music }] : []),
    { href: '/media', label: 'Resources', icon: Library },
    { href: '/members', label: t.members, icon: Users },
    { href: '/feedback', label: 'Feedback & Updates', icon: Lightbulb },
  ];

  const isVisible = (item: { requiresAuth?: boolean; requiresGuest?: boolean }) =>
    (item.requiresAuth && currentUser) || (item.requiresGuest && !currentUser) || (!item.requiresAuth && !item.requiresGuest);

  return (
    <Sidebar collapsible="icon" className="glass-nav border-r border-border/40">
      {/* Logo */}
      <SidebarHeader className="px-2.5 py-2.5 border-b border-border/20">
        <Link href="/" onClick={() => navigate('/')}
          className="flex items-center group-data-[collapsible=icon]:justify-center transition-all active:scale-95">
          <div className="h-8 w-8 shrink-0">
            <img src="/icon.svg" alt="em." className="h-full w-full" />
          </div>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-1.5 py-1.5 gap-1">
        {!isMounted || loadingAuth ? (
            <div className="space-y-2 px-1">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
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
                      "h-8.5 rounded-lg px-2.5 text-[13px] font-medium transition-all gap-2.5 focus-visible:ring-1 focus-visible:ring-primary/60",
                      active
                        ? "glass-elevated text-foreground"
                        : "text-foreground/75 hover:bg-background/35 hover:text-foreground"
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
                      "h-8.5 rounded-lg px-2.5 text-[13px] font-medium gap-2.5 transition-all focus-visible:ring-1 focus-visible:ring-primary/60",
                      pathname.startsWith('/admin')
                        ? "glass-elevated text-foreground"
                        : "text-primary/80 hover:bg-primary/10 hover:text-primary"
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
      <SidebarFooter className="border-t border-border/30 p-2">
        <div className="flex items-center gap-2">
          {!isMounted || loadingAuth ? (
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
              <Skeleton className="h-4 flex-1 group-data-[collapsible=icon]:hidden" />
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="glass-thin group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-left transition-all hover:border-ring/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60">
                  <div className="h-8 w-8 shrink-0 rounded-full border border-border/50 bg-muted shadow-sm">
                    {currentUser ? <PixelAvatar avatar={currentUser.avatar} /> : <User className="h-full w-full p-2 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-[13px] font-semibold leading-tight">{currentUser?.firstName || 'Guest'}</p>
                    {currentUser && <p className="truncate text-[11px] text-muted-foreground">{currentUser.email}</p>}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-2xl p-2 mb-1">
                {currentUser ? (
                  <>
                    <DropdownMenuItem className="rounded-xl h-10 font-medium text-sm gap-2" onSelect={() => navigate('/profile')}>
                      <User className="h-4 w-4 text-primary" /> {t.profile}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="opacity-30 my-1" />
                    <DropdownMenuItem className="rounded-xl h-10 font-medium text-sm gap-2 text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => signOutUser()}>
                      <LogOut className="h-4 w-4" /> {t.signOut}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem className="rounded-xl h-10 font-medium text-sm gap-2" onSelect={() => navigate('/login')}>
                      <LogIn className="h-4 w-4 text-primary" /> {t.signIn}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl h-10 font-medium text-sm gap-2" onSelect={() => navigate('/signup')}>
                      <UserPlus className="h-4 w-4 text-primary" /> {t.register}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
