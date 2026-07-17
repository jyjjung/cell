"use client";

import { useEffect, useState } from 'react';

/** Keyboard overlap in px: layout viewport bottom minus visual viewport bottom. */
export function useVisualViewportInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const bottomInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(bottomInset);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
