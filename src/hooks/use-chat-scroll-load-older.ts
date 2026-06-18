"use client";

import { useEffect, useRef } from 'react';

const SCROLL_THRESHOLD_PX = 120;

/** In a flex-col-reverse list, scrolling up increases scrollTop toward the oldest messages. */
export function useChatScrollLoadOlder({
  onLoadOlder,
  hasMoreOlder = false,
  loadingOlder = false,
}: {
  onLoadOlder?: () => void;
  hasMoreOlder?: boolean;
  loadingOlder?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onLoadOlder) return;

    const handleScroll = () => {
      if (!hasMoreOlder || loadingOlder) return;
      const nearOldest =
        el.scrollTop >= el.scrollHeight - el.clientHeight - SCROLL_THRESHOLD_PX;
      if (nearOldest) onLoadOlder();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [onLoadOlder, hasMoreOlder, loadingOlder]);

  return scrollRef;
}
