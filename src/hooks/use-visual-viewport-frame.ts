"use client";

import { useEffect, type RefObject } from 'react';

/**
 * Pin an element to the visual viewport on touch devices.
 * When the on-screen keyboard opens, the browser often shifts the visual viewport
 * (headers disappear above the screen). Matching top/height to visualViewport keeps
 * the chrome visible and shrinks only the available content area.
 */
export function useVisualViewportFrame(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;

    let raf = 0;

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
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) {
          clear();
          return;
        }

        el.style.position = 'fixed';
        el.style.left = '0px';
        el.style.right = '0px';
        el.style.width = '100%';
        el.style.top = `${vv.offsetTop}px`;
        el.style.height = `${vv.height}px`;
        el.style.zIndex = '40';
      });
    };

    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);

    const touchQuery = window.matchMedia('(pointer: coarse)');
    const onTouchChange = () => sync();
    touchQuery.addEventListener('change', onTouchChange);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      touchQuery.removeEventListener('change', onTouchChange);
      clear();
    };
  }, [enabled, ref]);
}
