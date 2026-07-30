import { describe, expect, it } from 'vitest';
import { reactionsMapsEqual, toggleReactionMap } from '@/lib/reaction-utils';

describe('toggleReactionMap', () => {
  it('adds a reaction for a new emoji', () => {
    expect(toggleReactionMap(undefined, '👍', 'u1')).toEqual({ '👍': ['u1'] });
  });

  it('removes the user and drops empty emoji keys', () => {
    expect(toggleReactionMap({ '👍': ['u1'] }, '👍', 'u1')).toEqual({});
  });

  it('keeps other reactors when removing one', () => {
    expect(toggleReactionMap({ '👍': ['u1', 'u2'] }, '👍', 'u1')).toEqual({
      '👍': ['u2'],
    });
  });
});

describe('reactionsMapsEqual', () => {
  it('treats undefined and empty as different from populated', () => {
    expect(reactionsMapsEqual(undefined, undefined)).toBe(true);
    expect(reactionsMapsEqual({}, {})).toBe(true);
    expect(reactionsMapsEqual({ '👍': ['u1'] }, { '👍': ['u1'] })).toBe(true);
    expect(reactionsMapsEqual({ '👍': ['u1'] }, { '👍': ['u2'] })).toBe(false);
  });
});
