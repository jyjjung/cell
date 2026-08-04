import type { FormDefinition, FormFieldDefinition, FormAnswerValue } from '@/types/forms';
import { isProfileReferenceFieldType } from '@/lib/forms/field-types';

export type VisibleFieldMap = Record<string, boolean>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Accept a bare public token or a full /forms/public/<token> URL. */
export function extractPublicFormToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/forms\/public\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Not an absolute URL — try path-style paste.
  }
  const pathMatch = trimmed.match(/\/forms\/public\/([^/?#]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
  return trimmed;
}

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
    if (isProfileReferenceFieldType(field.type)) {
      visible[field.id] = false;
      continue;
    }
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
    if (isProfileReferenceFieldType(field.type)) continue;

    const isVisible = visibleFields[field.id] ?? true;
    if (!isVisible) continue;

    const value = answers[field.id];
    const stringValue = typeof value === 'string' ? value.trim() : '';
    const hasValue =
      field.type === 'checkbox'
        ? Array.isArray(value) && value.length > 0
        : stringValue.length > 0;

    if (field.required && !hasValue) {
      errorsByFieldId[field.id] = 'This field is required.';
      continue;
    }

    if (field.type === 'contactEmail' && hasValue && !isValidEmail(stringValue)) {
      errorsByFieldId[field.id] = 'Enter a valid email address.';
      continue;
    }

    if ((field.type === 'date' || field.type === 'birthday') && hasValue) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
        errorsByFieldId[field.id] = 'Enter a valid date.';
        continue;
      }
      const [y, m, d] = stringValue.split('-').map(Number);
      const dt = new Date(Date.UTC(y!, m! - 1, d!));
      if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m! - 1 || dt.getUTCDate() !== d) {
        errorsByFieldId[field.id] = 'Enter a valid date.';
      }
      continue;
    }

    if (field.type === 'url' && hasValue) {
      try {
        const candidate = /^https?:\/\//i.test(stringValue) ? stringValue : `https://${stringValue}`;
        // eslint-disable-next-line no-new
        new URL(candidate);
      } catch {
        errorsByFieldId[field.id] = 'Enter a valid link (URL).';
      }
      continue;
    }

    if (field.type === 'number' && hasValue && Number.isNaN(Number(stringValue))) {
      errorsByFieldId[field.id] = 'Enter a valid number.';
    }
  }

  return { errorsByFieldId };
}
