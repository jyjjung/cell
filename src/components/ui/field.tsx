'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { SelectionRow } from '@/components/ui/selection-row';
import { cn } from '@/lib/utils';

type FieldProps = React.HTMLAttributes<HTMLDivElement>;

export function Field({ className, ...props }: FieldProps) {
  return <div className={cn('space-y-2', className)} {...props} />;
}

type FieldLabelProps = React.ComponentPropsWithoutRef<typeof Label> & {
  required?: boolean;
};

export function FieldLabel({ children, required, className, ...props }: FieldLabelProps) {
  return (
    <Label className={cn('text-base', className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </Label>
  );
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}

export function FieldMessage({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-destructive', className)} role="alert" {...props} />;
}

type CheckboxFieldProps = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  disabled?: boolean;
  className?: string;
};

export function CheckboxField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: CheckboxFieldProps) {
  return (
    <SelectionRow
      htmlFor={id}
      label={label}
      description={description}
      disabled={disabled}
      className={className}
      control={
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={typeof label === 'string' ? label : undefined}
        />
      }
    />
  );
}

type RadioFieldProps = Omit<CheckboxFieldProps, 'checked' | 'onCheckedChange'> & {
  value: string;
};

export function RadioField({ id, value, label, description, disabled, className }: RadioFieldProps) {
  return (
    <SelectionRow
      htmlFor={id}
      label={label}
      description={description}
      disabled={disabled}
      className={className}
      control={
        <RadioGroupItem
          id={id}
          value={value}
          disabled={disabled}
          aria-label={typeof label === 'string' ? label : undefined}
        />
      }
    />
  );
}

type SearchInputProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, 'type'> & {
  onClear?: () => void;
};

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, value, defaultValue, ...props }, ref) => {
    const hasValue =
      typeof value === 'string' ? value.length > 0 : typeof defaultValue === 'string' && defaultValue.length > 0;

    return (
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={ref}
          type="search"
          value={value}
          defaultValue={defaultValue}
          className={cn('rounded-full pl-10', onClear && 'pr-10', className)}
          {...props}
        />
        {onClear && hasValue ? (
          <IconButton
            aria-label="Clear search"
            onClick={onClear}
            icon={X}
            size="compact"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        ) : null}
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';
