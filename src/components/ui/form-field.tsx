'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type FormFieldProps = {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Visible label + optional description/error for any control (HIG).
 * Pass `id`, `aria-invalid`, and `aria-describedby` to the child input.
 */
export function FormField({
  id,
  label,
  description,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  const descId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-base">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {description ? (
        <p id={descId} className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div
        data-form-field-control
        data-field-id={id}
        data-aria-describedby={describedBy}
        data-aria-invalid={error ? 'true' : undefined}
      >
        {children}
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Props to spread onto Input/Textarea/Select when wrapped in FormField. */
export function formFieldControlProps(id: string, error?: string, description?: string) {
  const descId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descId, errorId].filter(Boolean).join(' ') || undefined;
  return {
    id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': describedBy,
  };
}
