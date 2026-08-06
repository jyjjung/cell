import type { FormAnswerValue, FormDefinition, FormResponse } from '@/types/forms';

/** Resolve a display name from name / contactName answers. */
export function resolveSubmitterName(
  form: Pick<FormDefinition, 'fields'>,
  answers: Record<string, FormAnswerValue>,
): string {
  const sorted = [...form.fields].sort((a, b) => a.order - b.order);
  for (const field of sorted) {
    if (field.type !== 'name' && field.type !== 'contactName') continue;
    const value = answers[field.id];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** Best label for a response in lists, exports, and reports. */
export function displaySubmitterLabel(
  response: Pick<FormResponse, 'submitterName' | 'submitterEmail' | 'answers'>,
  form?: Pick<FormDefinition, 'fields'>,
): string {
  if (response.submitterName?.trim()) return response.submitterName.trim();
  if (form) {
    const fromAnswers = resolveSubmitterName(form, response.answers);
    if (fromAnswers) return fromAnswers;
  }
  return response.submitterEmail?.trim() || 'Unknown';
}
