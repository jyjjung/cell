"use client";

import { useEffect, type RefObject } from 'react';

/**
 * Keep a chat shell glued to the visible screen on mobile.
 * iOS moves visualViewport.offsetTop when the keyboard opens; without syncing,
 * fixed/sticky headers slide off the top of the screen.
 */
export function useChatViewportShell(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    const vv = window.visualViewport;
    let raf = 0;

    const clear = () => {
      el.style.position = '';
      el.style.top = '';
      el.style.left = '';
      el.style.right = '';
      el.style.width = '';
      el.style.height = '';
      el.style.zIndex = '';
      el.style.maxHeight = '';
    };

    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const height = vv?.height ?? window.innerHeight;
        const offsetTop = vv?.offsetTop ?? 0;

        el.style.position = 'fixed';
        el.style.left = '0px';
        el.style.right = '0px';
        el.style.width = '100%';
        el.style.top = `${offsetTop}px`;
        el.style.height = `${height}px`;
        el.style.maxHeight = `${height}px`;
        el.style.zIndex = '30';

        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      });
    };

    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      clear();
    };
  }, [enabled, ref]);
}
