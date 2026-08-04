import type { FormAnswerValue, FormDefinition, FormFieldDefinition } from '@/types/forms';

export type FormProfilePrefill = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  birthday?: string | null;
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

/** Normalize stored birthday values to yyyy-MM-dd for date inputs. */
export function toDateInputValue(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? '';
}

/** Build blank answers, optionally prefilling profile-linked name/email/phone/birthday fields. */
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
    if (field.type === 'phone' && profile?.phone) {
      initial[field.id] = profile.phone;
      continue;
    }
    if (field.type === 'birthday' && profile?.birthday) {
      const birthday = toDateInputValue(profile.birthday);
      if (birthday) {
        initial[field.id] = birthday;
        continue;
      }
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
