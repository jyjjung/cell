
"use client";

import Link from 'next/link';
import LoginForm from '@/components/auth/login-form';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { translations } from '@/lib/translations';

export default function LoginPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && currentUser) {
      const destination = currentUser.isApproved || currentUser.isAdmin ? '/' : '/pending-approval';
      router.replace(destination);
    }
  }, [currentUser, loadingAuth, router, isMounted]);

   if (!isMounted || loadingAuth || (isMounted && !loadingAuth && currentUser)) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
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
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">{t.welcomeBack}</h1>
        </div>

        <LoginForm />

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
