"use client";

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LandingPage from '@/components/home/landing-page';
import { DashboardSkeleton } from '@/components/home/dashboard-skeleton';

const DashboardPage = dynamic(() => import('@/components/home/dashboard-page'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

export default function HomePage() {
  const { currentUser, hasSession, loadingAuth } = useAuth();
  const router = useRouter();

  // Guests: paint landing immediately (don't wait on auth restore).
  if (!hasSession) {
    return (
      <LandingPage
        onSignIn={() => router.push('/login')}
        onSignUp={() => router.push('/signup')}
      />
    );
  }

  // Cached profile can paint the dashboard while the live snapshot finishes.
  if (currentUser) {
    return <DashboardPage currentUser={currentUser} />;
  }

  if (loadingAuth) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-container flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
    </div>
  );
}
