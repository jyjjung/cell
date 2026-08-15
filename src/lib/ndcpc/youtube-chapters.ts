import { getYouTubeVideoId } from '@/lib/ndcpc/video';

export type YouTubeChapter = {
  title: string;
  startSeconds: number;
  endSeconds?: number;
};

export const YOUTUBE_FULL_VIDEO_VALUE = 'full';

const YOUTUBE_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

function unescapeYoutubeText(text: string) {
  return text
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/');
}

export function normalizeYouTubeUrl(url: string) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    return url;
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}

function dedupeChapters(chapters: YouTubeChapter[]): YouTubeChapter[] {
  const seen = new Set<number>();
  const unique: YouTubeChapter[] = [];

  for (const chapter of chapters) {
    if (seen.has(chapter.startSeconds)) {
      continue;
    }
    seen.add(chapter.startSeconds);
    unique.push({ title: chapter.title, startSeconds: chapter.startSeconds });
  }

  unique.sort((a, b) => a.startSeconds - b.startSeconds);

  for (let index = 0; index < unique.length - 1; index += 1) {
    unique[index].endSeconds = unique[index + 1].startSeconds;
  }

  return unique;
}

function chapterTitleFromRenderer(title: unknown): string | null {
  if (!title || typeof title !== 'object') {
    return null;
  }

  const record = title as { simpleText?: unknown; runs?: Array<{ text?: unknown }> };
  if (typeof record.simpleText === 'string' && record.simpleText.trim()) {
    return record.simpleText.trim();
  }

  const fromRuns = (record.runs ?? [])
    .map((run) => (typeof run?.text === 'string' ? run.text : ''))
    .join('')
    .trim();

  return fromRuns || null;
}

function collectChaptersFromJson(value: unknown, chapters: YouTubeChapter[]) {
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectChaptersFromJson(item, chapters);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  const renderer =
    (record.chapterRenderer as Record<string, unknown> | undefined) ??
    (record.macroMarkersListItemRenderer as Record<string, unknown> | undefined);

  if (renderer && typeof renderer.timeRangeStartMillis === 'number') {
    const title = chapterTitleFromRenderer(renderer.title);
    if (title) {
      chapters.push({
        title,
        startSeconds: Math.floor(renderer.timeRangeStartMillis / 1000),
      });
    }
  }

  for (const nested of Object.values(record)) {
    collectChaptersFromJson(nested, chapters);
  }
}

function extractYtInitialData(html: string): unknown | null {
  const marker = 'var ytInitialData = ';
  const start = html.indexOf(marker);
  if (start < 0) {
    return null;
  }

  let index = start + marker.length;
  while (index < html.length && html[index] !== '{') {
    index += 1;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let cursor = index; cursor < html.length; cursor += 1) {
    const char = html[cursor];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(index, cursor + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

export function parseYouTubeChaptersFromHtml(html: string): YouTubeChapter[] {
  const chapters: YouTubeChapter[] = [];

  // Prefer structured ytInitialData when present (title may use runs or simpleText).
  const initialData = extractYtInitialData(html);
  if (initialData) {
    collectChaptersFromJson(initialData, chapters);
    if (chapters.length > 0) {
      return dedupeChapters(chapters);
    }
  }

  const chapterPattern =
    /"chapterRenderer":\{"title":\{(?:"simpleText":"((?:\\.|[^"\\])*)"|"runs":\[\{"text":"((?:\\.|[^"\\])*)"\}\])\},"timeRangeStartMillis":(\d+)/g;

  for (const match of html.matchAll(chapterPattern)) {
    chapters.push({
      title: unescapeYoutubeText(match[1] || match[2] || ''),
      startSeconds: Math.floor(Number.parseInt(match[3], 10) / 1000),
    });
  }

  if (chapters.length === 0) {
    const macroPattern =
      /"macroMarkersListItemRenderer":\{"title":\{(?:"simpleText":"((?:\\.|[^"\\])*)"|"runs":\[\{"text":"((?:\\.|[^"\\])*)"\}\])\}[^}]*?"timeRangeStartMillis":(\d+)/g;
    for (const match of html.matchAll(macroPattern)) {
      chapters.push({
        title: unescapeYoutubeText(match[1] || match[2] || ''),
        startSeconds: Math.floor(Number.parseInt(match[3], 10) / 1000),
      });
    }
  }

  return dedupeChapters(chapters);
}

export async function fetchYouTubeChapters(url: string): Promise<YouTubeChapter[]> {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    return [];
  }

  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: YOUTUBE_FETCH_HEADERS,
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  return parseYouTubeChaptersFromHtml(html);
}

export function formatChapterTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function findChapterIndexForStart(
  chapters: YouTubeChapter[],
  startSeconds?: number
) {
  if (startSeconds === undefined) {
    return -1;
  }

  return chapters.findIndex((chapter) => chapter.startSeconds === startSeconds);
}

export type YouTubeClipSelection = {
  startSeconds?: number;
  endSeconds?: number;
  chapterTitle?: string;
};

/** Resolve a song clip from a selected YouTube chapter only (URL timestamps ignored). */
export function resolveYouTubeClip(options: {
  chapters?: YouTubeChapter[];
  selectedChapter: string;
  fullVideoValue?: string;
}): YouTubeClipSelection {
  const fullVideoValue = options.fullVideoValue ?? YOUTUBE_FULL_VIDEO_VALUE;
  const chapters = options.chapters ?? [];

  if (options.selectedChapter === fullVideoValue || chapters.length === 0) {
    return {};
  }

  const chapter = chapters[Number.parseInt(options.selectedChapter, 10)];
  if (!chapter) {
    return {};
  }

  return {
    startSeconds: chapter.startSeconds,
    ...(chapter.endSeconds !== undefined ? { endSeconds: chapter.endSeconds } : {}),
    chapterTitle: chapter.title,
  };
}

/** Prefer the base video title when an existing resource was saved as "Video - Chapter". */
export function getBaseVideoTitle(resourceTitle: string, videoTitle?: string) {
  if (videoTitle) {
    return videoTitle;
  }

  const separator = ' - ';
  const index = resourceTitle.lastIndexOf(separator);
  if (index > 0) {
    return resourceTitle.slice(0, index);
  }

  return resourceTitle;
}
