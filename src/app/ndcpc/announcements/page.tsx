'use client';

import { useInbox } from '@/contexts/inbox-context';
import { useEffect } from 'react';

/** Deep link: opens the NDCPC inbox sheet on the Announcements tab. */
export default function NdcpcAnnouncementsPage() {
  const { openInbox } = useInbox();

  useEffect(() => {
    openInbox('announcements');
  }, [openInbox]);

  return null;
}
