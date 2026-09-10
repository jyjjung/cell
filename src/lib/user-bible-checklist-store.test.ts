import { describe, expect, it } from 'vitest';
import { shouldAcceptChecklistSnapshot } from '@/lib/user-bible-checklist-store';

function snapshot(
  passages: string[] | undefined,
  fromCache: boolean,
) {
  return {
    exists: () => passages !== undefined,
    data: () => (passages === undefined ? undefined : { completedPassages: passages }),
    metadata: { fromCache },
  };
}

describe('shouldAcceptChecklistSnapshot', () => {
  it('keeps known progress when the persistent cache reports an empty miss', () => {
    expect(shouldAcceptChecklistSnapshot(['2026-01-01::Matthew 1'], snapshot([], true))).toBe(false);
    expect(shouldAcceptChecklistSnapshot(['2026-01-01::Matthew 1'], snapshot(undefined, true))).toBe(false);
  });

  it('accepts server-confirmed empty progress and non-empty cache snapshots', () => {
    expect(shouldAcceptChecklistSnapshot(['2026-01-01::Matthew 1'], snapshot([], false))).toBe(true);
    expect(shouldAcceptChecklistSnapshot([], snapshot(['2026-01-01::Matthew 1'], true))).toBe(true);
  });
});
