import { storage } from '@/lib/firebase';
import { deleteObject, ref, type StorageReference } from 'firebase/storage';

function refFromDownloadUrl(imageUrl: string): StorageReference | null {
  try {
    const url = new URL(imageUrl);
    if (!url.hostname.includes('firebasestorage.googleapis.com')) return null;

    const encodedPath = url.pathname.split('/o/')[1];
    if (!encodedPath) return null;

    const path = decodeURIComponent(encodedPath.split('?')[0] ?? encodedPath);
    return ref(storage, path);
  } catch {
    return null;
  }
}

/** Deletes a Firebase Storage object when its download URL is known. */
export async function deleteStorageObjectAtUrl(imageUrl: string | undefined): Promise<void> {
  if (!imageUrl) return;
  const fileRef = refFromDownloadUrl(imageUrl);
  if (!fileRef) return;

  try {
    await deleteObject(fileRef);
  } catch {
    // Object may already be gone or URL may be external.
  }
}
