'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type IconButtonProps = Omit<React.ComponentProps<typeof Button>, 'size' | 'children'> & {
  /** Required for accessibility (HIG). */
  'aria-label': string;
  icon: React.ElementType;
  iconClassName?: string;
  /**
   * `default` — 44×44 drawn control (toolbars, composer, hub).
   * `compact` — small visual for dense inline (chat actions, chips).
   * Do not use overflowing 44px hit overlays here; they overlap neighbors.
   */
  size?: 'default' | 'compact';
};

/** Icon-only control with enforced label. Default size is 44×44; `compact` stays small for dense rows. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, iconClassName, className, variant = 'ghost', size = 'default', ...props }, ref) => {
    const compact = size === 'compact';
    return (
      <Button
        ref={ref}
        type="button"
        size={compact ? 'iconCompact' : 'icon'}
        variant={variant}
        className={className}
        {...props}
      >
        <Icon className={cn(compact ? 'h-3 w-3' : 'h-5 w-5', iconClassName)} aria-hidden />
      </Button>
    );
  },
);
IconButton.displayName = 'IconButton';
