import { describe, expect, it } from 'vitest';
import { displaySubmitterLabel, resolveSubmitterName } from '@/lib/forms/submitter-display';
import type { FormDefinition, FormResponse } from '@/types/forms';

function formWithFields(fields: FormDefinition['fields']): FormDefinition {
  return {
    id: 'f1',
    title: 'Test',
    fields,
    createdAt: {} as FormDefinition['createdAt'],
  };
}

describe('submitter display', () => {
  it('resolves name from profile and contact name fields', () => {
    const form = formWithFields([
      { id: 'n1', label: 'Name', type: 'contactName', order: 0, required: false },
      { id: 'n2', label: 'Profile', type: 'name', order: 1, required: false },
    ]);
    expect(resolveSubmitterName(form, { n1: 'Guest Name' })).toBe('Guest Name');
    expect(resolveSubmitterName(form, { n2: 'Profile Name' })).toBe('Profile Name');
  });

  it('prefers stored submitterName for display', () => {
    const response: FormResponse = {
      id: 'r1',
      formId: 'f1',
      submitterEmail: 'user@example.com',
      submitterName: 'Jane Doe',
      answers: {},
      createdAt: {} as FormResponse['createdAt'],
    };
    expect(displaySubmitterLabel(response)).toBe('Jane Doe');
  });

  it('falls back to answers then email', () => {
    const form = formWithFields([
      { id: 'n1', label: 'Name', type: 'contactName', order: 0, required: false },
    ]);
    const response: FormResponse = {
      id: 'r1',
      formId: 'f1',
      submitterEmail: 'user@example.com',
      answers: { n1: 'Typed Name' },
      createdAt: {} as FormResponse['createdAt'],
    };
    expect(displaySubmitterLabel(response, form)).toBe('Typed Name');

    const noName: FormResponse = {
      ...response,
      answers: {},
    };
    expect(displaySubmitterLabel(noName, form)).toBe('user@example.com');
  });
});
