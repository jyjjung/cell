'use client';

import { usePathname } from 'next/navigation';
import { resolveActiveApp } from '@/lib/app-access';
import { InboxSheet } from '@/components/inbox/InboxSheet';
import { NdcpcInboxSheet } from '@/components/inbox/NdcpcInboxSheet';

export function AppInboxSheet() {
  const pathname = usePathname();
  const activeApp = resolveActiveApp(pathname);

  if (activeApp === 'ndcpc') {
    return <NdcpcInboxSheet />;
  }

  return <InboxSheet />;
}
