import { describe, expect, it } from 'vitest';
import { chordSheetsForKey, resolveChordSheetsForSetlistSong } from './worship-utils';
import type { SongChordSheet, WorshipSong } from '@/types';

function song(sheets: Partial<SongChordSheet>[]): WorshipSong {
  return {
    id: 'song-1',
    title: 'Thank God I\'m Free',
    chordSheets: sheets.map((sheet, i) => ({
      id: sheet.id ?? `sheet-${i}`,
      key: sheet.key ?? 'E',
      imageUrl: sheet.imageUrl ?? '',
      uploadedBy: 'u1',
      uploadedAt: {} as SongChordSheet['uploadedAt'],
      kind: sheet.kind,
      sourceText: sheet.sourceText,
    })),
  } as WorshipSong;
}

describe('chordSheetsForKey', () => {
  it('includes a pasted chart for every key', () => {
    const lib = song([{ id: 'text-e', key: 'E', kind: 'text', sourceText: '[E]Hello' }]);
    expect(chordSheetsForKey(lib, 'G').map((s) => s.id)).toEqual(['text-e']);
    expect(chordSheetsForKey(lib, 'numbers').map((s) => s.id)).toEqual(['text-e']);
  });

  it('keeps image scans only in their stored key', () => {
    const lib = song([
      { id: 'img-c', key: 'C', imageUrl: 'https://example.com/c.png' },
      { id: 'text-e', key: 'E', kind: 'text', sourceText: '[E]Hello' },
    ]);
    expect(chordSheetsForKey(lib, 'C').map((s) => s.id)).toEqual(['img-c', 'text-e']);
    expect(chordSheetsForKey(lib, 'G').map((s) => s.id)).toEqual(['text-e']);
  });
});

describe('resolveChordSheetsForSetlistSong', () => {
  it('uses a pasted chart when the setlist key has no scan', () => {
    const lib = song([{ id: 'text-e', key: 'E', kind: 'text', sourceText: '[E]Hello' }]);
    const sheets = resolveChordSheetsForSetlistSong(lib, { key: 'A' });
    expect(sheets.map((s) => s.id)).toEqual(['text-e']);
  });
});
