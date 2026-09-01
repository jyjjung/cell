'use client';

import { hasAccountsAccess } from '@/lib/app-access';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutGate } from '@/components/layout/layout-gate';

export default function AccountsAppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login?next=/accounts');
      return;
    }
    if (!loadingAuth && currentUser && !hasAccountsAccess(currentUser)) {
      router.replace('/login?next=/accounts');
    }
  }, [currentUser, loadingAuth, router]);

  const ready = !!currentUser && hasAccountsAccess(currentUser);

  return (
    <LayoutGate loading={loadingAuth} ready={ready} label="Loading account">
      {children}
    </LayoutGate>
  );
}
