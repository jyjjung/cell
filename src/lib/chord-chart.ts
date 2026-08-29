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

/** Flat/sharp only when not the start of a glued lyric syllable (Dbreath → D + breath, not Db + reath). */
const NOTE_ACCIDENTAL = String.raw`(?:#|b(?![a-z]))?`;

const CHORD_BODY =
  String.raw`(?:N\.?C\.?|NC|N/C|[A-G]${NOTE_ACCIDENTAL}(?:maj7|maj9|maj13|maj|min7|min9|min|m7b5|m7|m9|m11|m13|madd9|m|sus4|sus2|sus|add9|add2|add11|dim7|dim|aug|2|4|5|6|7|9|11|13|\(\d+\))*(?:/[A-G]${NOTE_ACCIDENTAL})?)`;

const CHORD_TOKEN = new RegExp(`^\\(?${CHORD_BODY}\\)?$`, 'i');
const CHORD_GLOBAL = new RegExp(`(\\(?${CHORD_BODY}\\)?)`, 'gi');
const CHORDPRO_TOKEN = new RegExp(`\\[(\\(?${CHORD_BODY}\\)?)\\]`, 'gi');
const TRAILING_CUE_RE = /\s*(\((?:To\b|\d+(?:st|nd|rd|th)\s+x\b)[^)]*\))\s*$/i;

const SECTION_RE =
  /^(INTRO|VERSE|CHORUS|BRIDGE|TAG|ENDING|TURNAROUND|OUTRO|PRE-?CHORUS|PRECHORUS|INSTRUMENTAL|INTERLUDE|VAMP|BREAK|HOOK)(?:\s+\d+[A-Z]*)?$/i;

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

export function isTextChordSheet(sheet: Pick<SongChordSheet, 'kind' | 'sourceText'>): boolean {
  return sheet.kind === 'text' || Boolean(sheet.sourceText);
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

const INLINE_CHORD_RE = new RegExp(`(?<=\\s|^)(\\(?${CHORD_BODY}\\)?)(?=\\s|$)`, 'g');
const DIRECTION_CUE_RE = /\((?:To\b|\d+(?:st|nd|rd|th)\s+x\b)[^)]*\)/gi;

function hasSpaceOnEachSide(line: string, index: number, token: string): boolean {
  const leftOk = index === 0 || /\s/.test(line[index - 1]);
  const end = index + token.length;
  const rightOk = end >= line.length || /\s/.test(line[end]);
  return leftOk && rightOk;
}

function stripSongSelectChrome(text: string): string {
  return text
    .replace(/SongSelect\s*logo/gi, '')
    .replace(/SongSelect/gi, '')
    .replace(/[\uFFFC\u00a0]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
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

/** Chord row in SongSelect paste — not a lowercase lyric syllable on its own line. */
function isChordLine(trimmed: string): boolean {
  if (!isStandaloneChordToken(trimmed)) return false;
  if (/^[a-g]$/.test(trimmed)) return false;
  return true;
}

function shouldSplitInlineChord(line: string, index: number, token: string): boolean {
  if (!isStandaloneChordToken(token)) return false;
  if (!hasSpaceOnEachSide(line, index, token)) return false;

  // Never pull letters out of jump cues: (To Ch. 1a), (2nd x To Tag 2)
  const before = line.slice(0, index);
  const open = before.lastIndexOf('(');
  const close = before.lastIndexOf(')');
  if (open > close) {
    const end = line.indexOf(')', open);
    const inside = line.slice(open, end === -1 ? line.length : end + 1);
    if (/to\b|\d+(?:st|nd|rd|th)\s+x\b/i.test(inside)) return false;
  }

  return true;
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
    || isChordLine(trimmed)
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

function firstSectionLineIndex(lines: string[]): number {
  return lines.findIndex((line) => isSectionHeader(line.trim()));
}

/** Turn mashed SongSelect plain text (`I'm E/G#shaking`) into chord-on-own-line format. */
export function expandInlineChords(text: string): string {
  const lines = text.split('\n');
  const sectionAt = firstSectionLineIndex(lines);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      out.push('');
      continue;
    }
    // Title/credits above the first section — don't split "Great" / "Are" into chords.
    if (sectionAt !== -1 && i < sectionAt) {
      out.push(line);
      continue;
    }
    const expanded = expandOneLine(line);
    out.push(expanded);
    // Only separate groups when a mashed line was split into chords + lyrics.
    if (expanded.includes('\n')) out.push('');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

/** Rejoin HTML pastes that turned `| E | E |` into one token per line. */
export function repairBrokenMeasureLines(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const cur = lines[i].trim();
    const looksBrokenBar =
      cur === '|'
      || (isStandaloneChordToken(cur) && i + 1 < lines.length && lines[i + 1].trim() === '|');
    if (!looksBrokenBar) {
      out.push(lines[i]);
      i += 1;
      continue;
    }
    const parts: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) {
        i += 1;
        break;
      }
      if (t === '|') {
        parts.push('|');
        i += 1;
        continue;
      }
      if (isStandaloneChordToken(t)) {
        parts.push(t);
        i += 1;
        continue;
      }
      break;
    }
    const pipeCount = parts.filter((p) => p === '|').length;
    if (pipeCount >= 2 && parts.some((p) => p !== '|')) {
      const tokens = [...parts];
      if (tokens[0] !== '|') tokens.unshift('|');
      if (tokens[tokens.length - 1] !== '|') tokens.push('|');
      let measure = '';
      for (const token of tokens) {
        measure += token === '|' ? '|' : ` ${token} `;
      }
      out.push(measure.replace(/ +/g, ' ').trim());
    } else {
      for (const part of parts) out.push(part);
    }
  }
  return out.join('\n');
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
    if (node.nodeType === 3) return node.textContent ?? '';
    if (node.nodeType !== 1) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') {
      const alt = el.getAttribute('alt') || '';
      return /songselect/i.test(alt) ? '' : alt;
    }
    const childText = Array.from(el.childNodes).map(emit).join('');
    const own = childText.trim();
    // Keep bar / chord rows on one line (SongSelect tables).
    if (tag === 'td' || tag === 'th') {
      return `${childText} `;
    }
    if (tag === 'tr') return `${childText.trim()}\n`;
    if (own && isChordLine(own) && !el.querySelector('div,p,br,tr,td')) {
      return ` ${own} `;
    }
    if (/^(p|div|h[1-6]|li|section)$/.test(tag)) return `${childText}\n`;
    return childText;
  };
  return emit(parsed.body);
}

function looksLikeStructuredChart(text: string): boolean {
  const hasBars = /(?:^|\n)\s*\|[^|\n]+\|\s*(?:\n|$)/.test(text);
  const hasSection = /(?:^|\n)\s*(intro|verse|chorus|bridge|tag|ending|turnaround)\b/i.test(text);
  return hasBars && hasSection;
}

function plainTextHasMashedChords(text: string): boolean {
  const lines = text.split('\n');
  const sectionAt = firstSectionLineIndex(lines);
  if (sectionAt === -1) return false;
  for (let i = sectionAt; i < lines.length; i++) {
    if (expandOneLine(lines[i]) !== lines[i]) return true;
  }
  return false;
}

function finalizePlainPaste(plainNorm: string): string {
  const raw = plainTextHasMashedChords(plainNorm) ? expandInlineChords(plainNorm) : plainNorm;
  return repairBrokenMeasureLines(raw);
}

/** @internal Exported for unit tests — picks rich paste when plain glues chords to lyrics. */
export function preferChordChartPasteSource(plainNorm: string, htmlText: string): 'html' | 'plain' {
  const mashed = plainTextHasMashedChords(plainNorm);
  const structured = looksLikeStructuredChart(plainNorm);
  const htmlLines = htmlText.split('\n').filter((l) => l.trim()).length;
  const plainLines = plainNorm.split('\n').filter((l) => l.trim()).length;
  const preferHtml = mashed || (htmlLines > plainLines + 2 && !structured);
  return preferHtml ? 'html' : 'plain';
}

/** Prefer rich paste when plain text glues chords to lyrics; keep bar lines from plain when needed. */
export function prepareChordChartPaste(plain: string, html?: string | null): string {
  const plainNorm = stripSongSelectChrome(plain);
  if (!html?.trim()) {
    return finalizePlainPaste(plainNorm);
  }

  const htmlText = stripSongSelectChrome(decodeHtmlEntities(chartTextFromHtml(html)));
  const raw = preferChordChartPasteSource(plainNorm, htmlText) === 'html'
    ? htmlText
    : (plainTextHasMashedChords(plainNorm) ? expandInlineChords(plainNorm) : plainNorm);
  return repairBrokenMeasureLines(raw);
}

function normalizePaste(text: string): string {
  const stripped = stripSongSelectChrome(text);
  const raw = plainTextHasMashedChords(stripped) ? expandInlineChords(stripped) : stripped;
  return repairBrokenMeasureLines(raw);
}

function isChordToken(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;
  return CHORD_TOKEN.test(trimmed);
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

function flushLyric(buffer: string, blocks: ChartBlock[]) {
  if (!buffer.trim() && !/\[[^\]]+\]/.test(buffer)) {
    return;
  }
  const parsed = peelTrailingCues(explodeInlineChords(parseChordProLine(buffer.replace(/[ \t]+$/g, ''))));
  if (parsed.parts.length > 0) {
    blocks.push({ type: 'lyric', parts: parsed.parts, cue: parsed.cue });
  } else if (parsed.cue) {
    blocks.push({ type: 'note', text: parsed.cue });
  }
}

function bufferHasLyrics(buffer: string): boolean {
  return buffer.replace(/\[[^\]]*\]/g, '').trim().length > 0;
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
      out.push({ type: 'lyric', parts: [...pickups, ...block.parts], cue: block.cue });
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

function looksLikeChordPro(text: string): boolean {
  return /\[[A-G]/.test(text) || /\[N\.?C\.?\]/i.test(text);
}

export function parseChordChart(raw: string): ChartBlock[] {
  const text = stripCcliFooter(normalizePaste(raw));
  const parsed = looksLikeChordPro(text) && !/^\s*[A-G](?:#|b)?(?:\/[A-G])?\s*$/m.test(text.split('\n').slice(0, 12).join('\n'))
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

function parseSongSelect(text: string): ChartBlock[] {
  const lines = text.split('\n');
  const blocks: ChartBlock[] = [];
  let buffer = '';
  let sawSection = false;
  let headerCount = 0;

  const flush = () => {
    flushLyric(buffer, blocks);
    buffer = '';
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\uFFFC/g, '');
    const trimmed = line.trim();

    if (isSkipLine(trimmed)) continue;

    if (!trimmed) {
      if (bufferHasLyrics(buffer)) flush();
      continue;
    }

    if (!sawSection && !isSectionHeader(trimmed) && !isMeasureLine(trimmed)) {
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
      flush();
      sawSection = true;
      blocks.push({ type: 'section', text: trimmed.toUpperCase() });
      continue;
    }

    sawSection = true;

    if (isMeasureLine(trimmed)) {
      flush();
      blocks.push({ type: 'measure', text: trimmed });
      continue;
    }

    if (isDirectionNote(trimmed)) {
      flush();
      blocks.push({ type: 'note', text: trimmed });
      continue;
    }

    if (isMetaLine(trimmed)) {
      flush();
      blocks.push({ type: 'meta', text: trimmed });
      continue;
    }

    if (isChordLine(trimmed)) {
      buffer += `[${unwrapChord(trimmed)}]`;
      continue;
    }

    if (/^\s+$/.test(line)) {
      buffer += ' ';
      continue;
    }

    buffer += line;
  }

  flush();
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
  const re = new RegExp(CHORD_GLOBAL.source, CHORD_GLOBAL.flags);
  let result = '';
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const token = match[0];
    const index = match.index;
    result += text.slice(last, index);
    if (isChordToken(token) && hasSpaceOnEachSide(text, index, token)) {
      result += map(unwrapChord(token));
    } else {
      result += token;
    }
    last = index + token.length;
  }
  result += text.slice(last);
  return result;
}

export function transposeBlocks(
  blocks: ChartBlock[],
  originalKey: ChordKey,
  displayKey: ChordKey,
): ChartBlock[] {
  if (originalKey === 'numbers' || originalKey === displayKey) return blocks;
  const from = originalKey as Exclude<ChordKey, 'numbers'>;
  const map = (chord: string) => {
    if (displayKey === 'numbers') return toNashville(chord, from);
    const to = displayKey as Exclude<ChordKey, 'numbers'>;
    return transposeChord(chord, semitoneDistance(from, to), displayKey);
  };

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
