"use client";

import { useEffect, type RefObject } from 'react';

/**
 * Keep the chat shell aligned to the visible viewport when the keyboard opens.
 * Only listens to visualViewport *resize* — never scroll events or scrollTo,
 * which previously caused a feedback loop that shook the page.
 */
export function useChatViewportShell(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;

    let lastTop = Number.NaN;
    let lastHeight = Number.NaN;

    const clear = () => {
      el.style.position = '';
      el.style.top = '';
      el.style.left = '';
      el.style.right = '';
      el.style.width = '';
      el.style.height = '';
      el.style.zIndex = '';
    };

    const sync = () => {
      const top = Math.round(vv.offsetTop);
      const height = Math.round(vv.height);
      if (top === lastTop && height === lastHeight) return;
      lastTop = top;
      lastHeight = height;

      el.style.position = 'fixed';
      el.style.left = '0px';
      el.style.right = '0px';
      el.style.width = '100%';
      el.style.top = `${top}px`;
      el.style.height = `${height}px`;
      el.style.zIndex = '30';
    };

    // Establish fixed shell immediately so keyboard open doesn't switch layout modes.
    sync();
    vv.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      vv.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      clear();
    };
  }, [enabled, ref]);
}
