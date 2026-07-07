
import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
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

    try {
      await adminAuth.deleteUser(uidToDelete);
    } catch {
      // User may already be removed from Auth.
    }

    const deletes = [
      adminDb.collection('users').doc(uidToDelete),
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
    await commitDeletesInChunks(adminDb, chatDeletes);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
