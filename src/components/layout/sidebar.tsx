
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, Users, BookOpen, Bell, Shield, LogOut, User,
  LogIn, UserPlus, MessageCircle, ChevronDown, ChevronRight,
  CalendarCheck, Music, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from './theme-toggle';
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
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { translations } from '@/lib/translations';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

type NavItem = {
  href?: string;
  label: string;
  icon?: React.ElementType;
  badge?: number;
  requiresAuth?: boolean;
  requiresGuest?: boolean;
  children?: { href: string; label: string; badge?: number; requiresAuth?: boolean; requiresGuest?: boolean }[];
};

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, isWorshipTeam, signOutUser, loadingAuth } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const { setIsPageLoading } = usePageLoading();
  const { notifications: allNotifications } = useNotifications();
  const { chats } = useChats();

  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  const unreadAlerts = useMemo(() => {
    if (!currentUser || !allNotifications) return 0;
    return allNotifications.filter(n => Array.isArray(n.readBy) && !n.readBy.includes(currentUser.uid)).length;
  }, [allNotifications, currentUser]);

  const unreadAnnouncements = useMemo(() => {
    if (!currentUser || !allNotifications) return 0;
    return allNotifications.filter(n => n.type === 'announcement' && Array.isArray(n.readBy) && !n.readBy.includes(currentUser.uid)).length;
  }, [allNotifications, currentUser]);

  const unreadGeneralAlerts = useMemo(() => {
    if (!currentUser || !allNotifications) return 0;
    return allNotifications.filter(n => n.type !== 'announcement' && Array.isArray(n.readBy) && !n.readBy.includes(currentUser.uid)).length;
  }, [allNotifications, currentUser]);

  const unreadChats = useMemo(() => {
    if (!currentUser || !chats) return 0;
    return chats.filter(chat => {
      if (!chat.lastMessageSentAt || chat.lastMessageSenderId === currentUser.uid) return false;
      
      const ms = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.toMillis === 'function') return ts.toMillis();
          if (ts instanceof Date) return ts.getTime();
          if (ts._seconds) return ts._seconds * 1000 + (ts._nanoseconds / 1000000);
          return 0;
      };

      const lastSeen = chat.memberSeen?.[currentUser.uid];
      if (!lastSeen) return true;

      return ms(chat.lastMessageSentAt) > ms(lastSeen);
    }).length;
  }, [chats, currentUser]);

  const navigate = (path: string) => {
    if (pathname !== path) setIsPageLoading(true);
    setOpenMobile(false);
    router.push(path);
  };

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  // Auto-open group that contains active route
  useEffect(() => {
    navItems.forEach(item => {
      if (item.children?.some(c => pathname.startsWith(c.href))) {
        setOpenGroups(prev => prev.includes(item.label) ? prev : [...prev, item.label]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navItems: NavItem[] = [
    { href: '/', label: t.home, icon: Home },
    {
      label: t.alerts, icon: Bell, badge: unreadAlerts,
      children: [
        { href: '/announcements', label: t.announcements, badge: unreadAnnouncements },
        { href: '/notifications', label: t.notifications, badge: unreadGeneralAlerts },
      ]
    },
    {
      label: t.scripture, icon: BookOpen,
      children: [
        { href: '/bible-checklist', label: t.readingPlan, requiresAuth: true },
        { href: '/bible-checklist', label: t.readingPlan, requiresGuest: true },
        { href: '/full-plan', label: t.fullPlan },
        { href: '/memorize', label: t.memoryVerses },
        { href: '/leaderboard', label: t.communityProgress, requiresAuth: true },
      ]
    },
    { href: '/chat', label: t.chat, icon: MessageCircle, badge: unreadChats, requiresAuth: true },
    {
      label: t.datesAndRosters, icon: CalendarCheck,
      children: [
        { href: '/events', label: t.events },
        { href: '/rsvp', label: 'RSVP', requiresAuth: true },
        { href: '/qt', label: t.qtRoster },
        { href: '/cleaning-roster', label: t.cleaningRoster },
      ]
    },
    ...(isAdmin || isWorshipTeam ? [{ href: '/worship', label: 'Worship Portal', icon: Music }] : []),
    { href: '/media', label: 'Links', icon: Link2 },
    { href: '/members', label: t.members, icon: Users },
  ];

  const isVisible = (item: { requiresAuth?: boolean; requiresGuest?: boolean }) =>
    (item.requiresAuth && currentUser) || (item.requiresGuest && !currentUser) || (!item.requiresAuth && !item.requiresGuest);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30 bg-background/80 backdrop-blur-2xl">
      {/* Logo */}
      <SidebarHeader className="px-5 py-6 border-b border-border/10">
        <Link href="/" onClick={() => navigate('/')}
          className="flex items-center group-data-[collapsible=icon]:justify-center transition-all active:scale-95">
          <div className="h-8 w-8 shrink-0">
            <img src="/icon.svg" alt="em." className="h-full w-full" />
          </div>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4 gap-1">
        {!isMounted || loadingAuth ? (
          <div className="space-y-1.5 px-1">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
          </div>
        ) : (
          <SidebarMenu className="gap-0.5">
            {navItems.map(item => {
              if (!item.children) {
                // Simple link
                if (!isVisible(item as any)) return null;
                const active = isActive(item.href!);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      onClick={() => navigate(item.href!)}
                      className={cn(
                        "h-10 rounded-xl px-3 text-sm font-medium transition-all gap-3",
                        active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/60 text-foreground/80 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href!}>
                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <SidebarMenuBadge className="bg-primary text-primary-foreground text-[10px] font-bold">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              }

              // Group with children
              const isOpen = openGroups.includes(item.label);
              const hasActiveChild = item.children.some(c => isActive(c.href));
              const visibleChildren = item.children.filter(isVisible);
              if (visibleChildren.length === 0) return null;

              return (
                <SidebarMenuItem key={item.label} className="group-data-[collapsible=icon]:hidden">
                  {/* Group header — only shown when sidebar is expanded */}
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      "w-full flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-all",
                      hasActiveChild ? "text-primary" : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                    <span className="flex-1 text-left">{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">{item.badge}</span>
                    )}
                    <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pl-7 pr-1 py-1 space-y-0.5">
                          {visibleChildren.map(child => {
                            const childActive = isActive(child.href);
                            return (
                              <button
                                key={child.href + child.label}
                                onClick={() => navigate(child.href)}
                                className={cn(
                                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                                  childActive
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-foreground/60 hover:text-foreground hover:bg-muted/50 font-medium"
                                )}
                              >
                                <span className="flex-1 truncate">{child.label}</span>
                                {typeof child.badge === 'number' && child.badge > 0 && (
                                  <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none shrink-0 ml-2">
                                    {child.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SidebarMenuItem>
              );
            })}

            {/* Admin button */}
            {isMounted && !loadingAuth && isAdmin && (
              <>
                <SidebarSeparator className="my-2 opacity-30" />
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin')}
                    tooltip="Admin"
                    onClick={() => navigate('/admin')}
                    className={cn(
                      "h-10 rounded-xl px-3 text-sm font-medium gap-3 transition-all",
                      pathname.startsWith('/admin')
                        ? "bg-primary text-primary-foreground"
                        : "text-primary/80 hover:bg-primary/10 hover:text-primary"
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
              <div className="mt-4 space-y-1.5 group-data-[collapsible=icon]:hidden">
                <SidebarSeparator className="opacity-30 mb-3" />
                <Button asChild variant="default" className="w-full h-10 rounded-xl text-sm font-semibold" onClick={() => navigate('/login')}>
                  <Link href="/login"><LogIn className="mr-2 h-4 w-4" />{t.signIn}</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full h-10 rounded-xl text-sm font-medium text-muted-foreground" onClick={() => navigate('/signup')}>
                  <Link href="/signup"><UserPlus className="mr-2 h-4 w-4" />{t.register}</Link>
                </Button>
              </div>
            )}
          </SidebarMenu>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          {!isMounted || loadingAuth ? (
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
              <Skeleton className="h-4 flex-1 group-data-[collapsible=icon]:hidden" />
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 h-12 px-2 rounded-xl hover:bg-muted/50 transition-all flex-1 min-w-0 text-left group">
                  <div className="h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-muted border border-border/50 shadow-sm">
                    {currentUser ? <PixelAvatar avatar={currentUser.avatar} /> : <User className="h-full w-full p-2 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold truncate leading-tight">{currentUser?.firstName || 'Guest'}</p>
                    {currentUser && <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-2xl p-2 border-border/50 shadow-2xl mb-1">
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
          <div className="shrink-0 group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
