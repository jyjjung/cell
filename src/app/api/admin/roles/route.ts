import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { normalizeRoleCapabilities, normalizeRoleScope } from '@/lib/role-capabilities';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const app = getAdminApp();
    const auth = getAdminAuth(app);
    const db = getAdminDb(app);
    const uid = (await auth.verifyIdToken(token)).uid;
    if (!(await userHasAdminAccess(db, uid))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return NextResponse.json({ error: 'Role name must be at least 2 characters.' }, { status: 400 });
    }

    const appScope = normalizeRoleScope(body.appScope);
    const createChat = body.createChat !== false && (appScope === 'cell' || appScope === 'ndcpc');

    const roleRef = db.collection('roles').doc();
    const chatRef = createChat ? db.collection('chats').doc() : null;
    const batch = db.batch();
    batch.set(roleRef, {
      name,
      appScope,
      capabilities: normalizeRoleCapabilities(body.capabilities),
      status: 'active',
      chatId: chatRef?.id ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: uid,
    });
    if (chatRef) {
      batch.set(chatRef, {
        type: 'group',
        name,
        appScope,
        ...(appScope === 'ndcpc' ? { ndcpcKind: 'role' } : {}),
        members: [],
        memberInfo: {},
        admins: [],
        createdAt: FieldValue.serverTimestamp(),
        lastMessageText: 'Role circle initialized.',
        lastMessageSentAt: FieldValue.serverTimestamp(),
        memberSeen: {},
      });
    }
    await batch.commit();
    return NextResponse.json({ success: true, roleId: roleRef.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not create role.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
