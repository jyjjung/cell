import { describe, expect, it } from 'vitest';
import { chatPushBadgeFields } from '@/lib/chat-push-badge';

describe('chatPushBadgeFields', () => {
  it('omits badge when count is unknown so clients keep the prior badge', () => {
    expect(chatPushBadgeFields(null)).toEqual({});
  });

  it('includes data and APNs badge for a finite non-negative count', () => {
    expect(chatPushBadgeFields(3)).toEqual({ dataBadge: '3', apnsBadge: 3 });
    expect(chatPushBadgeFields(0)).toEqual({ dataBadge: '0', apnsBadge: 0 });
  });

  it('rejects invalid counts', () => {
    expect(chatPushBadgeFields(Number.NaN)).toEqual({});
    expect(chatPushBadgeFields(-1)).toEqual({});
  });
});
