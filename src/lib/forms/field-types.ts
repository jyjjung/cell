import type { FormFieldDefinition, FormFieldType } from '@/types/forms';
import { normalizeAllowedWeekdays } from '@/lib/forms/date-field-utils';

export const FORM_FIELD_TYPES: FormFieldType[] = [
  'text',
  'textarea',
  'select',
  'checkbox',
  'yesno',
  'name',
  'email',
  'contactName',
  'contactEmail',
  'phone',
  'birthday',
  'number',
  'date',
  'dates',
  'time',
  'url',
];

export function isFormFieldType(value: unknown): value is FormFieldType {
  return typeof value === 'string' && (FORM_FIELD_TYPES as string[]).includes(value);
}

/** Shown read-only on fill; auto-filled from profile for admin reports. */
export function isProfileReferenceFieldType(type: FormFieldType): type is 'name' | 'email' {
  return type === 'name' || type === 'email';
}

/** Shown on the form; may pre-fill and write back to profile (phone/birthday). */
export function isProfileLinkedFieldType(type: FormFieldType): type is 'phone' | 'birthday' {
  return type === 'phone' || type === 'birthday';
}

export function isChoiceFieldType(type: FormFieldType): boolean {
  return type === 'select' || type === 'checkbox';
}

export function isArrayAnswerFieldType(type: FormFieldType): boolean {
  return type === 'checkbox' || type === 'dates';
}

export function isDateFieldType(type: FormFieldType): boolean {
  return type === 'date' || type === 'dates';
}

export function isStringAnswerFieldType(type: FormFieldType): boolean {
  return !isArrayAnswerFieldType(type);
}

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  select: 'Single choice',
  checkbox: 'Multiple choice',
  yesno: 'Yes / No',
  name: 'Name from profile',
  email: 'Email from profile',
  contactName: 'Name question',
  contactEmail: 'Email question',
  phone: 'Phone (from profile)',
  birthday: 'Birthday (from profile)',
  number: 'Number',
  date: 'Date',
  dates: 'Multiple dates',
  time: 'Time',
  url: 'Link (URL)',
};

export function defaultLabelForFieldType(type: FormFieldType, order: number): string {
  if (type === 'name') return 'Name (profile)';
  if (type === 'email') return 'Email (profile)';
  if (type === 'contactName') return 'Name';
  if (type === 'contactEmail') return 'Email';
  if (type === 'phone') return 'Phone';
  if (type === 'birthday') return 'Birthday';
  if (type === 'date') return 'Date';
  if (type === 'dates') return 'Dates';
  if (type === 'time') return 'Time';
  if (type === 'url') return 'Website';
  if (type === 'yesno') return 'Yes or no?';
  if (type === 'number') return 'Number';
  return `Question ${order + 1}`;
}

/** Firestore rejects `undefined` — only write defined keys. */
export function serializeFieldForFirestore(f: FormFieldDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: f.id,
    label: f.label,
    type: f.type,
    order: f.order,
    required: !!f.required,
  };
  if (isChoiceFieldType(f.type)) {
    out.options = Array.isArray(f.options) ? f.options.filter((x) => typeof x === 'string') : [];
  }
  if (f.conditional && typeof f.conditional.dependsOnFieldId === 'string' && typeof f.conditional.equals === 'string') {
    out.conditional = {
      dependsOnFieldId: f.conditional.dependsOnFieldId,
      equals: f.conditional.equals,
    };
  }
  if (f.visibility) {
    out.visibility = {
      allowedRoleIds: f.visibility.allowedRoleIds ?? [],
      allowedUserIds: f.visibility.allowedUserIds ?? [],
    };
  }
  const allowedWeekdays = normalizeAllowedWeekdays(f.dateConfig?.allowedWeekdays);
  if (allowedWeekdays?.length) {
    out.dateConfig = { allowedWeekdays };
  }
  return out;
}

export function serializeFieldsForFirestore(fields: FormFieldDefinition[]): Record<string, unknown>[] {
  return fields.map(serializeFieldForFirestore);
}
