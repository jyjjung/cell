'use client';

import { hasNdcpcAccess } from '@/lib/app-access';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutGate } from '@/components/layout/layout-gate';

export default function NdcpcAppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login?next=/ndcpc');
      return;
    }
    if (!loadingAuth && currentUser && !hasNdcpcAccess(currentUser)) {
      router.replace('/');
    }
  }, [currentUser, loadingAuth, router]);

  const ready = !!currentUser && hasNdcpcAccess(currentUser);

  return (
    <LayoutGate loading={loadingAuth} ready={ready} label="Loading preschool">
      {children}
    </LayoutGate>
  );
}
