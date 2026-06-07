export {
  CHAT_MESSAGES_LIVE_LIMIT as CHAT_MESSAGES_LIMIT,
  CHAT_MESSAGES_LIVE_LIMIT as CHAT_MESSAGES_CACHE_LIMIT,
} from '@/lib/chat-messages-device-cache';

/** No-op: only the open chat syncs history to avoid N×reads on list load. */
export function prefetchChatMessagesCache(): void {}
