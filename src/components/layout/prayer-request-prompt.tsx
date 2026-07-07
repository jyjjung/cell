"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { HeartHandshake } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { usePrayerRequests } from '@/hooks/use-prayer-requests';
import { usePageLoading } from '@/contexts/page-loading-context';
import { translations } from '@/lib/translations';

const DISMISS_PREFIX = 'prayer-request-prompt-dismissed';

function getDismissKey(uid: string) {
  return `${DISMISS_PREFIX}:${uid}`;
}

export function PrayerRequestPrompt() {
  const { currentUser } = useAuth();
  const { requests, loading, isShepherd } = usePrayerRequests();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => {
    if (!currentUser?.uid || loading || isShepherd) return;
    if (pathname === '/prayer-requests') return;
    if (requests.length > 0) return;
    if (typeof window !== 'undefined' && localStorage.getItem(getDismissKey(currentUser.uid)) === 'true') {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [currentUser?.uid, loading, isShepherd, requests.length, pathname]);

  const handleDontAskAgain = () => {
    if (currentUser?.uid) {
      localStorage.setItem(getDismissKey(currentUser.uid), 'true');
    }
    setOpen(false);
  };

  const handleGoToPrayer = () => {
    setOpen(false);
    setIsPageLoading(true);
    router.push('/prayer-requests');
  };

  if (!currentUser || isShepherd) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm rounded-xl border-border/70 p-5">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base font-semibold leading-snug">{t.prayerRequests}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {t.prayerRequestPromptMessage}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full" onClick={handleGoToPrayer}>
            {t.submitPrayerRequest}
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleDontAskAgain}>
            {t.prayerRequestPromptDontAskAgain}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
