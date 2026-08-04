import type { FormAnswerValue, FormDefinition, FormFieldDefinition } from '@/types/forms';

export type FormProfilePrefill = {
  name?: string | null;
  email?: string | null;
};

export function formatProfileName(profile: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}): string {
  const fromParts = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  if (fromParts) return fromParts;
  return (profile.displayName ?? '').trim();
}

/** Build blank answers, optionally prefilling profile-linked name/email fields. */
export function buildInitialAnswers(
  form: Pick<FormDefinition, 'fields'>,
  profile?: FormProfilePrefill | null,
): Record<string, FormAnswerValue> {
  const initial: Record<string, FormAnswerValue> = {};
  for (const field of form.fields) {
    if (field.type === 'checkbox') {
      initial[field.id] = [];
      continue;
    }
    if (field.type === 'name' && profile?.name) {
      initial[field.id] = profile.name;
      continue;
    }
    if (field.type === 'email' && profile?.email) {
      initial[field.id] = profile.email;
      continue;
    }
    initial[field.id] = '';
  }
  return initial;
}

export function findFirstEmailField(fields: FormFieldDefinition[]): FormFieldDefinition | undefined {
  return [...fields].sort((a, b) => a.order - b.order).find((f) => f.type === 'email');
}

export function formHasEmailField(form: Pick<FormDefinition, 'fields'>): boolean {
  return form.fields.some((f) => f.type === 'email');
}
