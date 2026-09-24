import { createHash, randomBytes } from 'node:crypto';

export function createShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function shareTokenFromRequest(value: string | undefined): string | null {
  if (!value || !/^[A-Za-z0-9_-]{32,128}$/.test(value)) return null;
  return value;
}
