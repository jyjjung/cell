"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';

/**
 * A slim banner that slides down when the user goes offline and slides up
 * briefly when they reconnect. It sits at the very top of the viewport,
 * above all other content.
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
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[300] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold pointer-events-none select-none"
          style={{
            background: showOffline
              ? 'rgba(239,68,68,0.92)'
              : 'rgba(34,197,94,0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
