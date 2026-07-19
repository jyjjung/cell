import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';

export async function POST(request: NextRequest) {
  try {
    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    const callerIsAdmin = await userHasAdminAccess(adminDb, decodedToken.uid);
    if (!callerIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Caller is not an admin.' }, { status: 403 });
    }

    const { chatId } = await request.json();
    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json({ error: 'Bad Request: Chat ID is missing or invalid.' }, { status: 400 });
    }

    const chatRef = adminDb.collection('chats').doc(chatId);
    await adminDb.recursiveDelete(chatRef);

    // Clear any role → chat link so role admin UI does not point at a deleted chat.
    const linkedRoles = await adminDb.collection('roles').where('chatId', '==', chatId).get();
    if (!linkedRoles.empty) {
      const batch = adminDb.batch();
      linkedRoles.docs.forEach((roleDoc) => {
        batch.update(roleDoc.ref, { chatId: FieldValue.delete() });
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Chat ${chatId} and all its messages have been deleted.`,
    });
  } catch (error: unknown) {
    console.error('--- DETAILED CHAT DELETION ERROR ---');
    console.error('Timestamp:', new Date().toISOString());
    if (error && typeof error === 'object') {
      const err = error as { code?: string; message?: string; stack?: string };
      if (err.code) console.error('Error Code:', err.code);
      if (err.message) console.error('Error Message:', err.message);
      if (err.stack) console.error('Stack Trace:', err.stack);
    }
    console.error('------------------------------------');
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'An unknown error occurred on the server.',
      },
      { status: 500 },
    );
  }
}
