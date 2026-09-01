
"use client";

import Link from 'next/link';
import SignupForm from '@/components/auth/signup-form';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { translations } from '@/lib/translations';
import { PageLoading } from '@/components/ui/loading-spinner';

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
    return <PageLoading />;
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
       <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="text-page-title">{t.createAccount}</h1>
        </div>

        <Suspense fallback={<PageLoading />}>
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
