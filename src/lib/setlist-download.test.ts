import { describe, expect, it } from 'vitest';
import {
  filesFromSetlistSlides,
  sheetDownloadFilename,
  sheetExtension,
} from './setlist-download';

describe('sheet download names', () => {
  it('puts setlist order in front of the song title', () => {
    expect(sheetDownloadFilename({
      setlistOrder: 1,
      songTitle: 'Love Came Down',
      pageIndex: 1,
      pageCount: 1,
      ext: 'jpg',
    })).toBe('1 - Love Came Down.jpg');
  });

  it('keeps the same setlist number for extra pages of the same song', () => {
    expect(sheetDownloadFilename({
      setlistOrder: 1,
      songTitle: 'Love Came Down',
      pageIndex: 2,
      pageCount: 2,
      ext: 'jpg',
    })).toBe('1 - Love Came Down pg2.jpg');
  });

  it('strips characters that break OS filenames', () => {
    expect(sheetDownloadFilename({
      songTitle: 'Verse / Chorus: "Live"',
      pageIndex: 1,
      pageCount: 1,
      ext: 'jpg',
    })).toBe('Verse Chorus Live.jpg');
  });

  it('builds ordered photo files from slides', () => {
    const files = filesFromSetlistSlides([
      { songTitle: 'Love Came Down', imageUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] },
      { songTitle: 'Amazing Grace', imageUrls: ['https://example.com/c.jpg'] },
    ]);
    expect(files.map((f) => f.filename)).toEqual([
      '1 - Love Came Down pg1.jpg',
      '1 - Love Came Down pg2.jpg',
      '2 - Amazing Grace.jpg',
    ]);
  });

  it('includes pasted text charts in download order', () => {
    const files = filesFromSetlistSlides([
      {
        songTitle: 'Free',
        setlistOrder: 1,
        imageUrls: ['https://example.com/a.jpg'],
        textCharts: [{
          sheet: { id: 't1', key: 'E', imageUrl: '', storagePath: '', uploadedAt: {} as never, kind: 'text', sourceText: 'Verse\n[E]' },
          displayKey: 'G',
          annotationId: 'note-1',
        }],
      },
    ]);
    expect(files).toHaveLength(2);
    expect(files[0]?.url).toContain('example.com');
    expect(files[1]?.textChart?.displayKey).toBe('G');
    expect(files[1]?.textChart?.annotationId).toBe('note-1');
    expect(files[1]?.filename).toBe('1 - Free pg2.png');
  });

  it('reads extension from the storage path', () => {
    expect(sheetExtension('https://firebasestorage.googleapis.com/v0/b/x/o/worshipChordSheets%2Fid.png?alt=media')).toBe('png');
  });
});
