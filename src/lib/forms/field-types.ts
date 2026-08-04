import type { FormFieldDefinition, FormFieldType } from '@/types/forms';

export const FORM_FIELD_TYPES: FormFieldType[] = [
  'text',
  'textarea',
  'select',
  'checkbox',
  'yesno',
  'name',
  'email',
  'phone',
  'number',
  'date',
  'time',
  'url',
];

export function isFormFieldType(value: unknown): value is FormFieldType {
  return typeof value === 'string' && (FORM_FIELD_TYPES as string[]).includes(value);
}

export function isProfileLinkedFieldType(type: FormFieldType): type is 'name' | 'email' {
  return type === 'name' || type === 'email';
}

export function isChoiceFieldType(type: FormFieldType): boolean {
  return type === 'select' || type === 'checkbox';
}

export function isStringAnswerFieldType(type: FormFieldType): boolean {
  return type !== 'checkbox';
}

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  select: 'Single choice',
  checkbox: 'Multiple choice',
  yesno: 'Yes / No',
  name: 'Name (from profile)',
  email: 'Email (from profile)',
  phone: 'Phone',
  number: 'Number',
  date: 'Date',
  time: 'Time',
  url: 'Link (URL)',
};

export function defaultLabelForFieldType(type: FormFieldType, order: number): string {
  if (type === 'name') return 'Name';
  if (type === 'email') return 'Email';
  if (type === 'phone') return 'Phone';
  if (type === 'date') return 'Date';
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
  return out;
}

export function serializeFieldsForFirestore(fields: FormFieldDefinition[]): Record<string, unknown>[] {
  return fields.map(serializeFieldForFirestore);
}
