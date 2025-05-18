"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Home, LogIn, LogOut, ShieldCheck } from 'lucide-react';

export default function Header() {
  const { isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          {/* You can replace this SVG with a proper logo if you have one */}
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
          <span className="font-bold sm:inline-block text-lg">
            Cell Dates
          </span>
        </Link>
        <nav className="flex flex-1 items-center space-x-4">
          <Link href="/" legacyBehavior passHref>
            <Button variant="ghost" className="text-sm font-medium">
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
        </nav>
        <div className="flex items-center space-x-2">
          {isAdmin ? (
            <>
              <Link href="/admin/dashboard" legacyBehavior passHref>
                <Button variant="outline" size="sm">
                  <ShieldCheck className="mr-2 h-4 w-4" /> Admin Dashboard
                </Button>
              </Link>
              <Button onClick={logout} variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <Link href="/admin" legacyBehavior passHref>
              <Button variant="ghost" size="sm">
                <LogIn className="mr-2 h-4 w-4" /> Admin Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
