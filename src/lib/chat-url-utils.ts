/** Matches http(s):// and www. URLs in message text. */
export const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function normalizeChatUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith('www.')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function chatLinkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function chatLinkFaviconUrl(url: string): string | null {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${origin}`;
  } catch {
    return null;
  }
}
