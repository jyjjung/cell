import { storage } from '@/lib/firebase';
import { deleteObject, ref, type StorageReference } from 'firebase/storage';

function refFromDownloadUrl(imageUrl: string): StorageReference | null {
  try {
    const url = new URL(imageUrl);
    const host = url.hostname;
    const isFirebaseHost =
      host.includes('firebasestorage.googleapis.com') ||
      host.endsWith('.firebasestorage.app') ||
      host === 'storage.googleapis.com';
    if (!isFirebaseHost) return null;

    // Classic download URL: .../o/<encodedPath>?...
    const encodedPath = url.pathname.split('/o/')[1];
    if (encodedPath) {
      const path = decodeURIComponent(encodedPath.split('?')[0] ?? encodedPath);
      return ref(storage, path);
    }

    // GCS-style: /<bucket>/avatars/... or /avatars/...
    const parts = url.pathname.split('/').filter(Boolean);
    const avatarsIdx = parts.indexOf('avatars');
    const chatsIdx = parts.indexOf('chats');
    const start = avatarsIdx >= 0 ? avatarsIdx : chatsIdx;
    if (start >= 0) {
      return ref(storage, parts.slice(start).join('/'));
    }

    return null;
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
