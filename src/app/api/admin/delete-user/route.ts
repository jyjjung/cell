
import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(token);
    const callerDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid: uidToDelete } = await request.json();
    if (!uidToDelete) return NextResponse.json({ error: 'UID missing' }, { status: 400 });

    try {
      await adminAuth.deleteUser(uidToDelete);
    } catch (e) {}

    const batch = adminDb.batch();
    batch.delete(adminDb.collection('users').doc(uidToDelete));
    batch.delete(adminDb.collection('userBibleChecklists').doc(uidToDelete));
    
    const chatsSnap = await adminDb.collection('chats').where('members', 'array-contains', uidToDelete).get();
    chatsSnap.forEach(doc => {
        const data = doc.data();
        if (data.type === 'private' || (data.members?.length === 1)) {
            batch.delete(doc.ref);
        } else {
            batch.update(doc.ref, {
                members: FieldValue.arrayRemove(uidToDelete),
                [`memberInfo.${uidToDelete}`]: FieldValue.delete(),
                admins: FieldValue.arrayRemove(uidToDelete)
            });
        }
    });
    
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
