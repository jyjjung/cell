"use client";

import { useEffect } from 'react';

/**
 * Shrink the chat shell to the visible viewport height when the keyboard opens.
 * Height only — never transform/translate while focused (that dismisses the iOS keyboard).
 * Debounced so mid-animation height thrashing does not blur the input.
 */
export function useChatVisualViewportVars(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    const vv = window.visualViewport;
    if (!vv) return;

    let lastHeight = Number.NaN;
    let timer = 0;

    const apply = () => {
      const height = Math.round(vv.height);
      if (height === lastHeight) return;
      lastHeight = height;
      root.style.setProperty('--chat-vv-height', `${height}px`);
    };

    const sync = () => {
      window.clearTimeout(timer);
      // Apply after the keyboard animation settles to avoid blur/glitch mid-transition.
      timer = window.setTimeout(apply, 120);
    };

    apply();
    vv.addEventListener('resize', sync);

    return () => {
      window.clearTimeout(timer);
      vv.removeEventListener('resize', sync);
      root.style.removeProperty('--chat-vv-height');
      root.style.removeProperty('--chat-vv-offset');
    };
  }, [enabled]);
}
