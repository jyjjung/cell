import { isToday, isYesterday, isThisYear } from 'date-fns';
import { ChatMessage } from '@/types/ndcpc-ported';
import { formatAppDate } from '@/lib/ndcpc/format-date';
import type { NdcpcLocale } from '@/lib/ndcpc/format-date';

const GROUP_GAP_MS = 5 * 60 * 1000;

export type MessageGroupPosition = 'single' | 'first' | 'middle' | 'last';

export type ChatMessageGroup = {
  indices: number[];
};

function toDate(value: ChatMessage['createdAt']) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return null;
}

/** Soft-deleted or empty-text messages render as a deleted placeholder. */
export function isChatMessageDeleted(message: ChatMessage) {
  return message.deleted === true || !message.text?.trim();
}

function toMillis(value: ChatMessage['createdAt']) {
  const date = toDate(value);
  return date ? date.getTime() : null;
}

function isSameGroup(a: ChatMessage, b: ChatMessage) {
  if (a.authorUid !== b.authorUid) return false;
  if (a.replyTo || b.replyTo) return false;

  const aMs = toMillis(a.createdAt);
  const bMs = toMillis(b.createdAt);
  if (aMs && bMs && Math.abs(bMs - aMs) > GROUP_GAP_MS) return false;

  return true;
}

export function getMessageGroupPosition(
  messages: ChatMessage[],
  index: number
): MessageGroupPosition {
  const message = messages[index];
  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;

  const sameAsPrev = prev ? isSameGroup(prev, message) : false;
  const sameAsNext = next ? isSameGroup(message, next) : false;

  if (!sameAsPrev && !sameAsNext) return 'single';
  if (!sameAsPrev && sameAsNext) return 'first';
  if (sameAsPrev && sameAsNext) return 'middle';
  return 'last';
}

export function getChatMessageGroups(messages: ChatMessage[]): ChatMessageGroup[] {
  const groups: ChatMessageGroup[] = [];

  messages.forEach((_, index) => {
    const position = getMessageGroupPosition(messages, index);
    if (position === 'first' || position === 'single') {
      groups.push({ indices: [index] });
      return;
    }
    groups[groups.length - 1]?.indices.push(index);
  });

  return groups;
}

export function shouldShowDateSeparator(messages: ChatMessage[], index: number) {
  const message = messages[index];
  const currentDate = toDate(message.createdAt);
  if (!currentDate) return index === 0;

  if (index === 0) return true;

  const previousDate = toDate(messages[index - 1]?.createdAt);
  if (!previousDate) return true;

  return previousDate.toDateString() !== currentDate.toDateString();
}

export function formatChatDateSeparator(
  date: Date,
  locale: NdcpcLocale,
  t: (key: 'chat.today' | 'chat.yesterday', params?: Record<string, string | number>) => string
) {
  if (isToday(date)) return t('chat.today');
  if (isYesterday(date)) return t('chat.yesterday');
  if (isThisYear(date)) return formatAppDate(date, 'EEEE, MMM d', locale);
  return formatAppDate(date, 'MMM d, yyyy', locale);
}

export function getGroupSpacingClass(messages: ChatMessage[], startIndex: number) {
  if (startIndex === 0) return '';
  if (shouldShowDateSeparator(messages, startIndex)) return 'mt-4';

  const prev = messages[startIndex - 1];
  const current = messages[startIndex];
  if (prev && prev.authorUid !== current.authorUid) return 'mt-3';

  return 'mt-4';
}

/** Tail corner only on the last bubble in a cluster. Others stay fully rounded. */
const BUBBLE_RADIUS = {
  own: {
    single: 'rounded-2xl rounded-br-md',
    first: 'rounded-2xl',
    middle: 'rounded-2xl',
    last: 'rounded-2xl rounded-br-md',
  },
  other: {
    single: 'rounded-2xl rounded-bl-md',
    first: 'rounded-2xl',
    middle: 'rounded-2xl',
    last: 'rounded-2xl rounded-bl-md',
  },
} as const;

export function getBubbleRadius(isOwn: boolean, position: MessageGroupPosition) {
  return isOwn ? BUBBLE_RADIUS.own[position] : BUBBLE_RADIUS.other[position];
}

export function getMessageDate(message: ChatMessage) {
  return toDate(message.createdAt);
}

/** Each viewer's name appears only on the latest own message they've read. */
export function getReadReceiptNamesByMessageId(
  messages: ChatMessage[],
  authorUid: string
) {
  const namesByMessageId = new Map<string, string[]>();
  const viewerLatestRead = new Map<string, { index: number; name: string }>();

  messages.forEach((message, index) => {
    if (message.authorUid !== authorUid) return;
    if (isChatMessageDeleted(message)) return;

    Object.entries(message.seenBy ?? {}).forEach(([uid, value]) => {
      if (uid === authorUid) return;

      const name = value?.name?.trim();
      if (!name) return;

      const existing = viewerLatestRead.get(uid);
      if (!existing || index > existing.index) {
        viewerLatestRead.set(uid, { index, name });
      }
    });
  });

  viewerLatestRead.forEach(({ index, name }) => {
    const messageId = messages[index]?.id;
    if (!messageId) return;

    const names = namesByMessageId.get(messageId) ?? [];
    names.push(name);
    namesByMessageId.set(messageId, names);
  });

  return namesByMessageId;
}
