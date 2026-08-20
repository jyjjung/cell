import { describe, expect, it } from 'vitest';
import {
  chordSheetsForKey,
  ensureSetlistEntryIds,
  findSetlistSongIndex,
  resolveChordSheetsForSetlistSong,
  setlistSongEntryKey,
} from './worship-utils';
import type { SongChordSheet, WorshipSong } from '@/types';

function song(sheets: Partial<SongChordSheet>[]): WorshipSong {
  return {
    id: 'song-1',
    title: 'Thank God I\'m Free',
    chordSheets: sheets.map((sheet, i) => ({
      id: sheet.id ?? `sheet-${i}`,
      key: sheet.key ?? 'E',
      imageUrl: sheet.imageUrl ?? '',
      storagePath: sheet.storagePath ?? '',
      uploadedBy: 'u1',
      uploadedAt: {} as SongChordSheet['uploadedAt'],
      kind: sheet.kind,
      sourceText: sheet.sourceText,
    })),
  } as unknown as WorshipSong;
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

describe('setlist song entry ids', () => {
  it('matches a duplicate row by entryId instead of the first songId', () => {
    const songs = [
      { songId: 'a', entryId: 'e1', title: 'Same', key: 'C' as const, order: 0 },
      { songId: 'a', entryId: 'e2', title: 'Same', key: 'G' as const, order: 1 },
    ];
    expect(findSetlistSongIndex(songs, { songId: 'a', entryId: 'e2' })).toBe(1);
    expect(setlistSongEntryKey(songs[1]!, 1)).toBe('e2');
  });

  it('falls back to the first songId for legacy rows without entryId', () => {
    const songs = [
      { songId: 'a', title: 'Same', key: 'C' as const, order: 0 },
      { songId: 'b', title: 'Other', key: 'G' as const, order: 1 },
    ];
    expect(findSetlistSongIndex(songs, { songId: 'a' })).toBe(0);
    expect(setlistSongEntryKey(songs[0]!, 0)).toBe('a:0');
  });

  it('fills missing entry ids without rewriting existing ones', () => {
    const songs = [
      { songId: 'a', entryId: 'keep', title: 'Same', key: 'C' as const, order: 0 },
      { songId: 'a', title: 'Same', key: 'G' as const, order: 1 },
    ];
    const next = ensureSetlistEntryIds(songs);
    expect(next[0]?.entryId).toBe('keep');
    expect(next[1]?.entryId).toBeTruthy();
    expect(next[1]?.entryId).not.toBe('keep');
  });
});

describe('resolveChordSheetsForSetlistSong', () => {
  it('uses a pasted chart when the setlist key has no scan', () => {
    const lib = song([{ id: 'text-e', key: 'E', kind: 'text', sourceText: '[E]Hello' }]);
    const sheets = resolveChordSheetsForSetlistSong(lib, { key: 'A' });
    expect(sheets.map((s) => s.id)).toEqual(['text-e']);
  });
});
