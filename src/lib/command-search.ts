/** Shared helpers for the ⌘K quick-search / command menu. */

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchQuery(query).split(/\s+/).filter(Boolean);
}

/** True when every search token appears somewhere in the combined haystack. */
export function matchesSearchQuery(query: string, ...parts: (string | null | undefined)[]): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/** cmdk filter — supports optional `keywords` on CommandItem. */
export function commandMenuFilter(value: string, search: string, keywords?: string[]): number {
  if (!normalizeSearchQuery(search)) return 1;
  return matchesSearchQuery(search, value, ...(keywords ?? [])) ? 1 : 0;
}

export function chatLastActivityMs(chat: {
  lastMessageSentAt?: { toMillis?: () => number };
  createdAt?: { toMillis?: () => number };
}): number {
  const last = chat.lastMessageSentAt ?? chat.createdAt;
  if (last && typeof last.toMillis === 'function') return last.toMillis();
  return 0;
}
