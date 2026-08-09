import { describe, expect, it } from 'vitest';
import {
  formIsAcceptingResponses,
  formResponsesAreLocked,
  parseFormStatus,
} from '@/lib/forms/lifecycle';

describe('form lifecycle', () => {
  it('parses status values', () => {
    expect(parseFormStatus('draft')).toBe('draft');
    expect(parseFormStatus('closed')).toBe('closed');
    expect(parseFormStatus('published')).toBe('published');
    expect(parseFormStatus(undefined)).toBe('published');
  });

  it('accepts responses only when published and under capacity', () => {
    expect(formIsAcceptingResponses({ status: 'published', responseCount: 1 })).toBe(true);
    expect(formIsAcceptingResponses({ status: 'closed', responseCount: 1 })).toBe(false);
    expect(formIsAcceptingResponses({ status: 'draft', responseCount: 0 })).toBe(false);
    expect(
      formIsAcceptingResponses({ status: 'published', maxResponses: 2, responseCount: 2 }),
    ).toBe(false);
  });

  it('locks responses when closed or lock flag is set', () => {
    expect(formResponsesAreLocked({ status: 'published' })).toBe(false);
    expect(formResponsesAreLocked({ status: 'published', lockResponsesAfterSubmit: true })).toBe(
      true,
    );
    expect(formResponsesAreLocked({ status: 'closed' })).toBe(true);
    expect(formResponsesAreLocked({ status: 'closed', lockResponsesAfterSubmit: false })).toBe(
      true,
    );
  });

  it('allows fixing incomplete submissions when lock-after-submit is on', () => {
    expect(
      formResponsesAreLocked(
        { status: 'published', lockResponsesAfterSubmit: true },
        { lastValidationErrors: { a: 'Required' } },
      ),
    ).toBe(false);
    expect(
      formResponsesAreLocked(
        { status: 'closed', lockResponsesAfterSubmit: true },
        { lastValidationErrors: { a: 'Required' } },
      ),
    ).toBe(true);
  });
});
