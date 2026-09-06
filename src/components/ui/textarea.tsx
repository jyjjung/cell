import * as React from 'react';

import {cn} from '@/lib/utils';

/** Textarea — matches Input tokens (44px-friendly type size, ring focus). */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground touch-manipulation',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
          'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30',
          'read-only:cursor-default read-only:bg-muted/40',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-100 disabled:text-muted-foreground',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
