'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  formatDateValue,
  isWeekdayAllowed,
  parseDateValue,
} from '@/lib/forms/date-field-utils';
import { cn } from '@/lib/utils';

type SingleProps = {
  mode: 'single';
  value: string;
  onChange: (next: string) => void;
};

type MultipleProps = {
  mode: 'multiple';
  value: string[];
  onChange: (next: string[]) => void;
};

type Props = (SingleProps | MultipleProps) & {
  allowedWeekdays?: number[];
  readOnly?: boolean;
  id?: string;
  className?: string;
};

export default function FormDateFieldInput({
  mode,
  value,
  onChange,
  allowedWeekdays,
  readOnly = false,
  id,
  className,
}: Props) {
  const disabledMatcher = useMemo(() => {
    if (!allowedWeekdays?.length) return undefined;
    return (date: Date) => !isWeekdayAllowed(date, allowedWeekdays);
  }, [allowedWeekdays]);

  const selectedSingle = mode === 'single' && value ? parseDateValue(value) ?? undefined : undefined;
  const selectedMultiple = useMemo(() => {
    if (mode !== 'multiple' || !Array.isArray(value)) return [];
    return value
      .map((item) => parseDateValue(item))
      .filter((date): date is Date => date !== null);
  }, [mode, value]);

  const summaryLabel =
    mode === 'single'
      ? selectedSingle
        ? format(selectedSingle, 'PPP')
        : 'Pick a date'
      : selectedMultiple.length > 0
        ? `${selectedMultiple.length} date${selectedMultiple.length === 1 ? '' : 's'} selected`
        : 'Pick dates';

  const removeDate = (dateStr: string) => {
    if (mode !== 'multiple' || readOnly) return;
    const current = Array.isArray(value) ? value : [];
    onChange(current.filter((item) => item !== dateStr));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={readOnly}
            className={cn(
              'w-full justify-start rounded-xl font-normal',
              !value || (Array.isArray(value) && value.length === 0) ? 'text-muted-foreground' : undefined,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
            <span className="truncate">{summaryLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {mode === 'single' ? (
            <Calendar
              mode="single"
              selected={selectedSingle}
              disabled={disabledMatcher}
              onSelect={(date) => onChange(date ? formatDateValue(date) : '')}
              initialFocus
            />
          ) : (
            <Calendar
              mode="multiple"
              selected={selectedMultiple}
              disabled={disabledMatcher}
              onSelect={(dates) => {
                const next = (dates ?? [])
                  .map((date) => formatDateValue(date))
                  .sort();
                onChange(next);
              }}
              initialFocus
            />
          )}
        </PopoverContent>
      </Popover>

      {mode === 'multiple' && Array.isArray(value) && value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((dateStr) => {
            const parsed = parseDateValue(dateStr);
            return (
              <span
                key={dateStr}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/20 px-2 py-1 text-xs"
              >
                {parsed ? format(parsed, 'MMM d, yyyy') : dateStr}
                {!readOnly ? (
                  <button
                    type="button"
                    className="rounded-sm text-muted-foreground hover:text-foreground"
                    onClick={() => removeDate(dateStr)}
                    aria-label={`Remove ${dateStr}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}

      {allowedWeekdays?.length ? (
        <p className="text-[11px] text-muted-foreground">
          Only{' '}
          {allowedWeekdays
            .map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day])
            .join(', ')}{' '}
          can be selected.
        </p>
      ) : null}
    </div>
  );
}
