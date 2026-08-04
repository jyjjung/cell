import { describe, expect, it } from 'vitest';
import { shouldHardHealFcm } from '@/lib/fcm-heal';

describe('shouldHardHealFcm', () => {
  it('skips soft path when healthy and version current', () => {
    expect(
      shouldHardHealFcm({
        needsResync: false,
        versionStale: false,
        swHealthy: true,
      }),
    ).toBe(false);
  });

  it('heals when forced', () => {
    expect(
      shouldHardHealFcm({
        force: true,
        needsResync: false,
        versionStale: false,
        swHealthy: true,
      }),
    ).toBe(true);
  });

  it('heals when Firestore requests resync', () => {
    expect(
      shouldHardHealFcm({
        needsResync: true,
        versionStale: false,
        swHealthy: true,
      }),
    ).toBe(true);
  });

  it('heals when local heal version is stale', () => {
    expect(
      shouldHardHealFcm({
        needsResync: false,
        versionStale: true,
        swHealthy: true,
      }),
    ).toBe(true);
  });

  it('heals when messaging SW is missing or wrong', () => {
    expect(
      shouldHardHealFcm({
        needsResync: false,
        versionStale: false,
        swHealthy: false,
      }),
    ).toBe(true);
  });
});
