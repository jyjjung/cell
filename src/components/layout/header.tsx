
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Button } from '@/components/ui/button';
import { Home, LogIn, LogOut, ShieldCheck, ClipboardList, Menu, X, UserPlus, UserCircle, LibraryBig } from 'lucide-react';
import { usePathname } from 'next/navigation'; 

export default function Header() {
  const { isAdmin, adminLogout, currentUser, signOutUser, loadingAuth } = useAuth();
  const { setIsPageLoading } = usePageLoading();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname(); 

  const handleLinkClick = (targetPath: string) => {
    if (targetPath !== pathname) {
      setIsPageLoading(true);
    }
    closeMobileMenu(); 
  };

  const handleAdminLogoutClick = () => {
    setIsPageLoading(true); // adminLogout already handles redirect and page loading
    adminLogout();
    closeMobileMenu();
  };

  const handleUserSignOutClick = async () => {
    // signOutUser already handles redirect and page loading
    await signOutUser();
    closeMobileMenu();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const commonNavLinks = (
    <>
      <Link href="/" legacyBehavior passHref>
        <Button variant="ghost" className="text-sm font-medium" onClick={() => handleLinkClick('/')}>
          <Home className="mr-2 h-4 w-4" /> Home
        </Button>
      </Link>
      <Link href="/bible-plan" legacyBehavior passHref>
        <Button variant="ghost" className="text-sm font-medium" onClick={() => handleLinkClick('/bible-plan')}>
          <ClipboardList className="mr-2 h-4 w-4" /> Full Bible Plan
        </Button>
      </Link>
      {currentUser && (
         <Link href="/bible-checklist" legacyBehavior passHref>
          <Button variant="ghost" className="text-sm font-medium" onClick={() => handleLinkClick('/bible-checklist')}>
            <LibraryBig className="mr-2 h-4 w-4" /> My Checklist
          </Button>
        </Link>
      )}
    </>
  );
  
  const mobileCommonNavLinks = (
    <>
      <Link href="/" legacyBehavior passHref>
        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/')}>
          <Home className="mr-3 h-5 w-5" />Home
        </Button>
      </Link>
      <Link href="/bible-plan" legacyBehavior passHref>
        <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/bible-plan')}>
          <ClipboardList className="mr-3 h-5 w-5" />Full Bible Plan
        </Button>
      </Link>
       {currentUser && (
         <Link href="/bible-checklist" legacyBehavior passHref>
          <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/bible-checklist')}>
            <LibraryBig className="mr-3 h-5 w-5" />My Checklist
          </Button>
        </Link>
      )}
    </>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-6">
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
          <span className="font-bold sm:inline-block text-lg">
            Cell Dates
          </span>
        </Link>

        <div className="hidden md:flex flex-grow"></div>

        <nav className="hidden md:flex items-center space-x-1">
          {commonNavLinks}
        
          {isAdmin && (
            <Link href="/admin/dashboard" legacyBehavior passHref>
              <Button variant="outline" size="sm" onClick={() => handleLinkClick('/admin/dashboard')}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Admin Panel
              </Button>
            </Link>
          )}

          {!loadingAuth && currentUser ? (
            <>
              {/* Could add a profile link here: e.g., <Link href="/profile"><Button>Profile</Button></Link> */}
              <Button onClick={handleUserSignOutClick} variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" /> Logout User
              </Button>
            </>
          ) : !loadingAuth && !isAdmin && !currentUser ? ( // Show general login/signup if not admin and no user
            <>
              <Link href="/login" legacyBehavior passHref>
                <Button variant="ghost" size="sm" onClick={() => handleLinkClick('/login')}>
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Button>
              </Link>
              <Link href="/signup" legacyBehavior passHref>
                <Button variant="outline" size="sm" onClick={() => handleLinkClick('/signup')}>
                  <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                </Button>
              </Link>
            </>
          ) : null}

          {!loadingAuth && !currentUser && !isAdmin && ( // If not admin and no user, show admin login
             <Link href="/admin" legacyBehavior passHref>
                <Button variant="ghost" size="sm" onClick={() => handleLinkClick('/admin')}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Admin Login
                </Button>
              </Link>
          )}
          {isAdmin && ( // Admin logout button (different from user logout)
             <Button onClick={handleAdminLogoutClick} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Admin Logout
              </Button>
          )}

        </nav>

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

      {isMobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden absolute top-14 inset-x-0 bg-background border-b border-border shadow-lg p-4 z-40">
          <nav className="flex flex-col space-y-2">
            {mobileCommonNavLinks}
            
            <hr className="border-border my-2" />

            {isAdmin && (
              <Link href="/admin/dashboard" legacyBehavior passHref>
                <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/admin/dashboard')}>
                  <ShieldCheck className="mr-3 h-5 w-5" />Admin Panel
                </Button>
              </Link>
            )}

            {!loadingAuth && currentUser ? (
              <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={handleUserSignOutClick}>
                <LogOut className="mr-3 h-5 w-5" />Logout User
              </Button>
            ) : !loadingAuth && !isAdmin && !currentUser ? (
              <>
                <Link href="/login" legacyBehavior passHref>
                  <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/login')}>
                    <LogIn className="mr-3 h-5 w-5" />Login
                  </Button>
                </Link>
                <Link href="/signup" legacyBehavior passHref>
                  <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/signup')}>
                    <UserPlus className="mr-3 h-5 w-5" />Sign Up
                  </Button>
                </Link>
              </>
            ) : null}
            
            {!loadingAuth && !currentUser && !isAdmin && (
                <Link href="/admin" legacyBehavior passHref>
                    <Button variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/admin')}>
                    <ShieldCheck className="mr-3 h-5 w-5" />Admin Login
                    </Button>
                </Link>
            )}
            {isAdmin && (
                 <Button variant="ghost" className="w-full justify-start text-base py-3 text-destructive hover:text-destructive" onClick={handleAdminLogoutClick}>
                    <LogOut className="mr-3 h-5 w-5" />Admin Logout
                </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
