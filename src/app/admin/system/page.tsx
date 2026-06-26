
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { translations } from '@/lib/translations';

export default function SystemAdminPage() {
  const { isAdmin, loadingAuth, currentUser } = useAuth();
  const router = useRouter();
  const t = translations[currentUser?.preferredLanguage || 'en'];

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
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 opacity-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-micro-label">{t.adminRedirecting}</p>
    </div>
  );
}
