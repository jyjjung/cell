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

async function getReactorDisplayName(
  reactorId: string,
  chat: Chat,
  db: Firestore,
): Promise<string> {
  try {
    const userDoc = await db.collection('users').doc(reactorId).get();
    if (userDoc.exists) {
      const profile = userDoc.data() as UserProfileData;
      if (profile.firstName) {
        const fullName = `${profile.firstName} ${profile.lastName || ''}`.trim();
        if (fullName) return fullName;
      }
    }
  } catch (error) {
    console.error(`[send-chat-reaction-push] Error fetching reactor profile for ${reactorId}:`, error);
  }

  const fromChat = chat.memberInfo?.[reactorId];
  if (fromChat?.firstName) {
    const fullName = `${fromChat.firstName || ''} ${fromChat.lastName || ''}`.trim();
    if (fullName) return fullName;
  }

  return 'Someone';
}

function messagePreview(message: ChatMessage): string {
  if (message.text?.trim()) return preview(message.text);
  if (message.imageUrl) return 'a photo';
  if (message.poll?.question) return preview(message.poll.question);
  return 'a message';
}

export async function POST(request: NextRequest) {
  let body: {
    chatId?: string;
    messageId?: string;
    emoji?: string;
    parentMessageId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const authResult = await verifyAuthToken(request);
  if (isAuthError(authResult)) return authResult;

  const { chatId, messageId, emoji, parentMessageId } = body;
  if (!chatId || !messageId || !emoji || typeof emoji !== 'string') {
    return NextResponse.json(
      { error: 'chatId, messageId, and emoji are required' },
      { status: 400 },
    );
  }

  const trimmedEmoji = emoji.trim();
  if (!trimmedEmoji || trimmedEmoji.length > 32) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
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

    const messageDoc = parentMessageId
      ? await chatDocRef
          .collection('messages')
          .doc(parentMessageId)
          .collection('thread')
          .doc(messageId)
          .get()
      : await chatDocRef.collection('messages').doc(messageId).get();

    if (!messageDoc.exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = { id: messageDoc.id, ...messageDoc.data() } as ChatMessage;
    if (message.isDeleted) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const reactors = message.reactions?.[trimmedEmoji] || [];
    if (!reactors.includes(authResult.uid)) {
      return NextResponse.json({ success: true, delivered: 0, reason: 'not_reacted' });
    }

    const recipientIds = members.filter(
      (uid): uid is string => typeof uid === 'string' && uid !== authResult.uid,
    );
    if (recipientIds.length === 0) {
      return NextResponse.json({ success: true, delivered: 0, reason: 'no_recipients' });
    }

    // One push per reactor per emoji per message (skip remove/re-add spam).
    const dedupeId = `chat-reaction-${messageId}-${authResult.uid}-${encodeURIComponent(trimmedEmoji)}`;
    const logRef = adminDb.collection('notificationLog').doc(dedupeId);
    try {
      await logRef.create({
        recipientIds,
        reactorId: authResult.uid,
        chatId,
        messageId,
        emoji: trimmedEmoji,
        ...(parentMessageId ? { parentMessageId } : {}),
        sentAt: FieldValue.serverTimestamp(),
      });
    } catch {
      return NextResponse.json({ success: true, delivered: 0, reason: 'already_notified' });
    }

    const reactorName = await getReactorDisplayName(authResult.uid, chat, adminDb);
    const previewText = messagePreview(message);

    let title: string;
    let bodyText: string;
    if (chat.type === 'group') {
      title = chat.name || 'Group Chat';
      bodyText = `${reactorName} reacted ${trimmedEmoji} to "${previewText}"`;
    } else {
      title = reactorName;
      bodyText = `Reacted ${trimmedEmoji} to "${previewText}"`;
    }

    const pushPayload = {
      title,
      body: bodyText,
      tag: `chat-reaction-${messageId}`,
      link: `/chat/${chatId}`,
    };

    const deliveryResults = await Promise.all(
      recipientIds.map(async (recipientId) => {
        try {
          return await deliverDataPushToUser(
            recipientId,
            pushPayload,
            adminDb,
            adminMessaging,
          );
        } catch (error) {
          console.error(
            `[send-chat-reaction-push] Delivery failed for ${recipientId}:`,
            error,
          );
          return 0;
        }
      }),
    );
    const delivered = deliveryResults.reduce((sum, count) => sum + count, 0);

    await logRef.update({ pushDeliveredCount: delivered }).catch(() => {});

    return NextResponse.json({ success: true, delivered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-chat-reaction-push]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
