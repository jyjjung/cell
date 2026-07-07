
import { type NextRequest, NextResponse } from 'next/server';
import type { App as FirebaseAdminApp } from 'firebase-admin/app';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { userHasAdminAccess } from '@/lib/server-admin-access';

function initializeAdminApp(): FirebaseAdminApp {
  const existingApp = getApps().find(app => app.name === 'firebase-admin-delete-chat');
  if (existingApp) {
    return existingApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('[Admin Init] CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is not defined.');
  }

  try {
    const credential = cert(JSON.parse(serviceAccountKey));
    return initializeApp({ credential }, 'firebase-admin-delete-chat');
  } catch (e: any) {
    throw new Error(`[Admin Init] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize app. Error: ${e.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminApp = initializeAdminApp();
    const adminAuth = getAuth(adminApp);
    const adminDb = getFirestore(adminApp);

    // 1. Verify the caller is an admin
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }

    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }
    
    const callerIsAdmin = await userHasAdminAccess(adminDb, decodedToken.uid);
    if (!callerIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Caller is not an admin.' }, { status: 403 });
    }

    // 2. Get the Chat ID to delete from the request body
    const { chatId } = await request.json();
    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json({ error: 'Bad Request: Chat ID is missing or invalid.' }, { status: 400 });
    }
    
    // 3. Use recursiveDelete to delete the chat document and all its subcollections.
    // This is the official and most robust way to perform this operation.
    const chatRef = adminDb.collection('chats').doc(chatId);
    await adminDb.recursiveDelete(chatRef);

    return NextResponse.json({ success: true, message: `Chat ${chatId} and all its messages have been deleted.` });

  } catch (error: any) {
    console.error('--- DETAILED CHAT DELETION ERROR ---');
    console.error('Timestamp:', new Date().toISOString());
    if (error.code) console.error('Error Code:', error.code);
    if (error.message) console.error('Error Message:', error.message);
    if (error.stack) console.error('Stack Trace:', error.stack);
    console.error('------------------------------------');
    return NextResponse.json({ 
        error: 'Internal Server Error', 
        details: error.message || 'An unknown error occurred on the server.' 
    }, { status: 500 });
  }
}
