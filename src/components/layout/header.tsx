
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Button } from '@/components/ui/button';
import { Menu, X, ShieldCheck, LogOut, User } from 'lucide-react';
import { usePathname } from 'next/navigation'; 
import { ThemeToggle } from '@/components/layout/theme-toggle';
import PageLoaderManager from './page-loader-manager';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    setIsPageLoading(true); 
    adminLogout(); 
    closeMobileMenu();
  };

  const handleUserSignOutClick = async () => {
    await signOutUser();
    closeMobileMenu();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  const navLinks = (
     <>
      <Button asChild variant="ghost" onClick={() => handleLinkClick('/')}>
        <Link href="/">Home</Link>
      </Button>
      {!currentUser && (
        <Button asChild variant="ghost" onClick={() => handleLinkClick('/bible-plan')}>
          <Link href="/bible-plan">Full Bible Plan</Link>
        </Button>
      )}
      <Button asChild variant="ghost" onClick={() => handleLinkClick('/memorize')}>
        <Link href="/memorize">Memory Verses</Link>
      </Button>
    </>
  );

  const mobileNavLinks = (
     <>
      <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/')}>
        <Link href="/">Home</Link>
      </Button>
      {!currentUser && (
         <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/bible-plan')}>
            <Link href="/bible-plan">Full Bible Plan</Link>
         </Button>
      )}
      <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/memorize')}>
        <Link href="/memorize">Memory Verses</Link>
      </Button>
    </>
  );

  return (
    <>
    <PageLoaderManager />
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2 mr-6" onClick={() => handleLinkClick('/')}>
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
        
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks}
        </nav>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
            <div className="hidden md:flex items-center space-x-2">
                {/* User Dropdown */}
                {!loadingAuth && currentUser && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm">
                                <User className="mr-2 h-4 w-4" />
                                {currentUser.displayName || "My Account"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem onSelect={() => { closeMobileMenu(); router.push('/profile'); setIsPageLoading(true); }}><Link href="/profile">Profile</Link></DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => { closeMobileMenu(); router.push('/bible-checklist'); setIsPageLoading(true); }}><Link href="/bible-checklist">My Checklist</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleUserSignOutClick} className="text-destructive focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Guest Buttons */}
                {!loadingAuth && !currentUser && (
                    <>
                        <Button asChild variant="ghost" size="sm" onClick={() => handleLinkClick('/login')}><Link href="/login">Login</Link></Button>
                        <Button asChild variant="default" size="sm" onClick={() => handleLinkClick('/signup')}><Link href="/signup">Sign Up</Link></Button>
                    </>
                )}

                {/* Admin Controls */}
                {isAdmin && (
                    <>
                        <Button asChild variant="outline" size="sm" onClick={() => handleLinkClick('/admin/dashboard')}><Link href="/admin/dashboard"><ShieldCheck className="mr-2 h-4 w-4" /> Admin</Link></Button>
                        <Button onClick={handleAdminLogoutClick} variant="ghost" size="sm" className="text-destructive hover:text-destructive"><LogOut className="mr-2 h-4 w-4" /> Logout Admin</Button>
                    </>
                )}

                {/* Admin Login for Guests */}
                {!isAdmin && !currentUser && !loadingAuth && (
                    <Button asChild variant="ghost" size="sm" onClick={() => handleLinkClick('/admin')}><Link href="/admin">Admin</Link></Button>
                )}
            </div>
            
            <ThemeToggle />

            <div className="md:hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMobileMenu}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="mobile-menu"
                    className="rounded-md text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <span className="sr-only">Open main menu</span>
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden absolute top-16 inset-x-0 bg-background border-b border-border shadow-lg p-4 z-40">
          <nav className="flex flex-col space-y-1">
            {mobileNavLinks}
            
            <hr className="my-2" />

            {/* Mobile User Section */}
            {!loadingAuth && currentUser && (
                <>
                    <p className="px-3 py-2 text-sm font-semibold text-muted-foreground">My Account</p>
                    <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/profile')}><Link href="/profile">Profile</Link></Button>
                    <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/bible-checklist')}><Link href="/bible-checklist">My Checklist</Link></Button>
                    <Button variant="ghost" className="w-full justify-start text-base py-3 text-destructive hover:text-destructive" onClick={handleUserSignOutClick}>Logout</Button>
                </>
            )}

            {/* Mobile Guest Section */}
            {!loadingAuth && !currentUser && (
                <>
                    <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/login')}><Link href="/login">Login</Link></Button>
                    <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/signup')}><Link href="/signup">Sign Up</Link></Button>
                </>
            )}

            <hr className="my-2" />

            {/* Mobile Admin Section */}
            {isAdmin ? (
                <>
                    <p className="px-3 py-2 text-sm font-semibold text-muted-foreground">Administration</p>
                    <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/admin/dashboard')}><Link href="/admin/dashboard">Admin Panel</Link></Button>
                    <Button variant="ghost" className="w-full justify-start text-base py-3 text-destructive hover:text-destructive" onClick={handleAdminLogoutClick}>Admin Logout</Button>
                </>
            ) : !currentUser && (
                 <Button asChild variant="ghost" className="w-full justify-start text-base py-3" onClick={() => handleLinkClick('/admin')}><Link href="/admin">Admin Login</Link></Button>
            )}
          </nav>
        </div>
      )}
    </header>
    </>
  );
}
