'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScoreboardPage } from '@/components/scoreboard/scoreboard-page';
import { DashboardSkeleton } from '@/components/home/dashboard-skeleton';
import { NavPageHeader, PageShell } from '@/components/ui/page-layout';
import { useAuth } from '@/contexts/auth-context';
import { hasCellAccess } from '@/lib/app-access';
import { redirectToAccessibleApp } from '@/lib/persist-last-app';

export default function ScoreboardRoute() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login?next=/scoreboard');
      return;
    }
    if (!loadingAuth && currentUser && !hasCellAccess(currentUser)) {
      redirectToAccessibleApp(router, currentUser);
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth || !currentUser || !hasCellAccess(currentUser)) {
    return <DashboardSkeleton />;
  }

  return (
    <PageShell>
      <NavPageHeader
        title="Scoreboard"
      />
      <ScoreboardPage />
    </PageShell>
  );
}
