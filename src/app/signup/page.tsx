
"use client";

import Link from 'next/link';
import SignupForm from '@/components/auth/signup-form';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { translations } from '@/lib/translations';

export default function SignupPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && currentUser) {
      if (currentUser.isApproved || currentUser.isAdmin) {
        router.push('/');
      } else {
        router.push('/pending-approval');
      }
    }
  }, [currentUser, loadingAuth, router, isMounted]);

  if (!isMounted || loadingAuth || (!loadingAuth && currentUser && isMounted)) {
    return null; 
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
       <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">{t.createAccount}</h1>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <SignupForm />
        </Suspense>

        <p className="text-center text-sm text-muted-foreground">
          {t.hasAccount}{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t.signIn}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
