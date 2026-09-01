'use client';

import { LoadingState as UiLoadingState } from '@/components/ui/loading-state';

/** @deprecated Prefer `import { LoadingState } from '@/components/ui/loading-state'` with `isLoading`. */
export function LoadingState() {
  return <UiLoadingState isLoading delayMs={0} variant="skeleton" skeletonRows={4} />;
}
