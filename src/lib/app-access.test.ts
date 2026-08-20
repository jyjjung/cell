import { describe, expect, it } from 'vitest';
import {
  hasAssignedCellAccess,
  hasCellAccess,
  inferCellAccessFlag,
  isCellHomePath,
} from './app-access';

describe('inferCellAccessFlag', () => {
  it('treats missing and empty access as em.', () => {
    expect(inferCellAccessFlag(undefined)).toBe(true);
    expect(inferCellAccessFlag({})).toBe(true);
  });

  it('keeps explicit cell access', () => {
    expect(inferCellAccessFlag({ cell: true })).toBe(true);
    expect(inferCellAccessFlag({ cell: true, ndcpc: true })).toBe(true);
  });

  it('keeps preschool-only members off em.', () => {
    expect(inferCellAccessFlag({ ndcpc: true })).toBe(false);
    expect(inferCellAccessFlag({ cell: false, ndcpc: true })).toBe(false);
  });

  it('heals both-apps-off as legacy em.', () => {
    expect(inferCellAccessFlag({ cell: false, ndcpc: false })).toBe(true);
    expect(inferCellAccessFlag({ cell: false })).toBe(true);
  });

  it('grants em. when the member has a cell role', () => {
    expect(inferCellAccessFlag({ ndcpc: true }, ['role-1'])).toBe(true);
  });
});

describe('hasCellAccess', () => {
  it('requires an approved member', () => {
    expect(hasCellAccess({ access: {}, isApproved: false })).toBe(false);
    expect(hasCellAccess({ access: { cell: false, ndcpc: false }, isApproved: true })).toBe(true);
  });

  it('does not grant em. to preschool-only members', () => {
    expect(hasCellAccess({ access: { ndcpc: true }, isApproved: true })).toBe(false);
  });
});

describe('hasAssignedCellAccess', () => {
  it('matches inferCellAccessFlag for admin checkboxes', () => {
    expect(hasAssignedCellAccess({ access: { cell: false, ndcpc: false } })).toBe(true);
    expect(hasAssignedCellAccess({ access: { ndcpc: true } })).toBe(false);
  });
});

describe('isCellHomePath', () => {
  it('treats /cell as em. home', () => {
    expect(isCellHomePath('/')).toBe(true);
    expect(isCellHomePath('/cell')).toBe(true);
    expect(isCellHomePath('/cell/chat')).toBe(false);
  });
});
