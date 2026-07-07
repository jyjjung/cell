/** Merge message lists (first list wins ordering for duplicates). */
export function mergeMessageLists<T extends { id: string }>(...lists: T[][]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

function messageSortMillis(m: {
  createdAt?: { toMillis?: () => number };
  pollUpdatedAt?: { toMillis?: () => number };
}): number {
  const created = m.createdAt?.toMillis?.() ?? 0;
  const pollUpdated = m.pollUpdatedAt?.toMillis?.() ?? 0;
  return Math.max(created, pollUpdated);
}

/** Newest first; pending messages (no createdAt yet) stay at the live end of the thread. */
export function sortChatMessagesDesc<T extends {
  id: string;
  createdAt?: { toMillis?: () => number };
  pollUpdatedAt?: { toMillis?: () => number };
}>(
  messages: T[],
): T[] {
  return [...messages].sort((a, b) => {
    const aMs = messageSortMillis(a);
    const bMs = messageSortMillis(b);
    const aPending = aMs === 0;
    const bPending = bMs === 0;
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    if (aPending && bPending) return b.id.localeCompare(a.id);
    const diff = bMs - aMs;
    return diff !== 0 ? diff : b.id.localeCompare(a.id);
  });
}

function pollVotesEqual(
  a?: Record<string, string[]>,
  b?: Record<string, string[]>,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const va = a[key] ?? [];
    const vb = b[key] ?? [];
    if (va.length !== vb.length) return false;
    for (let i = 0; i < va.length; i++) {
      if (va[i] !== vb[i]) return false;
    }
  }
  return true;
}

function pollsEqual(
  a?: { question: string; options: string[]; allowMultiple?: boolean },
  b?: { question: string; options: string[]; allowMultiple?: boolean },
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.question === b.question &&
    !!a.allowMultiple === !!b.allowMultiple &&
    a.options.length === b.options.length &&
    a.options.every((option, index) => option === b.options[index])
  );
}

function carryOlderMessages<T extends {
  id: string;
  createdAt?: { toMillis?: () => number };
  pollUpdatedAt?: { toMillis?: () => number };
}>(primary: T[], previous: T[]): T[] {
  const primaryIds = new Set(primary.map((m) => m.id));
  if (primary.length === 0) return previous;

  const oldestInWindowMs = messageSortMillis(primary[primary.length - 1]);
  return previous.filter((m) => {
    if (primaryIds.has(m.id)) return false;
    const ms = messageSortMillis(m);
    if (ms === 0) return false;
    return ms < oldestInWindowMs;
  });
}

function reactionsEqual(
  a?: { [key: string]: string[] },
  b?: { [key: string]: string[] },
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const ra = a[key] ?? [];
    const rb = b[key] ?? [];
    if (ra.length !== rb.length) return false;
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] !== rb[i]) return false;
    }
  }
  return true;
}

/** True when two messages would render the same bubble content. */
export function chatMessagesShallowEqual(
  a: { id: string; createdAt?: { toMillis?: () => number } },
  b: { id: string; createdAt?: { toMillis?: () => number } },
): boolean {
  if (a === b) return true;
  const ma = a as Record<string, unknown>;
  const mb = b as Record<string, unknown>;
  return (
    ma.id === mb.id &&
    ma.senderId === mb.senderId &&
    ma.text === mb.text &&
    ma.imageUrl === mb.imageUrl &&
    ma.replyToId === mb.replyToId &&
    ma.threadParentId === mb.threadParentId &&
    ma.eventId === mb.eventId &&
    ma.setlistId === mb.setlistId &&
    ma.rosterId === mb.rosterId &&
    ma.qtDate === mb.qtDate &&
    ma.cleaningDate === mb.cleaningDate &&
    ma.songId === mb.songId &&
    ma.songTitle === mb.songTitle &&
    ma.sheetKey === mb.sheetKey &&
    ma.isDeleted === mb.isDeleted &&
    ma.deletedBy === mb.deletedBy &&
    ma.deletedContentType === mb.deletedContentType &&
    ma.systemEvent === mb.systemEvent &&
    ma.replyCount === mb.replyCount &&
    ma.latestReplySenderId === mb.latestReplySenderId &&
    ma.latestReplyText === mb.latestReplyText &&
    ma.latestReplyImageUrl === mb.latestReplyImageUrl &&
    reactionsEqual(
      ma.reactions as { [key: string]: string[] } | undefined,
      mb.reactions as { [key: string]: string[] } | undefined,
    ) &&
    pollsEqual(
      ma.poll as { question: string; options: string[]; allowMultiple?: boolean } | undefined,
      mb.poll as { question: string; options: string[]; allowMultiple?: boolean } | undefined,
    ) &&
    pollVotesEqual(
      ma.pollVotes as Record<string, string[]> | undefined,
      mb.pollVotes as Record<string, string[]> | undefined,
    ) &&
    (ma.pollUpdatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ===
      (mb.pollUpdatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() &&
    (ma.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ===
      (mb.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.()
  );
}

/** Keep stable object references for unchanged messages to reduce React re-renders. */
export function stabilizeMessages<T extends { id: string }>(
  incoming: T[],
  previous: T[],
  isEqual: (a: T, b: T) => boolean = chatMessagesShallowEqual as (a: T, b: T) => boolean,
): T[] {
  const prevById = new Map(previous.map((m) => [m.id, m]));
  return incoming.map((m) => {
    const old = prevById.get(m.id);
    return old && isEqual(old, m) ? old : m;
  });
}

/** Merge while preserving references for messages that did not change. */
export function mergeMessageListsStable<T extends {
  id: string;
  createdAt?: { toMillis?: () => number };
  pollUpdatedAt?: { toMillis?: () => number };
}>(
  primary: T[],
  secondary: T[],
  previous: T[],
  options?: { retainOnlyOlderSecondary?: boolean },
  isEqual: (a: T, b: T) => boolean = chatMessagesShallowEqual as (a: T, b: T) => boolean,
): T[] {
  const stabilizedPrimary = stabilizeMessages(primary, previous, isEqual);
  const secondaryMessages = options?.retainOnlyOlderSecondary
    ? carryOlderMessages(stabilizedPrimary, secondary)
    : secondary;
  return sortChatMessagesDesc(mergeMessageLists(stabilizedPrimary, secondaryMessages));
}

/** @deprecated Use mergeMessageLists */
export function mergeLatestMessageWindow<T extends { id: string }>(
  latestWindow: T[],
  previous: T[],
): T[] {
  return mergeMessageLists(latestWindow, previous);
}
