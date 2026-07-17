"use client";

import type { CSSProperties, ReactNode } from 'react';
import { useVisualViewportInset } from '@/hooks/use-visual-viewport-inset';
import { cn } from '@/lib/utils';

type ChatConversationPanelProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** Scrollable messages plus pinned input — adjusts for the on-screen keyboard without moving fixed headers. */
export default function ChatConversationPanel({ children, footer, className }: ChatConversationPanelProps) {
  const keyboardInset = useVisualViewportInset();

  const style: CSSProperties | undefined =
    keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined;

  return (
    <div
      className={cn('flex-1 min-h-0 flex flex-col overflow-hidden', className)}
      style={style}
    >
      <div className="flex-1 min-h-0 relative overflow-hidden">{children}</div>
      {footer ? <div className="shrink-0 bg-background">{footer}</div> : null}
    </div>
  );
}
