'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getAppHref, listAccessibleApps, resolveEntryApp } from '@/lib/app-access';
import { persistLastApp } from '@/lib/persist-last-app';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/** `/` for signed-in users: last app, or Account on first visit. */
export function ShellRouter() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loadingAuth || !currentUser) return;
    const isApproved = currentUser.isApproved || currentUser.isAdmin;
    if (!isApproved) {
      router.replace('/pending-approval');
      return;
    }

    const accessible = listAccessibleApps(currentUser);
    if (accessible.length === 0) {
      router.replace('/pending-approval');
      return;
    }

    const entry = resolveEntryApp(currentUser);
    if (entry) {
      // Keep last-app cookie/localStorage fresh for switcher + next visit.
      // Hard navigate so offline/PWA does not stall on App Router RSC soft-nav.
      persistLastApp(entry, currentUser.uid);
      const href = getAppHref(entry);
      if (window.location.pathname === href) return;
      window.location.replace(href);
    }
  }, [currentUser, loadingAuth, router]);

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <LoadingSpinner />
    </div>
  );
}
