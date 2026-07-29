"use client";

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/home/landing-page';
import { DashboardSkeleton } from '@/components/home/dashboard-skeleton';

const DashboardPage = dynamic(() => import('@/components/home/dashboard-page'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

export default function HomePage() {
  const { currentUser, hasSession, loadingAuth } = useAuth();
  const router = useRouter();

  // Wait for Firebase auth restore — hasSession starts false and would flash landing.
  if (loadingAuth || (hasSession && !currentUser)) {
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

  return <DashboardPage currentUser={currentUser} />;
}
