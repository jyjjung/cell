"use client";

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChatConversationPanelProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Messages scroll in the middle; input stays pinned at the bottom.
 * On mobile the input uses fixed positioning so iOS keeps it above the keyboard
 * without repositioning the page or headers.
 */
export default function ChatConversationPanel({ children, footer, className }: ChatConversationPanelProps) {
  return (
    <div className={cn('flex-1 min-h-0 flex flex-col overflow-hidden', className)}>
      <div
        className={cn(
          'flex-1 min-h-0 relative overflow-hidden',
          footer && 'max-md:pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]',
        )}
      >
        {children}
      </div>
      {footer ? (
        <div
          className={cn(
            'shrink-0 bg-background',
            'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:border-t max-md:border-border/40',
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
