'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';

type TagScheme = 'Brand' | 'Danger' | 'Positive' | 'Warning' | 'Neutral';
type TagVariant = 'Primary' | 'Secondary';

const tagStyles: Record<TagScheme, Record<TagVariant, string>> = {
  Brand: {
    Primary: 'bg-primary text-primary-foreground',
    Secondary: 'bg-primary/10 text-primary',
  },
  Danger: {
    Primary: 'bg-destructive text-destructive-foreground',
    Secondary: 'bg-destructive/10 text-destructive',
  },
  Positive: {
    Primary: 'bg-success text-success-foreground',
    Secondary: 'bg-success/10 text-success',
  },
  Warning: {
    Primary: 'bg-secondary text-secondary-foreground',
    Secondary: 'bg-secondary text-secondary-foreground',
  },
  Neutral: {
    Primary: 'bg-foreground text-background',
    Secondary: 'bg-muted text-muted-foreground',
  },
};

export type TagProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  label?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  scheme?: TagScheme;
  variant?: TagVariant;
};

export function Tag({
  className,
  children,
  icon,
  label,
  removable = true,
  onRemove,
  removeLabel = 'Remove tag',
  scheme = 'Brand',
  variant = 'Primary',
  ...props
}: TagProps) {
  return (
    <div
      className={cn(
        'inline-flex min-h-8 items-center justify-center gap-2 rounded-lg p-2 text-base leading-none',
        tagStyles[scheme][variant],
        className,
      )}
      {...props}
    >
      {icon}
      <span className="whitespace-nowrap">{label ?? children}</span>
      {removable && onRemove ? (
        <IconButton
          type="button"
          size="compact"
          variant="ghost"
          aria-label={removeLabel}
          icon={X}
          onClick={onRemove}
          className="h-4 w-4 min-h-4 min-w-4 rounded-full p-0 hover:bg-black/10"
          iconClassName="h-4 w-4"
        />
      ) : null}
    </div>
  );
}

export type TagToggleProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'type'
> & {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  showIcon?: boolean;
  state?: boolean;
};

export const TagToggle = React.forwardRef<HTMLButtonElement, TagToggleProps>(
  (
    {
      className,
      children,
      label,
      icon,
      showIcon = true,
      state = false,
      ...props
    },
    ref,
  ) => (
    <Button
      ref={ref}
      type="button"
      aria-pressed={state}
      variant={state ? 'primary' : 'ghost'}
      size="xs"
      className={cn(
        'h-auto min-h-8 rounded-lg p-2 text-base leading-none',
        !state && 'bg-primary/10 text-muted-foreground hover:bg-primary/15',
        className,
      )}
      {...props}
    >
      {state && showIcon ? icon ?? <Check className="h-4 w-4" aria-hidden /> : null}
      <span className="whitespace-nowrap">{label ?? children}</span>
    </Button>
  ),
);
TagToggle.displayName = 'TagToggle';

export function TagToggleGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      className={cn('flex flex-wrap items-start gap-2', className)}
      {...props}
    />
  );
}
