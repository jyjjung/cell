import { deleteObject, listAll, ref, refFromURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/** Deletes a single avatar object when its download URL is known. */
export async function deleteAvatarPhotoAtUrl(imageUrl: string | undefined): Promise<void> {
  if (!imageUrl) return;
  try {
    await deleteObject(refFromURL(storage, imageUrl));
  } catch {
    // Object may already be gone or URL may be external.
  }
}

/** Removes prior profile photos for this user (`avatars/{uid}_*`). */
export async function deletePreviousAvatarPhotos(uid: string): Promise<void> {
  if (!uid || uid === 'anonymous') return;

  try {
    const folderRef = ref(storage, 'avatars');
    const listing = await listAll(folderRef);
    const prefix = `${uid}_`;

    await Promise.all(
      listing.items
        .filter((item) => item.name.startsWith(prefix))
        .map((item) => deleteObject(item).catch(() => undefined)),
    );
  } catch {
    // listAll may be denied by rules; caller can fall back to deleteAvatarPhotoAtUrl.
  }
}
