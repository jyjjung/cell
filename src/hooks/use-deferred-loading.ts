'use client';

import { useEffect, useState } from 'react';

/**
 * HIG loading: avoid flashing spinners for fast operations.
 * Returns true only after `delayMs` of continuous loading.
 */
export function useDeferredLoading(isLoading: boolean, delayMs = 400): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }

    const timer = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, delayMs]);

  return show;
}
