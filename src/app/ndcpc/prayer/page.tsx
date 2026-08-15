'use client';

import { useInbox } from '@/contexts/inbox-context';
import { useEffect } from 'react';

/** Deep link: opens the NDCPC inbox sheet on the Prayer tab. */
export default function NdcpcPrayerPage() {
  const { openInbox } = useInbox();

  useEffect(() => {
    openInbox('prayer');
  }, [openInbox]);

  return null;
}
