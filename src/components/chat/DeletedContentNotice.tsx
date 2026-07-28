'use client';

import { cn } from '@/lib/utils';

/** Inline deleted notice — matches soft-deleted chat messages (no card chrome). */
export function DeletedContentNotice({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <p className={cn('text-[11px] italic text-muted-foreground/60', className)}>
      {label}
    </p>
  );
}
