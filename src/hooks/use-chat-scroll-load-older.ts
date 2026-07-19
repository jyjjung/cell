"use client";

import { useEffect, useRef } from 'react';

const SCROLL_THRESHOLD_PX = 120;

export function isNearOldestInReverseList({
  scrollTop,
  scrollHeight,
  clientHeight,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}) {
  const scrollableDistance = Math.max(0, scrollHeight - clientHeight);
  const distanceFromNewest = Math.abs(scrollTop);
  return distanceFromNewest >= scrollableDistance - SCROLL_THRESHOLD_PX;
}

/** In a flex-col-reverse list, browsers may report upward scrolling with a negative scrollTop. */
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
      const nearOldest = isNearOldestInReverseList(el);
      if (nearOldest) onLoadOlder();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, [onLoadOlder, hasMoreOlder, loadingOlder]);

  return scrollRef;
}
