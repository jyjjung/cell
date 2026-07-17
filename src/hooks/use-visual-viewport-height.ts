"use client";

import { useEffect, type RefObject } from 'react';

/**
 * On touch devices, pin a chat shell to the top of the screen and match visualViewport
 * height when the keyboard opens. Only height changes on resize — top stays at 0 so
 * headers do not jump, and we never listen to visualViewport scroll.
 */
export function useVisualViewportHeight(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;

    const touchQuery = window.matchMedia('(pointer: coarse)');

    const clear = () => {
      el.style.position = '';
      el.style.top = '';
      el.style.left = '';
      el.style.right = '';
      el.style.width = '';
      el.style.height = '';
      el.style.zIndex = '';
    };

    const apply = () => {
      if (!touchQuery.matches) {
        clear();
        return;
      }

      el.style.position = 'fixed';
      el.style.top = '0';
      el.style.left = '0';
      el.style.right = '0';
      el.style.width = '100%';
      el.style.height = `${vv.height}px`;
      el.style.zIndex = '1';
    };

    apply();
    vv.addEventListener('resize', apply);
    touchQuery.addEventListener('change', apply);

    return () => {
      vv.removeEventListener('resize', apply);
      touchQuery.removeEventListener('change', apply);
      clear();
    };
  }, [enabled, ref]);
}
