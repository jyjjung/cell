'use client';

import dynamic from 'next/dynamic';
import type { AppUser } from '@/types';
import { HomeGreeting } from '@/components/home/home-greeting';
import { HomeBibleSection } from '@/components/home/home-bible-section';
import { HomeAgendaSkeleton } from '@/components/home/home-agenda-row';
import { PageShell } from '@/components/ui/page-layout';

/** Deferred — schedule/events hooks; not needed for first paint. */
const HomeAgendaSection = dynamic(
  () => import('@/components/home/home-agenda-section').then((m) => m.HomeAgendaSection),
  { loading: () => <HomeAgendaSkeleton rows={3} /> },
);

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
