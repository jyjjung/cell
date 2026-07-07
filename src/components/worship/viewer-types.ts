import type { ChordKey, ReferenceTrack } from '@/types';

export interface ViewerSlide {
  songTitle: string;
  key: ChordKey;
  imageUrls: string[];
  referenceTracks?: ReferenceTrack[];
}

export type ViewerMode = 'slides' | 'continuous';
