"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { CommunityLanding } from '@/components/shell/community-landing';
import { ShellRouter } from '@/components/shell/shell-router';
import {
  getAppHref,
  readLastAppPreference,
  type CommunityAppId,
} from '@/lib/app-access';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HomeClient({
  initialHasSession,
  initialLastApp = null,
}: {
  initialHasSession: boolean;
  initialLastApp?: CommunityAppId | null;
}) {
  const { currentUser, hasSession, loadingAuth } = useAuth();
  const router = useRouter();
  const [resumingHref, setResumingHref] = useState<string | null>(() =>
    initialHasSession && initialLastApp ? getAppHref(initialLastApp) : null,
  );

  // Same speed as a server redirect, without breaking offline PWA launch:
  // hard-navigate from cookie/localStorage immediately — do not wait on Firebase.
  useEffect(() => {
    if (!initialHasSession && !hasSession) return;
    const last = initialLastApp ?? readLastAppPreference();
    if (!last) return;
    const href = getAppHref(last);
    setResumingHref(href);
    if (window.location.pathname === href) return;
    window.location.replace(href);
  }, [initialHasSession, hasSession, initialLastApp]);

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
        <LoadingSpinner />
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
        <LoadingSpinner />
      </div>
    );
  }

  return <ShellRouter />;
}
