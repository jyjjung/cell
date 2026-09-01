"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

export default function Footer() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  // Only show footer on public-facing pages
  const publicRoutes = ['/', '/login', '/signup', '/privacy', '/terms', '/forgot-password', '/pending-approval'];
  const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));

  // Always hide on individual chat routes
  if (pathname.startsWith('/chat/') && pathname !== '/chat') return null;

  // Hide inside the authenticated app
  if (!isPublic) return null;

  return (
    <footer className="app-main-footer w-full relative z-10">
      <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          NDC Community Apps © 2026
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link 
            href="/privacy" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.privacyPolicy}
          </Link>

          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.termsOfService}
          </Link>
        </div>
      </div>
    </footer>
  );
}
