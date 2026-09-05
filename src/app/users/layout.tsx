'use client';

import { hasUsersAppAccess } from '@/lib/app-access';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutGate } from '@/components/layout/layout-gate';
import { redirectToAccessibleApp } from '@/lib/persist-last-app';

export default function UsersAppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login?next=/users');
      return;
    }
    if (!loadingAuth && currentUser && !hasUsersAppAccess(currentUser)) {
      redirectToAccessibleApp(router, currentUser);
    }
  }, [currentUser, loadingAuth, router]);

  const ready = !!currentUser && hasUsersAppAccess(currentUser);

  return (
    <LayoutGate loading={loadingAuth} ready={ready} label="Loading users">
      {children}
    </LayoutGate>
  );
}
