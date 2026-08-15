import { normalizeName } from '@/lib/ndcpc/name-similarity';

type NameParts = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

/** Full account name used on NDCPC rosters (not the compact "First L." label). */
export function ndcpcAccountDisplayName(person: NameParts | null | undefined): string {
  if (!person) return '';
  const full = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim();
  if (full) return full;
  return person.email?.trim() || '';
}

export function matchesNdcpcAccountName(
  assignedName: string | null | undefined,
  person: NameParts | null | undefined,
): boolean {
  const assigned = assignedName?.trim();
  if (!assigned) return false;
  const account = ndcpcAccountDisplayName(person);
  if (!account) return false;
  return normalizeName(assigned) === normalizeName(account);
}
