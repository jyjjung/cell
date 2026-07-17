"use client";

import { useEffect } from 'react';

/** Prevent the document from scrolling (e.g. when a full-height panel handles its own scroll). */
export function useLockBodyScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    const vv = window.visualViewport;
    const preventViewportScroll = () => {
      window.scrollTo(0, 0);
    };
    vv?.addEventListener('scroll', preventViewportScroll);

    return () => {
      vv?.removeEventListener('scroll', preventViewportScroll);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [enabled]);
}
