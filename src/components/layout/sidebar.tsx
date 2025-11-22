
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ListChecks, BookOpen, BrainCircuit, User, LogIn, UserPlus, Shield, LogOut, Calendar, Users, BookHeart, BookMarked, ListOrdered } from 'lucide-react';
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
    SidebarGroup,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Skeleton } from '../ui/skeleton';

export default function AppSidebar() {
  const pathname = usePathname();
  const { currentUser, isAdmin, signOutUser, adminLogout, loadingAuth } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();


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

  const mainNavItems = [
    { href: '/', label: 'Home', icon: Home, tooltip: 'Home' },
    { href: '/events', label: 'Events', icon: Calendar, tooltip: 'Events' },
    { href: '/memorize', label: 'Memory Verses', icon: BrainCircuit, tooltip: 'Memory Verses' },
  ];

  const readingPlanNavItems = [
     { href: '/bible-checklist', label: 'My Checklist', icon: ListChecks, requiresAuth: true, tooltip: 'My Checklist' },
    { href: '/bible-checklist', label: 'Reading Plan', icon: ListChecks, requiresGuest: true, tooltip: 'Reading Plan' },
    { href: '/full-plan', label: 'Full Plan', icon: BookOpen, tooltip: 'Full Plan' },
    { href: '/leaderboard', label: 'Leaderboard', icon: Users, tooltip: 'Leaderboard', requiresAuth: true },
  ];
  
  const adminNavItems = [
      { href: '/admin/events', label: 'Events', icon: Calendar },
      { href: '/admin/memory-verses', label: 'Memory Verses', icon: BookMarked },
      { href: '/admin/bible-plan', label: 'Bible Plan', icon: BookOpen },
  ];

  const renderNavItems = (items: (typeof mainNavItems | typeof readingPlanNavItems)[0][]) => {
    return items.map((item) => {
      const shouldShow = (item.requiresAuth && currentUser) || (item.requiresGuest && !currentUser) || (!item.requiresAuth && !item.requiresGuest);
      
      return (
          <SidebarMenuItem key={item.href + item.label} className={cn(!shouldShow && "hidden")}>
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
    });
  }


  return (
    <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center space-x-2" onClick={() => handleLinkClick('/')}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                    <line x1="16" x2="16" y1="2" y2="6"></line>
                    <line x1="8" x2="8" y1="2" y2="6"></line>
                    <line x1="3" x2="21" y1="10" y2="10"></line>
                    <path d="M8 14h.01"></path>
                    <path d="M12 14h.01"></path>
                    <path d="M16 14h.01"></path>
                    <path d="M8 18h.01"></path>
                    <path d="M12 18h.01"></path>
                    <path d="M16 18h.01"></path>
                </svg>
                <span className="font-bold text-lg">
                    Cell Dates
                </span>
            </Link>
        </SidebarHeader>

        <SidebarContent>
            <SidebarMenu>
              {renderNavItems(mainNavItems)}
            </SidebarMenu>

            
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                    Reading Plan
                </SidebarGroupLabel>
                <SidebarMenu>
                    {renderNavItems(readingPlanNavItems)}
                </SidebarMenu>
            </SidebarGroup>

              {loadingAuth ? (
                <div className="p-2 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !currentUser ? (
                 <div className="p-2 space-y-2 group-data-[collapsible=icon]:hidden">
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
              ) : null}

              
              <div className={cn("mt-2")}>
                 <SidebarSeparator />
                {isAdmin ? (
                  <SidebarGroup>
                      <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Admin</SidebarGroupLabel>
                      <SidebarMenu>
                          {adminNavItems.map(item => (
                              <SidebarMenuItem key={item.href}>
                                  <Link href={item.href} passHref legacyBehavior>
                                      <SidebarMenuButton
                                          isActive={pathname.startsWith(item.href)}
                                          onClick={() => handleLinkClick(item.href)}
                                          tooltip={item.label}
                                      >
                                          <item.icon />
                                          <span>{item.label}</span>
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                          ))}
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
                      </SidebarMenu>
                  </SidebarGroup>
                ) : (
                    <SidebarMenu>
                        <SidebarMenuItem className={cn(loadingAuth && "hidden")}>
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
                    </SidebarMenu>
                )}
              </div>
        </SidebarContent>

        <SidebarFooter>
            <div className="flex items-center justify-between">
                {loadingAuth ? (
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
                                        </div>
                                    </>
                                ) : (
                                     <>
                                        <User className="mr-3 h-5 w-5 shrink-0" />
                                        <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
                                            <span className="font-semibold truncate">Guest</span>
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
                                {isAdmin && (
                                  <>
                                  <DropdownMenuSeparator />
                                   <DropdownMenuItem onSelect={handleAdminLogout} className="text-destructive focus:text-destructive">
                                      <LogOut className="mr-2 h-4 w-4" /> Logout Admin
                                  </DropdownMenuItem>
                                  </>
                                )}
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
                                 <DropdownMenuItem onSelect={() => handleLinkClick('/admin')}>
                                  <Shield className="mr-2 h-4 w-4" /> Admin
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
