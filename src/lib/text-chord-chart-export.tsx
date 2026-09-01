'use client';

import { TextChordChartCanvas, TEXT_CHART_SURFACE } from '@/components/worship/text-chord-chart';
import type { ChordKey, SongChordSheet } from '@/types';
import { toBlob } from 'html-to-image';
import { createRoot, type Root } from 'react-dom/client';

function resolveDisplayKey(sheet: SongChordSheet, displayKey: ChordKey): ChordKey {
  return displayKey === 'numbers' ? sheet.key : displayKey;
}

function strokesForAnnotation(sheet: SongChordSheet, annotationId?: string) {
  if (!annotationId) return [];
  return sheet.annotations?.find((a) => a.id === annotationId)?.strokes ?? [];
}

function waitForLayout() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Renders a pasted chart (with optional note strokes) to a PNG blob for download. */
export async function exportTextChordSheetToPng({
  sheet,
  displayKey,
  annotationId,
}: {
  sheet: SongChordSheet;
  displayKey: ChordKey;
  annotationId?: string;
}): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  let root: Root | null = createRoot(container);
  const resolvedKey = resolveDisplayKey(sheet, displayKey);
  const strokes = strokesForAnnotation(sheet, annotationId);

  try {
    root.render(
      <TextChordChartCanvas
        sheet={sheet}
        originalKey={sheet.key}
        displayKey={resolvedKey}
        strokes={strokes}
        exportMode
        theme={TEXT_CHART_SURFACE}
      />,
    );
    await waitForLayout();
    await document.fonts.ready;

    const target = container.firstElementChild as HTMLElement | null;
    if (!target) throw new Error('Could not render chart');

    const blob = await toBlob(target, {
      pixelRatio: 2,
      backgroundColor: '#1f1f1f',
      cacheBust: true,
    });
    if (!blob || blob.size === 0) throw new Error('Could not export chart');
    return blob;
  } finally {
    root?.unmount();
    root = null;
    container.remove();
  }
}
