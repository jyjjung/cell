import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { isAuthError, verifyAuthToken } from '@/lib/api-auth';
import { deliverDataPushToUser } from '@/lib/server-push';
import type { Chat, ChatMessage, UserProfileData } from '@/types';

function preview(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

async function getVoterDisplayName(
  voterId: string,
  chat: Chat,
  db: Firestore,
): Promise<string> {
  try {
    const userDoc = await db.collection('users').doc(voterId).get();
    if (userDoc.exists) {
      const profile = userDoc.data() as UserProfileData;
      if (profile.firstName) {
        const fullName = `${profile.firstName} ${profile.lastName || ''}`.trim();
        if (fullName) return fullName;
      }
    }
  } catch (error) {
    console.error(`[send-poll-vote-push] Error fetching voter profile for ${voterId}:`, error);
  }

  const fromChat = chat.memberInfo?.[voterId];
  if (fromChat?.firstName) {
    const fullName = `${fromChat.firstName || ''} ${fromChat.lastName || ''}`.trim();
    if (fullName) return fullName;
  }

  return 'Someone';
}

export async function POST(request: NextRequest) {
  let body: { chatId?: string; messageId?: string; optionIndex?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const authResult = await verifyAuthToken(request);
  if (isAuthError(authResult)) return authResult;

  const { chatId, messageId, optionIndex } = body;
  if (!chatId || !messageId || typeof optionIndex !== 'number' || !Number.isInteger(optionIndex)) {
    return NextResponse.json(
      { error: 'chatId, messageId, and optionIndex are required' },
      { status: 400 },
    );
  }

  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminMessaging = getAdminMessaging(adminApp);

    const chatDocRef = adminDb.collection('chats').doc(chatId);
    const chatDoc = await chatDocRef.get();
    if (!chatDoc.exists) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const chat = { id: chatDoc.id, ...chatDoc.data() } as Chat;
    const members = (chat.members || []).map((m) =>
      typeof m === 'string' ? m : (m as { uid?: string }).uid,
    );
    if (!members.includes(authResult.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messageDoc = await chatDocRef.collection('messages').doc(messageId).get();
    if (!messageDoc.exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = { id: messageDoc.id, ...messageDoc.data() } as ChatMessage;
    if (!message.poll || message.isDeleted) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const pollAuthorId = message.senderId;
    if (!pollAuthorId || pollAuthorId === authResult.uid) {
      return NextResponse.json({ success: true, delivered: 0, reason: 'skipped_self' });
    }

    if (optionIndex < 0 || optionIndex >= message.poll.options.length) {
      return NextResponse.json({ error: 'Invalid optionIndex' }, { status: 400 });
    }

    const optionKey = String(optionIndex);
    const voters = message.pollVotes?.[optionKey] || [];
    if (!voters.includes(authResult.uid)) {
      return NextResponse.json({ success: true, delivered: 0, reason: 'not_voted' });
    }

    // One push per voter per poll (skip option flips / re-votes).
    const dedupeId = `poll-vote-${messageId}-${authResult.uid}`;
    const logRef = adminDb.collection('notificationLog').doc(dedupeId);
    try {
      await logRef.create({
        userId: pollAuthorId,
        voterId: authResult.uid,
        chatId,
        messageId,
        sentAt: FieldValue.serverTimestamp(),
      });
    } catch {
      return NextResponse.json({ success: true, delivered: 0, reason: 'already_notified' });
    }

    const voterName = await getVoterDisplayName(authResult.uid, chat, adminDb);
    const optionLabel = message.poll.options[optionIndex] || 'an option';
    const questionPreview = preview(message.poll.question);

    let title: string;
    let bodyText: string;
    if (chat.type === 'group') {
      title = chat.name || 'Group Chat';
      bodyText = `${voterName} voted "${preview(optionLabel, 40)}" on "${questionPreview}"`;
    } else {
      title = voterName;
      bodyText = `Voted "${preview(optionLabel, 40)}" on your poll "${questionPreview}"`;
    }

    const delivered = await deliverDataPushToUser(
      pollAuthorId,
      {
        title,
        body: bodyText,
        tag: `poll-vote-${messageId}`,
        link: `/chat/${chatId}`,
      },
      adminDb,
      adminMessaging,
    );

    await logRef.update({ pushDeliveredCount: delivered }).catch(() => {});

    return NextResponse.json({ success: true, delivered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-poll-vote-push]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
