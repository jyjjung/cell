
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Home, LogIn, LogOut, ShieldCheck, ClipboardList, Menu, X } from 'lucide-react';

export default function Header() {
  const { isAdmin, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-6">
        <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
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

        {/* Spacer to push nav items to the right, only visible on desktop */}
        <div className="hidden md:flex flex-grow"></div>

        {/* Desktop Navigation & Admin Links */}
        <nav className="hidden md:flex items-center space-x-2">
          <Link href="/" legacyBehavior passHref>
            <Button variant="ghost" className="text-sm font-medium">
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
          <Link href="/bible-plan" legacyBehavior passHref>
            <Button variant="ghost" className="text-sm font-medium">
              <ClipboardList className="mr-2 h-4 w-4" /> Full Bible Plan
            </Button>
          </Link>
        
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
        </nav>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            className="p-2 rounded-md text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className="sr-only">Open main menu</span>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Panel (Dropdown) */}
      {isMobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden absolute top-14 inset-x-0 bg-background border-b border-border shadow-lg p-4 z-40">
          <nav className="flex flex-col space-y-2">
            <Link href="/" legacyBehavior passHref>
              <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={closeMobileMenu}>
                <Home className="mr-3 h-5 w-5" />Home
              </Button>
            </Link>
            <Link href="/bible-plan" legacyBehavior passHref>
              <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={closeMobileMenu}>
                <ClipboardList className="mr-3 h-5 w-5" />Full Bible Plan
              </Button>
            </Link>
            
            <hr className="border-border my-2" />

            {isAdmin ? (
              <>
                <Link href="/admin/dashboard" legacyBehavior passHref>
                  <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={closeMobileMenu}>
                    <ShieldCheck className="mr-3 h-5 w-5" />Admin Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-base py-3" 
                  onClick={() => { logout(); closeMobileMenu(); }}
                >
                  <LogOut className="mr-3 h-5 w-5" />Logout
                </Button>
              </>
            ) : (
              <Link href="/admin" legacyBehavior passHref>
                 <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={closeMobileMenu}>
                    <LogIn className="mr-3 h-5 w-5" />Admin Login
                  </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
