import type { DocumentReference, Firestore } from 'firebase-admin/firestore';

const FIRESTORE_BATCH_LIMIT = 400;

type BatchUpdate = {
  ref: DocumentReference;
  data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
};

export async function commitUpdatesInChunks(
  adminDb: Firestore,
  updates: BatchUpdate[],
  batchLimit = FIRESTORE_BATCH_LIMIT,
): Promise<void> {
  for (let i = 0; i < updates.length; i += batchLimit) {
    const batch = adminDb.batch();
    for (const { ref, data } of updates.slice(i, i + batchLimit)) {
      batch.update(ref, data);
    }
    await batch.commit();
  }
}
export async function commitDeletesInChunks(
  adminDb: Firestore,
  refs: DocumentReference[],
  batchLimit = FIRESTORE_BATCH_LIMIT,
): Promise<void> {
  for (let i = 0; i < refs.length; i += batchLimit) {
    const batch = adminDb.batch();
    for (const ref of refs.slice(i, i + batchLimit)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}
