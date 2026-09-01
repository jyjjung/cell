import { splitSheetsForViewer } from '@/lib/chord-chart';
import { isPdfUrl } from '@/lib/utils';
import type { ChordKey, SetlistSong, SongChordSheet } from '@/types';
import type { ViewerSlide } from '@/components/worship/viewer-types';

export type TextChartDownload = {
  sheet: SongChordSheet;
  displayKey: ChordKey;
  annotationId?: string;
};

export type SheetDownloadSource = {
  songTitle: string;
  key?: ChordKey;
  imageUrls?: string[];
  textCharts?: TextChartDownload[];
  setlistOrder?: number;
};

export type SheetDownloadFile = {
  url?: string;
  textChart?: TextChartDownload;
  filename: string;
};

const UNSAFE_FILENAME = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFilename(name: string, fallback = 'sheet'): string {
  const cleaned = name
    .replace(UNSAFE_FILENAME, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120);
  return cleaned || fallback;
}

export function sheetExtension(url: string, mime?: string): string {
  if (isPdfUrl(url) || mime === 'application/pdf') return 'pdf';
  const type = (mime ?? '').toLowerCase();
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  try {
    const path = decodeURIComponent(new URL(url).pathname).toLowerCase();
    if (path.endsWith('.png')) return 'png';
    if (path.endsWith('.webp')) return 'webp';
    if (path.endsWith('.gif')) return 'gif';
    if (path.endsWith('.pdf')) return 'pdf';
  } catch {
    const lower = url.toLowerCase();
    if (lower.includes('.png')) return 'png';
    if (lower.includes('.pdf')) return 'pdf';
  }
  return 'jpg';
}

export function sheetDownloadFilename({
  setlistOrder,
  songTitle,
  pageIndex,
  pageCount,
  ext,
}: {
  setlistOrder?: number;
  songTitle: string;
  pageIndex: number;
  pageCount: number;
  ext: string;
}): string {
  const order = setlistOrder != null ? `${setlistOrder} - ` : '';
  const page = pageCount > 1 ? ` pg${pageIndex}` : '';
  return `${sanitizeFilename(`${order}${songTitle}${page}`, 'sheet')}.${ext}`;
}

export function uniqueFilenames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf('.');
    const base = dot === -1 ? name : name.slice(0, dot);
    const ext = dot === -1 ? '' : name.slice(dot);
    return `${base} (${count})${ext}`;
  });
}

/** Chord sheets in setlist order — image/PDF URLs and pasted text charts. */
export function filesFromSetlistSlides(slides: SheetDownloadSource[]): SheetDownloadFile[] {
  const files: SheetDownloadFile[] = [];
  slides.forEach((slide, sectionIdx) => {
    const setlistOrder = slide.setlistOrder ?? sectionIdx + 1;
    const imageUrls = slide.imageUrls ?? [];
    const textCharts = slide.textCharts ?? [];
    const pageCount = imageUrls.length + textCharts.length;

    imageUrls.forEach((url, pageIdx) => {
      files.push({
        url,
        filename: sheetDownloadFilename({
          setlistOrder,
          songTitle: slide.songTitle,
          pageIndex: pageIdx + 1,
          pageCount,
          ext: sheetExtension(url),
        }),
      });
    });

    textCharts.forEach((textChart, textIdx) => {
      files.push({
        textChart,
        filename: sheetDownloadFilename({
          setlistOrder,
          songTitle: slide.songTitle,
          pageIndex: imageUrls.length + textIdx + 1,
          pageCount,
          ext: 'png',
        }),
      });
    });
  });
  const unique = uniqueFilenames(files.map((f) => f.filename));
  return files.map((file, i) => ({ ...file, filename: unique[i]! }));
}

export function sheetDownloadSourceFromSetlistSong(
  setlistSong: Pick<SetlistSong, 'title' | 'key' | 'annotationId'>,
  sheets: SongChordSheet[],
  setlistOrder: number,
): SheetDownloadSource {
  const { imageUrls, textSheets } = splitSheetsForViewer(sheets);
  return {
    songTitle: setlistSong.title,
    setlistOrder,
    key: setlistSong.key,
    imageUrls,
    textCharts: textSheets.map((sheet) => ({
      sheet,
      displayKey: setlistSong.key,
      annotationId: setlistSong.annotationId,
    })),
  };
}

export function sheetDownloadSourceFromSongSheets(
  songTitle: string,
  sheets: SongChordSheet[],
  displayKey?: ChordKey,
): SheetDownloadSource {
  const { imageUrls, textSheets } = splitSheetsForViewer(sheets);
  return {
    songTitle,
    key: displayKey,
    imageUrls,
    textCharts: textSheets.map((sheet) => ({
      sheet,
      displayKey: displayKey ?? sheet.key,
    })),
  };
}

export function hasDownloadableSheets(sheets: SongChordSheet[]): boolean {
  const { imageUrls, textSheets } = splitSheetsForViewer(sheets);
  return imageUrls.length > 0 || textSheets.length > 0;
}

export function filesFromViewerSlides(slides: ViewerSlide[]): SheetDownloadFile[] {
  return filesFromSetlistSlides(
    slides.map((slide, i) => ({
      songTitle: slide.songTitle,
      setlistOrder: i + 1,
      key: slide.key,
      imageUrls: slide.imageUrls ?? [],
      textCharts: (slide.textSheets ?? []).map((sheet) => ({
        sheet,
        displayKey: slide.key,
        annotationId: slide.annotationId,
      })),
    })),
  );
}
