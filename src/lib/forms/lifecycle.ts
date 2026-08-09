import type { FormDefinition, FormResponse } from '@/types/forms';
import { formHasResponseCapacity } from '@/lib/forms/capacity';

export type FormLifecycleStatus = 'draft' | 'published' | 'closed';

export function parseFormStatus(raw: unknown): FormLifecycleStatus {
  if (raw === 'draft') return 'draft';
  if (raw === 'closed') return 'closed';
  return 'published';
}

/** New submissions allowed (published + under capacity). */
export function formIsAcceptingResponses(
  form: Pick<FormDefinition, 'status' | 'maxResponses' | 'responseCount'>,
): boolean {
  if (form.status === 'draft' || form.status === 'closed') return false;
  return formHasResponseCapacity(form);
}

function responseHasValidationErrors(
  response?: Pick<FormResponse, 'lastValidationErrors'> | null,
): boolean {
  const errors = response?.lastValidationErrors;
  return !!errors && typeof errors === 'object' && Object.keys(errors).length > 0;
}

/**
 * Submitters cannot edit or delete responses.
 * Closed forms always lock. Lock-after-submit still allows fixing incomplete submissions.
 */
export function formResponsesAreLocked(
  form: Pick<FormDefinition, 'status' | 'lockResponsesAfterSubmit'>,
  response?: Pick<FormResponse, 'lastValidationErrors'> | null,
): boolean {
  if (form.status === 'closed') return true;
  if (!form.lockResponsesAfterSubmit) return false;
  if (responseHasValidationErrors(response)) return false;
  return true;
}

export function formResponsesLockedMessage(
  form: Pick<FormDefinition, 'status' | 'lockResponsesAfterSubmit'>,
): string {
  if (form.status === 'closed') {
    return 'This form is closed. Responses can no longer be edited or deleted.';
  }
  return 'Responses for this form are locked and can no longer be edited or deleted.';
}
