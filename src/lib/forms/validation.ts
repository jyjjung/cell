import type { FormDefinition, FormFieldDefinition, FormAnswerValue } from '@/types/forms';

export type VisibleFieldMap = Record<string, boolean>;

function isConditionalSatisfied(field: FormFieldDefinition, answers: Record<string, FormAnswerValue>): boolean {
  if (!field.conditional) return true;
  const dependsOnValue = answers[field.conditional.dependsOnFieldId];
  if (typeof dependsOnValue === 'string') return dependsOnValue === field.conditional.equals;
  if (Array.isArray(dependsOnValue)) return dependsOnValue.includes(field.conditional.equals);
  return false;
}

export function computeVisibleFields(form: FormDefinition, answers: Record<string, FormAnswerValue>): VisibleFieldMap {
  const visible: VisibleFieldMap = {};
  for (const field of [...form.fields].sort((a, b) => a.order - b.order)) {
    visible[field.id] = isConditionalSatisfied(field, answers);
  }
  return visible;
}

export function validateFormResponse(
  form: FormDefinition,
  answers: Record<string, FormAnswerValue>,
): { errorsByFieldId: Record<string, string> } {
  const visibleFields = computeVisibleFields(form, answers);
  const errorsByFieldId: Record<string, string> = {};

  for (const field of form.fields) {
    const isVisible = visibleFields[field.id] ?? true;
    if (!isVisible) continue;
    if (!field.required) continue;

    const value = answers[field.id];
    const hasValue =
      field.type === 'checkbox'
        ? Array.isArray(value) && value.length > 0
        : typeof value === 'string' && value.trim().length > 0;

    if (!hasValue) {
      errorsByFieldId[field.id] = 'This field is required.';
    }
  }

  return { errorsByFieldId };
}

