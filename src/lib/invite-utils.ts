import type { AppInvite } from '@/types';
import type { Timestamp } from 'firebase/firestore';

export const DEFAULT_INVITE_MAX_USES = 1;
export const DEFAULT_INVITE_EXPIRES_DAYS = 7;

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function generateInviteCode(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

export function inviteMaxUses(invite: Pick<AppInvite, 'maxUses'>): number {
  const value = invite.maxUses ?? DEFAULT_INVITE_MAX_USES;
  return value > 0 ? value : DEFAULT_INVITE_MAX_USES;
}

export function inviteUseCount(invite: Pick<AppInvite, 'useCount'>): number {
  return invite.useCount ?? 0;
}

export function inviteUsesRemaining(invite: AppInvite): number {
  return Math.max(0, inviteMaxUses(invite) - inviteUseCount(invite));
}

function timestampToMillis(value: Timestamp | { toMillis?: () => number } | undefined): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

export function resolveInviteExpiresAtMs(
  invite: Pick<AppInvite, 'expiresAt' | 'createdAt'>,
  nowMs = Date.now(),
): number | null {
  const explicitMs = timestampToMillis(invite.expiresAt ?? undefined);
  if (explicitMs > 0) return explicitMs;

  const createdMs = timestampToMillis(invite.createdAt);
  if (createdMs > 0) {
    return createdMs + DEFAULT_INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
  }

  return null;
}

export function isInviteExpired(
  invite: Pick<AppInvite, 'expiresAt' | 'createdAt'>,
  nowMs = Date.now(),
): boolean {
  const expiresAtMs = resolveInviteExpiresAtMs(invite, nowMs);
  if (!expiresAtMs) return false;
  return expiresAtMs <= nowMs;
}

export type InviteStatus = 'active' | 'used' | 'expired';

export function getInviteStatus(invite: AppInvite, nowMs = Date.now()): InviteStatus {
  if (inviteUsesRemaining(invite) <= 0) return 'used';
  if (isInviteExpired(invite, nowMs)) return 'expired';
  return 'active';
}
