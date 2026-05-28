
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
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-8 text-center max-w-2xl mx-auto space-y-12">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
        >
            <div className="relative inline-flex">
                <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/10">
                    <ShieldCheck className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-2 -right-2 p-2 rounded-full bg-background border-2 border-primary/20 shadow-xl"
                >
                    <Clock className="h-5 w-5 text-primary" />
                </motion.div>
            </div>

            <div className="space-y-4">
                <h1 className="text-2xl sm:text-2xl font-black tracking-tighter leading-none uppercase">
                    {t.awaitingAuth}.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-medium leading-tight">
                    {t.approvalDesc}
                </p>
            </div>

            <div className="p-6 rounded-[2rem] bg-muted border border-white/5 italic text-sm text-muted-foreground">
                "{t.contactAdmin}"
            </div>

            <div className="pt-8">
                <Button 
                    variant="outline" 
                    onClick={() => signOutUser()}
                    className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] bg-card/20 backdrop-blur-md border-white/10 hover:bg-destructive hover:text-white transition-all group active:scale-95"
                >
                    <LogOut className="mr-3 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    {t.signOut}
                </Button>
            </div>
        </motion.div>
    </div>
  );
}
