'use client';

import dynamic from 'next/dynamic';

const GlobalPageLoader = dynamic(
  () => import('@/components/layout/global-page-loader'),
  { ssr: false },
);

export function ClientDynamicOverlays() {
  return <GlobalPageLoader />;
}
