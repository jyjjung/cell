import type { DocVisibility } from '@/types';

export const DOCS_COLLECTION = 'docs';
export const DOC_TITLE_MAX = 200;
export const DOC_COMMENT_MAX = 2000;

export function buildMemberIds(ownerId: string, sharedWith: string[]): string[] {
  const ids = new Set<string>([ownerId, ...sharedWith]);
  return Array.from(ids);
}

export function normalizeSharedWith(
  visibility: DocVisibility,
  sharedWith: string[],
  ownerId: string,
): string[] {
  if (visibility === 'private') return [];
  return Array.from(new Set(sharedWith.filter((uid) => uid && uid !== ownerId)));
}

export function stripHtmlPreview(html: string, maxLen = 120): string {
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}
