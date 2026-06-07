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

/** @deprecated Use mergeMessageLists */
export function mergeLatestMessageWindow<T extends { id: string }>(
  latestWindow: T[],
  previous: T[],
): T[] {
  return mergeMessageLists(latestWindow, previous);
}
