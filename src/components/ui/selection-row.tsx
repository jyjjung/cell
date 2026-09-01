'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type SelectionRowProps = {
  /** Checkbox, switch, or radio — keep visual size; row supplies hit target. */
  control: React.ReactNode;
  label: React.ReactNode;
  description?: React.ReactNode;
  htmlFor?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

/**
 * HIG selection row — full-width tappable target (≥44px) with visible label.
 * Pair with Checkbox, Switch, or RadioGroupItem.
 */
export function SelectionRow({
  control,
  label,
  description,
  htmlFor,
  disabled,
  className,
  onClick,
}: SelectionRowProps) {
  const Comp = htmlFor ? 'label' : 'div';

  return (
    <Comp
      htmlFor={htmlFor}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 touch-manipulation transition-colors',
        'hover:bg-muted/50 active:bg-muted/70',
        'has-[:focus-visible]:bg-muted/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent active:bg-transparent',
        className,
      )}
    >
      <span className="flex h-11 shrink-0 items-center">{control}</span>
      <span className="min-w-0 flex-1 space-y-0.5 pt-2.5">
        <span className="block text-base font-medium leading-snug text-foreground">{label}</span>
        {description ? (
          <span className="block text-sm leading-relaxed text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </Comp>
  );
}
