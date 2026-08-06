import type { FormFieldDefinition } from '@/types/forms';
import { normalizeAllowedWeekdays } from '@/lib/forms/date-field-utils';
import { isChoiceFieldType, isFormFieldType } from '@/lib/forms/field-types';

/** Shared parser for admin create/update payloads — never emits undefined keys. */
export function parseFieldsFromBody(rawFields: unknown): FormFieldDefinition[] {
  if (!Array.isArray(rawFields)) return [];
  const fields: FormFieldDefinition[] = [];
  for (const f of rawFields as any[]) {
    if (!f || typeof f !== 'object') continue;
    if (typeof f.id !== 'string' || typeof f.label !== 'string' || typeof f.order !== 'number') continue;
    if (!isFormFieldType(f.type)) continue;
    if (typeof f.required !== 'boolean') continue;

    const field: FormFieldDefinition = {
      id: f.id,
      label: f.label,
      type: f.type,
      order: f.order,
      required: f.required,
    };

    if (isChoiceFieldType(f.type)) {
      field.options = Array.isArray(f.options) ? f.options.filter((x: any) => typeof x === 'string') : [];
    }

    if (
      f.conditional &&
      typeof f.conditional === 'object' &&
      typeof f.conditional.dependsOnFieldId === 'string' &&
      typeof f.conditional.equals === 'string'
    ) {
      field.conditional = {
        dependsOnFieldId: f.conditional.dependsOnFieldId,
        equals: f.conditional.equals,
      };
    }

    if (f.visibility && typeof f.visibility === 'object') {
      field.visibility = {
        allowedRoleIds: Array.isArray(f.visibility.allowedRoleIds)
          ? f.visibility.allowedRoleIds.filter((x: any) => typeof x === 'string')
          : undefined,
        allowedUserIds: Array.isArray(f.visibility.allowedUserIds)
          ? f.visibility.allowedUserIds.filter((x: any) => typeof x === 'string')
          : undefined,
      };
    }

    const allowedWeekdays = normalizeAllowedWeekdays(f.dateConfig?.allowedWeekdays);
    if (allowedWeekdays?.length) {
      field.dateConfig = { allowedWeekdays };
    }

    fields.push(field);
  }
  return fields;
}
