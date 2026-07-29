import type { DocVisibility } from '@/types';
import { escapeHtml } from '@/lib/sanitize-html';

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

/** True when HTML has no visible text (empty TipTap docs, placeholders, etc.). */
export function isBlankDocHtml(html: string | undefined | null): boolean {
  if (!html) return true;
  return stripHtmlPreview(html, Number.MAX_SAFE_INTEGER).length === 0;
}

/** Plain text matching TipTap `getText({ blockSeparator: '\\n' })`. */
export function htmlToEditorPlainText(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(html || '', 'text/html');
    const children = Array.from(parsed.body.children);
    if (children.length > 0) {
      return children.map((el) => el.textContent || '').join('\n');
    }
    return parsed.body.textContent || '';
  }
  return stripHtmlPreview(html || '', Number.MAX_SAFE_INTEGER);
}

function tokenizeForDiff(text: string): string[] {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

/**
 * Character ranges in `next` that were inserted relative to `prev` (word-level).
 * Used to highlight remote collaborator edits like shared Apple Notes.
 */
export function findInsertedTextRanges(
  prev: string,
  next: string,
): Array<{ start: number; end: number }> {
  if (prev === next) return [];
  if (!next) return [];
  if (!prev) return [{ start: 0, end: next.length }];

  // Cap DP size for long documents — highlight the whole note instead.
  if (prev.length > 4000 || next.length > 4000) {
    return [{ start: 0, end: next.length }];
  }

  const prevTokens = tokenizeForDiff(prev);
  const nextTokens = tokenizeForDiff(next);
  const m = prevTokens.length;
  const n = nextTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        prevTokens[i] === nextTokens[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const nextOffsets: number[] = [];
  let offset = 0;
  for (const token of nextTokens) {
    nextOffsets.push(offset);
    offset += token.length;
  }

  const inserted: Array<{ start: number; end: number }> = [];
  let i = 0;
  let j = 0;

  const pushRange = (start: number, end: number) => {
    if (start >= end) return;
    const last = inserted[inserted.length - 1];
    if (last && last.end === start) {
      last.end = end;
    } else {
      inserted.push({ start, end });
    }
  };

  while (i < m && j < n) {
    if (prevTokens[i] === nextTokens[j]) {
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      const start = nextOffsets[j];
      pushRange(start, start + nextTokens[j].length);
      j += 1;
    }
  }
  while (j < n) {
    const start = nextOffsets[j];
    pushRange(start, start + nextTokens[j].length);
    j += 1;
  }

  return inserted.filter((range) => next.slice(range.start, range.end).trim().length > 0);
}

type PmNodeLike = {
  isTextblock: boolean;
  isText: boolean;
  text?: string;
  descendants: (f: (node: PmNodeLike, pos: number) => boolean | void) => void;
};

/**
 * Map plain-text offsets (with `\\n` between textblocks) onto ProseMirror positions.
 */
export function mapTextRangesToDocPositions(
  doc: PmNodeLike,
  ranges: Array<{ start: number; end: number }>,
): Array<{ from: number; to: number }> {
  if (ranges.length === 0) return [];
  const mapped: Array<{ from: number; to: number }> = [];
  let textOffset = 0;
  let seenTextblock = false;

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      if (seenTextblock) textOffset += 1;
      seenTextblock = true;
      return;
    }
    if (!node.isText || !node.text) return;
    const start = textOffset;
    const end = textOffset + node.text.length;
    for (const range of ranges) {
      const overlapStart = Math.max(range.start, start);
      const overlapEnd = Math.min(range.end, end);
      if (overlapStart < overlapEnd) {
        mapped.push({
          from: pos + (overlapStart - start),
          to: pos + (overlapEnd - start),
        });
      }
    }
    textOffset = end;
  });

  return mapped;
}
