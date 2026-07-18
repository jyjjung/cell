"use client";

import { useEffect, useRef } from 'react';

const KEYBOARD_OPEN_PX = 80;
const STABILITY_MS = 80;
const FIRST_OPEN_KB_RATIO = 0.42;

type ChatKeyboardState = {
  savedKb: number;
  isOpen: boolean;
};

const state: ChatKeyboardState = {
  savedKb: 0,
  isOpen: false,
};

function isIOSLike() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function setShellHeight(heightPx: number) {
  document.documentElement.style.setProperty('--chat-vv-height', `${Math.max(200, Math.round(heightPx))}px`);
}

function setKeyboardOpen(open: boolean) {
  state.isOpen = open;
  document.documentElement.dataset.chatKeyboard = open ? 'open' : 'closed';
}

/**
 * Pre-shrink the chat shell before Safari's focus visibility check.
 * Call from textarea onMouseDown (fires before focus on iOS).
 */
export function preLiftChatComposer() {
  if (typeof window === 'undefined') return;
  if (!document.documentElement.dataset.chatDetail) return;
  // Desktop never uses the mobile chat shell lock.
  if (window.matchMedia('(min-width: 768px)').matches) return;

  const layoutH = window.innerHeight;
  const kb =
    state.savedKb > KEYBOARD_OPEN_PX
      ? state.savedKb
      : Math.round(layoutH * FIRST_OPEN_KB_RATIO);

  setShellHeight(layoutH - kb);
  setKeyboardOpen(true);
}

/**
 * Keep the chat shell sized to the visual viewport and learn a stable keyboard height.
 * Height only — never transform the shell (that can dismiss the iOS keyboard).
 */
export function useChatVisualViewportVars(enabled: boolean) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) {
      document.documentElement.style.removeProperty('--chat-vv-height');
      delete document.documentElement.dataset.chatKeyboard;
      return;
    }

    const root = document.documentElement;
    const vv = window.visualViewport;
    let layoutH = window.innerHeight;
    let lastHeight = Number.NaN;
    let pendingKb = 0;
    let stableTimer = 0;
    let raf = 0;

    const applyHeight = (height: number) => {
      if (height === lastHeight) return;
      lastHeight = height;
      setShellHeight(height);
    };

    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!enabledRef.current) return;

        if (!vv) {
          applyHeight(window.innerHeight);
          return;
        }

        // Refresh layout baseline when keyboard is clearly closed.
        if (vv.offsetTop < 1 && Math.abs(vv.height - window.innerHeight) < 2) {
          layoutH = window.innerHeight;
        }

        const height = Math.round(vv.height);
        const kb = Math.max(0, Math.round(layoutH - vv.height - vv.offsetTop));

        applyHeight(height);

        if (kb < KEYBOARD_OPEN_PX) {
          window.clearTimeout(stableTimer);
          pendingKb = 0;
          setKeyboardOpen(false);
          return;
        }

        setKeyboardOpen(true);
        pendingKb = kb;
        window.clearTimeout(stableTimer);
        stableTimer = window.setTimeout(() => {
          if (pendingKb > KEYBOARD_OPEN_PX) {
            state.savedKb = pendingKb;
          }
        }, STABILITY_MS);
      });
    };

    const onOrientation = () => {
      window.clearTimeout(stableTimer);
      state.savedKb = 0;
      setKeyboardOpen(false);
      window.setTimeout(() => {
        layoutH = window.innerHeight;
        lastHeight = Number.NaN;
        sync();
      }, 250);
    };

    // Safety net: only while keyboard open, snap accidental document scroll.
    const onWindowScroll = () => {
      if (state.isOpen && window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    applyHeight(vv?.height ?? window.innerHeight);
    sync();

    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', onOrientation);
    window.addEventListener('scroll', onWindowScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(stableTimer);
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', onOrientation);
      window.removeEventListener('scroll', onWindowScroll);
      root.style.removeProperty('--chat-vv-height');
      delete root.dataset.chatKeyboard;
      state.isOpen = false;
    };
  }, [enabled]);
}

export function useIsIOSLike() {
  return typeof window !== 'undefined' && isIOSLike();
}

export { isIOSLike };
