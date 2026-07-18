import type { DocVisibility } from '@/types';

export const DOCS_COLLECTION = 'docs';
export const DOC_TITLE_MAX = 200;
export const DOC_COMMENT_MAX = 2000;
/** Prompt to convert a chat message into a shared document above this length. */
export const LONG_MESSAGE_DOC_THRESHOLD = 400;

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

export function mergeAuthorIds(existing: string[] | undefined, uid: string): string[] {
  const ids = new Set<string>(existing || []);
  ids.add(uid);
  return Array.from(ids);
}

export function displayDocTitle(title: string | undefined | null, untitledLabel = 'Untitled'): string {
  const trimmed = (title || '').trim();
  return trimmed || untitledLabel;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert plain chat text into simple TipTap-compatible HTML paragraphs. */
export function plainTextToDocHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '<p></p>';
  return trimmed
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');
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
