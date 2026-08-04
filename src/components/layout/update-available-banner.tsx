'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';
import { useAuth } from '@/contexts/auth-context';
import { RefreshCw } from 'lucide-react';

const DISMISS_KEY = 'em_update_banner_dismissed_at';
const RELOADED_KEY = 'em_update_banner_reloaded_at';
/** Hide after "Later" for the rest of the tab session (or 12h). */
const DISMISS_MS = 12 * 60 * 60 * 1000;
/** After Reload, suppress the banner so controllerchange does not re-prompt. */
const RELOAD_COOLDOWN_MS = 5 * 60 * 1000;
/** Do not hammer update() on every tab focus. */
const UPDATE_CHECK_MIN_MS = 30 * 60 * 1000;

function isDismissed(): boolean {
  const dismissedAt = Number(sessionStorage.getItem(DISMISS_KEY) || '0');
  if (Date.now() - dismissedAt < DISMISS_MS) return true;
  const reloadedAt = Number(sessionStorage.getItem(RELOADED_KEY) || '0');
  if (Date.now() - reloadedAt < RELOAD_COOLDOWN_MS) return true;
  return false;
}

/**
 * Prompt once when a new PWA service worker is ready while this page is still
 * on the old controller. Avoids the old bug of showing on every controllerchange
 * (including right after Reload).
 */
export function UpdateAvailableBanner() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (isDismissed()) return;

    let cancelled = false;
    let lastUpdateCheckAt = 0;

    const show = () => {
      if (cancelled || isDismissed()) return;
      setVisible(true);
    };

    const watchWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      // New SW finished installing while this tab still has an old controller.
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        show();
      }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          show();
        }
      });
    };

    const checkRegistration = async (opts?: { requestUpdate?: boolean }) => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg || cancelled) return;

        // Prefer the Workbox/PWA worker — ignore the FCM push-scope registration.
        const scriptUrl = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
        if (scriptUrl.includes('firebase-messaging-sw.js')) return;

        if (reg.waiting && navigator.serviceWorker.controller) {
          show();
        }
        watchWorker(reg.installing);

        reg.addEventListener('updatefound', () => {
          watchWorker(reg.installing);
        });

        if (opts?.requestUpdate) {
          const now = Date.now();
          if (now - lastUpdateCheckAt >= UPDATE_CHECK_MIN_MS) {
            lastUpdateCheckAt = now;
            void reg.update().catch(() => {});
          }
        }
      } catch {
        // ignore
      }
    };

    void checkRegistration({ requestUpdate: true });

    // With skipWaiting, the new worker may activate before we observe "installed".
    // Prompt once when control changes mid-session — but never right after Reload.
    const onControllerChange = () => show();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkRegistration({ requestUpdate: true });
      }
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
            sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
            const reload = () => window.location.reload();
            void navigator.serviceWorker
              .getRegistration('/')
              .then((reg) => {
                if (reg?.waiting) {
                  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
              })
              .catch(() => {})
              .finally(() => {
                // Give skipWaiting a tick when a waiting worker exists.
                window.setTimeout(reload, 50);
              });
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
