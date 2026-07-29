"use client";

import { useInbox } from '@/contexts/inbox-context';
import { useEffect } from 'react';

/** Deep link: opens the inbox sheet on the Announcements tab. */
export default function AnnouncementsPage() {
  const { openInbox } = useInbox();

  useEffect(() => {
    openInbox('announcements');
  }, [openInbox]);

  return null;
}
