"use client";

import { cn } from '@/lib/utils';

export function DeletedContentNotice({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-[11px] font-medium italic text-muted-foreground',
        className,
      )}
    >
      {label}
    </div>
  );
}
