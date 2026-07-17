"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useChatScrollLoadOlder } from '@/hooks/use-chat-scroll-load-older';
import { cn } from '@/lib/utils';

type ChatConversationPanelProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  onLoadOlder?: () => void;
  loadingOlder?: boolean;
  hasMoreOlder?: boolean;
};

/**
 * Messages scroll above a pinned input. Keyboard overlap is handled with
 * bottom padding only (no position/top syncing — that causes viewport shake).
 */
export default function ChatConversationPanel({
  children,
  footer,
  className,
  onLoadOlder,
  loadingOlder = false,
  hasMoreOlder = false,
}: ChatConversationPanelProps) {
  const scrollRef = useChatScrollLoadOlder({ onLoadOlder, hasMoreOlder, loadingOlder });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const vv = window.visualViewport;
    if (!panel || !vv) return;

    let lastInset = -1;

    const update = () => {
      // Keyboard height only — never touch top/position/scroll (avoids feedback shake).
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      if (inset === lastInset) return;
      lastInset = inset;
      panel.style.paddingBottom = inset > 0 ? `${inset}px` : '';
    };

    update();
    vv.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
      panel.style.paddingBottom = '';
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className={cn('flex-1 min-h-0 flex flex-col overflow-hidden', className)}
    >
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-2 flex flex-col-reverse custom-scrollbar touch-pan-y overscroll-y-contain"
        >
          <div className="flex flex-col-reverse gap-1 max-w-3xl mx-auto w-full min-w-0">
            {loadingOlder && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
      {footer ? (
        <div className="shrink-0 bg-background border-t border-border/40">{footer}</div>
      ) : null}
    </div>
  );
}
