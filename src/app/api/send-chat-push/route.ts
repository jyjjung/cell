
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { deliverChatPush } from '@/lib/server-chat-push';
import { isAuthError, verifyAuthToken } from '@/lib/api-auth';


export async function POST(request: NextRequest) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const authResult = await verifyAuthToken(request);
    if (isAuthError(authResult)) return authResult;

    const { chatId, messageId, senderId, text } = body;
    if (!chatId || !messageId) {
        return NextResponse.json({ error: 'chatId and messageId are required' }, { status: 400 });
    }
    if (typeof senderId !== 'string' || senderId !== authResult.uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (typeof text !== 'string' || !text.trim()) {
        return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    try {
        const adminApp = getAdminApp();
        const adminDb = getAdminDb(adminApp);
        const adminMessaging = getAdminMessaging(adminApp);

        const chatDoc = await adminDb.collection('chats').doc(chatId).get();
        if (!chatDoc.exists) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        const members = (chatDoc.data()?.members || []).map((m: string | { uid?: string }) =>
            typeof m === 'string' ? m : m.uid,
        );
        if (!members.includes(authResult.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await deliverChatPush(
            { chatId, messageId, senderId, text },
            adminDb,
            adminMessaging,
        );

        if (result.reason === 'Chat not found') {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            delivered: result.success,
            alreadySent: result.alreadySent ?? false,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error sending chat push notification:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
    }
}
