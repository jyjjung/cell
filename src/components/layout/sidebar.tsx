
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ListChecks, BookOpen, BrainCircuit, User, LogIn, UserPlus, Shield, LogOut, Calendar, Users, BookMarked, ListOrdered, Settings, Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { usePageLoading } from '@/contexts/page-loading-context';
import { ThemeToggle } from './theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    SidebarGroupLabel,
    SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, signOutUser, adminLogout, loadingAuth } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const { setOpenMobile } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLinkClick = (path: string) => {
    if (pathname !== path) {
      setIsPageLoading(true);
    }
    setOpenMobile(false); // Close mobile sidebar on navigation
  };

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  const handleAdminLogout = () => {
    adminLogout();
    router.push('/admin');
  };
  
  const sidebarPrefs = currentUser?.sidebar;

  const mainNavItems = [
    { href: '/', label: 'Home', icon: Home, tooltip: 'Home', key: 'home' },
    { href: '/notifications', label: 'Notifications', icon: Bell, tooltip: 'Notifications', key: 'notifications'},
    { href: '/events', label: 'Events', icon: Calendar, tooltip: 'Events', key: 'events' },
    { href: '/memorize', label: 'Memory Verses', icon: BrainCircuit, tooltip: 'Memory Verses', key: 'memorize' },
  ];

  const readingPlanNavItems = [
    { href: '/bible-checklist', label: 'My Checklist', icon: ListChecks, requiresAuth: true, tooltip: 'My Checklist', key: 'checklist' },
    { href: '/bible-checklist', label: 'Reading Plan', icon: ListChecks, requiresGuest: true, tooltip: 'Reading Plan', key: 'checklist' },
    { href: '/full-plan', label: 'Full Plan', icon: BookOpen, tooltip: 'Full Plan', key: 'fullPlan' },
    { href: '/leaderboard', label: 'Leaderboard', icon: Users, tooltip: 'Leaderboard', requiresAuth: true, key: 'leaderboard' },
  ];
  
  const adminNavItems = [
      { href: '/admin/events', label: 'Events', icon: Calendar, key: 'adminEvents' },
      { href: '/admin/memory-verses', label: 'Memory Verses', icon: BookMarked, key: 'adminMemoryVerses' },
      { href: '/admin/bible-plan', label: 'Bible Plan', icon: BookOpen, key: 'adminBiblePlan' },
      { href: '/admin/notifications', label: 'Notifications', icon: BellRing, key: 'adminNotifications' },
  ];

  const isNavItemVisible = (item: any) => {
    const isVisibleByPref = item.key ? sidebarPrefs?.[item.key as keyof typeof sidebarPrefs] ?? true : true;
    if (!isVisibleByPref) return false;

    const isVisibleByAuth = (item.requiresAuth && currentUser) || (item.requiresGuest && !currentUser) || (!item.requiresAuth && !item.requiresGuest);
    return isVisibleByAuth;
  };

  const isReadingPlanSectionVisible = readingPlanNavItems.some(isNavItemVisible);
  const isAdminSectionVisible = isAdmin && adminNavItems.some(item => sidebarPrefs?.[item.key as keyof typeof sidebarPrefs] ?? true);

  const renderNavItems = (items: any[]) => {
    return items.map((item) => (
          <SidebarMenuItem key={item.href + item.label} className={cn(!isNavItemVisible(item) ? 'hidden' : '')}>
              <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                      isActive={pathname === item.href}
                      onClick={() => handleLinkClick(item.href)}
                      tooltip={item.tooltip}
                  >
                      <item.icon />
                      <span>{item.label}</span>
                  </SidebarMenuButton>
              </Link>
          </SidebarMenuItem>
      )
    );
  }


  return (
    <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center justify-start space-x-2" onClick={() => handleLinkClick('/')}>
                <img src="/icon.svg" alt="em." className="h-9 w-9" />
            </Link>
        </SidebarHeader>

        <SidebarContent>
            <SidebarMenu>
              {(!isMounted || loadingAuth) ? (
                <>
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                </>
              ) : (
                renderNavItems(mainNavItems)
              )}

              {isReadingPlanSectionVisible && <SidebarSeparator />}

              {isReadingPlanSectionVisible && (
                  <SidebarMenuItem className="pointer-events-none">
                    <SidebarGroupLabel className="px-2 pt-2">
                        Reading Plan
                    </SidebarGroupLabel>
                  </SidebarMenuItem>
              )}
              {renderNavItems(readingPlanNavItems)}

              {currentUser && <SidebarSeparator />}
              
              {isAdminSectionVisible && (
                  <SidebarMenuItem className="pointer-events-none">
                    <SidebarGroupLabel className="px-2 pt-2">
                        Admin
                    </SidebarGroupLabel>
                  </SidebarMenuItem>
              )}
              {isAdmin && renderNavItems(adminNavItems)}
              
              {isAdmin && (
                  <SidebarMenuItem>
                      <SidebarMenuButton
                          onClick={handleAdminLogout}
                          tooltip="Logout Admin"
                          className="text-destructive hover:bg-destructive/10"
                      >
                          <LogOut />
                          <span>Logout Admin</span>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
              )}
              
              { currentUser && !isAdmin && (
                  <SidebarMenuItem>
                      <Link href="/admin" passHref legacyBehavior>
                          <SidebarMenuButton
                              isActive={pathname === '/admin'}
                              onClick={() => handleLinkClick('/admin')}
                              tooltip="Admin"
                          >
                              <Shield />
                              <span>Admin</span>
                          </SidebarMenuButton>
                      </Link>
                  </SidebarMenuItem>
              )}
            </SidebarMenu>
            
            { !isMounted || loadingAuth ? null : (
                !currentUser && (
                    <div className="p-2 space-y-2 group-data-[collapsible=icon]:hidden mt-auto">
                        <SidebarSeparator />
                        <p className="text-sm text-sidebar-foreground/70 px-2">Sign in to track your progress.</p>
                        <Button asChild variant="outline" className="w-full border-sidebar-border" onClick={() => handleLinkClick('/login')}>
                            <Link href="/login" className="flex items-center justify-center">
                                <LogIn className="mr-2 h-4 w-4" /> 
                                <span>Login</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full border-sidebar-border" onClick={() => handleLinkClick('/signup')}>
                            <Link href="/signup" className="flex items-center justify-center">
                                <UserPlus className="mr-2 h-4 w-4" /> 
                                <span>Sign Up</span>
                            </Link>
                        </Button>
                    </div>
                )
            )}
        </SidebarContent>

        <SidebarFooter>
            <div className="flex items-center justify-between">
                { !isMounted || loadingAuth ? (
                     <div className="flex items-center w-full">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2 ml-2 w-full group-data-[collapsible=icon]:hidden">
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-left h-auto px-2 py-1">
                                {currentUser ? (
                                    <>
                                        <User className="mr-3 h-5 w-5 shrink-0" />
                                        <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
                                            <span className="font-semibold truncate">{currentUser.displayName || "User"}</span>
                                             <span className="text-xs text-muted-foreground">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                                        </div>
                                    </>
                                ) : (
                                     <>
                                        <User className="mr-3 h-5 w-5 shrink-0" />
                                        <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
                                            <span className="font-semibold truncate">Guest</span>
                                            <span className="text-xs text-muted-foreground">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                                        </div>
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
                            {currentUser ? (
                              <>
                                <DropdownMenuLabel className="truncate">{currentUser.email}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => {router.push('/profile'); handleLinkClick('/profile')}}>
                                    <User className="mr-2 h-4 w-4" /> Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {router.push('/settings'); handleLinkClick('/settings')}}>
                                    <Settings className="mr-2 h-4 w-4" /> Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuLabel>Guest</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleLinkClick('/login')}>
                                  <LogIn className="mr-2 h-4 w-4" /> Login
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleLinkClick('/signup')}>
                                  <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                                </DropdownMenuItem>
                              </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <ThemeToggle />
            </div>
        </SidebarFooter>
    </Sidebar>
  );
}
