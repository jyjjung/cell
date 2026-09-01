'use client';

import { getBlob, ref } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { sheetExtension, type SheetDownloadFile } from '@/lib/setlist-download';
import { exportTextChordSheetToPng } from '@/lib/text-chord-chart-export';

export class DownloadCancelledError extends Error {
  constructor() {
    super('Download cancelled');
    this.name = 'DownloadCancelledError';
  }
}

function storagePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const encodedPath = parsed.pathname.split('/o/')[1];
    if (encodedPath) {
      return decodeURIComponent(encodedPath.split('?')[0] ?? encodedPath);
    }
    const parts = parsed.pathname.split('/').filter(Boolean);
    const start = parts.indexOf('worshipChordSheets');
    if (start >= 0) return parts.slice(start).join('/');
    return null;
  } catch {
    return null;
  }
}

async function blobFromCache(url: string): Promise<Blob | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const corsReq = new Request(url, { mode: 'cors', credentials: 'omit' });
    const cached = (await caches.match(corsReq)) ?? (await caches.match(url));
    if (!cached || cached.type === 'opaque') return null;
    const blob = await cached.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

async function fetchSheetBlob(url: string): Promise<Blob> {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
  } catch {
    /* try cache / SDK */
  }

  const cached = await blobFromCache(url);
  if (cached) return cached;

  const path = storagePathFromUrl(url);
  if (path) {
    const blob = await getBlob(ref(storage, path));
    if (blob.size > 0) return blob;
  }

  throw new Error('Could not download sheet');
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 8_000);
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite';
    startIn?: 'downloads' | 'desktop' | 'documents' | 'pictures';
  }) => Promise<FileSystemDirectoryHandle>;
};

function supportsDirectoryPicker(): boolean {
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';
}

async function pickDownloadFolder(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (typeof picker !== 'function') {
    throw new Error('Folder picker is not supported in this browser');
  }
  try {
    return await picker.call(window, { mode: 'readwrite', startIn: 'downloads' });
  } catch (error) {
    if (isAbort(error)) throw new DownloadCancelledError();
    throw error;
  }
}

async function writeBlobToFolder(
  dir: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob,
) {
  const handle = await dir.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function loadSheet(file: SheetDownloadFile): Promise<{ filename: string; blob: Blob }> {
  if (file.textChart) {
    const blob = await exportTextChordSheetToPng(file.textChart);
    return { filename: file.filename, blob };
  }
  if (!file.url) throw new Error('Could not download sheet');
  const blob = await fetchSheetBlob(file.url);
  const ext = sheetExtension(file.url, blob.type);
  const filename = file.filename.replace(/\.[^.]+$/, `.${ext}`);
  return { filename, blob };
}

async function loadAllSheets(
  files: SheetDownloadFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ filename: string; blob: Blob }[]> {
  const loaded: { filename: string; blob: Blob }[] = [];
  const errors: unknown[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      loaded.push(await loadSheet(files[i]!));
    } catch (error) {
      errors.push(error);
    }
    onProgress?.(i + 1, files.length);
  }
  if (loaded.length === 0) {
    const last = errors[errors.length - 1];
    throw last instanceof Error ? last : new Error('Could not download chord sheets');
  }
  return loaded;
}

async function saveToFolder(
  dir: FileSystemDirectoryHandle,
  loaded: { filename: string; blob: Blob }[],
) {
  for (const item of loaded) {
    await writeBlobToFolder(dir, item.filename, item.blob);
  }
}

async function shareLoadedFiles(loaded: { filename: string; blob: Blob }[]): Promise<boolean> {
  const shareFiles = loaded.map(
    (item) => new File([item.blob], item.filename, { type: item.blob.type || 'image/jpeg' }),
  );
  if (typeof navigator.canShare !== 'function' || !navigator.canShare({ files: shareFiles })) {
    return false;
  }
  try {
    await navigator.share({ files: shareFiles });
    return true;
  } catch (error) {
    if (isAbort(error)) throw new DownloadCancelledError();
    return false;
  }
}

async function saveSequentially(loaded: { filename: string; blob: Blob }[]) {
  for (let i = 0; i < loaded.length; i++) {
    triggerBlobDownload(loaded[i]!.blob, loaded[i]!.filename);
    if (i < loaded.length - 1) await wait(700);
  }
}

/**
 * Saves every photo as its own file, in setlist order, without opening a new tab.
 */
export async function downloadNamedFiles(
  files: SheetDownloadFile[],
  options?: { onProgress?: (done: number, total: number) => void },
): Promise<void> {
  if (files.length === 0) {
    throw new Error('No chord sheets to download');
  }

  if (files.length === 1) {
    const item = await loadSheet(files[0]!);
    triggerBlobDownload(item.blob, item.filename);
    options?.onProgress?.(1, 1);
    return;
  }

  // Pick the folder while the click gesture is still fresh (before loading blobs).
  let folder: FileSystemDirectoryHandle | null = null;
  if (supportsDirectoryPicker()) {
    folder = await pickDownloadFolder();
  }

  const loaded = await loadAllSheets(files, options?.onProgress);

  if (folder) {
    await saveToFolder(folder, loaded);
    return;
  }

  if (await shareLoadedFiles(loaded)) return;

  await saveSequentially(loaded);
}
