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
      className={cn(
        'block rounded-md bg-muted/50 motion-safe:animate-pulse',
        'motion-reduce:bg-muted/70 motion-reduce:animate-none',
        className,
      )}
    />
  );
}
