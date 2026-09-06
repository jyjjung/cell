'use client';

import { useMemo } from 'react';
import type { FormDefinition, FormAnswerValue, FormFieldDefinition } from '@/types/forms';
import { computeVisibleFields } from '@/lib/forms/validation';
import { isProfileLinkedFieldType, isProfileReferenceFieldType } from '@/lib/forms/field-types';
import FormDateFieldInput from '@/components/forms/FormDateFieldInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type Props = {
  form: FormDefinition;
  value: Record<string, FormAnswerValue>;
  onChange?: (next: Record<string, FormAnswerValue>) => void;
  errorsByFieldId?: Record<string, string> | null;
  readOnly?: boolean;
  profileLinkedHint?: boolean;
};

function getFieldOrder(fields: FormFieldDefinition[]) {
  return [...fields].sort((a, b) => a.order - b.order);
}

const YES_NO_OPTIONS = ['Yes', 'No'];

export default function FormRenderer({
  form,
  value,
  onChange,
  errorsByFieldId,
  readOnly = false,
  profileLinkedHint = false,
}: Props) {
  const visible = useMemo(() => computeVisibleFields(form, value), [form, value]);
  const fields = useMemo(() => getFieldOrder(form.fields), [form.fields]);

  const setAnswer = (fieldId: string, nextValue: FormAnswerValue) => {
    if (!onChange) return;
    onChange({ ...value, [fieldId]: nextValue });
  };

  const fillableFields = fields.filter((f) => !isProfileReferenceFieldType(f.type));
  const profileReferenceFields = fields.filter((f) => {
    if (!isProfileReferenceFieldType(f.type)) return false;
    const answer = value[f.id];
    return typeof answer === 'string' && answer.trim().length > 0;
  });

  if (fillableFields.length === 0 && profileReferenceFields.length === 0) {
    return <p className="text-sm text-muted-foreground">This form has no questions to fill out yet.</p>;
  }

  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const selectValue = typeof value[field.id] === 'string' ? (value[field.id] as string) : '';

        // Profile name/email: show read-only so people can see what admins receive.
        if (isProfileReferenceFieldType(field.type)) {
          if (!selectValue.trim()) return null;
          return (
            <div key={field.id} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <Label className="text-sm font-medium" htmlFor={`field-${field.id}`}>
                  {field.label}
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  From your profile — form admins can see this
                </span>
              </div>
              <Input
                id={`field-${field.id}`}
                type={field.type === 'email' ? 'email' : 'text'}
                autoComplete={field.type === 'email' ? 'email' : 'name'}
                readOnly
                disabled
                value={selectValue}
                className="bg-muted/30"
              />
            </div>
          );
        }

        const isVisible = visible[field.id] ?? true;
        if (!isVisible) return null;

        const fieldError = errorsByFieldId?.[field.id];
        const required = field.required;
        const errorClass = fieldError ? 'border-destructive focus-visible:ring-destructive' : undefined;
        const linked = isProfileLinkedFieldType(field.type);

        const textLike =
          field.type === 'text' ||
          field.type === 'contactName' ||
          field.type === 'contactEmail' ||
          field.type === 'phone' ||
          field.type === 'number' ||
          field.type === 'time' ||
          field.type === 'url';

        const usesSharedCalendar =
          field.type === 'date' || field.type === 'dates' || field.type === 'birthday';

        const inputType =
          field.type === 'contactEmail'
            ? 'email'
            : field.type === 'phone'
              ? 'tel'
              : field.type === 'number'
                ? 'number'
                : field.type === 'time'
                  ? 'time'
                  : field.type === 'url'
                    ? 'url'
                    : 'text';

        return (
          <div key={field.id} className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Label className="text-sm font-medium" htmlFor={`field-${field.id}`}>
                {field.label}
                {required ? <span className="text-destructive ml-0.5">*</span> : null}
              </Label>
              {linked && profileLinkedHint ? (
                <span className="text-[11px] text-muted-foreground">
                  From your profile — editing here can update your account
                </span>
              ) : null}
            </div>

            {textLike && !usesSharedCalendar && (
              <Input
                id={`field-${field.id}`}
                type={inputType}
                autoComplete={
                  field.type === 'contactEmail'
                    ? 'email'
                    : field.type === 'contactName'
                      ? 'name'
                      : field.type === 'phone'
                        ? 'tel'
                        : field.type === 'birthday'
                          ? 'bday'
                          : field.type === 'url'
                            ? 'url'
                            : undefined
                }
                inputMode={field.type === 'number' ? 'decimal' : field.type === 'phone' ? 'tel' : undefined}
                disabled={readOnly}
                value={selectValue}
                onChange={(e) => setAnswer(field.id, e.target.value)}
                aria-invalid={!!fieldError}
                className={errorClass}
                placeholder={
                  field.type === 'contactEmail'
                    ? 'you@example.com'
                    : field.type === 'contactName'
                      ? 'Your name'
                      : field.type === 'phone'
                        ? '+61…'
                        : field.type === 'url'
                          ? 'https://'
                          : undefined
                }
              />
            )}

            {usesSharedCalendar && (field.type === 'date' || field.type === 'birthday') && (
              <FormDateFieldInput
                id={`field-${field.id}`}
                mode="single"
                value={selectValue}
                onChange={(next) => setAnswer(field.id, next)}
                allowedWeekdays={field.dateConfig?.allowedWeekdays}
                readOnly={readOnly}
                className={errorClass}
              />
            )}

            {field.type === 'dates' && (
              <FormDateFieldInput
                id={`field-${field.id}`}
                mode="multiple"
                value={Array.isArray(value[field.id]) ? (value[field.id] as string[]) : []}
                onChange={(next) => setAnswer(field.id, next)}
                allowedWeekdays={field.dateConfig?.allowedWeekdays}
                readOnly={readOnly}
                className={errorClass}
              />
            )}

            {field.type === 'textarea' && (
              <Textarea
                id={`field-${field.id}`}
                disabled={readOnly}
                value={selectValue}
                onChange={(e) => setAnswer(field.id, e.target.value)}
                aria-invalid={!!fieldError}
                className={errorClass}
                rows={4}
              />
            )}

            {(field.type === 'select' || field.type === 'yesno') && (
              <RadioGroup
                value={selectValue || undefined}
                onValueChange={(v) => setAnswer(field.id, v)}
                disabled={readOnly}
                className={cn(
                  'gap-2 rounded-xl border border-border/60 bg-muted/10 p-3',
                  fieldError ? 'border-destructive' : undefined,
                )}
                aria-invalid={!!fieldError}
              >
                {(field.type === 'yesno' ? YES_NO_OPTIONS : field.options ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No options configured</p>
                ) : (
                  (field.type === 'yesno' ? YES_NO_OPTIONS : field.options ?? []).map((opt) => {
                    const id = `field-${field.id}-${opt}`;
                    return (
                      <label
                        key={opt}
                        htmlFor={id}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors',
                          selectValue === opt ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/40',
                          readOnly ? 'cursor-default' : undefined,
                        )}
                      >
                        <RadioGroupItem value={opt} id={id} disabled={readOnly} />
                        <span>{opt}</span>
                      </label>
                    );
                  })
                )}
              </RadioGroup>
            )}

            {field.type === 'checkbox' && (
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                {(field.options ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No options configured</p>
                ) : (
                  (field.options ?? []).map((opt) => {
                    const selected = Array.isArray(value[field.id]) && (value[field.id] as string[]).includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selected}
                          disabled={readOnly}
                          onCheckedChange={(checked) => {
                            const current = Array.isArray(value[field.id]) ? (value[field.id] as string[]) : [];
                            if (checked === true) {
                              if (current.includes(opt)) return;
                              setAnswer(field.id, [...current, opt]);
                            } else {
                              setAnswer(field.id, current.filter((x) => x !== opt));
                            }
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}

            {fieldError ? (
              <p className="text-xs text-destructive" role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
