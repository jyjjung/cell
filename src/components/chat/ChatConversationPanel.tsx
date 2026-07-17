"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChatConversationPanelProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** Scrollable messages plus pinned input — adjusts for the on-screen keyboard without moving fixed headers. */
export default function ChatConversationPanel({ children, footer, className }: ChatConversationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const vv = window.visualViewport;
    if (!panel || !vv) return;

    const update = () => {
      const bottomInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      panel.style.paddingBottom = bottomInset > 0 ? `${bottomInset}px` : '';
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      panel.style.paddingBottom = '';
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className={cn('flex-1 min-h-0 flex flex-col overflow-hidden', className)}
    >
      <div className="flex-1 min-h-0 relative overflow-hidden">{children}</div>
      {footer ? <div className="shrink-0 bg-background">{footer}</div> : null}
    </div>
  );
}
