'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy `/chat` → canonical em. chat under `/cell/chat`. */
export default function LegacyChatRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cell/chat');
  }, [router]);
  return null;
}
