"use client";

import Link from 'next/link';
import LoginForm from '@/components/auth/login-form';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { syncServerSession } from '@/lib/client-session';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { translations } from '@/lib/translations';
import { PageLoading } from '@/components/ui/loading-spinner';

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  if (next.startsWith('/login') || next.startsWith('/signup')) return '/';
  return next;
}

function LoginPageInner() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const nextPath = safeNextPath(searchParams.get('next'));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || loadingAuth || !currentUser || redirecting) return;

    let cancelled = false;
    setRedirecting(true);

    void (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) await syncServerSession(idToken);
      } catch (error) {
        console.error('[LoginPage] Failed to sync session before redirect:', error);
      }
      if (!cancelled) router.replace(nextPath);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, loadingAuth, router, isMounted, nextPath, redirecting]);

  if (!isMounted || loadingAuth || redirecting || (isMounted && !loadingAuth && currentUser)) {
    return <PageLoading />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4"
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
          <h1 className="text-page-title">{t.welcomeBack}</h1>
        </div>

        <LoginForm redirectTo={nextPath} />

        <p className="text-center text-sm text-muted-foreground">
          {t.noAccount}{' '}
          <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            {t.register}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginPageInner />
    </Suspense>
  );
}
