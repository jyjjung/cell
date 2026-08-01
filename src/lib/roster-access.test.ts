import { describe, expect, it } from 'vitest';
import { userCanEditRoster, userCanSeeRoster } from '@/lib/roster-access';

const viewer = { uid: 'viewer-1', roleIds: ['member'] };
const editor = { uid: 'editor-1', roleIds: ['member'] };
const outsider = { uid: 'outsider-1', roleIds: [] };

describe('roster access', () => {
  it('lets everyone view public rosters', () => {
    const def = {
      visibility: { type: 'public' as const },
      editPermissions: { allowedUserIds: [editor.uid] },
    };
    expect(userCanSeeRoster(viewer, def)).toBe(true);
    expect(userCanSeeRoster(editor, def)).toBe(true);
    expect(userCanSeeRoster(outsider, def)).toBe(true);
    expect(userCanEditRoster(viewer, def)).toBe(false);
    expect(userCanEditRoster(editor, def)).toBe(true);
  });

  it('lets listed viewers see private rosters without edit access', () => {
    const def = {
      visibility: {
        type: 'private' as const,
        allowedUserIds: [viewer.uid],
        allowedRoleIds: [],
      },
      editPermissions: { allowedUserIds: [editor.uid] },
    };
    expect(userCanSeeRoster(viewer, def)).toBe(true);
    expect(userCanEditRoster(viewer, def)).toBe(false);
    expect(userCanSeeRoster(outsider, def)).toBe(false);
  });

  it('lets editors view private rosters even when not on the view list', () => {
    const def = {
      visibility: {
        type: 'private' as const,
        allowedUserIds: [viewer.uid],
        allowedRoleIds: [],
      },
      editPermissions: { allowedUserIds: [editor.uid] },
    };
    expect(userCanSeeRoster(editor, def)).toBe(true);
    expect(userCanEditRoster(editor, def)).toBe(true);
  });

  it('lets role-based viewers see private rosters', () => {
    const def = {
      visibility: {
        type: 'private' as const,
        allowedUserIds: [],
        allowedRoleIds: ['member'],
      },
      editPermissions: {},
    };
    expect(userCanSeeRoster(viewer, def)).toBe(true);
    expect(userCanSeeRoster(outsider, def)).toBe(false);
  });
});
