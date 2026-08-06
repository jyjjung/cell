'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FORM_WEEKDAY_OPTIONS, toggleWeekday } from '@/lib/forms/date-field-utils';
import { cn } from '@/lib/utils';

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
    <div className="space-y-2">
      <div>
        <Label className="text-xs">{label}</Label>
        {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {FORM_WEEKDAY_OPTIONS.map(({ value: dayValue, label: dayLabel }) => {
          const selected = value.includes(dayValue);
          return (
            <label
              key={dayValue}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer transition-all',
                selected
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-muted/20 border-border/60 text-muted-foreground hover:bg-muted/40',
                disabled ? 'cursor-default opacity-60' : undefined,
              )}
            >
              <Checkbox
                checked={selected}
                disabled={disabled}
                className="hidden"
                onCheckedChange={(checked) =>
                  onChange(toggleWeekday(value, dayValue, checked === true))
                }
              />
              {dayLabel}
            </label>
          );
        })}
      </div>
    </div>
  );
}
