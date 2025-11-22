
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ListChecks, BookOpen, BrainCircuit, User, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function BottomNav() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { setIsPageLoading } = usePageLoading();

  const handleLinkClick = (path: string) => {
    if (pathname !== path) {
      setIsPageLoading(true);
    }
  };

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/bible-checklist', label: 'Checklist', icon: ListChecks },
    { href: '/full-plan', label: 'Plan', icon: BookOpen },
    { href: '/memorize', label: 'Verses', icon: BrainCircuit },
    { href: '/profile', label: 'Profile', icon: User, requiresAuth: true },
    { href: '/login', label: 'Login', icon: LogIn, requiresGuest: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const shouldShow = (item.requiresAuth && currentUser) || (item.requiresGuest && !currentUser) || (!item.requiresAuth && !item.requiresGuest);
          if (!shouldShow) return null;

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={() => handleLinkClick(item.href)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors",
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
