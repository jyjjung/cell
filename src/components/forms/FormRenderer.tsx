"use client";

import { useMemo } from 'react';
import type { FormDefinition, FormAnswerValue, FormFieldDefinition } from '@/types/forms';
import { computeVisibleFields } from '@/lib/forms/validation';
import { isProfileLinkedFieldType } from '@/lib/forms/field-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">This form has no fields yet.</p>;
  }

  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const isVisible = visible[field.id] ?? true;
        if (!isVisible) return null;

        const fieldError = errorsByFieldId?.[field.id];
        const required = field.required;
        const selectValue = typeof value[field.id] === 'string' ? (value[field.id] as string) : '';
        const errorClass = fieldError ? 'border-destructive focus-visible:ring-destructive' : undefined;
        const linked = isProfileLinkedFieldType(field.type);

        const textLike =
          field.type === 'text' ||
          field.type === 'name' ||
          field.type === 'email' ||
          field.type === 'phone' ||
          field.type === 'number' ||
          field.type === 'date' ||
          field.type === 'time' ||
          field.type === 'url';

        const inputType =
          field.type === 'email'
            ? 'email'
            : field.type === 'phone'
              ? 'tel'
              : field.type === 'number'
                ? 'number'
                : field.type === 'date'
                  ? 'date'
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
                <span className="text-[11px] text-muted-foreground">Filled from your profile — you can edit it</span>
              ) : null}
            </div>

            {textLike && (
              <Input
                id={`field-${field.id}`}
                type={inputType}
                autoComplete={
                  field.type === 'email'
                    ? 'email'
                    : field.type === 'name'
                      ? 'name'
                      : field.type === 'phone'
                        ? 'tel'
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
                  field.type === 'email'
                    ? 'you@example.com'
                    : field.type === 'name'
                      ? 'Your name'
                      : field.type === 'phone'
                        ? '+61…'
                        : field.type === 'url'
                          ? 'https://'
                          : undefined
                }
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
              <Select
                disabled={readOnly}
                value={selectValue || undefined}
                onValueChange={(v) => setAnswer(field.id, v)}
              >
                <SelectTrigger
                  id={`field-${field.id}`}
                  aria-invalid={!!fieldError}
                  className={errorClass}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(field.type === 'yesno' ? YES_NO_OPTIONS : field.options ?? []).length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      No options configured
                    </SelectItem>
                  ) : (
                    (field.type === 'yesno' ? YES_NO_OPTIONS : field.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
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
