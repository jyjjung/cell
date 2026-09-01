"use client";

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

/**
 * Compact header status pill. One signal for the whole app — not a full-width bar.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const t = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline]);

  const showOffline = !online;
  if (!showOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold select-none',
        showOffline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-success text-success-foreground',
      )}
    >
      {showOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">Offline</span>
          <span className="sr-only">You are offline. Showing cached content.</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">Back online</span>
        </>
      )}
    </div>
  );
}
