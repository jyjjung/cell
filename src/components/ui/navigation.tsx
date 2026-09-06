'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type NavigationButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  icon?: React.ReactNode;
  label?: React.ReactNode;
  direction?: 'row' | 'column';
  size?: 'small' | 'medium';
  active?: boolean;
};

export const NavigationButton = React.forwardRef<HTMLButtonElement, NavigationButtonProps>(
  (
    {
      className,
      icon,
      label,
      direction = 'column',
      size = 'small',
      active = false,
      children,
      ...props
    },
    ref,
  ) => (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-2 touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        direction === 'column' ? 'flex-col gap-2' : 'flex-row gap-1.5',
        size === 'small' ? 'text-sm font-semibold' : 'text-base',
        active
          ? 'text-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        className,
      )}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      {icon}
      {label ?? children}
    </Button>
  ),
);
NavigationButton.displayName = 'NavigationButton';

type NavigationPillProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  active?: boolean;
  label?: React.ReactNode;
};

export const NavigationPill = React.forwardRef<HTMLButtonElement, NavigationPillProps>(
  ({ className, active = false, label, children, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      className={cn(
        'inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-base leading-none touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active
          ? 'bg-primary/10 text-foreground'
          : 'text-foreground hover:bg-accent/50',
        className,
      )}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      {label ?? children}
    </Button>
  ),
);
NavigationPill.displayName = 'NavigationPill';

type NavigationListProps = React.HTMLAttributes<HTMLDivElement> & {
  direction?: 'row' | 'column';
};

export function NavigationButtonList({
  className,
  direction = 'row',
  ...props
}: NavigationListProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'row' ? 'flex-wrap items-center' : 'w-full flex-col items-stretch',
        className,
      )}
      {...props}
    />
  );
}

export function NavigationPillList({
  className,
  direction = 'row',
  ...props
}: NavigationListProps) {
  return (
    <div
      className={cn(
        'flex gap-1',
        direction === 'row' ? 'flex-wrap items-center' : 'w-full flex-col items-stretch',
        className,
      )}
      {...props}
    />
  );
}
