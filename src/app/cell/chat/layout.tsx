'use client';

import { useAuth } from '@/contexts/auth-context';
import { hasCellAccess } from '@/lib/app-access';
import { LayoutGate } from '@/components/layout/layout-gate';
import { redirectToAccessibleApp } from '@/lib/persist-last-app';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CellChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login?next=/cell/chat');
      return;
    }
    if (!loadingAuth && currentUser && !hasCellAccess(currentUser)) {
      redirectToAccessibleApp(router, currentUser);
    }
  }, [currentUser, loadingAuth, router]);

  return (
    <LayoutGate
      loading={loadingAuth}
      ready={!!currentUser && hasCellAccess(currentUser)}
      label="Loading chat"
    >
      <div className="flex w-full min-h-0 flex-1 flex-col">
        {children}
      </div>
    </LayoutGate>
  );
}
