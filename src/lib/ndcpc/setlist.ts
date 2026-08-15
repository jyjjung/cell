import type { Resource, Setlist } from '@/types/ndcpc-ported';

export type NormalizedSetlist = {
  songIds: string[];
  chantIds: string[];
};

export function normalizeSetlist(
  setlist: Setlist,
  resourceMap: Map<string, Resource>
): NormalizedSetlist {
  if (setlist.songIds || setlist.chantIds) {
    return {
      songIds: setlist.songIds ?? [],
      chantIds: setlist.chantIds ?? [],
    };
  }

  const songIds: string[] = [];
  const chantIds: string[] = [];

  for (const id of setlist.resourceIds ?? []) {
    const resource = resourceMap.get(id);
    if (resource?.category === 'chants') {
      chantIds.push(id);
    } else {
      songIds.push(id);
    }
  }

  return { songIds, chantIds };
}

export function resolveSetlistResources(
  ids: string[],
  resourceMap: Map<string, Resource>
): Resource[] {
  return ids
    .map((id) => resourceMap.get(id))
    .filter((resource): resource is Resource => !!resource);
}
