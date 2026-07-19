
import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb, getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { commitDeletesInChunks, commitUpdatesInChunks } from '@/lib/commit-batches';

export async function POST(request: NextRequest) {
  try {
    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(token);
    const callerIsAdmin = await userHasAdminAccess(adminDb, decodedToken.uid);
    if (!callerIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid: uidToDelete } = await request.json();
    if (!uidToDelete) return NextResponse.json({ error: 'UID missing' }, { status: 400 });

    const userRef = adminDb.collection('users').doc(uidToDelete);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    await adminDb
      .collection('migrationArchive')
      .doc('deletedUsers')
      .collection('records')
      .doc(uidToDelete)
      .set({
        sourcePath: userRef.path,
        payload: userSnap.data(),
        deletedBy: decodedToken.uid,
        archivedAt: FieldValue.serverTimestamp(),
      });

    const deletes = [
      userRef,
      adminDb.collection('userBibleChecklists').doc(uidToDelete),
      adminDb.collection('communityProgress').doc(uidToDelete),
    ];

    const chatsSnap = await adminDb.collection('chats').where('members', 'array-contains', uidToDelete).get();
    const chatUpdates: Array<{ ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> }> = [];
    const chatDeletes: FirebaseFirestore.DocumentReference[] = [];

    chatsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.type === 'private' || (data.members?.length === 1)) {
            chatDeletes.push(docSnap.ref);
        } else {
            chatUpdates.push({
              ref: docSnap.ref,
              data: {
                members: FieldValue.arrayRemove(uidToDelete),
                [`memberInfo.${uidToDelete}`]: FieldValue.delete(),
                admins: FieldValue.arrayRemove(uidToDelete),
              },
            });
        }
    });

    await commitDeletesInChunks(adminDb, deletes);
    await commitUpdatesInChunks(adminDb, chatUpdates);
    for (const chatRef of chatDeletes) {
      await adminDb.recursiveDelete(chatRef);
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'cell-abca4.firebasestorage.app';
      if (bucketName) {
        await getAdminStorage(adminApp).bucket(bucketName).deleteFiles({
          prefix: `chats/${chatRef.id}/`,
          force: true,
        }).catch(() => undefined);
      }
    }
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'cell-abca4.firebasestorage.app';
    if (bucketName) {
      await getAdminStorage(adminApp).bucket(bucketName).deleteFiles({
        prefix: `avatars/${uidToDelete}_`,
        force: true,
      }).catch(() => undefined);
    }
    try {
      await adminAuth.deleteUser(uidToDelete);
    } catch {
      // Auth record may already be absent; Firestore archive remains recoverable.
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
