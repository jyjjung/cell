"use client";

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChatConversationPanelProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** Scrollable messages plus pinned input. Keyboard inset is handled by the chat frame. */
export default function ChatConversationPanel({ children, footer, className }: ChatConversationPanelProps) {
  return (
    <div className={cn('flex-1 min-h-0 flex flex-col overflow-hidden', className)}>
      <div className="flex-1 min-h-0 relative overflow-hidden">{children}</div>
      {footer ? <div className="shrink-0 bg-background">{footer}</div> : null}
    </div>
  );
}
