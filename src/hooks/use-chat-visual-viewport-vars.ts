"use client";

import { useEffect } from 'react';

/**
 * Keep the chat shell inside the visible area when the keyboard opens.
 * Uses CSS variables + transform (not top/scrollTo) to avoid the iOS feedback shake.
 */
export function useChatVisualViewportVars(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    const vv = window.visualViewport;
    if (!vv) return;

    let lastHeight = Number.NaN;
    let lastOffset = Number.NaN;

    const sync = () => {
      const height = Math.round(vv.height);
      const offset = Math.round(vv.offsetTop);
      if (height === lastHeight && offset === lastOffset) return;
      lastHeight = height;
      lastOffset = offset;
      root.style.setProperty('--chat-vv-height', `${height}px`);
      root.style.setProperty('--chat-vv-offset', `${offset}px`);
    };

    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);

    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      root.style.removeProperty('--chat-vv-height');
      root.style.removeProperty('--chat-vv-offset');
    };
  }, [enabled]);
}
