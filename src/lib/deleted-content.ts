import type { ChatMessage, DeletedMessageContentType } from '@/types';
import type { translations } from '@/lib/translations';

type TranslationBundle = (typeof translations)['en'];

const PREVIEW_LABELS: Record<DeletedMessageContentType, string> = {
  message: 'This message has been deleted',
  image: 'This image has been deleted',
  event: 'This event has been deleted',
  setlist: 'This setlist has been deleted',
  roster: 'This roster has been deleted',
  song: 'This song has been deleted',
  poll: 'This poll has been deleted',
  qt: 'This QT entry has been deleted',
  cleaning: 'This cleaning roster has been deleted',
};

export function getDeletedMessageContentType(
  message: Pick<
    ChatMessage,
    | 'poll'
    | 'songId'
    | 'sheetKey'
    | 'setlistId'
    | 'rosterId'
    | 'eventId'
    | 'qtDate'
    | 'cleaningDate'
    | 'imageUrl'
  >,
): DeletedMessageContentType {
  if (message.poll) return 'poll';
  if (message.songId || message.sheetKey) return 'song';
  if (message.setlistId) return 'setlist';
  if (message.rosterId) return 'roster';
  if (message.eventId) return 'event';
  if (message.qtDate) return 'qt';
  if (message.cleaningDate) return 'cleaning';
  if (message.imageUrl) return 'image';
  return 'message';
}

export function getDeletedContentPreview(type: DeletedMessageContentType): string {
  return PREVIEW_LABELS[type];
}

export function getDeletedContentLabel(
  type: DeletedMessageContentType,
  t: TranslationBundle,
): string {
  switch (type) {
    case 'image':
      return t.deletedContentImage;
    case 'event':
      return t.deletedContentEvent;
    case 'setlist':
      return t.deletedContentSetlist;
    case 'roster':
      return t.deletedContentRoster;
    case 'song':
      return t.deletedContentSong;
    case 'poll':
      return t.deletedContentPoll;
    case 'qt':
      return t.deletedContentQt;
    case 'cleaning':
      return t.deletedContentCleaning;
    default:
      return t.deletedContentMessage;
  }
}

export function resolveDeletedMessageLabel(
  message: Pick<ChatMessage, 'deletedContentType' | 'isDeleted'>,
  t: TranslationBundle,
): string {
  const type = message.deletedContentType ?? 'message';
  return getDeletedContentLabel(type, t);
}
