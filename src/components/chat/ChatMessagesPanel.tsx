"use client";

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useChatScrollLoadOlder } from '@/hooks/use-chat-scroll-load-older';
import { cn } from '@/lib/utils';

type ChatMessagesPanelProps = {
  children: ReactNode;
  footer: ReactNode;
  className?: string;
  contentClassName?: string;
  onLoadOlder?: () => void;
  loadingOlder?: boolean;
  hasMoreOlder?: boolean;
};

/**
 * Scroll container for messages with the input bar inside it (sticky bottom).
 * Focus/keyboard scrolling is confined here so headers above stay put.
 */
export default function ChatMessagesPanel({
  children,
  footer,
  className,
  contentClassName,
  onLoadOlder,
  loadingOlder = false,
  hasMoreOlder = false,
}: ChatMessagesPanelProps) {
  const scrollRef = useChatScrollLoadOlder({ onLoadOlder, hasMoreOlder, loadingOlder });

  return (
    <div
      ref={scrollRef}
      className={cn(
        'absolute inset-0 overflow-y-auto overflow-x-hidden flex flex-col-reverse',
        'custom-scrollbar touch-pan-y overscroll-y-contain',
        className,
      )}
    >
      <div className="sticky bottom-0 z-10 shrink-0 bg-background border-t border-border/40">
        {footer}
      </div>
      <div
        className={cn(
          'flex flex-col-reverse gap-1 max-w-3xl mx-auto w-full min-w-0 px-4 py-2',
          contentClassName,
        )}
      >
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
