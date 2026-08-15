'use client';

import { hasUsersAppAccess } from '@/lib/app-access';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function UsersAppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login?next=/users');
      return;
    }
    if (!loadingAuth && currentUser && !hasUsersAppAccess(currentUser)) {
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

  if (!hasUsersAppAccess(currentUser)) return null;

  return <>{children}</>;
}
