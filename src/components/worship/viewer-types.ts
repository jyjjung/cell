import type { ChordKey, ReferenceTrack, SongChordSheet } from '@/types';

export interface ViewerSlide {
  songTitle: string;
  key: ChordKey;
  imageUrls: string[];
  referenceTracks?: ReferenceTrack[];
  songId?: string;
  textSheets?: SongChordSheet[];
  annotationId?: string;
}

export type ViewerMode = 'slides' | 'continuous';
