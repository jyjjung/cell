"use client";

import { useInbox } from '@/contexts/inbox-context';
import { useEffect } from 'react';

/** Deep link: opens the inbox sheet on the Notifications tab. */
export default function NotificationsPage() {
  const { openInbox } = useInbox();

  useEffect(() => {
    openInbox('notifications');
  }, [openInbox]);

  return null;
}
