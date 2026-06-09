import type { ChatMessage } from '@/types';
import type { UserProfileData } from '@/types';
import { formatUserDisplayName } from '@/lib/formatting';
import { URL_REGEX, normalizeChatUrl } from '@/lib/chat-url-utils';

export type ChatPhoto = {
  id: string;
  imageUrl: string;
  senderLabel: string;
  createdAt?: ChatMessage['createdAt'];
};

export type ChatLink = {
  id: string;
  url: string;
  displayUrl: string;
  messageId: string;
  senderLabel: string;
  createdAt?: ChatMessage['createdAt'];
};

export function extractChatPhotos(
  messages: ChatMessage[],
  usersById: Map<string, UserProfileData>,
): ChatPhoto[] {
  return [...messages]
    .filter((m) => m.imageUrl && !m.songId && !m.isDeleted)
    .reverse()
    .map((m) => ({
      id: m.id,
      imageUrl: m.imageUrl!,
      senderLabel: formatUserDisplayName(usersById.get(m.senderId), 'Someone'),
      createdAt: m.createdAt,
    }));
}

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ?? [];
}

export function extractChatLinks(
  messages: ChatMessage[],
  usersById: Map<string, UserProfileData>,
): ChatLink[] {
  const seen = new Set<string>();
  const links: ChatLink[] = [];

  for (const m of messages) {
    if (m.isDeleted || !m.text) continue;

    const urls = extractUrlsFromText(m.text);
    for (let i = 0; i < urls.length; i++) {
      const displayUrl = urls[i];
      const url = normalizeChatUrl(displayUrl);
      if (seen.has(url)) continue;
      seen.add(url);

      links.push({
        id: `${m.id}-${i}`,
        url,
        displayUrl,
        messageId: m.id,
        senderLabel: formatUserDisplayName(usersById.get(m.senderId), 'Someone'),
        createdAt: m.createdAt,
      });
    }
  }

  return links;
}
