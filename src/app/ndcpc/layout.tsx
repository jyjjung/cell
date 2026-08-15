'use client';

import { hasNdcpcAccess } from '@/lib/app-access';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function NdcpcAppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login?next=/ndcpc');
      return;
    }
    if (!loadingAuth && currentUser && !hasNdcpcAccess(currentUser)) {
      router.replace('/');
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth || !currentUser) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasNdcpcAccess(currentUser)) return null;

  return <>{children}</>;
}
