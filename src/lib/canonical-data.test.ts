import { describe, expect, it } from 'vitest';
import { normalizeAppThemeId } from './app-themes';
import { getReferenceTracks } from './worship-utils';
import {
  entryHasContent,
  formatCustomRosterEntrySummary,
  getAssignedUserIdsFromCustomEntry,
  getCustomRosterEntryTitle,
  getUserCustomRosterLabels,
} from './roster-access';
import {
  makeManualPassageKey,
  makePassageKey,
} from './passage-keys';
import { isChapterMarkedCompleteInPlan } from './reading-utils';

describe('canonical data helpers', () => {
  it('accepts only canonical app theme IDs', () => {
    expect(normalizeAppThemeId('ocean')).toBe('ocean');
    expect(normalizeAppThemeId('legacy-palette')).toBe('classic');
  });

  it('keeps repeated Bible passages date-scoped and manual marks distinct', () => {
    expect(makePassageKey('2026-01-01', 'Matthew 1')).toBe('2026-01-01::Matthew 1');
    expect(makeManualPassageKey('Matthew 1')).toBe('manual::Matthew 1');
    expect(isChapterMarkedCompleteInPlan([], 'Matthew', 1, ['manual::Matthew 1'])).toBe(true);
  });

  it('reads only valid canonical reference tracks', () => {
    expect(getReferenceTracks({
      referenceTracks: [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { url: 'https://example.com/not-youtube' },
      ],
    })).toEqual([{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]);
  });

  it('renders custom rosters from field values', () => {
    const definition = {
      fields: [
        { id: 'leader', label: 'Leader', type: 'user' as const, order: 0 },
        { id: 'task', label: 'Task', type: 'text' as const, order: 1 },
      ],
    };
    const entry = {
      id: 'entry-1',
      date: '2026-07-19',
      fieldValues: {
        leader: { text: 'Alex Kim', userId: 'user-1' },
        task: { text: 'Welcome' },
      },
    };

    expect(entryHasContent(entry, definition)).toBeTruthy();
    expect(getCustomRosterEntryTitle(entry, definition)).toBe('Alex K.');
    expect(getUserCustomRosterLabels(entry, definition, 'user-1')).toEqual(['Leader']);
    expect(getAssignedUserIdsFromCustomEntry(entry, definition)).toEqual(['user-1']);
    expect(formatCustomRosterEntrySummary(entry, definition)).toBe(
      'Leader: Alex K., Task: Welcome',
    );
  });
});
