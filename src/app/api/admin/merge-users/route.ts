
import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    // 1. Verify Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const callerDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    
    if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required.' }, { status: 403 });
    }

    // 2. Validate Payload
    const { masterUid, duplicateUid } = await request.json();
    if (!masterUid || !duplicateUid || masterUid === duplicateUid) {
      return NextResponse.json({ error: 'Invalid identification parameters.' }, { status: 400 });
    }

    const masterRef = adminDb.collection('users').doc(masterUid);
    const duplicateRef = adminDb.collection('users').doc(duplicateUid);
    const [masterSnap, duplicateSnap] = await Promise.all([masterRef.get(), duplicateRef.get()]);

    if (!masterSnap.exists || !duplicateSnap.exists) {
      return NextResponse.json({ error: 'One or both records no longer exist.' }, { status: 404 });
    }

    const masterData = masterSnap.data()!;
    const duplicateData = duplicateSnap.data()!;

    // 3. Prepare Batch Operations
    const batch = adminDb.batch();

    // A. Consolidate Roles
    const combinedRoles = Array.from(new Set([
      ...(masterData.roleIds || []),
      ...(duplicateData.roleIds || [])
    ]));
    batch.update(masterRef, { 
      roleIds: combinedRoles,
      updatedAt: FieldValue.serverTimestamp()
    });

    // B. Consolidate Bible Progress
    const masterChecklistRef = adminDb.collection('userBibleChecklists').doc(masterUid);
    const duplicateChecklistRef = adminDb.collection('userBibleChecklists').doc(duplicateUid);
    
    const [masterChecklist, duplicateChecklist] = await Promise.all([
      masterChecklistRef.get(),
      duplicateChecklistRef.get()
    ]);

    const combinedPassages = Array.from(new Set([
      ...(masterChecklist.data()?.completedPassages || []),
      ...(duplicateChecklist.data()?.completedPassages || [])
    ]));

    if (combinedPassages.length > 0) {
      batch.set(masterChecklistRef, {
        userId: masterUid,
        completedPassages: combinedPassages,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // C. Migrate Chat Memberships
    const chatsRef = adminDb.collection('chats');
    const duplicateChatsSnap = await chatsRef.where('members', 'array-contains', duplicateUid).get();

    duplicateChatsSnap.forEach(chatDoc => {
      const chatData = chatDoc.data();
      if (!chatData || !Array.isArray(chatData.members)) return;

      const updates: any = {};
      const members = chatData.members.filter((id: string) => id !== duplicateUid);
      if (!members.includes(masterUid)) members.push(masterUid);
      updates.members = members;

      if (Array.isArray(chatData.admins) && chatData.admins.includes(duplicateUid)) {
        const admins = chatData.admins.filter((id: string) => id !== duplicateUid);
        if (!admins.includes(masterUid)) admins.push(masterUid);
        updates.admins = admins;
      }

      updates[`memberInfo.${duplicateUid}`] = FieldValue.delete();
      updates[`memberInfo.${masterUid}`] = {
        firstName: masterData.firstName,
        lastName: masterData.lastName,
        avatar: masterData.avatar || { mode: 'custom', skinTone: '#E0A376' }
      };

      batch.update(chatDoc.ref, updates);
    });

    // D. Finalize Data Operations
    batch.delete(duplicateRef);
    batch.delete(duplicateChecklistRef);

    await batch.commit();

    // 4. Cleanup Authentication Record (Soft Failure)
    try {
      await adminAuth.deleteUser(duplicateUid);
    } catch (authError: any) {
      console.warn('[Merge Engine] Auth deletion skipped:', authError.message);
    }

    return NextResponse.json({ success: true, message: 'Identity records consolidated.' });

  } catch (error: any) {
    console.error('--- CONSOLIDATION ERROR ---', error);
    return NextResponse.json({ 
      error: 'Consolidation Failed', 
      details: error.message 
    }, { status: 500 });
  }
}
