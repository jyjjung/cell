import { cn } from '@/lib/utils';

/**
 * Loading placeholder. Renders a span so it stays valid inside headings and
 * paragraphs, which lets skeletons reuse the real layout components.
 * Pass only sizing classes — the surface tone is fixed so placeholders across
 * the app read as one material.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('block animate-pulse rounded-md bg-muted/50', className)}
    />
  );
}
