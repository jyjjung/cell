'use client';

import type { ReactNode } from 'react';
import { SelectionRow } from '@/components/ui/selection-row';
import { Switch } from '@/components/ui/switch';

type SwitchRowProps = {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** HIG settings row: full-width tap target + visible label + switch. */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchRowProps) {
  const ariaLabel = typeof label === 'string' ? label : undefined;

  return (
    <SelectionRow
      htmlFor={id}
      label={label}
      description={description}
      disabled={disabled}
      className={className}
      control={
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={ariaLabel}
        />
      }
    />
  );
}
