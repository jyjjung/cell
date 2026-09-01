'use client';

import dynamic from 'next/dynamic';
import type { AppUser } from '@/types';
import { HomeGreeting } from '@/components/home/home-greeting';
import { HomeBibleSection } from '@/components/home/home-bible-section';
import { HomeAgendaSection } from '@/components/home/home-agenda-section';
import { PageShell } from '@/components/ui/page-layout';

/** Deferred — own Firestore listener; not needed for first paint. */
const HomeInfoWidgets = dynamic(
  () => import('@/components/dashboard-widgets/home-info-widgets'),
  { loading: () => null },
);

interface DashboardPageProps {
  currentUser: AppUser;
}

export default function DashboardPage({ currentUser }: DashboardPageProps) {
  return (
    <PageShell>
      <HomeGreeting currentUser={currentUser} />
      <HomeBibleSection currentUser={currentUser} />
      <HomeAgendaSection currentUser={currentUser} />
      <HomeInfoWidgets />
    </PageShell>
  );
}
