
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Only show footer on public-facing pages
  const publicRoutes = ['/', '/login', '/signup', '/features', '/privacy', '/forgot-password', '/pending-approval'];
  const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));

  // Always hide on individual chat routes
  if (pathname.startsWith('/chat/') && pathname !== '/chat') return null;

  // Hide inside the authenticated app
  if (!isPublic) return null;

  return (
    <footer className="app-main-footer w-full relative z-10">
      <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          em. © 2026
        </p>
        
        <div className="flex items-center gap-6">
          <Link 
            href="/features" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How it works
          </Link>

          <Link 
            href="/privacy" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
