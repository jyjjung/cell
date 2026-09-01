'use client';

import { useDeferredLoading } from '@/hooks/use-deferred-loading';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';

type LoadingStateProps = {
  /** When true, loading UI may appear (after optional delay). */
  isLoading: boolean;
  /** Accessible name for screen readers. */
  label?: string;
  /** Wait before showing UI — reduces flicker on fast loads (HIG). */
  delayMs?: number;
  className?: string;
  /** Centered spinner (default) or inline skeleton placeholders. */
  variant?: 'spinner' | 'skeleton';
  /** Number of skeleton rows when variant is skeleton. */
  skeletonRows?: number;
  children?: React.ReactNode;
};

/** Region that announces busy state and prefers skeletons over blocking spinners. */
export function LoadingState({
  isLoading,
  label = 'Loading',
  delayMs = 400,
  className,
  variant = 'spinner',
  skeletonRows = 3,
  children,
}: LoadingStateProps) {
  const show = useDeferredLoading(isLoading, delayMs);

  if (!isLoading && children) return <>{children}</>;
  if (!show) {
    return (
      <div className={cn('min-h-[1px]', className)} aria-busy={isLoading} aria-live="polite">
        {children}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div
        className={cn('space-y-3', className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
      >
        {Array.from({ length: skeletonRows }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center justify-center py-12', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <LoadingSpinner size="lg" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

type ListLoadingSkeletonProps = {
  rows?: number;
  className?: string;
};

/** Placeholder list while content loads — preserves layout (HIG loading). */
export function ListLoadingSkeleton({ rows = 4, className }: ListLoadingSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
