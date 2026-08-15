'use client';

import { hasAccountsAccess } from '@/lib/app-access';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AccountsAppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login?next=/accounts');
      return;
    }
    if (!loadingAuth && currentUser && !hasAccountsAccess(currentUser)) {
      router.replace('/login?next=/accounts');
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth || !currentUser) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasAccountsAccess(currentUser)) return null;

  return <>{children}</>;
}
