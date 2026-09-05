'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { CommunityLanding } from '@/components/shell/community-landing';
import { ShellRouter } from '@/components/shell/shell-router';
import { getAppHref, readLastAppPreference } from '@/lib/app-access';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HomeClient({
  initialHasSession,
}: {
  initialHasSession: boolean;
}) {
  const { currentUser, hasSession, loadingAuth } = useAuth();
  const router = useRouter();
  const [resumingHref, setResumingHref] = useState<string | null>(null);

  // Resume from last-app storage/cookie immediately — do not wait on Firebase.
  // Server redirect broke offline PWA launch; waiting on auth hung `/` on a spinner.
  useEffect(() => {
    if (!initialHasSession && !hasSession) return;
    const last = readLastAppPreference();
    if (!last) return;
    const href = getAppHref(last);
    setResumingHref(href);
    router.replace(href);
  }, [initialHasSession, hasSession, router]);

  if (!initialHasSession && !hasSession) {
    return (
      <CommunityLanding
        onSignIn={() => router.push('/login')}
        onSignUp={() => router.push('/signup')}
      />
    );
  }

  if (resumingHref) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (loadingAuth) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <CommunityLanding
        onSignIn={() => router.push('/login')}
        onSignUp={() => router.push('/signup')}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return <ShellRouter />;
}
