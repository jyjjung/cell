'use client';

import { useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import MessageBubble from '@/components/chat/MessageBubble';
import { ChatTimeSeparator } from '@/components/chat/ChatTimeSeparator';
import { getMessageGroupPosition, isChatMessageDeleted } from '@/lib/ndcpc/chat-message-meta';
import type { TranslationKey } from '@/context/LocaleProvider';
import type { ChatMessage } from '@/types/ndcpc-ported';
import type { AvatarData, Chat, ChatMemberInfo, ChatMessage as EmChatMessage, UserProfileData } from '@/types';
import { createDefaultNdcpcAvatar, sanitizeNdcpcAvatar } from '@/lib/user-avatars';

const EMPTY_USERS_BY_ID = new Map<string, UserProfileData>();

const NDCPC_CHAT_SHELL: Chat = {
  id: 'ndcpc',
  type: 'group',
  members: [],
  memberInfo: {},
  memberSeen: {},
  createdAt: Timestamp.fromMillis(0),
};

function resolveAuthorAvatar(message: ChatMessage): AvatarData {
  const hint = {
    uid: message.authorUid,
    displayName: message.authorName,
  };

  if (message.authorAvatar) {
    return sanitizeNdcpcAvatar(message.authorAvatar, hint);
  }
  if (message.authorPhotoURL) {
    return { mode: 'image', imageUrl: message.authorPhotoURL, cosmeticTier: 'none' };
  }
  return createDefaultNdcpcAvatar(hint);
}

function toMemberInfo(message: ChatMessage): ChatMemberInfo {
  const parts = message.authorName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || message.authorName || undefined,
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined,
    avatar: resolveAuthorAvatar(message),
  };
}

function toEmCreatedAt(value: ChatMessage['createdAt']): Timestamp {
  if (value instanceof Timestamp) return value;
  if (value && typeof (value as Timestamp).toMillis === 'function') {
    return value as Timestamp;
  }
  if (value && typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') {
    return Timestamp.fromMillis(value.seconds * 1000);
  }
  return Timestamp.fromMillis(0);
}

function toEmMessage(message: ChatMessage): EmChatMessage {
  return {
    id: message.id,
    senderId: message.authorUid,
    text: message.text,
    createdAt: toEmCreatedAt(message.createdAt),
    seenBy: [],
    reactions: message.reactions,
    isDeleted: isChatMessageDeleted(message),
  };
}

function toParentQuote(message: ChatMessage): {
  parentMessage?: EmChatMessage;
  parentSenderName?: string;
} {
  const replyTo = message.replyTo;
  if (!replyTo || typeof replyTo !== 'object') return {};
  return {
    parentMessage: {
      id: replyTo.messageId,
      senderId: '',
      text: replyTo.text,
      createdAt: Timestamp.fromMillis(0),
      seenBy: [],
    },
    parentSenderName: replyTo.authorName,
  };
}

type ChatMessageGroupProps = {
  messages: ChatMessage[];
  indices: number[];
  isOwn: boolean;
  currentUid?: string;
  seenNames: string[];
  timeSeparatorLabel?: string | null;
  onReply: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onDelete?: (message: ChatMessage) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

export function ChatMessageGroupView({
  messages,
  indices,
  isOwn,
  seenNames,
  timeSeparatorLabel,
  onReply,
  onReact,
  onDelete,
}: ChatMessageGroupProps) {
  const lastIndexInGroup = indices[indices.length - 1]!;

  const chat = useMemo(() => {
    const memberInfo: Chat['memberInfo'] = {};
    for (const message of messages) {
      memberInfo[message.authorUid] = toMemberInfo(message);
    }
    return { ...NDCPC_CHAT_SHELL, memberInfo };
  }, [messages]);

  return (
    <div>
      {timeSeparatorLabel ? <ChatTimeSeparator label={timeSeparatorLabel} /> : null}

      {indices.map((index) => {
        const message = messages[index]!;
        const position = getMessageGroupPosition(messages, index);
        const showAvatar = !isOwn && (position === 'single' || position === 'last');
        const showName = !isOwn && (position === 'single' || position === 'first');
        const { parentMessage, parentSenderName } = toParentQuote(message);
        const isLastInGroup = index === lastIndexInGroup;

        return (
          <MessageBubble
            key={message.id}
            message={toEmMessage(message)}
            chat={chat}
            sender={toMemberInfo(message)}
            usersById={EMPTY_USERS_BY_ID}
            toggleReaction={(_messageId, emoji) => onReact(message, emoji)}
            lastSeenNames={isOwn && isLastInGroup ? seenNames : []}
            onOpenThread={() => onReply(message)}
            onDelete={
              isOwn && onDelete
                ? () => {
                    onDelete(message);
                  }
                : undefined
            }
            parentMessage={parentMessage}
            parentSenderName={parentSenderName}
            showAvatar={showAvatar}
            showName={showName}
            showHalo={false}
          />
        );
      })}
    </div>
  );
}
