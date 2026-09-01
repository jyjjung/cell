'use client';

import dynamic from 'next/dynamic';
import { NdcpcDashboardSkeleton } from '@/components/ndcpc/ndcpc-dashboard-skeleton';

const DashboardView = dynamic(
  () => import('@/components/ndcpc/DashboardView').then((mod) => mod.DashboardView),
  { loading: () => <NdcpcDashboardSkeleton /> },
);

export default function NdcpcDashboardPage() {
  return <DashboardView />;
}
