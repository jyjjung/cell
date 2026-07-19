import { describe, expect, it } from 'vitest';
import { isNearOldestInReverseList } from './use-chat-scroll-load-older';

describe('isNearOldestInReverseList', () => {
  it('loads near the oldest edge when reverse scrolling uses negative scrollTop', () => {
    expect(
      isNearOldestInReverseList({
        scrollTop: -890,
        scrollHeight: 1200,
        clientHeight: 200,
      }),
    ).toBe(true);
  });

  it('supports browsers that expose positive reverse scroll offsets', () => {
    expect(
      isNearOldestInReverseList({
        scrollTop: 890,
        scrollHeight: 1200,
        clientHeight: 200,
      }),
    ).toBe(true);
  });

  it('does not load while the user remains near the newest messages', () => {
    expect(
      isNearOldestInReverseList({
        scrollTop: -100,
        scrollHeight: 1200,
        clientHeight: 200,
      }),
    ).toBe(false);
  });

  it('loads another page when the current messages do not fill the viewport', () => {
    expect(
      isNearOldestInReverseList({
        scrollTop: 0,
        scrollHeight: 500,
        clientHeight: 600,
      }),
    ).toBe(true);
  });
});
