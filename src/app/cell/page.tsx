'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { hasCellAccess } from '@/lib/app-access';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardSkeleton } from '@/components/home/dashboard-skeleton';
import { redirectToAccessibleApp } from '@/lib/persist-last-app';

const DashboardPage = dynamic(() => import('@/components/home/dashboard-page'), {
  loading: () => <DashboardSkeleton />,
});

export default function CellHomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login?next=/cell');
      return;
    }
    if (!loadingAuth && currentUser && !hasCellAccess(currentUser)) {
      redirectToAccessibleApp(router, currentUser);
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth || !currentUser) {
    return <DashboardSkeleton />;
  }

  if (!hasCellAccess(currentUser)) {
    return <DashboardSkeleton />;
  }

  return <DashboardPage currentUser={currentUser} />;
}
