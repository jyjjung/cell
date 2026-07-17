"use client";

import type { ReactNode } from 'react';
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
 * One scroll container owns messages + input.
 * Input is inside the scroller (sticky bottom) so focus/keyboard scrolling
 * happens here instead of moving the page headers.
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

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col-reverse',
        'custom-scrollbar touch-pan-y overscroll-y-contain',
        className,
      )}
    >
      {footer ? (
        <div className="sticky bottom-0 z-10 shrink-0 bg-background border-t border-border/40">
          {footer}
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-1 max-w-3xl mx-auto w-full min-w-0 px-4 py-2">
        {loadingOlder && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
