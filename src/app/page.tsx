"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLoadingVerse } from '@/hooks/use-loading-verse';
import LandingPage from '@/components/home/landing-page';
import DashboardPage from '@/components/home/dashboard-page';

export default function HomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const loadingVerse = useLoadingVerse();

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
                <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
            </motion.div>
            
            {loadingVerse && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <p className="text-xl md:text-2xl font-black tracking-tight leading-tight italic opacity-80">
                        "{loadingVerse.text}"
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">
                        — {loadingVerse.reference}
                    </p>
                </motion.div>
            )}
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
