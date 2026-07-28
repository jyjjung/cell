"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

const SCROLL_THRESHOLD_PX = 120;
const AWAY_FROM_BOTTOM_PX = 200;

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

export function isAwayFromNewestInReverseList({
  scrollTop,
}: {
  scrollTop: number;
  scrollHeight?: number;
  clientHeight?: number;
}) {
  return Math.abs(scrollTop) > AWAY_FROM_BOTTOM_PX;
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
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const jumpToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: 'smooth' });
    setShowJumpToLatest(false);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowJumpToLatest(isAwayFromNewestInReverseList(el));
      if (!onLoadOlder || !hasMoreOlder || loadingOlder) return;
      const nearOldest = isNearOldestInReverseList(el);
      if (nearOldest) onLoadOlder();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, [onLoadOlder, hasMoreOlder, loadingOlder]);

  return { scrollRef, showJumpToLatest, jumpToLatest };
}
