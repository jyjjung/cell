
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';

export default function PendingApprovalPage() {
  const { currentUser, loadingAuth, signOutUser } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth) {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.isApproved || currentUser.isAdmin) {
        router.push('/');
      }
    }
  }, [currentUser, loadingAuth, router, isMounted]);

  if (!isMounted || loadingAuth) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-6 text-center max-w-lg mx-auto stack-gap-sm">
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="stack-gap-sm w-full"
        >
            <div className="relative inline-flex mx-auto">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-background border border-primary/20 shadow-sm">
                    <Clock className="h-4 w-4 text-primary" />
                </div>
            </div>

            <div className="stack-gap-sm">
                <h1 className="text-page-title">
                    {t.pendingApproval}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.approvalDesc}
                </p>
            </div>

            <div className="widget-surface p-4 text-sm text-muted-foreground italic">
                {t.contactAdmin}
            </div>

            <Button 
                variant="outline" 
                onClick={() => signOutUser()}
                className="h-10 px-6 rounded-lg text-sm"
            >
                <LogOut className="mr-2 h-4 w-4" />
                {t.signOut}
            </Button>
        </motion.div>
    </div>
  );
}
