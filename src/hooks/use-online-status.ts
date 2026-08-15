"use client";

import { useState, useEffect } from 'react';

/** Browser online/offline (PWA and tab). */
export function useOnlineStatus(): boolean {
  // Assume online until mounted — reading navigator.onLine during render causes
  // hydration mismatches when the tab is actually offline.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  return online;
}
