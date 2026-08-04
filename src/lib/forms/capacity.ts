import type { FormDefinition } from '@/types/forms';

/** True when the form has room for another submission (unlimited if no max). */
export function formHasResponseCapacity(
  form: Pick<FormDefinition, 'maxResponses' | 'responseCount'>,
): boolean {
  const max = form.maxResponses;
  if (typeof max !== 'number' || max <= 0) return true;
  const count = typeof form.responseCount === 'number' ? form.responseCount : 0;
  return count < max;
}
