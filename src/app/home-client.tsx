"use client";

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/home/landing-page';
import { DashboardSkeleton } from '@/components/home/dashboard-skeleton';

const DashboardPage = dynamic(() => import('@/components/home/dashboard-page'), {
  loading: () => <DashboardSkeleton />,
});

export default function HomeClient({
  initialHasSession,
}: {
  initialHasSession: boolean;
}) {
  const { currentUser, hasSession, loadingAuth } = useAuth();
  const router = useRouter();

  // Guest with no cookie: paint landing immediately (skip auth waterfall).
  if (!initialHasSession && !hasSession) {
    return (
      <LandingPage
        onSignIn={() => router.push('/login')}
        onSignUp={() => router.push('/signup')}
      />
    );
  }

  if (loadingAuth) {
    return <DashboardSkeleton />;
  }

  if (!hasSession) {
    return (
      <LandingPage
        onSignIn={() => router.push('/login')}
        onSignUp={() => router.push('/signup')}
      />
    );
  }

  if (!currentUser) {
    return <DashboardSkeleton />;
  }

  return <DashboardPage currentUser={currentUser} />;
}
