"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import LandingPage from '@/components/home/landing-page';
import DashboardPage from '@/components/home/dashboard-page';

export default function HomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || loadingAuth) {
    return (
        <div className="flex flex-col items-center justify-center h-screen px-8 text-center max-w-2xl mx-auto space-y-12">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative"
            >
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </motion.div>
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
