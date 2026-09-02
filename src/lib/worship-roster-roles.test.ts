import { describe, expect, it } from 'vitest';
import { mergeWorshipRosterSlots, WORSHIP_ROLES } from '@/types';
import {
  findWorshipRoleConflict,
  normalizeWorshipRoleLabel,
  parseWorshipRosterRoles,
  roleBadgeClass,
  rolesFromSettingsDoc,
} from './worship-roster-roles';

describe('normalizeWorshipRoleLabel', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeWorshipRoleLabel('  Vox  4  ')).toBe('Vox 4');
  });
});

describe('parseWorshipRosterRoles', () => {
  it('drops blanks, non-strings, and case-insensitive duplicates', () => {
    expect(parseWorshipRosterRoles(['Lead', ' lead ', '', 3, 'Vox 1'])).toEqual(['Lead', 'Vox 1']);
  });

  it('returns null for non-arrays so callers can fall back to defaults', () => {
    expect(parseWorshipRosterRoles(undefined)).toBeNull();
    expect(parseWorshipRosterRoles('Lead')).toBeNull();
  });
});

describe('rolesFromSettingsDoc', () => {
  it('falls back to the built-in list when the doc is missing', () => {
    expect(rolesFromSettingsDoc(null)).toEqual(WORSHIP_ROLES);
  });

  it('keeps an empty saved list', () => {
    expect(rolesFromSettingsDoc({ roles: [] })).toEqual([]);
  });
});

describe('findWorshipRoleConflict', () => {
  it('matches case-insensitively', () => {
    expect(findWorshipRoleConflict(['Lead', 'Drums'], 'lead')).toBe('Lead');
    expect(findWorshipRoleConflict(['Lead'], 'Bass')).toBeUndefined();
  });
});

describe('mergeWorshipRosterSlots', () => {
  it('adds missing catalog roles and keeps filled extras', () => {
    const merged = mergeWorshipRosterSlots(
      [
        { role: 'Lead', members: [{ userId: 'u1', displayName: 'Ada' }], order: 0 },
        { role: 'Old Role', members: [{ userId: null, displayName: 'Guest' }], order: 1 },
        { role: 'Empty Extra', members: [], order: 2 },
      ],
      ['Lead', 'Vox 4'],
    );
    expect(merged.map((slot) => slot.role)).toEqual(['Lead', 'Vox 4', 'Old Role']);
    expect(merged[0]?.members).toEqual([{ userId: 'u1', displayName: 'Ada' }]);
    expect(merged[1]?.members).toEqual([]);
  });

  it('uses the built-in catalog by default', () => {
    const merged = mergeWorshipRosterSlots([]);
    expect(merged.map((slot) => slot.role)).toEqual(WORSHIP_ROLES);
  });
});

describe('roleBadgeClass', () => {
  it('keeps known instrument colors and hashes unknown labels', () => {
    expect(roleBadgeClass('Lead')).toContain('text-primary');
    expect(roleBadgeClass('Click')).toMatch(/border-/);
  });
});
