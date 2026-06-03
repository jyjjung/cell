/** Merge a live snapshot window with older paginated messages. */
export function mergeLatestMessageWindow<T extends { id: string }>(
  latestWindow: T[],
  previous: T[]
): T[] {
  if (previous.length === 0) return latestWindow;
  const latestIds = new Set(latestWindow.map((m) => m.id));
  const older = previous.filter((m) => !latestIds.has(m.id));
  return [...latestWindow, ...older];
}
