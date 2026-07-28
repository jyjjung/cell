"use client";

import { cn } from '@/lib/utils';

/** Inline deleted notice — same centered italic style as soft-deleted chat messages. */
export function DeletedContentNotice({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('chat-message-row flex w-full justify-center py-1', className)}>
      <p className="text-[11px] italic text-muted-foreground/60">{label}</p>
    </div>
  );
}
