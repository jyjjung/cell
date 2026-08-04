'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';
import { useAuth } from '@/contexts/auth-context';
import { RefreshCw } from 'lucide-react';

const DISMISS_KEY = 'em_update_banner_dismissed_at';
const DISMISS_MS = 6 * 60 * 60 * 1000;

/**
 * Client-only deploy refresh prompt.
 * Uses the service worker lifecycle — no Vercel API / Fluid CPU.
 */
export function UpdateAvailableBanner() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const dismissedAt = Number(sessionStorage.getItem(DISMISS_KEY) || '0');
    if (Date.now() - dismissedAt < DISMISS_MS) return;

    let cancelled = false;

    const show = () => {
      if (cancelled) return;
      const last = Number(sessionStorage.getItem(DISMISS_KEY) || '0');
      if (Date.now() - last < DISMISS_MS) return;
      setVisible(true);
    };

    const onControllerChange = () => show();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const checkWaiting = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        if (reg.waiting) show();
        // Cheap: ask SW to check for updates (static sw.js from CDN — not Fluid functions).
        void reg.update().catch(() => {});
      } catch {
        // ignore
      }
    };

    void checkWaiting();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkWaiting();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm md:bottom-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-sm text-foreground">{t.appUpdateAvailable}</p>
        <Button
          size="sm"
          className="shrink-0 rounded-lg"
          onClick={() => {
            window.location.reload();
          }}
        >
          {t.appUpdateReload}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 rounded-lg"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
            setVisible(false);
          }}
        >
          {t.appUpdateLater}
        </Button>
      </div>
    </div>
  );
}
