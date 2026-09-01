'use client';

import { useAuth } from '@/contexts/auth-context';
import { hasNdcpcAccess } from '@/lib/app-access';
import { LayoutGate } from '@/components/layout/layout-gate';
import { syncProfileToChats } from '@/lib/sync-profile-chats';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function NdcpcChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const healedRef = useRef(false);

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login?next=/ndcpc/chat');
    } else if (!loadingAuth && currentUser && !hasNdcpcAccess(currentUser)) {
      router.replace('/');
    }
  }, [currentUser, loadingAuth, router]);

  // Heal stale role-chat membership + scoped avatars once per session on preschool chat.
  useEffect(() => {
    if (!currentUser?.uid || healedRef.current) return;
    healedRef.current = true;
    void syncProfileToChats().catch(() => {});
  }, [currentUser?.uid]);

  return (
    <LayoutGate
      loading={loadingAuth}
      ready={!!currentUser && hasNdcpcAccess(currentUser)}
      label="Loading chat"
    >
      <div className="flex w-full min-h-0 flex-1 flex-col">
        {children}
      </div>
    </LayoutGate>
  );
}
