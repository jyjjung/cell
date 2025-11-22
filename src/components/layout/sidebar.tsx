
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ListChecks, BookOpen, BrainCircuit, User, LogIn, UserPlus, Shield, LogOut } from 'lucide-react';
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
} from "@/components/ui/dropdown-menu"


export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, isAdmin, signOutUser, adminLogout } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const router = useRouter();


  const handleLinkClick = (path: string) => {
    if (pathname !== path) {
      setIsPageLoading(true);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  const handleAdminLogout = () => {
    adminLogout();
    router.push('/admin');
  };

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/bible-checklist', label: 'My Checklist', icon: ListChecks, requiresAuth: true },
    { href: '/bible-checklist', label: 'Reading Plan', icon: ListChecks, requiresGuest: true },
    { href: '/full-plan', label: 'Full Plan', icon: BookOpen },
    { href: '/memorize', label: 'Memory Verses', icon: BrainCircuit },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r bg-background hidden md:flex flex-col">
      <div className="p-4 border-b">
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
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
           const shouldShow = (item.requiresAuth && currentUser) || (item.requiresGuest && !currentUser) || (!item.requiresAuth && !item.requiresGuest);
           if (!shouldShow) return null;

          return (
            <Button
              key={item.href + item.label}
              asChild
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => handleLinkClick(item.href)}
            >
              <Link href={item.href}>
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          {currentUser ? (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start text-left h-auto px-2 py-1">
                        <User className="mr-3 h-5 w-5" />
                        <div className="flex flex-col truncate">
                            <span className="font-semibold truncate">{currentUser.displayName || "User"}</span>
                            <span className="text-xs text-muted-foreground truncate">{currentUser.email}</span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
                    <DropdownMenuItem onSelect={() => {router.push('/profile'); setIsPageLoading(true);}}>
                        <User className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    {isAdmin && (
                        <>
                         <DropdownMenuItem onSelect={() => {router.push('/admin/dashboard'); setIsPageLoading(true);}}>
                            <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
                         </DropdownMenuItem>
                         <DropdownMenuItem onSelect={handleAdminLogout} className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" /> Logout Admin
                        </DropdownMenuItem>
                        </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleSignOut} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="w-full space-y-2">
              <Button asChild variant="default" className="w-full" onClick={() => handleLinkClick('/login')}>
                <Link href="/login"><LogIn className="mr-2 h-4 w-4" /> Login</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full" onClick={() => handleLinkClick('/signup')}>
                <Link href="/signup"><UserPlus className="mr-2 h-4 w-4" /> Sign Up</Link>
              </Button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
