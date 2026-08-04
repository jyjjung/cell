import { describe, expect, it } from 'vitest';
import { shouldSkipCatchupFullScan } from '@/lib/duty-reminder-catchup';

describe('shouldSkipCatchupFullScan', () => {
  it('skips when morning succeeded for today with no error', () => {
    expect(
      shouldSkipCatchupFullScan({
        todayIso: '2026-08-04',
        lastRunTodayIso: '2026-08-04',
        lastRunSource: 'scheduled',
        lastError: null,
      }),
    ).toBe(true);
  });

  it('skips after a successful manual run the same day', () => {
    expect(
      shouldSkipCatchupFullScan({
        todayIso: '2026-08-04',
        lastRunTodayIso: '2026-08-04',
        lastRunSource: 'manual',
      }),
    ).toBe(true);
  });

  it('does not skip when morning has not run today', () => {
    expect(
      shouldSkipCatchupFullScan({
        todayIso: '2026-08-04',
        lastRunTodayIso: '2026-08-03',
        lastRunSource: 'scheduled',
      }),
    ).toBe(false);
  });

  it('does not skip when last run left an error', () => {
    expect(
      shouldSkipCatchupFullScan({
        todayIso: '2026-08-04',
        lastRunTodayIso: '2026-08-04',
        lastRunSource: 'scheduled',
        lastError: 'timeout',
      }),
    ).toBe(false);
  });

  it('does not skip when only a prior catchup ran', () => {
    expect(
      shouldSkipCatchupFullScan({
        todayIso: '2026-08-04',
        lastRunTodayIso: '2026-08-04',
        lastRunSource: 'catchup',
      }),
    ).toBe(false);
  });
});
