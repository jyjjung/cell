"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LandingPage from '@/components/home/landing-page';
import DashboardPage from '@/components/home/dashboard-page';

export default function HomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || loadingAuth) {
    return (
      <div className="page-container flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }
  
  if (!currentUser) {
      return (
        <LandingPage 
          onSignIn={() => router.push('/login')} 
          onSignUp={() => router.push('/signup')} 
        />
      );
  }

  return <DashboardPage currentUser={currentUser} />;
}
