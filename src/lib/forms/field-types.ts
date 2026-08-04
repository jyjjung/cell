import type { FormFieldType } from '@/types/forms';

export const FORM_FIELD_TYPES: FormFieldType[] = [
  'text',
  'textarea',
  'select',
  'checkbox',
  'name',
  'email',
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

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  select: 'Single choice',
  checkbox: 'Multiple choice',
  name: 'Name (from profile)',
  email: 'Email (from profile)',
};

export function defaultLabelForFieldType(type: FormFieldType, order: number): string {
  if (type === 'name') return 'Name';
  if (type === 'email') return 'Email';
  return `Question ${order + 1}`;
}
