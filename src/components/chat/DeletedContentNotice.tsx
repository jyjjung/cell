"use client";

import { cn } from '@/lib/utils';

/** Inline deleted notice — matches soft-deleted chat messages / setlists. */
export function DeletedContentNotice({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('chat-message-row py-2 flex justify-center w-full', className)}>
      <p className="text-[11px] italic text-muted-foreground/60">{label}</p>
    </div>
  );
}
