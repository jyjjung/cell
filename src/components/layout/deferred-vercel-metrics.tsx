'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Analytics = dynamic(
  () => import('@vercel/analytics/react').then((m) => m.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights),
  { ssr: false },
);

/** Defer Vercel analytics until after first paint / idle to protect LCP. */
export function DeferredVercelMetrics() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof ric === 'function') {
      const id = ric(enable, { timeout: 4000 });
      const cancel = (
        window as Window & { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback;
      return () => {
        cancelled = true;
        cancel?.(id);
      };
    }

    const timer = window.setTimeout(enable, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
