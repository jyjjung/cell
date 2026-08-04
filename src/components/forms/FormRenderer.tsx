"use client";

import { useMemo } from 'react';
import type { FormDefinition, FormAnswerValue, FormFieldDefinition } from '@/types/forms';
import { computeVisibleFields } from '@/lib/forms/validation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  form: FormDefinition;
  /** Current answers (fieldId -> value). */
  value: Record<string, FormAnswerValue>;
  onChange?: (next: Record<string, FormAnswerValue>) => void;
  errorsByFieldId?: Record<string, string> | null;
  readOnly?: boolean;
};

function getFieldOrder(fields: FormFieldDefinition[]) {
  return [...fields].sort((a, b) => a.order - b.order);
}

export default function FormRenderer({
  form,
  value,
  onChange,
  errorsByFieldId,
  readOnly = false,
}: Props) {
  const visible = useMemo(() => computeVisibleFields(form, value), [form, value]);
  const fields = useMemo(() => getFieldOrder(form.fields), [form.fields]);

  const setAnswer = (fieldId: string, nextValue: FormAnswerValue) => {
    if (!onChange) return;
    onChange({ ...value, [fieldId]: nextValue });
  };

  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const isVisible = visible[field.id] ?? true;
        if (!isVisible) return null;

        const fieldError = errorsByFieldId?.[field.id];
        const required = field.required;

        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium" htmlFor={`field-${field.id}`}>
                {field.label}
                {required ? <span className="text-destructive">*</span> : null}
              </Label>
              {fieldError ? (
                <span className="text-xs text-destructive">{fieldError}</span>
              ) : null}
            </div>

            {field.type === 'text' && (
              <Input
                id={`field-${field.id}`}
                disabled={readOnly}
                value={typeof value[field.id] === 'string' ? (value[field.id] as string) : ''}
                onChange={(e) => setAnswer(field.id, e.target.value)}
                className={fieldError ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
            )}

            {field.type === 'textarea' && (
              <Textarea
                id={`field-${field.id}`}
                disabled={readOnly}
                value={typeof value[field.id] === 'string' ? (value[field.id] as string) : ''}
                onChange={(e) => setAnswer(field.id, e.target.value)}
                className={fieldError ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
            )}

            {field.type === 'select' && (
              <Select
                disabled={readOnly}
                value={typeof value[field.id] === 'string' ? (value[field.id] as string) : ''}
                onValueChange={(v) => setAnswer(field.id, v)}
              >
                <SelectTrigger id={`field-${field.id}`}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === 'checkbox' && (
              <div className="space-y-2">
                {(field.options ?? []).map((opt) => {
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
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

