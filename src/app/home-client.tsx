"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { CommunityLanding } from '@/components/shell/community-landing';
import { ShellRouter } from '@/components/shell/shell-router';

export default function HomeClient({
  initialHasSession,
}: {
  initialHasSession: boolean;
}) {
  const { currentUser, hasSession, loadingAuth } = useAuth();
  const router = useRouter();

  if (!initialHasSession && !hasSession) {
    return (
      <CommunityLanding
        onSignIn={() => router.push('/login')}
        onSignUp={() => router.push('/signup')}
      />
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
