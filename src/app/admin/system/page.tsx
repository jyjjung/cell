
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function SystemAdminPage() {
  const { isAdmin, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth) {
        if (isAdmin) {
            router.replace('/chat/system');
        } else {
            router.replace('/dashboard');
        }
    }
  }, [isAdmin, loadingAuth, router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 opacity-30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest leading-none text-foreground/40">Redirecting to chat assistant...</p>
    </div>
  );
}
