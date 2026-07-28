import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WorshipRoster } from '@/types';

export type SetlistChangeKind = 'song_added' | 'song_removed' | 'song_updated' | 'reordered';

function describeSetlistChange(
  setlistName: string,
  kind: SetlistChangeKind,
  detail?: string,
): { title: string; message: string } {
  const name = setlistName.trim() || 'Setlist';
  switch (kind) {
    case 'song_added':
      return {
        title: 'Setlist updated',
        message: detail
          ? `"${name}" — song added: ${detail}`
          : `"${name}" — a song was added`,
      };
    case 'song_removed':
      return {
        title: 'Setlist updated',
        message: detail
          ? `"${name}" — song removed: ${detail}`
          : `"${name}" — a song was removed`,
      };
    case 'song_updated':
      return {
        title: 'Setlist updated',
        message: detail
          ? `"${name}" — ${detail}`
          : `"${name}" — a song was updated`,
      };
    case 'reordered':
      return {
        title: 'Setlist updated',
        message: `"${name}" — song order changed`,
      };
  }
}

/** Notify members assigned on worship rosters linked to this setlist. */
export async function notifySetlistChange(params: {
  setlistId: string;
  setlistName: string;
  kind: SetlistChangeKind;
  detail?: string;
  actorId?: string;
  createNotification: (data: {
    title: string;
    message: string;
    type: 'reminder';
    isGlobal: false;
    userId: string;
    relatedUrl: string;
  }) => Promise<unknown>;
}): Promise<void> {
  const { setlistId, setlistName, kind, detail, actorId, createNotification } = params;
  const { title, message } = describeSetlistChange(setlistName, kind, detail);

  let rosters: WorshipRoster[] = [];
  try {
    const snap = await getDocs(
      query(collection(db, 'worshipRosters'), where('setlistId', '==', setlistId)),
    );
    rosters = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipRoster));
  } catch (error) {
    console.warn('[notifySetlistChange] could not load linked rosters:', error);
    return;
  }

  if (rosters.length === 0) return;

  const recipientIds = new Set<string>();
  for (const roster of rosters) {
    for (const slot of roster.slots || []) {
      for (const member of slot.members || []) {
        const memberId = member.userId;
        if (memberId && memberId !== actorId) recipientIds.add(memberId);
      }
    }
  }

  await Promise.all(
    [...recipientIds].map((userId) =>
      createNotification({
        title,
        message,
        type: 'reminder',
        isGlobal: false,
        userId,
        relatedUrl: '/worship',
      }).catch((err) => {
        console.warn('[notifySetlistChange] notify failed for', userId, err);
      }),
    ),
  );
}
