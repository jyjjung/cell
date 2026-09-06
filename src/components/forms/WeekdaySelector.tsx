'use client';

import { FORM_WEEKDAY_OPTIONS, toggleWeekday } from '@/lib/forms/date-field-utils';
import { cn } from '@/lib/utils';
import { CheckboxField, Field, FieldDescription, FieldLabel } from '@/components/ui/field';

type Props = {
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
};

export default function WeekdaySelector({
  value,
  onChange,
  disabled = false,
  label = 'Allowed days',
  description = 'Leave all unchecked to allow any day. Pick specific days to limit choices (e.g. Thursdays only).',
}: Props) {
  return (
    <Field>
      <div>
        <FieldLabel className="text-xs">{label}</FieldLabel>
        {description ? <FieldDescription className="mt-0.5 text-xs">{description}</FieldDescription> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {FORM_WEEKDAY_OPTIONS.map(({ value: dayValue, label: dayLabel }) => {
          const selected = value.includes(dayValue);
          return (
            <CheckboxField
              key={dayValue}
              id={`weekday-${dayValue}`}
              label={dayLabel}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs font-medium transition-all',
                selected
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-muted/20 border-border/60 text-muted-foreground hover:bg-muted/40',
                disabled ? 'cursor-default opacity-60' : undefined,
              )}
              checked={selected}
              disabled={disabled}
              onCheckedChange={(checked) => onChange(toggleWeekday(value, dayValue, checked === true))}
            />
          );
        })}
      </div>
    </Field>
  );
}
