import { describe, expect, it } from 'vitest';
import {
  buildUnreadCountClear,
  buildUnreadCountIncrements,
  getChatUnreadMessageCount,
  isChatUnread,
  sumChatUnreadMessageCounts,
} from '@/lib/notification-utils';

function chat(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    lastMessageSentAt: { toMillis: () => 2000 },
    lastMessageSenderId: 'bob',
    memberSeen: { alice: { toMillis: () => 1000 } },
    ...overrides,
  };
}

describe('getChatUnreadMessageCount', () => {
  it('returns the denormalized counter when present', () => {
    expect(
      getChatUnreadMessageCount(
        chat({ memberUnreadCount: { alice: 4 } }),
        'alice',
      ),
    ).toBe(4);
  });

  it('returns 0 when the counter is explicitly cleared', () => {
    expect(
      getChatUnreadMessageCount(
        chat({ memberUnreadCount: { alice: 0 } }),
        'alice',
      ),
    ).toBe(0);
  });

  it('falls back to 1 for legacy unread chats without a counter', () => {
    expect(getChatUnreadMessageCount(chat(), 'alice')).toBe(1);
    expect(isChatUnread(chat(), 'alice')).toBe(true);
  });

  it('returns 0 when caught up and no counter', () => {
    expect(
      getChatUnreadMessageCount(
        chat({
          lastMessageSenderId: 'alice',
          memberSeen: { alice: { toMillis: () => 3000 } },
        }),
        'alice',
      ),
    ).toBe(0);
  });
});

describe('buildUnreadCountIncrements', () => {
  it('increments others and clears the sender', () => {
    expect(
      buildUnreadCountIncrements(['alice', 'bob', 'carol'], 'bob', (n) => `inc:${n}`),
    ).toEqual({
      'memberUnreadCount.alice': 'inc:1',
      'memberUnreadCount.bob': 0,
      'memberUnreadCount.carol': 'inc:1',
    });
  });
});

describe('buildUnreadCountClear', () => {
  it('zeros the caller counter field', () => {
    expect(buildUnreadCountClear('alice')).toEqual({
      'memberUnreadCount.alice': 0,
    });
  });
});

describe('sumChatUnreadMessageCounts', () => {
  it('sums message counts and honors skip', () => {
    const chats = [
      chat({ id: 'a', memberUnreadCount: { alice: 2 } }),
      chat({ id: 'b', memberUnreadCount: { alice: 3 } }),
      chat({ id: 'c', memberUnreadCount: { alice: 5 } }),
    ];
    expect(sumChatUnreadMessageCounts(chats, 'alice')).toBe(10);
    expect(
      sumChatUnreadMessageCounts(chats, 'alice', (c) => c.id === 'b'),
    ).toBe(7);
  });
});
