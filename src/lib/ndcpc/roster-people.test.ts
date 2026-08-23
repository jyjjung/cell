import { describe, expect, it } from 'vitest';
import { ndcpcRosterDirectoryEntries, ndcpcRosterMemberUidForName } from './roster-people';

const cellOnly = {
  uid: 'cell-1',
  firstName: 'Cell',
  lastName: 'Member',
  email: 'cell@example.com',
  access: { cell: true, ndcpc: false },
};

const ndcpcFlag = {
  uid: 'ndcpc-1',
  firstName: 'Preschool',
  lastName: 'Lead',
  email: 'ndcpc@example.com',
  access: { ndcpc: true },
};

const ndcpcRole = {
  uid: 'ndcpc-2',
  firstName: 'Role',
  lastName: 'Holder',
  email: 'role@example.com',
  access: { cell: true },
  ndcpcRoleIds: ['teacher'],
};

const noName = {
  uid: 'ndcpc-3',
  firstName: '',
  lastName: 'Blank',
  email: 'blank@example.com',
  access: { ndcpc: true },
};

describe('ndcpcRosterDirectoryEntries', () => {
  it('keeps preschool-access people and drops em.-only members', () => {
    const entries = ndcpcRosterDirectoryEntries([cellOnly, ndcpcFlag, ndcpcRole, noName]);
    expect(entries.map((entry) => entry.uid)).toEqual(['ndcpc-1', 'ndcpc-2']);
  });
});

describe('ndcpcRosterMemberUidForName', () => {
  it('matches a directory name ignoring extra spaces', () => {
    const entries = ndcpcRosterDirectoryEntries([ndcpcFlag]);
    expect(ndcpcRosterMemberUidForName(entries, '  Preschool   Lead ')).toBe('ndcpc-1');
    expect(ndcpcRosterMemberUidForName(entries, 'Guest Name')).toBeUndefined();
  });
});
