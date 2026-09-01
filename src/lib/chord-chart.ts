import { escapeHtml } from '@/lib/sanitize-html';
import type { ChordKey, SongChordSheet } from '@/types';

export const LETTER_KEYS: Exclude<ChordKey, 'numbers'>[] = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const NOTE_INDEX: Record<string, number> = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, 'E#': 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11,
};

const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

const CHORD_BODY =
  String.raw`(?:N\.?C\.?|NC|N/C|[A-G](?:#|b)?(?:maj7|maj9|maj13|maj|min7|min9|min|m7b5|m7|m9|m11|m13|madd9|m|sus4|sus2|sus|add9|add2|add11|dim7|dim|aug|2|4|5|6|7|9|11|13|\([^)]+\))*(?:/[A-G](?:#|b)?)?)`;

const CHORD_TOKEN = new RegExp(`^\\(?${CHORD_BODY}\\)?$`, 'i');
const CHORD_GLOBAL = new RegExp(`(\\(?${CHORD_BODY}\\)?)`, 'gi');
const CHORDPRO_TOKEN = new RegExp(`\\[(\\(?${CHORD_BODY}\\)?)\\]`, 'gi');
const TRAILING_CUE_RE = /\s*(\((?:To\b|\d+(?:st|nd|rd|th)\s+x\b)[^)]*\))\s*$/i;

const CHORD_SUFFIX_RE =
  /^(?:maj13|maj9|maj7|maj|min9|min7|min|madd9|m7b5|m13|m11|m9|m7|sus4|sus2|sus|add11|add9|add2|dim7|dim|aug|m(?![a-z])|13|11|9|7|6|5|4|2|\([^)]+\))+(?:\/[A-G](?:#|b)?)?/i;

const SECTION_NAME =
  '(?:INTRO|VERSE|CHORUS|BRIDGE|TAG|ENDING|TURNAROUND|OUTRO|PRE-?CHORUS|PRECHORUS|POST-?CHORUS|POSTCHORUS|INSTRUMENTAL|INTERLUDE|VAMP|BREAK|HOOK)';

const SECTION_RE = new RegExp(
  `^${SECTION_NAME}(?:\\s*\\/\\s*${SECTION_NAME})*(?:\\s+\\d+[A-Z]*)?$`,
  'i',
);

const SKIP_LINE_RE =
  /^(?:\*\s*)?(?:CCLI\b|©|\(c\)|copyright\b|for use solely|note:\s*reproduction|www\.ccli|songselect|all rights reserved|ccli license)/i;

const CCLI_FOOTER_CUT_RE =
  /CCLI\s+Song\b|CCLI\s+License\b|(?:^|\n)\s*\*\s*©|(?:^|\n)\s*©\s|(?:^|\n)\s*For use solely with|(?:^|\n)\s*Note:\s*Reproduction/i;

export type ChartLyricPart = { chord?: string; text: string };

export type ChartBlock =
  | { type: 'title'; text: string }
  | { type: 'credit'; text: string }
  | { type: 'meta'; text: string }
  | { type: 'section'; text: string }
  | { type: 'measure'; text: string; cue?: string }
  | { type: 'lyric'; parts: ChartLyricPart[]; cue?: string }
  | { type: 'note'; text: string };

export function isTextChordSheet(sheet: Pick<SongChordSheet, 'kind' | 'sourceText' | 'sourceHtml'>): boolean {
  return sheet.kind === 'text' || Boolean(sheet.sourceText) || Boolean(sheet.sourceHtml);
}

export function splitSheetsForViewer(sheets: SongChordSheet[]): {
  imageUrls: string[];
  textSheets: SongChordSheet[];
} {
  return {
    imageUrls: sheets.filter((s) => !isTextChordSheet(s) && s.imageUrl).map((s) => s.imageUrl),
    textSheets: sheets.filter(isTextChordSheet),
  };
}

export function detectKeyFromText(text: string): ChordKey | null {
  const match = text.match(/\bkey\s*[-–—:]\s*([A-G](?:#|b)?)/i);
  if (!match) return null;
  const raw = match[1];
  const normalized = `${raw[0].toUpperCase()}${raw.slice(1)}` as ChordKey;
  return LETTER_KEYS.includes(normalized as Exclude<ChordKey, 'numbers'>) ? normalized : null;
}

/** English words that start with A–G so we don't steal their first letter as a chord. */
const WORD_NOT_CHORD = new Set([
  'a', 'am', 'an', 'and', 'as', 'at', 'all', 'also', 'away', 'again', 'anyone', 'ashamed',
  'be', 'by', 'but', 'been', 'being', 'because', 'before', 'between', 'both', 'broke', 'blood', 'body', 'back', 'based',
  'can', 'cant', "can't", 'cannot', 'come', 'cross', 'care', 'cause', 'clean', 'call', 'could', 'couldnt', "couldn't",
  'chains', 'chorus', 'caution',
  'do', 'did', 'dont', "don't", 'debt', 'dance', 'dancing',
  'each', 'even', 'ever', 'every', 'everyone',
  'for', 'from', 'free', 'friend', 'found', 'forget', 'foolishness',
  'go', 'god', 'gone', 'good', 'going', 'great',
  'he', 'his', 'her', 'has', 'have', 'held', 'how',
  'if', 'in', 'is', 'it', 'its', "it's", 'ill', "i'll", 'im', "i'm",
  'me', 'my', 'mine',
  'no', 'not', 'never', 'now',
  'of', 'oh', 'on', 'or', 'out', 'off', 'once', 'other', 'over',
  'so', 'say', 'some', 'sin', 'sing', 'shed', 'shame',
  'the', 'to', 'too', 'this', 'that', 'those', 'thank', 'threw', 'throwing', 'took',
  'up', 'us',
  'we', 'was', 'what', 'where', 'worth', 'wind', 'with',
]);

const INLINE_CHORD_RE = new RegExp(`(\\(?${CHORD_BODY}\\)?)`, 'g');
const DIRECTION_CUE_RE = /\((?:To\b|\d+(?:st|nd|rd|th)\s+x\b)[^)]*\)/gi;

function stripSongSelectChrome(text: string): string {
  return text
    .replace(/SongSelect\s*logo/gi, '\n')
    .replace(/SongSelect/gi, '')
    .replace(/[\uFFFC\u00a0]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Title glues to credits when the logo node is removed (`YesterdayGrace Binion | …`).
    .replace(/([a-z])([A-Z][a-z]+)(\s+\|)/g, '$1\n$2$3')
    // Title sometimes glues to the next credit line when a logo node is removed.
    .replace(/(Free|Love|Grace|God|Lord|Jesus)([A-Z][a-z])/g, '$1\n$2');
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function isStandaloneChordToken(token: string): boolean {
  return CHORD_TOKEN.test(token.trim());
}

function normalizeWordKey(word: string): string {
  return word.toLowerCase().replace(/[’']/g, '');
}

function isEnglishWordAtLineStart(line: string, chordLen: number): boolean {
  const firstWord = line.trim().match(/^([A-Za-z']+)/)?.[1] ?? '';
  if (firstWord.length <= chordLen) return false;
  const glued = normalizeWordKey(firstWord);
  if (WORD_NOT_CHORD.has(glued)) return true;
  if (chordLen === 1 && /^[A-Z][a-z]+$/.test(firstWord)) {
    const remainder = firstWord.slice(chordLen);
    return remainder.length > 0 && remainder[0] === remainder[0].toLowerCase();
  }
  return false;
}

function shouldSplitInlineChord(line: string, index: number, token: string): boolean {
  if (!isStandaloneChordToken(token)) return false;

  const before = line.slice(0, index);
  if (/\bkey\s*[-–—:]\s*$/i.test(before)) return false;

  // Never pull letters out of jump cues: (To Ch. 1a), (2nd x To Tag 2)
  const open = before.lastIndexOf('(');
  const close = before.lastIndexOf(')');
  if (open > close) {
    const end = line.indexOf(')', open);
    const inside = line.slice(open, end === -1 ? line.length : end + 1);
    if (/to\b|\d+(?:st|nd|rd|th)\s+x\b/i.test(inside)) return false;
  }

  const rest = line.slice(index + token.length);
  if (!rest) return false;

  // Chord then lyrics on the same line (`G  Goodbye yesterday`).
  if (/^\s+\S/.test(rest)) {
    // Lyric hyphen lead-ins like `A - Ggain` — the letter before the dash is not a chord.
    if (/^\s+-\s*/.test(rest)) return false;
    return true;
  }

  if (/^\./.test(rest)) return false;

  const letters = rest.match(/^[A-Za-z']+/)?.[0] ?? '';
  if (!letters) return false;
  // Ch. Br. Vs. — section abbreviations, not chords.
  if (rest[letters.length] === '.') return false;

  if (index === 0 && isEnglishWordAtLineStart(line, token.length)) return false;

  const glued = normalizeWordKey(`${token}${letters}`);
  if (WORD_NOT_CHORD.has(glued)) return false;
  return true;
}

/** SongSelect column alignment: `G  Goodbye` or `G   A7sus  I have decided`. */
function splitAlignmentChords(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed || isChordOnlyLine(trimmed)) return null;

  const tokens: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 0) {
    const match = remaining.match(new RegExp(`^(\\(?${CHORD_BODY}\\)?)(\\s{2,}|$)`, 'i'));
    if (!match || !isChordToken(match[1])) break;
    tokens.push(unwrapChord(match[1]));
    remaining = match[2] ? remaining.slice(match[0].length).trimStart() : '';
    if (!match[2]) break;
  }

  if (tokens.length === 0) return null;
  const out = [...tokens];
  if (remaining) out.push(remaining);
  return out.length > 1 ? out : null;
}

function chartPasteQuality(text: string): number {
  let score = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isChordOnlyLine(trimmed)) score += 3;
    if (/[A-G][#b]?(?:\([^)]+\))?(?:\/[A-G][#b]?)?[a-z]{2,}/i.test(trimmed)) score -= 2;
    if (/\S  \S/.test(line) && /^[A-G(]/i.test(trimmed)) score -= 1;
  }
  return score;
}

function expandOneLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;
  if (
    isSectionHeader(trimmed)
    || isMeasureLine(trimmed)
    || isMetaLine(trimmed)
    || isSkipLine(trimmed)
    || isDirectionNote(trimmed)
    || isStandaloneChordToken(trimmed)
    || /\[[A-G]/.test(line)
    || trimmed.includes('|')
  ) {
    return line;
  }

  // Keep (To Ch. 1a) intact while expanding the rest of the line.
  const cueRanges: Array<{ start: number; end: number; text: string }> = [];
  DIRECTION_CUE_RE.lastIndex = 0;
  let cueMatch: RegExpExecArray | null;
  while ((cueMatch = DIRECTION_CUE_RE.exec(line)) !== null) {
    cueRanges.push({
      start: cueMatch.index,
      end: cueMatch.index + cueMatch[0].length,
      text: cueMatch[0],
    });
  }
  const inCue = (index: number, len: number) =>
    cueRanges.some((r) => index < r.end && index + len > r.start);

  INLINE_CHORD_RE.lastIndex = 0;
  if (!INLINE_CHORD_RE.test(line)) return line;

  const pieces: string[] = [];
  let last = 0;
  INLINE_CHORD_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_CHORD_RE.exec(line)) !== null) {
    const token = match[1];
    if (inCue(match.index, token.length)) continue;
    if (!shouldSplitInlineChord(line, match.index, token)) continue;
    if (match.index > last) pieces.push(line.slice(last, match.index));
    pieces.push(token);
    last = match.index + token.length;
  }
  if (last === 0) return line;
  if (last < line.length) pieces.push(line.slice(last));
  return pieces.join('\n');
}

/** Turn mashed SongSelect plain text (`I'm E/G#shaking`) into chord-on-own-line format. */
export function expandInlineChords(text: string): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      out.push('');
      continue;
    }
    const expanded = expandOneLine(line);
    out.push(expanded);
    // Only separate groups when a mashed line was split into chords + lyrics.
    if (expanded.includes('\n')) out.push('');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

/** Rejoin HTML pastes that turned `| E | E |` or `| C2 Dsus Em7 . |` into one token per line. */
export function repairBrokenMeasureLines(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  const pushFormatted = (tokens: string[]) => {
    const merged = mergeMeasureSuffixes(tokens);
    if (!hasCompleteMeasureBar(merged)) {
      for (const part of tokens) out.push(part);
      return;
    }
    for (const line of formatMeasureBars(merged)) out.push(line);
  };

  while (i < lines.length) {
    const cur = lines[i].trim();
    const next = lines[i + 1]?.trim();
    const startsBroken =
      (cur === '|' && upcomingIsInstrumentalRun(lines, i))
      || (cur.startsWith('|') && !isCompleteMeasureLine(cur) && isMeasureFragmentLine(cur) && upcomingIsInstrumentalRun(lines, i))
      || (isStandaloneChordToken(cur) && next === '|');

    if (!startsBroken) {
      if (cur === '|' && !upcomingIsInstrumentalRun(lines, i)) {
        i += 1;
        continue;
      }
      if (isSingleChordMeasureLine(cur) && looksLikeLyricPickupFollows(lines, i + 1)) {
        const inner = cur.replace(/\|/g, ' ').trim();
        if (inner) out.push(inner);
        i += 1;
        continue;
      }
      if (cur.startsWith('|') && !isCompleteMeasureLine(cur) && !upcomingIsInstrumentalRun(lines, i)) {
        const inner = cur.replace(/\|/g, ' ').trim();
        if (inner) out.push(inner);
        i += 1;
        continue;
      }
      const prev = out[out.length - 1]?.trim() ?? '';
      if (prev && isMeasureLine(prev) && isMeasureContinuation(cur, prev)) {
        const joined = mergeMeasureSuffixes([
          ...tokenizeMeasureLine(prev),
          ...tokenizeMeasureLine(cur),
        ]);
        out.pop();
        for (const line of formatMeasureBars(joined)) out.push(line);
        i += 1;
        continue;
      }
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const tokens: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) {
        if (hasCompleteMeasureBar(tokens) && !measureRunContinues(lines, i + 1)) {
          i += 1;
          break;
        }
        i += 1;
        continue;
      }
      if (isSectionHeader(t) || isDirectionNote(t) || isMetaLine(t) || isSkipLine(t) || isLyricTextLine(t)) break;
      const glue = t === '|' || isStandaloneChordToken(t) || isMeasureFragmentLine(t) || isMeasureContinuation(t);
      if (!glue) break;
      tokens.push(...tokenizeMeasureLine(t));
      i += 1;
      const closed = closedMeasureBars(tokens);
      const currentWide = closed.some((bar) => bar.length >= 2 || bar.includes('.'));
      if (currentWide) break;
      const singles = closed.filter((bar) => bar.length === 1).length;
      if (singles >= 4) break;
      if (singles >= 2) {
        const peek = lines[i]?.trim() ?? '';
        const afterPeek = nextNonEmptyLine(lines, i + 1)?.text;
        if (isStandaloneChordToken(peek) && afterPeek !== '|') break;
      }
    }
    pushFormatted(tokens);
  }
  return out.join('\n');
}

function tokenizeMeasureLine(line: string): string[] {
  const tokens: string[] = [];
  for (const piece of line.split(/(\|)/)) {
    if (piece === '|') {
      tokens.push('|');
      continue;
    }
    for (const tok of piece.trim().split(/\s+/).filter(Boolean)) tokens.push(tok);
  }
  return tokens;
}

function isMeasurePiece(token: string): boolean {
  if (!token) return false;
  if (token === '|' || token === '.' || token === '/' || token === '%') return true;
  if (/^[.|/%]+$/.test(token)) return true;
  if (isStandaloneChordToken(token) || isChordToken(token)) return true;
  const suffix = token.match(CHORD_SUFFIX_RE)?.[0];
  return Boolean(suffix && suffix.length === token.length);
}

function isMeasureFragmentLine(line: string): boolean {
  const tokens = tokenizeMeasureLine(line.trim());
  return tokens.length > 0 && tokens.every(isMeasurePiece);
}

function isCompleteMeasureLine(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return false;
  return (t.match(/\|/g)?.length ?? 0) >= 2 && /[A-G.]/.test(t);
}

function isSingleChordMeasureLine(line: string): boolean {
  if (!isCompleteMeasureLine(line)) return false;
  const bars = closedMeasureBars(tokenizeMeasureLine(line.trim()));
  return bars.length === 1 && bars[0].length === 1 && isChordToken(bars[0][0]);
}

function looksLikeLyricPickupFollows(lines: string[], from: number): boolean {
  const first = nextNonEmptyLine(lines, from);
  if (!first) return false;
  const t = first.text;
  if (isSectionHeader(t) || isDirectionNote(t) || isMetaLine(t) || isSkipLine(t)) return false;
  if (isCompleteMeasureLine(t) || t === '|') return false;
  if (isLyricTextLine(t)) return true;
  if (!(isStandaloneChordToken(t) || isChordOnlyLine(t)) || t.includes('|')) return false;
  const after = nextNonEmptyLine(lines, first.index + 1);
  if (!after) return false;
  if (isLyricTextLine(after.text)) return true;
  if (!(isStandaloneChordToken(after.text) || isChordOnlyLine(after.text)) || after.text.includes('|')) {
    return false;
  }
  const lyrics = nextNonEmptyLine(lines, after.index + 1);
  return Boolean(lyrics && isLyricTextLine(lyrics.text));
}

function nextNonEmptyLine(lines: string[], from: number): { text: string; index: number } | null {
  for (let j = from; j < lines.length; j++) {
    const text = lines[j].trim();
    if (text) return { text, index: j };
  }
  return null;
}

function isLyricTextLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (isSectionHeader(t) || isDirectionNote(t) || isMetaLine(t) || isSkipLine(t)) return false;
  if (t === '|' || isMeasureFragmentLine(t) || isChordOnlyLine(t)) return false;
  return true;
}

function closedMeasureBars(tokens: string[]): string[][] {
  const bars: string[][] = [];
  let current: string[] = [];
  for (const tok of tokens) {
    if (tok === '|') {
      if (current.length > 0) {
        bars.push(current);
        current = [];
      }
    } else {
      current.push(tok);
    }
  }
  return bars;
}

function peekUpcomingBars(lines: string[], from: number): string[][] {
  const tokens: string[] = [];
  for (let j = from; j < lines.length; j++) {
    const t = lines[j].trim();
    if (!t) continue;
    if (isSectionHeader(t) || isDirectionNote(t) || isMetaLine(t) || isSkipLine(t) || isLyricTextLine(t)) break;
    if (!(isMeasureFragmentLine(t) || isChordOnlyLine(t) || t === '|')) break;
    tokens.push(...tokenizeMeasureLine(t));
    const closed = closedMeasureBars(tokens);
    if (closed.some((bar) => bar.length >= 2 || bar.includes('.')) || closed.filter((bar) => bar.length === 1).length >= 2) {
      return closed;
    }
  }
  return closedMeasureBars(tokens);
}

function upcomingIsInstrumentalRun(lines: string[], from: number): boolean {
  const bars = peekUpcomingBars(lines, from);
  if (bars.some((bar) => bar.length >= 2 || bar.includes('.'))) return true;
  return bars.filter((bar) => bar.length === 1).length >= 2;
}

function measureRunContinuesAt(lines: string[], index: number): boolean {
  const t = lines[index]?.trim() ?? '';
  if (!t) return false;
  if (isSectionHeader(t) || isDirectionNote(t) || isMetaLine(t) || isSkipLine(t) || isLyricTextLine(t)) return false;
  if (t.startsWith('|')) return upcomingIsInstrumentalRun(lines, index);
  if (isMeasureFragmentLine(t) || isMeasureContinuation(t)) return true;
  if (!isChordOnlyLine(t) || t.includes('|')) return false;
  const after = nextNonEmptyLine(lines, index + 1);
  if (!after) return false;
  return after.text === '|' || after.text === '.' || /^\.?\s*\|$/.test(after.text);
}

function measureRunContinues(lines: string[], from: number): boolean {
  const next = nextNonEmptyLine(lines, from);
  return next ? measureRunContinuesAt(lines, next.index) : false;
}

function isMeasureContinuation(line: string, previousMeasure?: string): boolean {
  const t = line.trim();
  if (!t || isSectionHeader(t) || isDirectionNote(t) || isMetaLine(t)) return false;
  const tokens = tokenizeMeasureLine(t);
  if (tokens.length === 0 || !tokens.every(isMeasurePiece)) return false;
  const startsNewBar = tokens[0] === '|' && tokens.some((tok) => tok !== '|' && (isChordToken(tok) || tok === '.'));
  if (startsNewBar) return false;
  if (
    previousMeasure
    && isCompleteMeasureLine(previousMeasure)
    && (t === '|' || (isChordOnlyLine(t) && !t.includes('|') && !t.includes('.')))
  ) {
    return false;
  }
  return true;
}

function hasCompleteMeasureBar(tokens: string[]): boolean {
  let open = false;
  let content = false;
  for (const tok of tokens) {
    if (tok === '|') {
      if (open && content) return true;
      open = true;
      content = false;
    } else {
      content = true;
    }
  }
  return false;
}

function mergeMeasureSuffixes(tokens: string[]): string[] {
  const out: string[] = [];
  for (const tok of tokens) {
    const suffix = tok.match(CHORD_SUFFIX_RE)?.[0];
    if (suffix && suffix.length === tok.length) {
      let i = out.length - 1;
      while (i >= 0 && out[i] === '|') i -= 1;
      if (i >= 0 && isChordToken(`${out[i]}${suffix}`)) {
        out[i] = `${out[i]}${suffix}`;
        continue;
      }
    }
    out.push(tok);
  }
  return out;
}

function formatMeasureBars(tokens: string[]): string[] {
  const bars: string[][] = [];
  let current: string[] = [];
  for (const tok of tokens) {
    if (tok === '|') {
      if (current.length > 0) {
        bars.push(current);
        current = [];
      }
      continue;
    }
    current.push(tok);
  }
  if (current.length > 0) bars.push(current);
  if (bars.length === 0) return [];

  const lines: string[] = [];
  let packed: string[][] = [];
  const flush = () => {
    if (packed.length === 0) return;
    lines.push(`| ${packed.map((bar) => bar.join('  ')).join(' | ')} |`);
    packed = [];
  };
  for (const bar of bars) {
    if (bar.length === 1 && bar[0] === '.' && lines.length > 0 && packed.length === 0) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\|\s*$/, '  . |');
      continue;
    }
    const wide = bar.length >= 2 || bar.includes('.');
    if (wide) {
      flush();
      packed.push(bar);
      flush();
    } else {
      packed.push(bar);
      if (packed.length >= 4) flush();
    }
  }
  flush();
  return lines;
}

function isChordStyledElement(el: HTMLElement): boolean {
  const text = (el.textContent ?? '').trim();
  if (!text || !isStandaloneChordToken(text)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'b' || tag === 'strong') return true;
  const cls = (el.getAttribute('class') ?? '').toLowerCase();
  if (/\bchord/.test(cls)) return true;
  const style = (el.getAttribute('style') ?? '').toLowerCase();
  if (/font-weight\s*:\s*(bold|[6-9]00)/.test(style)) return true;
  if (/display\s*:\s*block/.test(style)) return true;
  return false;
}

const HTML_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'div', 'dl', 'dt', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table',
  'tbody', 'tfoot', 'thead', 'tr', 'ul',
]);

/** Emit one block (p/div/…) preserving each chord or lyric fragment on its own line. */
function emitBlockLines(el: HTMLElement, emit: (node: Node) => string): string {
  const lines: string[] = [];
  let textBuf = '';
  const flushText = () => {
    const t = textBuf.replace(/\u00a0/g, ' ').trim();
    if (t) lines.push(t);
    textBuf = '';
  };

  for (const node of el.childNodes) {
    if (node.nodeType === 3) {
      const t = node.textContent ?? '';
      const parentTag = node.parentElement?.tagName.toLowerCase() ?? '';
      if (!t.trim() && /^(body|html|div|p|section|table|tbody|thead|tr|ul|ol)$/.test(parentTag)) {
        continue;
      }
      textBuf += t;
      continue;
    }
    if (node.nodeType !== 1) continue;
    const child = node as HTMLElement;
    const tag = child.tagName.toLowerCase();
    if (tag === 'br') {
      flushText();
      continue;
    }
    if (tag === 'img' && /songselect/i.test(child.getAttribute('alt') ?? '')) continue;

    if (HTML_BLOCK_TAGS.has(tag)) {
      flushText();
      const nested = emit(child);
      const nestedLines = nested.replace(/\n+$/g, '').split('\n').filter((l, i, arr) => l.trim() || i < arr.length - 1);
      for (const line of nestedLines) {
        if (line.trim()) lines.push(line.trim());
      }
      continue;
    }

    const childText = emit(child);
    const own = childText.trim();
    if (!own) continue;
    textBuf += childText;
  }
  flushText();
  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

function chartTextFromHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  let parsed: Document;
  try {
    parsed = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return '';
  }
  const emit = (node: Node): string => {
    if (node.nodeType === 3) {
      const t = node.textContent ?? '';
      const parentTag = node.parentElement?.tagName.toLowerCase() ?? '';
      if (!t.trim() && /^(body|html|div|p|section|table|tbody|thead|tr|ul|ol)$/.test(parentTag)) {
        return '';
      }
      return t;
    }
    if (node.nodeType !== 1) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') {
      const alt = el.getAttribute('alt') || '';
      return /songselect/i.test(alt) ? '' : alt;
    }
    if (tag === 'style' || tag === 'script' || tag === 'meta' || tag === 'link' || tag === 'head') return '';

    if (tag === 'pre') {
      return `${(el.textContent ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')}\n`;
    }

    const childText = Array.from(el.childNodes).map(emit).join('');
    const own = childText.trim();

    if (tag === 'td' || tag === 'th') {
      if (own && isMeasureLine(own)) return `${own}\n`;
      return `${childText.replace(/\s+/g, ' ').trim()} `;
    }
    if (tag === 'tr') return `${childText.replace(/\s+/g, ' ').trim()}\n`;

    if (HTML_BLOCK_TAGS.has(tag)) {
      if (tag === 'table' || el.querySelector('table')) {
        return `${childText}\n`;
      }
      if (own && isMeasureLine(own)) {
        return `${own}\n`;
      }
      const blockLines = emitBlockLines(el, emit);
      if (blockLines) return blockLines;
      return `${childText}\n`;
    }

    return childText;
  };
  return emit(parsed.body);
}

function isChordToken(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;
  return CHORD_TOKEN.test(trimmed);
}

function isChordOnlyLine(line: string): boolean {
  const tokens = unwrapBracketChordLine(line).trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => isChordToken(token));
}

/** `[(B/D#)]` / `[C2]` on their own SongSelect line. */
function unwrapBracketChordLine(line: string): string {
  const trimmed = line.trim();
  const wrapped = trimmed.match(/^\[(.+)\]$/);
  if (wrapped && isChordToken(wrapped[1])) return wrapped[1];
  return trimmed;
}

/** Rejoin `C` + `2` / `G` + `7sus` when SongSelect bolded only the root letter. */
function repairSplitChordLines(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const cur = lines[i].trim();
    const next = lines[i + 1]?.trim() ?? '';
    const suffix = next.match(CHORD_SUFFIX_RE)?.[0];
    if (isChordToken(cur) && suffix) {
      const combined = `${cur}${suffix}`;
      if (isChordToken(combined)) {
        const rest = next.slice(suffix.length).trim();
        out.push(combined);
        if (rest) out.push(rest);
        i += 2;
        continue;
      }
    }
    out.push(lines[i]);
    i += 1;
  }
  return out.join('\n');
}

function repairPastedChart(text: string): string {
  return repairSplitChordLines(repairBrokenMeasureLines(stripSongSelectChrome(text)));
}

/** Save pasted chart text — strip chrome and repair bar lines only. */
export function savePastedChartText(text: string): string {
  return repairPastedChart(text);
}

export type PreparedChartPaste = {
  text: string;
  html: string | null;
};

function looksLikeChartHtml(html: string): boolean {
  return /class="chart-(?:chord|table|section|measure|title)"/.test(html);
}

function stripSongSelectDom(root: HTMLElement) {
  root.querySelectorAll('img, script, style, meta, link, button, input, svg').forEach((el) => el.remove());
  const remove: Node[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = node.textContent ?? '';
    if (/SongSelect\s*logo/i.test(text) || /^\s*SongSelect\s*$/i.test(text)) {
      remove.push(node);
    }
    node = walker.nextNode();
  }
  for (const dead of remove) dead.parentNode?.removeChild(dead);
}

function stripCcliFromDom(root: HTMLElement) {
  const blocks = Array.from(root.querySelectorAll('div, p, tr, h1, h2, h3, li'));
  const cut = blocks.find((el) => {
    const text = (el.textContent ?? '').trim();
    if (!text) return false;
    if (!(CCLI_FOOTER_CUT_RE.test(text) || isSkipLine(text))) return false;
    const nested = Array.from(el.querySelectorAll('div, p, tr, h1, h2, h3, li')).some((child) => {
      const childText = (child.textContent ?? '').trim();
      return Boolean(childText) && (CCLI_FOOTER_CUT_RE.test(childText) || isSkipLine(childText));
    });
    return !nested;
  });
  if (!cut) return;
  while (cut.nextSibling) {
    cut.parentNode?.removeChild(cut.nextSibling);
  }
  cut.remove();
}

function serializeChartText(text: string): string {
  return escapeHtml(text).replace(/\u00a0/g, '&nbsp;');
}

function hasNestedChartBlock(el: HTMLElement): boolean {
  return Boolean(el.querySelector('div, p, table, h1, h2, h3, h4, h5, h6, li, tr, ul, ol'));
}

type ChartHtmlCtx = { sawBody: boolean; headerCount: number };

function classifyChartLine(text: string, ctx: ChartHtmlCtx): string {
  const trimmed = text.trim();
  if (isSectionHeader(trimmed)) {
    ctx.sawBody = true;
    return 'chart-section';
  }
  if (isMeasureLine(trimmed)) {
    ctx.sawBody = true;
    return 'chart-measure';
  }
  if (isDirectionNote(trimmed)) {
    ctx.sawBody = true;
    return 'chart-note';
  }
  if (isMetaLine(trimmed)) {
    ctx.sawBody = true;
    return 'chart-meta';
  }
  if (isChordOnlyLine(trimmed)) {
    ctx.sawBody = true;
    return 'chart-line chart-chord-line';
  }
  if (!ctx.sawBody) {
    if (ctx.headerCount === 0) {
      ctx.headerCount += 1;
      return 'chart-title';
    }
    ctx.headerCount += 1;
    return 'chart-credit';
  }
  return 'chart-line';
}

function serializeChartNode(node: Node, ctx: ChartHtmlCtx): string {
  if (node.nodeType === 3) {
    return serializeChartText(node.textContent ?? '');
  }
  if (node.nodeType !== 1) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') return '<br>';
  if (tag === 'table') {
    ctx.sawBody = true;
    const inner = Array.from(el.childNodes).map((child) => serializeChartNode(child, ctx)).join('');
    return inner.trim() ? `<table class="chart-table">${inner}</table>` : '';
  }
  if (tag === 'tr') {
    const inner = Array.from(el.childNodes).map((child) => serializeChartNode(child, ctx)).join('');
    return inner.trim() ? `<tr>${inner}</tr>` : '';
  }
  if (tag === 'td' || tag === 'th') {
    const inner = Array.from(el.childNodes).map((child) => serializeChartNode(child, ctx)).join('');
    return `<td class="chart-col">${inner}</td>`;
  }
  if (tag === 'tbody' || tag === 'thead' || tag === 'tfoot') {
    return Array.from(el.childNodes).map((child) => serializeChartNode(child, ctx)).join('');
  }

  const rawText = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
  const chordEl = isChordStyledElement(el) || (
    isStandaloneChordToken(rawText)
    && !hasNestedChartBlock(el)
    && !el.querySelector('br')
  );

  if (chordEl && isStandaloneChordToken(rawText)) {
    ctx.sawBody = true;
    const chord = `<span class="chart-chord">${escapeHtml(rawText)}</span>`;
    if (HTML_BLOCK_TAGS.has(tag) || tag === 'p') {
      return `<div class="chart-line chart-chord-line">${chord}</div>`;
    }
    return chord;
  }

  if (!HTML_BLOCK_TAGS.has(tag)) {
    return Array.from(el.childNodes).map((child) => serializeChartNode(child, ctx)).join('');
  }

  if (hasNestedChartBlock(el)) {
    return Array.from(el.childNodes).map((child) => serializeChartNode(child, ctx)).join('');
  }

  if (isSkipLine(rawText)) return '';

  const inner = Array.from(el.childNodes).map((child) => serializeChartNode(child, ctx)).join('');
  if (!inner.replace(/&nbsp;|<br\s*\/?>/gi, '').trim()) return '';
  const cls = classifyChartLine(rawText, ctx);
  return `<div class="${cls}">${inner}</div>`;
}

/** Turn SongSelect clipboard HTML into semantic chart HTML (chords stay on their own lines). */
export function formatChartHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const raw = html.trim();
  if (!raw) return '';
  if (looksLikeChartHtml(raw)) return raw;
  let parsed: Document;
  try {
    parsed = new DOMParser().parseFromString(raw, 'text/html');
  } catch {
    return '';
  }
  const body = parsed.body;
  if (!body) return '';
  stripSongSelectDom(body);
  stripCcliFromDom(body);
  const ctx: ChartHtmlCtx = { sawBody: false, headerCount: 0 };
  return Array.from(body.childNodes).map((child) => serializeChartNode(child, ctx)).join('').trim();
}

function chordTransposeMapper(originalKey: ChordKey, displayKey: ChordKey): ((chord: string) => string) | null {
  if (originalKey === 'numbers' || originalKey === displayKey) return null;
  const from = originalKey as Exclude<ChordKey, 'numbers'>;
  return (chord: string) => {
    if (displayKey === 'numbers') return toNashville(chord, from);
    return transposeChord(chord, semitoneDistance(from, displayKey as Exclude<ChordKey, 'numbers'>), displayKey);
  };
}

/** Transpose `.chart-chord` spans and measure lines in stored chart HTML. */
export function transposeChartHtml(html: string, originalKey: ChordKey, displayKey: ChordKey): string {
  const map = chordTransposeMapper(originalKey, displayKey);
  if (!map || typeof DOMParser === 'undefined') return html;
  let parsed: Document;
  try {
    parsed = new DOMParser().parseFromString(`<div id="chart-root">${html}</div>`, 'text/html');
  } catch {
    return html;
  }
  const root = parsed.getElementById('chart-root');
  if (!root) return html;
  root.querySelectorAll('.chart-chord').forEach((el) => {
    el.textContent = map(el.textContent ?? '');
  });
  root.querySelectorAll('.chart-measure').forEach((el) => {
    el.textContent = mapChordsInText(el.textContent ?? '', map);
  });
  root.querySelectorAll('.chart-meta').forEach((el) => {
    el.textContent = (el.textContent ?? '').replace(
      /\bkey\s*[-–—:]\s*([A-G](?:#|b)?)/i,
      () => `Key - ${displayKey === 'numbers' ? '#' : displayKey}`,
    );
  });
  root.querySelectorAll('.chart-line:not(.chart-chord-line)').forEach((el) => {
    if (el.querySelector('.chart-chord')) return;
    const text = el.textContent ?? '';
    if (isMeasureLine(text)) el.textContent = mapChordsInText(text, map);
  });
  return root.innerHTML;
}

/**
 * Paste like Apple Notes: keep clipboard HTML and format it; plain text is the fallback.
 */
export function prepareChordChartClipboard(plain: string, html?: string | null): PreparedChartPaste {
  const plainNorm = repairPastedChart(plain);
  if (html?.trim()) {
    const formatted = formatChartHtml(html);
    const fromHtml = repairPastedChart(decodeHtmlEntities(chartTextFromHtml(html)));
    if (formatted.trim() && looksLikeChartHtml(formatted)) {
      return { text: fromHtml.trim() ? fromHtml : plainNorm, html: formatted };
    }
    if (fromHtml.trim() && chartPasteQuality(fromHtml) >= chartPasteQuality(plainNorm)) {
      return { text: fromHtml, html: formatted.trim() || null };
    }
  }
  return { text: plainNorm, html: null };
}

/**
 * Paste like Apple Notes: use clipboard HTML when it preserves SongSelect line breaks.
 * Plain text is kept as-is (no regex re-splitting).
 */
export function prepareChordChartPaste(plain: string, html?: string | null): string {
  return prepareChordChartClipboard(plain, html).text;
}

function normalizePaste(text: string): string {
  return repairPastedChart(text);
}

function isSectionHeader(line: string): boolean {
  return SECTION_RE.test(line.trim());
}

function isMeasureLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.includes('|');
}

function isSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (SKIP_LINE_RE.test(trimmed)) return true;
  return /www\.ccli\.com/i.test(trimmed) || /music reproduction license/i.test(trimmed);
}

/** Drop the SongSelect / CCLI copyright block from the end of a paste. */
function stripCcliFooter(text: string): string {
  const match = text.match(CCLI_FOOTER_CUT_RE);
  const body = match?.index != null ? text.slice(0, match.index) : text;
  return body
    .split('\n')
    .filter((line) => !isSkipLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function isDirectionNote(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return false;
  const inner = trimmed.slice(1, -1).trim();
  if (isChordToken(inner) || isChordToken(trimmed)) return false;
  return /^(to\b|\d+(st|nd|rd|th)\s+x\b|based on\b)/i.test(inner);
}

function isMetaLine(line: string): boolean {
  return /^\s*(key|tempo|time)\s*[-–—:]/i.test(line) || /\|/.test(line) && /\b(key|tempo|time)\b/i.test(line);
}

function parseChordProLine(line: string): ChartLyricPart[] {
  const parts: ChartLyricPart[] = [];
  const re = new RegExp(CHORDPRO_TOKEN.source, 'gi');
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      parts.push({ text: line.slice(last, match.index) });
    }
    const nextTextStart = match.index + match[0].length;
    const rest = line.slice(nextTextStart);
    const nextChord = rest.search(new RegExp(CHORDPRO_TOKEN.source, 'i'));
    const text = nextChord === -1 ? rest : rest.slice(0, nextChord);
    parts.push({ chord: match[1], text });
    last = nextTextStart + text.length;
    re.lastIndex = last;
  }
  if (last < line.length) {
    parts.push({ text: line.slice(last) });
  }
  return parts.filter((p) => p.chord || p.text);
}

function explodeInlineChords(parts: ChartLyricPart[]): ChartLyricPart[] {
  const tokenRe = new RegExp(`(\\(${CHORD_BODY}\\)|\\[\\(?${CHORD_BODY}\\)?\\])`, 'gi');
  const out: ChartLyricPart[] = [];

  for (const part of parts) {
    const text = part.text;
    tokenRe.lastIndex = 0;
    if (!tokenRe.test(text)) {
      out.push(part);
      continue;
    }
    tokenRe.lastIndex = 0;
    let last = 0;
    let usedChord = false;
    let match: RegExpExecArray | null;
    while ((match = tokenRe.exec(text)) !== null) {
      let chord = match[1];
      if (chord.startsWith('[') && chord.endsWith(']')) chord = chord.slice(1, -1);
      if (!isChordToken(chord)) continue;
      const before = text.slice(last, match.index);
      if (!usedChord && part.chord) {
        out.push({ chord: part.chord, text: before });
        usedChord = true;
      } else if (before) {
        out.push({ text: before });
      }
      out.push({ chord, text: '' });
      last = match.index + match[0].length;
    }
    const rest = text.slice(last);
    if (last === 0) {
      out.push(part);
    } else if (rest) {
      const prev = out[out.length - 1];
      if (prev && prev.chord && !prev.text) prev.text = rest;
      else out.push({ text: rest });
    }
  }
  return out.filter((p) => p.chord || p.text);
}

function peelTrailingCues(parts: ChartLyricPart[]): { parts: ChartLyricPart[]; cue?: string } {
  const cues: string[] = [];
  const next = parts.map((part) => {
    const match = part.text.match(TRAILING_CUE_RE);
    if (!match || match.index == null) return part;
    cues.push(match[1]);
    return { ...part, text: part.text.slice(0, match.index) };
  }).filter((part) => part.chord || part.text.trim());
  return { parts: next, cue: cues.length > 0 ? cues.join(' ') : undefined };
}

/** Fold chord-only lines (SongSelect pickups) into the next lyric line. */
export function coalescePickupChords(blocks: ChartBlock[]): ChartBlock[] {
  const out: ChartBlock[] = [];
  let pickups: ChartLyricPart[] = [];

  const flushPickups = () => {
    if (pickups.length === 0) return;
    out.push({ type: 'lyric', parts: pickups });
    pickups = [];
  };

  for (const block of blocks) {
    if (
      block.type === 'lyric'
      && block.parts.length > 0
      && block.parts.every((part) => Boolean(part.chord) && !part.text.trim())
    ) {
      pickups.push(...block.parts.map((part) => ({ chord: part.chord, text: '' })));
      continue;
    }
    if (block.type === 'lyric' && pickups.length > 0) {
      const textParts = block.parts.filter((part) => part.text.trim());
      const chordParts = block.parts.filter((part) => part.chord);
      if (
        pickups.length === 1
        && textParts.length === 1
        && !textParts[0].chord
        && chordParts.length === 0
      ) {
        out.push({
          type: 'lyric',
          parts: [{ chord: pickups[0].chord, text: textParts[0].text }],
          cue: block.cue,
        });
      } else {
        out.push({ type: 'lyric', parts: [...pickups, ...block.parts], cue: block.cue });
      }
      pickups = [];
      continue;
    }
    flushPickups();
    out.push(block);
  }
  flushPickups();
  return out;
}

/** Put (To Br. 1b) style cues on the previous chord line instead of their own row. */
export function attachDirectionCues(blocks: ChartBlock[]): ChartBlock[] {
  const out: ChartBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'note' && out.length > 0) {
      const prev = out[out.length - 1];
      if (prev.type === 'lyric' || prev.type === 'measure') {
        const cue = [prev.cue, block.text].filter(Boolean).join(' ');
        out[out.length - 1] = { ...prev, cue };
        continue;
      }
    }
    out.push(block);
  }
  return out;
}

function blockWeight(block: ChartBlock): number {
  if (block.type === 'lyric') return 2;
  if (block.type === 'section') return 1.5;
  if (block.type === 'measure') return 1.1;
  return 0.9;
}

/** Split into two columns only at section boundaries so a verse/chorus stays together. */
export function splitChartBodyColumns(body: ChartBlock[]): [ChartBlock[], ChartBlock[]] {
  const groups: ChartBlock[][] = [];
  let current: ChartBlock[] = [];
  for (const block of body) {
    if (block.type === 'section' && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(block);
  }
  if (current.length > 0) groups.push(current);
  if (groups.length < 2) return [body, []];

  const weights = groups.map((group) => group.reduce((sum, block) => sum + blockWeight(block), 0));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let acc = 0;
  let splitAt = 1;
  let best = Infinity;
  for (let i = 1; i < groups.length; i++) {
    acc += weights[i - 1];
    const dist = Math.abs(acc - total / 2);
    if (dist < best) {
      best = dist;
      splitAt = i;
    }
  }
  return [groups.slice(0, splitAt).flat(), groups.slice(splitAt).flat()];
}

/** Classic ChordPro puts [C] on the same line as lyrics. SongSelect uses its own line for chords. */
function looksLikeChordPro(text: string): boolean {
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!/\[[A-G]|\[N\.?C\.?/i.test(line)) continue;
    const withoutChords = line.replace(/\[\(?[^\]]+\)?\]/g, '').trim();
    if (withoutChords && !isChordOnlyLine(withoutChords)) return true;
  }
  return false;
}

function looksLikeSongSelectLayout(text: string): boolean {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  let chordOnly = 0;
  let sections = 0;
  for (const line of lines) {
    if (isSectionHeader(line)) sections += 1;
    if (isChordOnlyLine(line) && !line.includes('[')) chordOnly += 1;
  }
  return sections >= 1 || chordOnly >= 2;
}

export function parseChordChart(raw: string): ChartBlock[] {
  const text = stripCcliFooter(normalizePaste(raw));
  const parsed = looksLikeChordPro(text) && !looksLikeSongSelectLayout(text)
    ? parsePlainOrChordPro(text)
    : parseSongSelect(text);
  return attachDirectionCues(coalescePickupChords(parsed));
}

function parsePlainOrChordPro(text: string): ChartBlock[] {
  const blocks: ChartBlock[] = [];
  let sawBody = false;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+$/g, '');
    if (isSkipLine(line)) continue;
    if (!line.trim()) continue;
    if (!sawBody && !isSectionHeader(line) && !isMeasureLine(line) && !line.includes('[')) {
      if (blocks.length === 0) blocks.push({ type: 'title', text: line.trim() });
      else blocks.push({ type: 'credit', text: line.trim() });
      continue;
    }
    sawBody = true;
    if (isSectionHeader(line)) {
      blocks.push({ type: 'section', text: line.trim().toUpperCase() });
    } else if (isMeasureLine(line)) {
      blocks.push({ type: 'measure', text: line.trim() });
    } else if (isDirectionNote(line)) {
      blocks.push({ type: 'note', text: line.trim() });
    } else if (isMetaLine(line)) {
      blocks.push({ type: 'meta', text: line.trim() });
    } else {
      blocks.push({ type: 'lyric', parts: parseChordProLine(line) });
    }
  }
  return blocks;
}

function joinLyric(prev: string, next: string): string {
  const a = prev.replace(/\s+/g, ' ').trimEnd();
  const b = next.trim();
  if (!a) return b;
  if (!b) return a;
  if (a.endsWith('-')) return `${a} ${b}`;
  return `${a} ${b}`;
}

const LINE_CONNECTOR_RE = /^(and|or|the|a|an|to|of|in|on|at|for|with|that)\b/;
const TRAILING_CONNECTOR_RE = /\b(and|or|the|a|an)$/i;

function lyricPartsText(parts: ChartLyricPart[]): string {
  return parts.map((part) => part.text ?? '').join('').replace(/\s+/g, ' ').trim();
}

function previousLyricIncomplete(parts: ChartLyricPart[]): boolean {
  const text = lyricPartsText(parts);
  if (!text) return true;
  if (/[-–—]$/.test(text)) return true;
  if (TRAILING_CONNECTOR_RE.test(text)) return true;
  return false;
}

function previousLyricComplete(parts: ChartLyricPart[]): boolean {
  if (previousLyricIncomplete(parts)) return false;
  const text = lyricPartsText(parts);
  if (/[.!?]$/.test(text)) return true;
  return text.split(/\s+/).filter(Boolean).length >= 3;
}

function startsNewLyricLine(text: string, parts: ChartLyricPart[]): boolean {
  if (!parts.some((part) => (part.text ?? '').trim())) return false;
  if (previousLyricIncomplete(parts)) return false;
  const t = text.trim();
  if (!t) return false;
  // SongSelect keeps mid-line syllables lowercase (`and a - gain`, `the Lord`).
  if (LINE_CONNECTOR_RE.test(t)) return false;
  // Capital start — including And / The / For — is a new musical line.
  if (/^[A-Z]/.test(t)) return true;
  // A long leftover line after a finished phrase (blank line missing).
  if (previousLyricComplete(parts) && t.split(/\s+/).filter(Boolean).length >= 4) return true;
  return false;
}

function parseSongSelect(text: string): ChartBlock[] {
  const blocks: ChartBlock[] = [];
  let sawSection = false;
  let headerCount = 0;
  let parts: ChartLyricPart[] = [];

  const flushParts = () => {
    const cleaned = parts.filter((part) => part.chord || (part.text ?? '').trim());
    parts = [];
    if (cleaned.length === 0) return;
    const peeled = peelTrailingCues(explodeInlineChords(cleaned));
    if (peeled.parts.length > 0) {
      blocks.push({ type: 'lyric', parts: peeled.parts, cue: peeled.cue });
    } else if (peeled.cue) {
      blocks.push({ type: 'note', text: peeled.cue });
    }
  };

  const lastPart = () => parts[parts.length - 1];

  const takeTrailingPickups = (): ChartLyricPart[] => {
    const trailing: ChartLyricPart[] = [];
    while (parts.length > 0) {
      const last = parts[parts.length - 1];
      if (last.chord && !(last.text ?? '').trim()) {
        trailing.unshift(parts.pop()!);
        continue;
      }
      break;
    }
    return trailing;
  };

  const flushLineKeepingPickups = () => {
    const trailing = takeTrailingPickups();
    flushParts();
    parts = trailing;
  };

  const pushChord = (chord: string) => {
    const wrapped = unwrapChord(chord);
    const last = lastPart();
    if (last && last.chord && !(last.text ?? '').trim()) {
      parts.push({ chord: wrapped, text: '' });
      return;
    }
    parts.push({ chord: wrapped, text: '' });
  };

  const pushLyric = (lyric: string) => {
    const piece = lyric.trim();
    if (!piece) return;
    if (startsNewLyricLine(piece, parts)) {
      flushLineKeepingPickups();
    }
    const last = lastPart();
    if (last && last.chord && !(last.text ?? '').trim()) {
      last.text = piece;
      return;
    }
    if (last && (last.text ?? '').trim()) {
      last.text = joinLyric(last.text, piece);
      return;
    }
    parts.push({ text: piece });
  };

  const pushBodyLine = (trimmed: string) => {
    const aligned = splitAlignmentChords(trimmed);
    if (aligned) {
      const lyric = aligned[aligned.length - 1];
      if (!isChordOnlyLine(lyric)) {
        for (const chord of aligned.slice(0, -1)) pushChord(chord);
        pushLyric(lyric);
        return;
      }
      if (aligned.every((part) => isChordOnlyLine(part))) {
        for (const chord of aligned) pushChord(chord);
        return;
      }
    }
    if (isChordOnlyLine(trimmed)) {
      for (const token of unwrapBracketChordLine(trimmed).split(/\s+/).filter(Boolean)) pushChord(token);
      return;
    }
    pushLyric(trimmed);
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\uFFFC/g, '');
    const trimmed = line.trim();

    if (isSkipLine(trimmed)) continue;
    if (!trimmed) {
      if (sawSection) flushLineKeepingPickups();
      continue;
    }

    if (!sawSection && !isSectionHeader(trimmed) && !isMeasureLine(trimmed)) {
      flushParts();
      if (isMetaLine(trimmed)) {
        blocks.push({ type: 'meta', text: trimmed });
        continue;
      }
      if (headerCount === 0) {
        blocks.push({ type: 'title', text: trimmed });
        headerCount += 1;
        continue;
      }
      blocks.push({ type: 'credit', text: trimmed });
      headerCount += 1;
      continue;
    }

    if (isSectionHeader(trimmed)) {
      flushParts();
      sawSection = true;
      blocks.push({ type: 'section', text: trimmed.toUpperCase() });
      continue;
    }

    sawSection = true;

    if (isMeasureLine(trimmed)) {
      flushParts();
      blocks.push({ type: 'measure', text: trimmed });
      continue;
    }

    if (isDirectionNote(trimmed)) {
      flushParts();
      blocks.push({ type: 'note', text: trimmed });
      continue;
    }

    if (isMetaLine(trimmed)) {
      flushParts();
      blocks.push({ type: 'meta', text: trimmed });
      continue;
    }

    pushBodyLine(trimmed);
  }

  flushParts();
  return blocks;
}

function unwrapChord(token: string): string {
  const trimmed = token.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')') && isChordToken(trimmed.slice(1, -1))) {
    return trimmed;
  }
  return trimmed;
}

function preferFlats(key: ChordKey): boolean {
  return FLAT_KEYS.has(key);
}

function transposeNote(note: string, semitones: number, flats: boolean): string {
  const idx = NOTE_INDEX[note];
  if (idx == null) return note;
  const next = (idx + semitones + 12 * 8) % 12;
  return flats ? FLAT_NOTES[next] : SHARP_NOTES[next];
}

export function semitoneDistance(from: Exclude<ChordKey, 'numbers'>, to: Exclude<ChordKey, 'numbers'>): number {
  return ((NOTE_INDEX[to] ?? 0) - (NOTE_INDEX[from] ?? 0) + 12) % 12;
}

export function transposeChord(chord: string, semitones: number, targetKey: ChordKey): string {
  if (semitones === 0 || targetKey === 'numbers') return chord;
  const wrapped = chord.startsWith('(') && chord.endsWith(')');
  const inner = wrapped ? chord.slice(1, -1) : chord;
  if (/^N\.?C\.?$|^NC$|^N\/C$/i.test(inner)) return chord;

  const match = inner.match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/);
  if (!match) return chord;
  const flats = preferFlats(targetKey);
  const root = transposeNote(match[1], semitones, flats);
  const suffix = match[2] ?? '';
  const bass = match[3] ? `/${transposeNote(match[3], semitones, flats)}` : '';
  const next = `${root}${suffix}${bass}`;
  return wrapped ? `(${next})` : next;
}

const NASHVILLE: Record<number, string> = {
  0: '1',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: '#4',
  7: '5',
  8: 'b6',
  9: '6',
  10: 'b7',
  11: '7',
};

function toNashville(chord: string, originalKey: Exclude<ChordKey, 'numbers'>): string {
  const wrapped = chord.startsWith('(') && chord.endsWith(')');
  const inner = wrapped ? chord.slice(1, -1) : chord;
  if (/^N\.?C\.?$|^NC$|^N\/C$/i.test(inner)) return chord;
  const match = inner.match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/);
  if (!match) return chord;
  const rootIdx = NOTE_INDEX[match[1]];
  const keyIdx = NOTE_INDEX[originalKey];
  if (rootIdx == null || keyIdx == null) return chord;
  const degree = NASHVILLE[(rootIdx - keyIdx + 12) % 12];
  const suffix = match[2] ?? '';
  let bass = '';
  if (match[3] && NOTE_INDEX[match[3]] != null) {
    bass = `/${NASHVILLE[(NOTE_INDEX[match[3]] - keyIdx + 12) % 12]}`;
  }
  const next = `${degree}${suffix}${bass}`;
  return wrapped ? `(${next})` : next;
}

function mapChordsInText(text: string, map: (chord: string) => string): string {
  return text.replace(CHORD_GLOBAL, (token) => {
    if (!isChordToken(token)) return token;
    return map(unwrapChord(token));
  });
}

export function transposeBlocks(
  blocks: ChartBlock[],
  originalKey: ChordKey,
  displayKey: ChordKey,
): ChartBlock[] {
  const map = chordTransposeMapper(originalKey, displayKey);
  if (!map) return blocks;

  return blocks.map((block) => {
    if (block.type === 'measure') {
      return { ...block, text: mapChordsInText(block.text, map) };
    }
    if (block.type === 'meta') {
      return {
        ...block,
        text: block.text.replace(/\bkey\s*[-–—:]\s*([A-G](?:#|b)?)/i, (_m, _k) =>
          `Key - ${displayKey === 'numbers' ? '#' : displayKey}`),
      };
    }
    if (block.type === 'lyric') {
      return {
        ...block,
        parts: block.parts.map((part) => (
          part.chord ? { ...part, chord: map(part.chord) } : part
        )),
      };
    }
    return block;
  });
}

export function lyricLineText(parts: ChartLyricPart[]): string {
  return parts.map((p) => p.text).join('');
}
