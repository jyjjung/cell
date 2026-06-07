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
    ma.replyCount === mb.replyCount &&
    ma.latestReplySenderId === mb.latestReplySenderId &&
    ma.latestReplyText === mb.latestReplyText &&
    ma.latestReplyImageUrl === mb.latestReplyImageUrl &&
    reactionsEqual(
      ma.reactions as { [key: string]: string[] } | undefined,
      mb.reactions as { [key: string]: string[] } | undefined,
    ) &&
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
export function mergeMessageListsStable<T extends { id: string }>(
  primary: T[],
  secondary: T[],
  previous: T[],
  isEqual: (a: T, b: T) => boolean = chatMessagesShallowEqual as (a: T, b: T) => boolean,
): T[] {
  const stabilizedPrimary = stabilizeMessages(primary, previous, isEqual);
  return mergeMessageLists(stabilizedPrimary, secondary);
}

/** @deprecated Use mergeMessageLists */
export function mergeLatestMessageWindow<T extends { id: string }>(
  latestWindow: T[],
  previous: T[],
): T[] {
  return mergeMessageLists(latestWindow, previous);
}
