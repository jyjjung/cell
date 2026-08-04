"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';

/**
 * Single offline signal for the app. Renders in document flow above the
 * header so it never covers full-screen viewers or chrome controls.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  // When we come back online, briefly flash a "reconnected" message then hide.
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
  const show = showOffline || showReconnected;

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 overflow-hidden select-none"
          role="status"
          aria-live="polite"
        >
          <div
            className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold"
            style={{
              background: showOffline
                ? 'rgba(239,68,68,0.92)'
                : 'rgba(34,197,94,0.92)',
            }}
          >
            {showOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-white shrink-0" />
                <span className="text-white">
                  You&apos;re offline — showing cached content
                </span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-white shrink-0" />
                <span className="text-white">Back online</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
