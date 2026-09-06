'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Pagination({
  className,
  ...props
}: React.ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  );
}

export function PaginationItem({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn('shrink-0', className)} {...props} />;
}

type PaginationButtonProps = React.ComponentProps<typeof Button> & {
  isActive?: boolean;
};

export const PaginationLink = React.forwardRef<HTMLButtonElement, PaginationButtonProps>(
  ({ className, isActive = false, size = 'small', variant, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      size={size}
      variant={variant ?? (isActive ? 'primary' : 'ghost')}
      className={cn(
        'min-w-10 rounded-lg px-3 text-base font-normal',
        !isActive && 'text-foreground',
        className,
      )}
      aria-current={isActive ? 'page' : undefined}
      {...props}
    />
  ),
);
PaginationLink.displayName = 'PaginationLink';

export const PaginationPrevious = React.forwardRef<HTMLButtonElement, PaginationButtonProps>(
  ({ className, children = 'Previous', disabled, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="small"
      disabled={disabled}
      className={cn('gap-2 px-3 text-base font-normal', className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {children}
    </Button>
  ),
);
PaginationPrevious.displayName = 'PaginationPrevious';

export const PaginationNext = React.forwardRef<HTMLButtonElement, PaginationButtonProps>(
  ({ className, children = 'Next', disabled, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="small"
      disabled={disabled}
      className={cn('gap-2 px-3 text-base font-normal', className)}
      {...props}
    >
      {children}
      <ChevronRight className="h-4 w-4" aria-hidden />
    </Button>
  ),
);
PaginationNext.displayName = 'PaginationNext';

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      className={cn('flex h-8 min-w-10 items-center justify-center px-3', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
