'use client';

import type { ReactNode } from 'react';
import { PageLoading } from '@/components/ui/loading-spinner';

type LayoutGateProps = {
  /** Auth or data still loading. */
  loading: boolean;
  /** User may view content (passed access checks). */
  ready: boolean;
  children: ReactNode;
  label?: string;
};

/** Auth/layout shell — skeleton loading, never a blank screen (HIG). */
export function LayoutGate({ loading, ready, children, label = 'Loading' }: LayoutGateProps) {
  if (loading || !ready) {
    return <PageLoading label={label} variant="skeleton" />;
  }
  return <>{children}</>;
}
