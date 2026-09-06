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
  size?: 'default' | 'small' | 'compact';
};

/** Icon-only control with enforced label. Default size is 44×44; `compact` stays small for dense rows. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, iconClassName, className, variant = 'ghost', size = 'default', ...props }, ref) => {
    const compact = size === 'compact';
    const small = size === 'small';
    return (
      <Button
        ref={ref}
        type="button"
        size={compact ? 'iconCompact' : 'icon'}
        variant={variant}
        className={cn(small && 'h-9 w-9 min-h-9 min-w-9', className)}
        {...props}
      >
        <Icon className={cn(compact ? 'h-4 w-4' : small ? 'h-4 w-4' : 'h-5 w-5', iconClassName)} aria-hidden />
      </Button>
    );
  },
);
IconButton.displayName = 'IconButton';
