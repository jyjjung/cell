import { describe, expect, it } from 'vitest';
import { validateFormResponse } from '@/lib/forms/validation';
import type { FormDefinition } from '@/types/forms';

function formWithFields(fields: FormDefinition['fields']): FormDefinition {
  return {
    id: 'test',
    title: 'Test',
    fields,
    createdAt: {} as FormDefinition['createdAt'],
  };
}

describe('validateFormResponse date fields', () => {
  it('requires at least one date for required dates fields', () => {
    const form = formWithFields([
      { id: 'd1', label: 'Dates', type: 'dates', order: 0, required: true },
    ]);
    const { errorsByFieldId } = validateFormResponse(form, { d1: [] });
    expect(errorsByFieldId.d1).toBe('This field is required.');
  });

  it('accepts valid multi-date answers', () => {
    const form = formWithFields([
      {
        id: 'd1',
        label: 'Thursdays',
        type: 'dates',
        order: 0,
        required: true,
        dateConfig: { allowedWeekdays: [4] },
      },
    ]);
    const { errorsByFieldId } = validateFormResponse(form, {
      d1: ['2026-08-06', '2026-08-13'],
    });
    expect(errorsByFieldId.d1).toBeUndefined();
  });

  it('rejects single dates on disallowed weekdays', () => {
    const form = formWithFields([
      {
        id: 'd1',
        label: 'Thursday only',
        type: 'date',
        order: 0,
        required: true,
        dateConfig: { allowedWeekdays: [4] },
      },
    ]);
    const { errorsByFieldId } = validateFormResponse(form, { d1: '2026-08-07' });
    expect(errorsByFieldId.d1).toBe('Pick a date on an allowed day of the week.');
  });
});
