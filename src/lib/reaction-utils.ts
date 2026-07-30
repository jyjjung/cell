export type ReactionMap = { [emoji: string]: string[] };

export function reactionsMapsEqual(a?: ReactionMap, b?: ReactionMap): boolean {
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

/** Toggle `uid` on `emoji` and return a new reactions map (empty emoji keys removed). */
export function toggleReactionMap(
  reactions: ReactionMap | undefined,
  emoji: string,
  uid: string,
): ReactionMap {
  const next: ReactionMap = { ...(reactions || {}) };
  const reactors = [...(next[emoji] || [])];
  const index = reactors.indexOf(uid);
  if (index >= 0) reactors.splice(index, 1);
  else reactors.push(uid);
  if (reactors.length > 0) next[emoji] = reactors;
  else delete next[emoji];
  return next;
}
