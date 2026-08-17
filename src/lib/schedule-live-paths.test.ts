import { describe, expect, it } from 'vitest';
import { needsLiveSchedule } from './schedule-live-paths';

describe('needsLiveSchedule', () => {
  it('uses live data on em. home and worship', () => {
    expect(needsLiveSchedule('/')).toBe(true);
    expect(needsLiveSchedule('/cell')).toBe(true);
    expect(needsLiveSchedule('/worship')).toBe(true);
  });

  it('keeps live data on other roster surfaces', () => {
    expect(needsLiveSchedule('/events')).toBe(true);
    expect(needsLiveSchedule('/cleaning-roster')).toBe(true);
    expect(needsLiveSchedule('/rosters/abc')).toBe(true);
    expect(needsLiveSchedule('/admin')).toBe(true);
  });

  it('does not attach roster listeners on unrelated apps', () => {
    expect(needsLiveSchedule('/cell/chat')).toBe(false);
    expect(needsLiveSchedule('/media')).toBe(false);
    expect(needsLiveSchedule('/ndcpc')).toBe(false);
    expect(needsLiveSchedule('/ndcpc/worship')).toBe(false);
  });
});
