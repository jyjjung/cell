import { describe, expect, it } from 'vitest';
import { applyChatMembersToDocAcl, mergeSourceChatIds, normalizeUidList } from './docs-chat-share';

describe('normalizeUidList', () => {
  it('dedupes and drops empties', () => {
    expect(normalizeUidList(['a', 'a', '', 'b'])).toEqual(['a', 'b']);
  });
});

describe('mergeSourceChatIds', () => {
  it('adds chat id once', () => {
    expect(mergeSourceChatIds(['c1'], 'c2')).toEqual(['c1', 'c2']);
    expect(mergeSourceChatIds(['c1'], 'c1')).toEqual(['c1']);
  });
});

describe('applyChatMembersToDocAcl', () => {
  it('shares a private doc with other chat members', () => {
    const next = applyChatMembersToDocAcl(
      {
        ownerId: 'owner',
        sharedWith: [],
        memberIds: ['owner'],
        visibility: 'private',
      },
      ['owner', 'm1', 'm2'],
      'chat-1',
    );

    expect(next.changed).toBe(true);
    expect(next.visibility).toBe('shared');
    expect(next.sharedWith.sort()).toEqual(['m1', 'm2']);
    expect(next.memberIds.sort()).toEqual(['m1', 'm2', 'owner']);
    expect(next.sourceChatIds).toEqual(['chat-1']);
  });

  it('stays private when chat only has the owner', () => {
    const next = applyChatMembersToDocAcl(
      {
        ownerId: 'owner',
        sharedWith: [],
        memberIds: ['owner'],
        visibility: 'private',
      },
      ['owner'],
      'chat-1',
    );

    expect(next.visibility).toBe('private');
    expect(next.sharedWith).toEqual([]);
    expect(next.memberIds).toEqual(['owner']);
    expect(next.sourceChatIds).toEqual(['chat-1']);
    expect(next.changed).toBe(true);
  });

  it('is a no-op when ACL already matches', () => {
    const next = applyChatMembersToDocAcl(
      {
        ownerId: 'owner',
        sharedWith: ['m1'],
        memberIds: ['owner', 'm1'],
        visibility: 'shared',
        sourceChatIds: ['chat-1'],
      },
      ['owner', 'm1'],
      'chat-1',
    );

    expect(next.changed).toBe(false);
  });
});
