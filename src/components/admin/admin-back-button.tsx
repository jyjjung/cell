"use client";

import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

function adminFallbackHref(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'admin' || segments.length < 2) return '/admin';
  if (segments.length === 2) return '/admin';
  return `/${segments.slice(0, -1).join('/')}`;
}

export function AdminBackButton() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mb-2 w-fit gap-1.5 rounded-xl px-2"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(adminFallbackHref(pathname));
      }}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {t.back}
    </Button>
  );
}
